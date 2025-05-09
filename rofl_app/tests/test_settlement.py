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
        
        # Create a mock ABI file
        self.mock_abi = [{"name": "executeMatch", "inputs": [], "outputs": []}]
        
        # Create the settlement engine with mocked Web3 provider
        with patch('builtins.open', mock_open(read_data=json.dumps(self.mock_abi))):
            self.engine = SettlementEngine(
                "0xContract",
                "mock_provider",
                "0xPrivateKey"
            )
        
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

    @patch('web3.Web3')
    def test_execute_matches_success(self, mock_web3):
        """Test executing matches successfully"""
        # Mock the transaction methods
        mock_contract = MagicMock()
        mock_functions = MagicMock()
        mock_tx_builder = MagicMock()
        mock_account = MagicMock()
        mock_eth = MagicMock()
        
        # Setup the call chain
        mock_web3.return_value.eth = mock_eth
        mock_eth.account = mock_account
        mock_account.from_key.return_value.address = "0xTestAccount"
        mock_contract.functions = mock_functions
        mock_functions.executeMatch.return_value = mock_tx_builder
        
        # Set up transaction execution
        mock_tx = {"from": "0xTestAccount", "nonce": 0, "gas": 500000, "gasPrice": 1000000000}
        mock_tx_builder.build_transaction.return_value = mock_tx
        
        # Mock signing
        mock_signed_tx = MagicMock()
        mock_signed_tx.rawTransaction = b'0x123456'
        mock_account.sign_transaction.return_value = mock_signed_tx
        
        # Mock transaction hash and receipt
        mock_tx_hash = b'0xabcdef'
        mock_eth.send_raw_transaction.return_value = mock_tx_hash
        mock_receipt = MagicMock()
        mock_receipt.status = 1  # Success
        mock_eth.wait_for_transaction_receipt.return_value = mock_receipt
        
        # Replace the engine's contract and methods with our mocks
        self.engine.oceanswap = mock_contract
        self.engine.web3 = mock_web3.return_value
        
        # Execute the match
        results = self.engine.execute_matches([self.sample_match])
        
        # Verify results
        self.assertEqual(len(results), 1)
        self.assertTrue(results[0]["success"])
        self.assertEqual(results[0]["match"], self.sample_match)
        
        # Verify the contract function was called with the right parameters
        mock_functions.executeMatch.assert_called_once_with(
            self.sample_match["buyOrderId"],
            self.sample_match["sellOrderId"],
            self.sample_match["buyerAddress"],
            self.sample_match["sellerAddress"],
            self.sample_match["amount"],
            self.sample_match["price"],
            self.sample_match["buyToken"],
            self.sample_match["sellToken"]
        )

    @patch('web3.Web3')
    def test_execute_matches_failure(self, mock_web3):
        """Test executing matches with a failure"""
        # Mock the transaction methods
        mock_contract = MagicMock()
        mock_functions = MagicMock()
        mock_tx_builder = MagicMock()
        mock_account = MagicMock()
        mock_eth = MagicMock()
        
        # Setup the call chain
        mock_web3.return_value.eth = mock_eth
        mock_eth.account = mock_account
        mock_account.from_key.return_value.address = "0xTestAccount"
        mock_contract.functions = mock_functions
        mock_functions.executeMatch.return_value = mock_tx_builder
        
        # Set up transaction execution
        mock_tx = {"from": "0xTestAccount", "nonce": 0, "gas": 500000, "gasPrice": 1000000000}
        mock_tx_builder.build_transaction.return_value = mock_tx
        
        # Mock signing
        mock_signed_tx = MagicMock()
        mock_signed_tx.rawTransaction = b'0x123456'
        mock_account.sign_transaction.return_value = mock_signed_tx
        
        # Simulate a transaction failure
        mock_tx_hash = b'0xabcdef'
        mock_eth.send_raw_transaction.return_value = mock_tx_hash
        mock_receipt = MagicMock()
        mock_receipt.status = 0  # Failure
        mock_eth.wait_for_transaction_receipt.return_value = mock_receipt
        
        # Replace the engine's contract and methods with our mocks
        self.engine.oceanswap = mock_contract
        self.engine.web3 = mock_web3.return_value
        
        # Execute the match
        results = self.engine.execute_matches([self.sample_match])
        
        # Verify results indicate failure
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["success"])
        self.assertEqual(results[0]["match"], self.sample_match)

    @patch('web3.Web3')
    def test_execute_matches_exception(self, mock_web3):
        """Test executing matches with an exception"""
        # Mock the transaction methods
        mock_contract = MagicMock()
        mock_functions = MagicMock()
        
        # Setup to raise an exception
        mock_functions.executeMatch.side_effect = Exception("Test error")
        mock_contract.functions = mock_functions
        
        # Replace the engine's contract with our mock
        self.engine.oceanswap = mock_contract
        
        # Execute the match
        results = self.engine.execute_matches([self.sample_match])
        
        # Verify results indicate failure with error message
        self.assertEqual(len(results), 1)
        self.assertFalse(results[0]["success"])
        self.assertEqual(results[0]["error"], "Test error")
        self.assertEqual(results[0]["match"], self.sample_match)

    @patch('web3.Web3')
    def test_execute_multiple_matches(self, mock_web3):
        """Test executing multiple matches"""
        # Create a second match
        sample_match2 = self.sample_match.copy()
        sample_match2["buyOrderId"] = 3
        sample_match2["sellOrderId"] = 4
        
        # Mock the transaction methods for success
        mock_contract = MagicMock()
        mock_functions = MagicMock()
        mock_tx_builder = MagicMock()
        mock_account = MagicMock()
        mock_eth = MagicMock()
        
        # Setup the call chain
        mock_web3.return_value.eth = mock_eth
        mock_eth.account = mock_account
        mock_account.from_key.return_value.address = "0xTestAccount"
        mock_contract.functions = mock_functions
        mock_functions.executeMatch.return_value = mock_tx_builder
        
        # Set up transaction execution
        mock_tx = {"from": "0xTestAccount", "nonce": 0, "gas": 500000, "gasPrice": 1000000000}
        mock_tx_builder.build_transaction.return_value = mock_tx
        
        # Mock signing
        mock_signed_tx = MagicMock()
        mock_signed_tx.rawTransaction = b'0x123456'
        mock_account.sign_transaction.return_value = mock_signed_tx
        
        # Mock transaction hash and receipt
        mock_tx_hash = b'0xabcdef'
        mock_eth.send_raw_transaction.return_value = mock_tx_hash
        mock_receipt = MagicMock()
        mock_receipt.status = 1  # Success
        mock_eth.wait_for_transaction_receipt.return_value = mock_receipt
        
        # Replace the engine's contract and methods with our mocks
        self.engine.oceanswap = mock_contract
        self.engine.web3 = mock_web3.return_value
        
        # Execute both matches
        results = self.engine.execute_matches([self.sample_match, sample_match2])
        
        # Verify results
        self.assertEqual(len(results), 2)
        self.assertTrue(results[0]["success"])
        self.assertTrue(results[1]["success"])
        
        # Verify executeMatch was called twice
        self.assertEqual(mock_functions.executeMatch.call_count, 2)

if __name__ == "__main__":
    unittest.main() 