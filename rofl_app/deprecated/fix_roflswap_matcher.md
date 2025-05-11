# ROFLSwap Matcher Troubleshooting

## Issue Summary

The ROFLSwap order matcher is failing to execute matches because of an authorization error when trying to access orders from the ROFLSwapV5 smart contract. The specific error code `0x6890282f` is related to the `roflEnsureAuthorizedOrigin` check in the Oasis Sapphire platform.

## Root Cause

After investigation, we found two main issues:

1. **Environment Variable Naming Mismatch**: The code was looking for `PRIVATE_KEY` in some places and `MATCHER_PRIVATE_KEY` in others, causing the matcher to fail.

2. **ROFL App Authentication Issue**: The critical issue is the `0x6890282f` error, which is returned when the `roflEnsureAuthorizedOrigin` check fails. This happens when:
   - The ROFL app ID registered in the smart contract doesn't match the actual app ID being used to authenticate
   - The request to the smart contract is not properly signed or authenticated with the ROFL framework

## Reproduction

We've verified the issue occurs in both environments:
- Running in the Oasis TEE (trusted execution environment)
- Running locally in a Docker container

## Solution

We've implemented the following fixes:

1. **Fixed Environment Variables**: Updated the `update_environment.sh` script to set both `PRIVATE_KEY` and `MATCHER_PRIVATE_KEY` to the same value, ensuring consistency in the codebase.

2. **Implemented Proper Authentication**: The key fix is using the direct ROFL app daemon socket interface for authentication instead of trying to use HTTP headers. This follows the Oracle pattern used in Oasis Sapphire:
   - `RoflUtility` class now directly communicates with the ROFL app daemon
   - All functions that require authentication are routed through the ROFL app daemon
   - The `ROFLSwapOracle` class uses the authenticated methods provided by `RoflUtility`

3. **Verified ROFL App ID**: We've ensured the ROFL App ID in our environment matches the one registered in the contract.

## Technical Details

### The Oracle Pattern

In Oasis Sapphire with ROFL, the oracle pattern is used:

1. The contract enforces that only authorized ROFL apps can call certain functions using `roflEnsureAuthorizedOrigin()`
2. The oracle runs inside a TEE (Trusted Execution Environment)
3. To authenticate, the oracle must talk to the ROFL app daemon directly through its socket interface
4. HTTP headers don't work for this authentication - it requires direct socket communication

### Authentication Flow

The fixed authentication flow works as follows:

1. For view functions that require ROFL authentication (like `getEncryptedOrder`):
   - We encode the function call data
   - We send it to the ROFL app daemon via `/rofl/v1/eth/call` endpoint
   - This authenticates the call as coming from the ROFL app

2. For transaction functions that require ROFL authentication (like `executeMatch`):
   - We encode the transaction data
   - We send it to the ROFL app daemon via `/rofl/v1/tx/sign-submit` endpoint
   - This authenticates the transaction as coming from the ROFL app

## How to Test the Fix

1. First, set up the environment variables:
   ```bash
   source ./update_environment.sh YOUR_PRIVATE_KEY
   ```

2. Test the authentication to verify it works:
   ```bash
   python test_contract_authentication.py
   ```

3. Run the matcher once to verify it can retrieve orders and process matches:
   ```bash
   python main.py --once
   ```

## Status

- Environment variable issue fixed ✅
- Authentication issue fixed ✅
- Order matching now working ✅

## Additional Notes

When running in a ROFL TEE environment, make sure:
1. The ROFL app daemon socket exists at `/run/rofl-appd.sock`
2. The application has permission to access this socket
3. The ROFL app ID registered in the contract matches the one used by the ROFL app daemon

If running outside a ROFL TEE environment (for testing), you can specify a custom socket path:
```bash
python main.py --socket /path/to/rofl-appd.sock --once
``` 