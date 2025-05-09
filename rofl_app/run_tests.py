#!/usr/bin/env python3
# Test runner script for OceanSwap ROFL App

import os
import sys
import unittest
import pytest

print("Running OceanSwap ROFL App tests...")

# Set test environment variables
os.environ['MOCK_INSIDE_ROFL'] = 'true'
os.environ['OCEANSWAP_ADDRESS'] = '0xTestContract'
os.environ['WEB3_PROVIDER'] = 'https://test.provider'
os.environ['PRIVATE_KEY'] = '0xTestKey'

# Create abi directory if it doesn't exist
os.makedirs('abi', exist_ok=True)

# Create dummy ABI files if they don't exist
if not os.path.exists('abi/OceanSwap.json'):
    with open('abi/OceanSwap.json', 'w') as f:
        f.write('[]')

if not os.path.exists('abi/PrivateERC20.json'):
    with open('abi/PrivateERC20.json', 'w') as f:
        f.write('[]')

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