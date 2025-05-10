#!/usr/bin/env python3
# Integration test for the complete order matching workflow

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock, mock_open

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl
from matching_engine import MatchingEngine
from settlement import SettlementEngine
from storage import OrderStorage

class TestOrderMatchingIntegration(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        # Ensure we're in ROFL mode for testing
        rofl.set_mock_inside_rofl(True)

        # Create mock components
        self.setup_mocks()
        
        # Sample buy orders
        self.buy_orders = [
            {
                "orderId": 1,
                "owner": "0xbuyer1",
                "isBuy": True,
                "price": 100,
                "size": 10,
                "token": "0xWaterToken"
            },
            {
                "orderId": 2,
                "owner": "0xbuyer2",
                "isBuy": True,
                "price": 95,
                "size": 5,
                "token": "0xWaterToken"
            }
        ]
        
        # Sample sell orders
        self.sell_orders = [
            {
                "orderId": 3,
                "owner": "0xseller1",
                "isBuy": False,
                "price": 90,
                "size": 3,
                "token": "0xWaterToken"
            },
            {
                "orderId": 4,
                "owner": "0xseller2",
                "isBuy": False,
                "price": 98,
                "size": 8,
                "token": "0xWaterToken"
            }
        ]

    def setup_mocks(self):
        """Set up all necessary mocks for the test"""
        # Mock Web3 and Contract
        self.mock_web3 = MagicMock()
        self.mock_contract = MagicMock()
        self.mock_functions = MagicMock()
        
        # Setup the contract mock
        self.mock_web3.eth.contract.return_value = self.mock_contract
        self.mock_contract.functions = self.mock_functions
        self.mock_web3.to_checksum_address = lambda x: x  # Identity function for testing
        
        # Setup the function callbacks
        self.mock_order_counter = MagicMock()
        self.mock_order_counter.call.return_value = 4  # Total orders
        self.mock_functions.orderCounter.return_value = self.mock_order_counter
        
        self.mock_filled_orders = MagicMock()
        self.mock_filled_orders.call.return_value = False  # No filled orders initially
        self.mock_functions.filledOrders.return_value = self.mock_filled_orders
        
        self.mock_get_order = MagicMock()
        self.mock_functions.getEncryptedOrder.return_value = self.mock_get_order
        
        self.mock_execute_match = MagicMock()
        self.mock_functions.executeMatch.return_value = self.mock_execute_match
        
        # Mock transaction submission
        self.mock_tx = MagicMock()
        self.mock_tx.build_transaction.return_value = {'data': '0xmocktxdata'}
        self.mock_execute_match.build_transaction = lambda x: {'data': '0xmocktxdata'}
        
        # Mock receipt
        self.mock_receipt = MagicMock()
        self.mock_receipt.status = 1
        self.mock_receipt.blockNumber = 12345
        self.mock_receipt.gasUsed = 100000
        self.mock_web3.eth.get_transaction_receipt.return_value = self.mock_receipt
        
        # Patch sign_submit_transaction
        patcher = patch('rofl_integration.sign_submit_transaction')
        self.mock_sign_submit = patcher.start()
        self.mock_sign_submit.return_value = {'hash': '0xmocktxhash'}
        self.addCleanup(patcher.stop)
        
        # Patch open to return mock ABI
        self.mock_abi = {"abi": []}
        patcher2 = patch('builtins.open', mock_open(read_data=json.dumps(self.mock_abi)))
        patcher2.start()
        self.addCleanup(patcher2.stop)
        
        # Patch decrypt to handle encrypted orders
        patcher3 = patch('rofl.decrypt')
        self.mock_decrypt = patcher3.start()
        self.addCleanup(patcher3.stop)
        
        # Patch storage
        patcher4 = patch('storage.OrderStorage')
        self.mock_storage_class = patcher4.start()
        self.mock_storage = MagicMock()
        self.mock_storage_class.return_value = self.mock_storage
        self.addCleanup(patcher4.stop)

    def test_complete_order_matching_workflow(self):
        """Test the complete order matching workflow from loading to settlement"""
        # Setup decryption of orders
        self.mock_decrypt.side_effect = [
            self.buy_orders[0],
            self.buy_orders[1],
            self.sell_orders[0],
            self.sell_orders[1]
        ]
        
        # Setup order fetching from contract
        self.mock_get_order.call.side_effect = [
            json.dumps(self.buy_orders[0]),
            json.dumps(self.buy_orders[1]),
            json.dumps(self.sell_orders[0]),
            json.dumps(self.sell_orders[1])
        ]
        
        # Create matching engine with mocked web3
        with patch('web3.Web3', return_value=self.mock_web3):
            matching_engine = MatchingEngine("0xContract", "mock_provider")
            settlement_engine = SettlementEngine("0xContract", "mock_provider", "0xPrivateKey")
            
            # Replace the web3 and contract instance with our mocks
            matching_engine.web3 = self.mock_web3
            matching_engine.roflswap = self.mock_contract
            settlement_engine.web3 = self.mock_web3
            settlement_engine.roflswap = self.mock_contract
            
            # Step 1: Load orders
            matching_engine.load_orders()
            
            # Verify orders were loaded correctly
            self.assertEqual(len(matching_engine.buy_orders), 2)
            self.assertEqual(len(matching_engine.sell_orders), 2)
            
            # Check order IDs
            buy_ids = [order["orderId"] for order in matching_engine.buy_orders]
            self.assertIn(1, buy_ids)
            self.assertIn(2, buy_ids)
            
            sell_ids = [order["orderId"] for order in matching_engine.sell_orders]
            self.assertIn(3, sell_ids)
            self.assertIn(4, sell_ids)
            
            # Step 2: Find matches
            matches = matching_engine.find_matches()
            
            # Verify matches were found
            self.assertGreater(len(matches), 0)
            
            # Check first match details
            first_match = next((m for m in matches if m['buyOrderId'] == 1 and m['sellOrderId'] == 3), None)
            self.assertIsNotNone(first_match)
            self.assertEqual(first_match['amount'], 3)  # Min of buy and sell sizes
            self.assertEqual(first_match['price'], 90)  # Sell price
            
            # Step 3: Execute matches
            results = settlement_engine.execute_matches(matches)
            
            # Verify execution results
            self.assertEqual(len(results), len(matches))
            self.assertTrue(all(r['success'] for r in results))
            
            # Verify sign_submit_transaction was called for each match
            self.assertEqual(self.mock_sign_submit.call_count, len(matches))
            
            # Step 4: Verify storage was updated
            self.mock_storage.save_matches.assert_called_once()
            saved_matches = self.mock_storage.save_matches.call_args[0][0]
            self.assertEqual(len(saved_matches), len(matches))

    def test_no_matching_orders(self):
        """Test workflow when no orders match"""
        # Change buy orders to have lower prices
        modified_buy_orders = [
            {
                "orderId": 1,
                "owner": "0xbuyer1",
                "isBuy": True,
                "price": 85,  # Lower than any sell price
                "size": 10,
                "token": "0xWaterToken"
            }
        ]
        
        # Setup decryption of orders
        self.mock_decrypt.side_effect = [
            modified_buy_orders[0],
            self.sell_orders[0]
        ]
        
        # Setup order fetching from contract - only two orders
        self.mock_order_counter.call.return_value = 2
        self.mock_get_order.call.side_effect = [
            json.dumps(modified_buy_orders[0]),
            json.dumps(self.sell_orders[0])
        ]
        
        # Create matching engine with mocked web3
        with patch('web3.Web3', return_value=self.mock_web3):
            matching_engine = MatchingEngine("0xContract", "mock_provider")
            settlement_engine = SettlementEngine("0xContract", "mock_provider", "0xPrivateKey")
            
            # Replace the web3 and contract instance with our mocks
            matching_engine.web3 = self.mock_web3
            matching_engine.roflswap = self.mock_contract
            settlement_engine.web3 = self.mock_web3
            settlement_engine.roflswap = self.mock_contract
            
            # Step 1: Load orders
            matching_engine.load_orders()
            
            # Verify orders were loaded correctly
            self.assertEqual(len(matching_engine.buy_orders), 1)
            self.assertEqual(len(matching_engine.sell_orders), 1)
            
            # Step 2: Find matches
            matches = matching_engine.find_matches()
            
            # Verify no matches were found
            self.assertEqual(len(matches), 0)
            
            # Step 3: Execute matches (should be a no-op)
            results = settlement_engine.execute_matches(matches)
            
            # Verify no executions
            self.assertEqual(len(results), 0)
            
            # Verify sign_submit_transaction was not called
            self.mock_sign_submit.assert_not_called()
            
            # Storage should not have been updated
            self.mock_storage.save_matches.assert_not_called()

    def test_partial_match_execution_failure(self):
        """Test workflow where some match executions fail"""
        # Setup decryption of orders
        self.mock_decrypt.side_effect = [
            self.buy_orders[0],
            self.sell_orders[0],
            self.sell_orders[1]
        ]
        
        # Setup order fetching from contract - three orders
        self.mock_order_counter.call.return_value = 3
        self.mock_get_order.call.side_effect = [
            json.dumps(self.buy_orders[0]),
            json.dumps(self.sell_orders[0]),
            json.dumps(self.sell_orders[1])
        ]
        
        # Make the first execution succeed and the second fail
        self.mock_sign_submit.side_effect = [
            {'hash': '0xmocktxhash1'},  # First call succeeds
            None  # Second call fails
        ]
        
        # Create matching engine with mocked web3
        with patch('web3.Web3', return_value=self.mock_web3):
            matching_engine = MatchingEngine("0xContract", "mock_provider")
            settlement_engine = SettlementEngine("0xContract", "mock_provider", "0xPrivateKey")
            
            # Replace the web3 and contract instance with our mocks
            matching_engine.web3 = self.mock_web3
            matching_engine.roflswap = self.mock_contract
            settlement_engine.web3 = self.mock_web3
            settlement_engine.roflswap = self.mock_contract
            
            # Step 1: Load orders
            matching_engine.load_orders()
            
            # Verify orders were loaded correctly
            self.assertEqual(len(matching_engine.buy_orders), 1)
            self.assertEqual(len(matching_engine.sell_orders), 2)
            
            # Step 2: Find matches
            matches = matching_engine.find_matches()
            
            # Should find two matches with the one buy order
            self.assertEqual(len(matches), 2)
            
            # Step 3: Execute matches with mixed results
            results = settlement_engine.execute_matches(matches)
            
            # Verify execution results
            self.assertEqual(len(results), 2)
            
            # First match should succeed, second should fail
            self.assertTrue(results[0]['success'])
            self.assertFalse(results[1]['success'])
            
            # Verify storage was updated with both results
            self.mock_storage.save_matches.assert_called_once()
            saved_matches = self.mock_storage.save_matches.call_args[0][0]
            self.assertEqual(len(saved_matches), 2)

if __name__ == "__main__":
    unittest.main() 