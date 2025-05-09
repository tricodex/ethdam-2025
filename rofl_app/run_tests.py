#!/usr/bin/env python3
# Test runner script for OceanSwap ROFL App

import os
import sys
import unittest
import pytest
import json

print("Running OceanSwap ROFL App tests...")

# Set test environment variables
os.environ['MOCK_INSIDE_ROFL'] = 'true'
os.environ['OCEANSWAP_ADDRESS'] = '0xTestContract'
os.environ['WEB3_PROVIDER'] = 'https://test.provider'
os.environ['PRIVATE_KEY'] = '0xTestKey'

# Create abi directory if it doesn't exist
os.makedirs('abi', exist_ok=True)

# Create mock ABI files with proper format for Web3
oceanswap_abi = [
    {
        "type": "function",
        "name": "orderCounter",
        "inputs": [],
        "outputs": [{"type": "uint256", "name": ""}],
        "stateMutability": "view",
        "constant": True
    },
    {
        "type": "function",
        "name": "filledOrders",
        "inputs": [{"type": "uint256", "name": "orderId"}],
        "outputs": [{"type": "bool", "name": ""}],
        "stateMutability": "view",
        "constant": True
    },
    {
        "type": "function",
        "name": "getEncryptedOrder",
        "inputs": [{"type": "uint256", "name": "orderId"}],
        "outputs": [{"type": "string", "name": ""}],
        "stateMutability": "view",
        "constant": True
    },
    {
        "type": "function",
        "name": "executeMatch",
        "inputs": [
            {"type": "uint256", "name": "buyOrderId"},
            {"type": "uint256", "name": "sellOrderId"},
            {"type": "address", "name": "buyer"},
            {"type": "address", "name": "seller"},
            {"type": "uint256", "name": "amount"},
            {"type": "uint256", "name": "price"},
            {"type": "address", "name": "buyToken"},
            {"type": "address", "name": "sellToken"}
        ],
        "outputs": [{"type": "bool", "name": ""}],
        "stateMutability": "nonpayable",
        "constant": False
    }
]

erc20_abi = [
    {
        "type": "function",
        "name": "balanceOf",
        "inputs": [{"type": "address", "name": "account"}],
        "outputs": [{"type": "uint256", "name": ""}],
        "stateMutability": "view",
        "constant": True
    },
    {
        "type": "function",
        "name": "transfer",
        "inputs": [
            {"type": "address", "name": "recipient"},
            {"type": "uint256", "name": "amount"}
        ],
        "outputs": [{"type": "bool", "name": ""}],
        "stateMutability": "nonpayable",
        "constant": False
    }
]

# Write ABIs to files
with open('abi/OceanSwap.json', 'w') as f:
    json.dump(oceanswap_abi, f, indent=2)

with open('abi/PrivateERC20.json', 'w') as f:
    json.dump(erc20_abi, f, indent=2)

# Patch the tests to use proper mocking of the Web3 contract initialization
# This will be done within the test files

# Run tests with unittest
print("\n=== Running unittest tests ===")
unittest_suite = unittest.defaultTestLoader.discover('tests', pattern='test_*.py')
unittest_runner = unittest.TextTestRunner(verbosity=2)
unittest_result = unittest_runner.run(unittest_suite)

# Run tests with pytest
print("\n=== Running pytest tests ===")
pytest_result = pytest.main(['-xvs', 'tests'])

# Determine overall success
success = unittest_result.wasSuccessful() and pytest_result == 0

if success:
    print("\n✅ All tests passed!")
    sys.exit(0)
else:
    print("\n❌ Some tests failed!")
    sys.exit(1) 