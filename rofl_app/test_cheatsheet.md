# ROFLSwap Testing Cheatsheet

This document provides quick reference commands for testing the ROFLSwap application.

## Test Requirements

Make sure you have the required Python packages installed:

```bash
pip install -r requirements.txt
```

## Running Individual Core Tests

### Core Order Matching Test
This test verifies the basic order matching flow with proper mocking:

```bash
python -m pytest test_order_matching.py -v
```

### Running the Complete Test Suite
Run all tests in the project:

```bash
python -m pytest -v
```

### Running Specific Test Files

```bash
# Integration test for order matching
python -m pytest tests/test_order_matching_integration.py -v

# Matching engine tests
python -m pytest tests/test_matching_engine.py -v

# Settlement tests
python -m pytest tests/test_settlement.py -v

# Storage tests
python -m pytest tests/test_storage.py -v

# ROFL framework tests
python -m pytest tests/test_rofl.py -v
```

## Direct Script Execution

You can also run the test script directly:

```bash
python run_order_matching_test.py
```

## Testing in Different Environments

### Setting Required Environment Variables

For a local test run, you'll need to set these environment variables:

```bash
# Required
export ROFLSWAP_ADDRESS="0xYourContractAddress"
export PRIVATE_KEY="0xYourPrivateKey"

# Optional - defaults to https://testnet.sapphire.oasis.io
export WEB3_PROVIDER="https://your-provider-url"
```

### Manually Testing ROFL Environment Integration

To test if the ROFL environment checks are working:

```python
from rofl import ensure_inside_rofl, set_mock_inside_rofl

# Enable ROFL mocking for tests
set_mock_inside_rofl(True)

# This should pass when mocked
ensure_inside_rofl()

# Disable mocking to test failure case
set_mock_inside_rofl(False)

# This should raise an EnvironmentError
try:
    ensure_inside_rofl()
except EnvironmentError:
    print("Successfully detected not running in ROFL")
```

## Fix Common Test Issues

### Fix Missing `delete` Method in MockSecureStorage

Add this to your conftest.py:

```python
class MockSecureStorage:
    # ... existing code ...
    
    def delete(self, key):
        """Delete a key-value pair from the secure storage"""
        if key in self.storage:
            del self.storage[key]
```

### Fix Environment Variable Issues in Tests

```python
@pytest.fixture(autouse=True)
def set_env_vars(monkeypatch):
    """Set required environment variables for tests"""
    monkeypatch.setenv('ROFLSWAP_ADDRESS', '0xTestContractAddress')
    monkeypatch.setenv('PRIVATE_KEY', '0xTestPrivateKey')
    monkeypatch.setenv('WEB3_PROVIDER', 'https://test-provider')
```

## Test Debugging Tips

1. Use `-v` for verbose output to see which tests are running
2. Use `--pdb` to drop into debugger on test failures
3. Use `pytest.mark.skip` to skip problematic tests temporarily
4. Examine the standard output with `-s` flag to see print statements from the tests

```bash
python -m pytest test_order_matching.py -v -s
```

## Notes for TEE Deployment Testing

- Actual TEE deployment requires proper ROFL app registration
- Use the Oasis CLI to build, deploy and monitor the ROFL app
- Use `oasis rofl show` to check ROFL app status
- Double check all secrets are properly set using `oasis rofl secret set` 