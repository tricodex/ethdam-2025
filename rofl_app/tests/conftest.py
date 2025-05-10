#!/usr/bin/env python3
# Common test fixtures for pytest

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl

@pytest.fixture(autouse=True)
def setup_rofl_environment():
    """Set up ROFL environment for all tests (automatically used)"""
    # Ensure ROFL mode is enabled for testing
    rofl.set_mock_inside_rofl(True)
    yield
    # Reset after test
    rofl.set_mock_inside_rofl(True)

@pytest.fixture
def sample_order():
    """Sample order data for testing"""
    return {
        "orderId": 1,
        "owner": "0xuser1",
        "isBuy": True,
        "price": 100,
        "size": 10,
        "token": "0xtoken1"
    }

@pytest.fixture
def sample_match():
    """Sample match data for testing"""
    return {
        "buyOrderId": 1,
        "sellOrderId": 2,
        "buyerAddress": "0xbuyer1",
        "sellerAddress": "0xseller1",
        "amount": 5,
        "price": 100,
        "buyToken": "0xtokenA",
        "sellToken": "0xtokenB",
        "success": True,
        "txHash": "0xhash1"
    }

@pytest.fixture
def mock_web3():
    """Mock Web3 instance for testing"""
    with patch('web3.Web3') as mock:
        mock_instance = MagicMock()
        mock_eth = MagicMock()
        mock_accounts = MagicMock()
        
        # Create a realistic mock structure
        mock_instance.eth = mock_eth
        mock_eth.account = mock_accounts
        mock_eth.get_transaction_count = MagicMock(return_value=0)
        mock_eth.gas_price = 1000000000
        
        mock.return_value = mock_instance
        yield mock

@pytest.fixture
def env_vars():
    """Set up environment variables for testing"""
    original_env = os.environ.copy()
    os.environ.update({
        'ROFLSwap_ADDRESS': '0xTestContract',
        'WEB3_PROVIDER': 'https://test.provider',
        'PRIVATE_KEY': '0xTestKey',
        'MOCK_INSIDE_ROFL': 'true'
    })
    yield
    # Restore original environment
    os.environ.clear()
    os.environ.update(original_env) 