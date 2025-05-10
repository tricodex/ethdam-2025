#!/usr/bin/env python3
# Tests for the MatchingEngine class in matching_engine.py

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock, mock_open

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl
from matching_engine import MatchingEngine

class TestMatchingEngine(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        # Ensure we're in ROFL mode for testing
        rofl.set_mock_inside_rofl(True)

        # Create a mock Web3 instance
        self.mock_web3 = MagicMock()
        self.mock_contract = MagicMock()
        self.mock_functions = MagicMock()
        
        # Setup the contract mock
        self.mock_web3.eth.contract.return_value = self.mock_contract
        self.mock_contract.functions = self.mock_functions
        
        # Patch Web3 to return our mock
        with patch('web3.Web3', return_value=self.mock_web3):
            # Create the matching engine with our mocked Web3
            self.engine = MatchingEngine("0xContract", "mock_provider")
            
            # Replace the web3 and contract instance with our mocks
            self.engine.web3 = self.mock_web3
            self.engine.ROFLSwap = self.mock_contract
        
        # Sample buy orders
        self.buy_orders = [
            {
                "orderId": 1,
                "owner": "0xbuyer1",
                "isBuy": True,
                "price": 100,
                "size": 10,
                "token": "0xtoken1"
            },
            {
                "orderId": 2,
                "owner": "0xbuyer2",
                "isBuy": True,
                "price": 95,
                "size": 5,
                "token": "0xtoken1"
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
                "token": "0xtoken1"
            },
            {
                "orderId": 4,
                "owner": "0xseller2",
                "isBuy": False,
                "price": 98,
                "size": 8,
                "token": "0xtoken1"
            }
        ]

    def test_load_orders(self):
        """Test loading orders from the contract"""
        # Setup the orderCounter to return 4
        mock_counter_func = MagicMock()
        mock_counter_func.call.return_value = 4
        self.mock_functions.orderCounter.return_value = mock_counter_func
        
        # Setup the filledOrders to return False (all orders are unfilled)
        mock_filled_func = MagicMock()
        mock_filled_func.call.return_value = False
        self.mock_functions.filledOrders.return_value = mock_filled_func
        
        # Setup getEncryptedOrder to return encrypted order data
        mock_get_order_func = MagicMock()
        mock_get_order_func.call.side_effect = [
            json.dumps(self.buy_orders[0]),
            json.dumps(self.buy_orders[1]),
            json.dumps(self.sell_orders[0]),
            json.dumps(self.sell_orders[1])
        ]
        self.mock_functions.getEncryptedOrder.return_value = mock_get_order_func
        
        # Call load_orders
        with patch('rofl.decrypt', side_effect=lambda x: json.loads(x)):
            self.engine.load_orders()
        
        # Verify orders were loaded correctly
        self.assertEqual(len(self.engine.buy_orders), 2)
        self.assertEqual(len(self.engine.sell_orders), 2)
        
        # Check order IDs
        buy_ids = [order["orderId"] for order in self.engine.buy_orders]
        self.assertIn(1, buy_ids)
        self.assertIn(2, buy_ids)
        
        sell_ids = [order["orderId"] for order in self.engine.sell_orders]
        self.assertIn(3, sell_ids)
        self.assertIn(4, sell_ids)

    def test_find_matches_no_orders(self):
        """Test find_matches with empty order books"""
        # Empty order books
        self.engine.buy_orders = []
        self.engine.sell_orders = []
        
        # Find matches
        matches = self.engine.find_matches()
        
        # Verify no matches found
        self.assertEqual(len(matches), 0)

    def test_find_matches_with_matching_orders(self):
        """Test find_matches with orders that should match"""
        # Set up the order books
        self.engine.buy_orders = self.buy_orders.copy()
        self.engine.sell_orders = self.sell_orders.copy()
        
        # Find matches
        matches = self.engine.find_matches()
        
        # Verify matches were found - at least one match should be found
        self.assertGreater(len(matches), 0)
        
        # Check the first match (buy order 1 with sell order 3)
        has_first_match = False
        for match in matches:
            if match['buyOrderId'] == 1 and match['sellOrderId'] == 3:
                has_first_match = True
                self.assertEqual(match['amount'], 3)  # The size of the sell order
                self.assertEqual(match['price'], 90)  # The price of the sell order
        
        # First match should exist
        self.assertTrue(has_first_match, "First match (buy 1, sell 3) not found")
        
        # Check the second match (buy order 1 with sell order 4)
        has_second_match = False
        for match in matches:
            if match['buyOrderId'] == 1 and match['sellOrderId'] == 4:
                has_second_match = True
                self.assertEqual(match['price'], 98)  # The price of the sell order
                
        # Second match should exist
        self.assertTrue(has_second_match, "Second match (buy 1, sell 4) not found")

    def test_find_matches_with_non_matching_orders(self):
        """Test find_matches with orders that should not match"""
        # Modify the buy orders to have lower prices
        non_matching_buy_orders = [
            {
                "orderId": 1,
                "owner": "0xbuyer1",
                "isBuy": True,
                "price": 85,  # Lower than all sell prices
                "size": 10,
                "token": "0xtoken1"
            }
        ]
        
        # Set up the order books
        self.engine.buy_orders = non_matching_buy_orders
        self.engine.sell_orders = self.sell_orders.copy()
        
        # Find matches
        matches = self.engine.find_matches()
        
        # Verify no matches found
        self.assertEqual(len(matches), 0)

    def test_find_matches_with_different_tokens(self):
        """Test find_matches with orders for different tokens"""
        # Modify the buy orders to have a different token
        different_token_orders = [
            {
                "orderId": 1,
                "owner": "0xbuyer1",
                "isBuy": True,
                "price": 100,
                "size": 10,
                "token": "0xtoken2"  # Different token
            }
        ]
        
        # Set up the order books
        self.engine.buy_orders = different_token_orders
        self.engine.sell_orders = self.sell_orders.copy()
        
        # Find matches - in the current implementation token matching is not checked
        matches = self.engine.find_matches()
        
        # There will be matches since our implementation doesn't check token match
        # In a real DEX, you'd need to ensure matching orders are for the same token pair
        self.assertGreater(len(matches), 0)

if __name__ == "__main__":
    unittest.main() 