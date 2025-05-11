# ROFLSwap Matcher Production Fix

## Problem

The ROFLSwap Matcher running in the TEE environment was unable to authenticate with the ROFLSwapOracle contract. This issue was caused by a mismatch between:

1. The format of the ROFL App ID in the smart contract (a truncated `bytes21` value)
2. The full-length ROFL App ID used in the ROFL TEE environment

Specifically:
- The ROFLSwapOracle contract has a `bytes21` type for `roflAppID` containing only: `qzd2jxyr5lujtkdnkpf9x`
- The ROFL app uses the full ID with the `rofl1` prefix: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`

## Solution

Our solution modifies the ROFL authentication code to automatically truncate the App ID when communicating with the ROFLSwapOracle contract, while maintaining the full App ID in the ROFL yaml configuration for CLI compatibility.

### Changes Made

1. Modified `rofl_auth.py` to:
   - Add ID truncation at the global level
   - Store both the original and truncated IDs
   - Use the truncated ID when authenticating with the contract
   - Add debug logging

2. Reverted `rofl.yaml` to use the full, correct App ID for ROFL CLI compatibility

3. Created shell scripts to:
   - Verify the contract configuration
   - Apply the fix
   - Test the fix with order matching

## How to Apply the Fix

### Prerequisites

- Access to the ROFL app's deployment environment
- Admin permissions for the ROFL app
- Python 3.6+ with the required dependencies

### Step 1: Verify Contract Configuration

```bash
python check_contract_app_id.py --contract YOUR_ROFLSWAP_ORACLE_CONTRACT_ADDRESS
```

This will show the current App ID in the ROFLSwapOracle contract and compare it with the ROFL yaml configuration.

### Step 2: Modify Authentication Code

1. Edit the `rofl_auth.py` file as follows:

```python
# At the top of the file after imports
# Get ROFL App ID from environment with truncation
ROFL_APP_ID = os.environ.get("ROFL_APP_ID", "")
logger.info(f"Original ROFL App ID: {ROFL_APP_ID}")

# Truncate if needed to match contract's bytes21 format
if ROFL_APP_ID and ROFL_APP_ID.startswith("rofl1") and len(ROFL_APP_ID) > 26:
    # Keep only first 26 chars (rofl1 + 21 bytes)
    TRUNCATED_APP_ID = ROFL_APP_ID[:26]
    logger.info(f"Using truncated ROFL App ID for contract auth: {TRUNCATED_APP_ID}")
else:
    TRUNCATED_APP_ID = ROFL_APP_ID
    logger.info(f"ROFL App ID unchanged: {TRUNCATED_APP_ID}")
```

2. In the `RoflUtility.__init__` method, add:

```python
# Save original and truncated App IDs
self.original_app_id = ROFL_APP_ID
self.truncated_app_id = TRUNCATED_APP_ID

logger.info(f"Contract address: {self.contract_address}")
logger.info(f"TEE mode: {self.is_tee}")
logger.info(f"Using truncated App ID for contract auth: {self.truncated_app_id}")
```

3. Add debug logging to `submit_transaction` and `_appd_post` methods to track App ID usage

### Step 3: Update and Restart the ROFL App

```bash
# Update the ROFL app with the modified code
oasis rofl update

# Restart the ROFL machine to apply changes
oasis rofl machine restart
```

### Step 4: Test Order Matching

1. Place test orders using the Oracle contract script:

```bash
cd ../contracts
bun hardhat run scripts/place-oracle-order.js --network sapphire-testnet
```

2. Wait a few minutes for the matcher to process the orders

3. Check if the orders were matched:

```bash
bun hardhat run scripts/check-oracle-matches.js --network sapphire-testnet
```

4. If needed, verify the Oracle status:

```bash
bun hardhat run scripts/check-oracle-status.js --network sapphire-testnet
```

## Automated Fix Script

For convenience, we've provided the `update_and_test_matcher.sh` script that:
1. Verifies ROFLSwapOracle contract configuration
2. Updates the ROFL app
3. Restarts the ROFL machine
4. Guides through testing order matching

To use it:

```bash
chmod +x update_and_test_matcher.sh
./update_and_test_matcher.sh
```

## Verification

After applying the fix, you should see:
1. The ROFL app status showing the full App ID
2. Debug logs showing truncation being applied when communicating with the contract
3. Successful order matching between buy and sell orders in the ROFLSwapOracle contract

## Notes

- This fix allows the ROFL app to work with the existing deployed ROFLSwapOracle contract without needing to redeploy
- The truncation happens in-memory, preserving the full ID in the configuration
- The ROFL CLI tools continue to work as expected with the full App ID 