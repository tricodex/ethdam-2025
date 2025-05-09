#!/usr/bin/env python3
# Tests for the main.py application entry point

import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl

class TestMainModule(unittest.TestCase):
    @patch('rofl.ensure_inside_rofl')
    @patch('matching_engine.MatchingEngine')
    @patch('settlement.SettlementEngine')
    @patch('storage.OrderStorage')
    @patch('rofl.register_periodic_task')
    def test_main_initialization(self, mock_register_task, mock_storage, 
                                mock_settlement, mock_matching, mock_ensure_rofl):
        """Test initialization of the main module"""
        # Set environment variables
        with patch.dict(os.environ, {
            'OCEANSWAP_ADDRESS': '0xTestContract',
            'WEB3_PROVIDER': 'https://test.provider',
            'PRIVATE_KEY': '0xTestKey'
        }):
            # Mock components
            mock_matching_instance = MagicMock()
            mock_settlement_instance = MagicMock()
            mock_storage_instance = MagicMock()
            
            mock_matching.return_value = mock_matching_instance
            mock_settlement.return_value = mock_settlement_instance
            mock_storage.return_value = mock_storage_instance
            
            # Import main module (this will execute the code)
            # We import inside the test to ensure environment variables are set
            import main
            
            # Verify that ensure_inside_rofl was called
            mock_ensure_rofl.assert_called_once()
            
            # Verify components were initialized
            mock_matching.assert_called_once_with('0xTestContract', 'https://test.provider')
            mock_settlement.assert_called_once_with('0xTestContract', 'https://test.provider', '0xTestKey')
            mock_storage.assert_called_once()
            
            # Verify periodic task was registered
            mock_register_task.assert_called_once()
            
            # Verify the main match_and_settle function was called once on startup
            mock_matching_instance.load_orders.assert_called_once()
            mock_matching_instance.find_matches.assert_called_once()

    @patch('rofl.ensure_inside_rofl')
    def test_main_missing_environment_variables(self, mock_ensure_rofl):
        """Test main module with missing environment variables"""
        # Import sys and reload main module to ensure it's fresh
        import sys
        
        # Clear required environment variables
        with patch.dict(os.environ, {
            'OCEANSWAP_ADDRESS': '',
            'PRIVATE_KEY': ''
        }, clear=True):
            # Check that main module raises ValueError on import
            with self.assertRaises(ValueError):
                if 'main' in sys.modules:
                    del sys.modules['main']
                import main

    @patch('rofl.ensure_inside_rofl')
    @patch('matching_engine.MatchingEngine')
    @patch('settlement.SettlementEngine')
    @patch('storage.OrderStorage')
    @patch('rofl.register_periodic_task')
    def test_match_and_settle_success(self, mock_register_task, mock_storage, 
                                    mock_settlement, mock_matching, mock_ensure_rofl):
        """Test match_and_settle function with successful matches"""
        # Set environment variables
        with patch.dict(os.environ, {
            'OCEANSWAP_ADDRESS': '0xTestContract',
            'WEB3_PROVIDER': 'https://test.provider',
            'PRIVATE_KEY': '0xTestKey'
        }):
            # Mock component instances
            mock_matching_instance = MagicMock()
            mock_settlement_instance = MagicMock()
            mock_storage_instance = MagicMock()
            
            # Set up mock returns
            sample_matches = [
                {
                    "buyOrderId": 1,
                    "sellOrderId": 2,
                    "buyerAddress": "0xbuyer1",
                    "sellerAddress": "0xseller1",
                    "amount": 5,
                    "price": 100,
                    "buyToken": "0xtokenA",
                    "sellToken": "0xtokenB"
                }
            ]
            
            sample_results = [
                {
                    "success": True,
                    "txHash": "0xhash1",
                    "match": sample_matches[0]
                }
            ]
            
            mock_matching_instance.find_matches.return_value = sample_matches
            mock_settlement_instance.execute_matches.return_value = sample_results
            
            mock_matching.return_value = mock_matching_instance
            mock_settlement.return_value = mock_settlement_instance
            mock_storage.return_value = mock_storage_instance
            
            # Import main module
            if 'main' in sys.modules:
                del sys.modules['main']
            import main
            
            # Call match_and_settle directly to test it
            main.match_and_settle()
            
            # Verify that matches were found and executed
            mock_matching_instance.load_orders.assert_called()
            mock_matching_instance.find_matches.assert_called()
            mock_settlement_instance.execute_matches.assert_called_once_with(sample_matches)
            mock_storage_instance.save_matches.assert_called_once_with(sample_results)

    @patch('rofl.ensure_inside_rofl')
    @patch('matching_engine.MatchingEngine')
    @patch('settlement.SettlementEngine')
    @patch('storage.OrderStorage')
    @patch('rofl.register_periodic_task')
    def test_match_and_settle_no_matches(self, mock_register_task, mock_storage, 
                                       mock_settlement, mock_matching, mock_ensure_rofl):
        """Test match_and_settle function with no matches found"""
        # Set environment variables
        with patch.dict(os.environ, {
            'OCEANSWAP_ADDRESS': '0xTestContract',
            'WEB3_PROVIDER': 'https://test.provider',
            'PRIVATE_KEY': '0xTestKey'
        }):
            # Mock component instances
            mock_matching_instance = MagicMock()
            mock_settlement_instance = MagicMock()
            mock_storage_instance = MagicMock()
            
            # Set up mock to return no matches
            mock_matching_instance.find_matches.return_value = []
            
            mock_matching.return_value = mock_matching_instance
            mock_settlement.return_value = mock_settlement_instance
            mock_storage.return_value = mock_storage_instance
            
            # Import main module
            if 'main' in sys.modules:
                del sys.modules['main']
            import main
            
            # Call match_and_settle directly to test it
            main.match_and_settle()
            
            # Verify that no matches were executed
            mock_matching_instance.load_orders.assert_called()
            mock_matching_instance.find_matches.assert_called()
            mock_settlement_instance.execute_matches.assert_not_called()
            mock_storage_instance.save_matches.assert_not_called()

    @patch('rofl.ensure_inside_rofl')
    @patch('matching_engine.MatchingEngine')
    @patch('settlement.SettlementEngine')
    @patch('storage.OrderStorage')
    @patch('rofl.register_periodic_task')
    def test_match_and_settle_exception(self, mock_register_task, mock_storage, 
                                      mock_settlement, mock_matching, mock_ensure_rofl):
        """Test match_and_settle function with an exception"""
        # Set environment variables
        with patch.dict(os.environ, {
            'OCEANSWAP_ADDRESS': '0xTestContract',
            'WEB3_PROVIDER': 'https://test.provider',
            'PRIVATE_KEY': '0xTestKey'
        }):
            # Mock component instances
            mock_matching_instance = MagicMock()
            mock_settlement_instance = MagicMock()
            mock_storage_instance = MagicMock()
            
            # Set up mock to raise an exception
            mock_matching_instance.load_orders.side_effect = Exception("Test error")
            
            mock_matching.return_value = mock_matching_instance
            mock_settlement.return_value = mock_settlement_instance
            mock_storage.return_value = mock_storage_instance
            
            # Import main module
            if 'main' in sys.modules:
                del sys.modules['main']
            import main
            
            # Call match_and_settle directly to test it - should not raise exception
            main.match_and_settle()
            
            # Verify that the error was caught and no further processing happened
            mock_matching_instance.load_orders.assert_called()
            mock_matching_instance.find_matches.assert_not_called()
            mock_settlement_instance.execute_matches.assert_not_called()
            mock_storage_instance.save_matches.assert_not_called()

if __name__ == "__main__":
    unittest.main() 