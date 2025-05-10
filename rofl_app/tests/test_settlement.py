#!/usr/bin/env python3
# Tests for the SettlementEngine class in settlement.py

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock, mock_open

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl
from settlement import SettlementEngine

class TestSettlementEngine(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        # Ensure we're in ROFL mode for testing
        rofl.set_mock_inside_rofl(True)
        
        # Create a mock Web3 instance
        self.mock_web3 = MagicMock()
        self.mock_contract = MagicMock()
        self.mock_functions = MagicMock()
        self.mock_account = MagicMock()
        self.mock_eth = MagicMock()
        
        # Set up the mock chain
        self.mock_web3.eth = self.mock_eth
        self.mock_eth.account = MagicMock()
        self.mock_eth.account.from_key = MagicMock(return_value=self.mock_account)
        self.mock_account.address = "0xTestAccount"
        
        # Setup the contract mock
        self.mock_web3.eth.contract.return_value = self.mock_contract
        self.mock_contract.functions = self.mock_functions
        
        # Patch Web3 to return our mock
        with patch('web3.Web3', return_value=self.mock_web3):
            # Create the settlement engine with our mocked Web3
            self.engine = SettlementEngine(
                "0xContract",
                "mock_provider",
                "0xPrivateKey"
            )
            
            # Replace the web3 and contract instance with our mocks
            self.engine.web3 = self.mock_web3
            self.engine.ROFLSwap = self.mock_contract
            self.engine.account = "0xTestAccount"
        
        # Sample match data
        self.sample_match = {
            "buyOrderId": 1,
            "sellOrderId": 2,
            "buyerAddress": "0xbuyer1",
            "sellerAddress": "0xseller1",
            "amount": 5,
            "price": 100,
            "buyToken": "0xtokenA",
            "sellToken": "0xtokenB"
        }

    def test_execute_matches_success(self):
        """Test executing matches successfully"""
        # Mock transaction builder
        mock_tx_builder = MagicMock()
        self.mock_functions.executeMatch.return_value = mock_tx_builder
        
        # Set up transaction execution
        mock_tx = {"from": "0xTestAccount", "nonce": 0, "gas": 500000, "gasPrice": 1000000000}
        mock_tx_builder.build_transaction.return_value = mock_tx
        
        # Mock transaction count and gas price
        self.mock_eth.get_transaction_count = MagicMock(return_value=0)
        self.mock_eth.gas_price = 1000000000
        
        # Mock signing
        mock_signed_tx = MagicMock()
        mock_signed_tx.rawTransaction = b'0x123456'
        self.mock_eth.account.sign_transaction = MagicMock(return_value=mock_signed_tx)
        
        # Mock transaction hash and receipt
        mock_tx_hash = b'0xabcdef'
        self.mock_eth.send_raw_transaction = MagicMock(return_value=mock_tx_hash)
        mock_receipt = MagicMock()
        mock_receipt.status = 1  # Success
        self.mock_eth.wait_for_transaction_receipt = MagicMock(return_value=mock_receipt)
        
        # Execute the match
        results = self.engine.execute_matches([self.sample_match])
        
        # Verify results
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["success"])
        self.assertEqual(results[0]["match"], self.sample_match)
        
        # Verify the contract function was called with the right parameters
        self.mock_functions.executeMatch.assert_called_once_with(
            self.sample_match["buyOrderId"],
            self.sample_match["sellOrderId"],
            self.sample_match["buyerAddress"],
            self.sample_match["sellerAddress"],
            self.sample_match["amount"],
            self.sample_match["price"],
            self.sample_match["buyToken"],
            self.sample_match["sellToken"]
        )

    def test_execute_matches_failure(self):
        """Test executing matches with a failure"""
        # Mock transaction builder
        mock_tx_builder = MagicMock()
        self.mock_functions.executeMatch.return_value = mock_tx_builder
        
        # Set up transaction execution
        mock_tx = {"from": "0xTestAccount", "nonce": 0, "gas": 500000, "gasPrice": 1000000000}
        mock_tx_builder.build_transaction.return_value = mock_tx
        
        # Mock transaction count and gas price
        self.mock_eth.get_transaction_count = MagicMock(return_value=0)
        self.mock_eth.gas_price = 1000000000
        
        # Mock signing
        mock_signed_tx = MagicMock()
        mock_signed_tx.rawTransaction = b'0x123456'
        self.mock_eth.account.sign_transaction = MagicMock(return_value=mock_signed_tx)
        
        # Simulate a transaction failure
        mock_tx_hash = b'0xabcdef'
        self.mock_eth.send_raw_transaction = MagicMock(return_value=mock_tx_hash)
        mock_receipt = MagicMock()
        mock_receipt.status = 0  # Failure
        self.mock_eth.wait_for_transaction_receipt = MagicMock(return_value=mock_receipt)
        
        # Execute the match
        results = self.engine.execute_matches([self.sample_match])
        
        # Verify results indicate failure
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["success"])
        self.assertEqual(results[0]["match"], self.sample_match)

    def test_execute_matches_exception(self):
        """Test executing matches with an exception"""
        # Setup to raise an exception
        self.mock_functions.executeMatch.side_effect = Exception("Test error")
        
        # Execute the match
        results = self.engine.execute_matches([self.sample_match])
        
        # Verify results indicate failure with error message
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["success"])
        self.assertEqual(results[0]["error"], "Test error")
        self.assertEqual(results[0]["match"], self.sample_match)

    def test_execute_multiple_matches(self):
        """Test executing multiple matches"""
        # Create a second match
        sample_match2 = self.sample_match.copy()
        sample_match2["buyOrderId"] = 3
        sample_match2["sellOrderId"] = 4
        
        # Mock transaction builder
        mock_tx_builder = MagicMock()
        self.mock_functions.executeMatch.return_value = mock_tx_builder
        
        # Set up transaction execution
        mock_tx = {"from": "0xTestAccount", "nonce": 0, "gas": 500000, "gasPrice": 1000000000}
        mock_tx_builder.build_transaction.return_value = mock_tx
        
        # Mock transaction count and gas price
        self.mock_eth.get_transaction_count = MagicMock(return_value=0)
        self.mock_eth.gas_price = 1000000000
        
        # Mock signing
        mock_signed_tx = MagicMock()
        mock_signed_tx.rawTransaction = b'0x123456'
        self.mock_eth.account.sign_transaction = MagicMock(return_value=mock_signed_tx)
        
        # Mock transaction hash and receipt
        mock_tx_hash = b'0xabcdef'
        self.mock_eth.send_raw_transaction = MagicMock(return_value=mock_tx_hash)
        mock_receipt = MagicMock()
        mock_receipt.status = 1  # Success
        self.mock_eth.wait_for_transaction_receipt = MagicMock(return_value=mock_receipt)
        
        # Execute both matches
        results = self.engine.execute_matches([self.sample_match, sample_match2])
        
        # Verify results
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0]["success"])
        self.assertTrue(results[1]["success"])
        
        # Verify executeMatch was called twice
        self.assertEqual(self.mock_functions.executeMatch.call_count, 2)

if __name__ == "__main__":
    unittest.main() 