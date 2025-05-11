# ROFLSwap Matcher Fix

This document explains how to fix the issue with the ROFLSwap Matcher not properly matching orders on the Oasis Sapphire network.

## The Issue

The ROFLSwap Matcher was unable to authenticate with the ROFLSwapOracle contract because of a mismatch between the ROFL App ID in the smart contract and the deployed ROFL app:

1. The contract has a `bytes21` type parameter for the `roflAppID` that contains only a substring of the full ROFL App ID.
2. The ROFL app is configured with the full ID (including the `rofl1` prefix): `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`.
3. When the matcher tries to authenticate, the authentication fails because the App IDs don't match.

## The Solution

Since the ID is already hardcoded in the deployed smart contract, we need to modify the ROFL app configuration to match the contract's expected App ID format. The main changes are:

1. Extract just the part of the App ID that matches what's in the contract (without the "rofl1" prefix).
2. Update the `rofl.yaml` file with the truncated App ID.
3. Restart the ROFL app to apply the changes.

## How to Apply the Fix

### 1. Check Current Configuration

First, run the `check_contract_app_id.py` script to see the current configuration:

```bash
cd rofl_app
bun python check_contract_app_id.py
```

This will show you the oracle address and ROFL App ID in the contract, and compare it with your current configuration.

### 2. Update the rofl.yaml

Run the `update-rofl-yaml.py` script to update the App ID in the ROFL app configuration:

```bash
cd rofl_app
bun python update-rofl-yaml.py
```

This script will:
- Create a backup of your current rofl.yaml
- Update the App ID to match the contract's expected format
- Print the next steps

### 3. Apply Changes to the ROFL App

After updating the configuration, you need to update and restart the ROFL app:

```bash
oasis rofl update
oasis rofl machine restart
```

Wait a few minutes for the changes to take effect.

### 4. Fix Oracle Address (if needed)

If the oracle address in the contract doesn't match the TEE account, you can use the `fix_tee_oracle.py` script:

```bash
cd rofl_app
bun python fix_tee_oracle.py
```

This script will:
- Check if the oracle address in the contract matches the TEE account
- If not, attempt to update the oracle address

### 5. Verify the Fix

Place new test orders using the hardhat scripts and check if they are properly matched:

```bash
cd ../contracts
bun hardhat run scripts/place-test-orders.js
```

## Technical Details

### App ID Format

- Full App ID Format: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
- Contract expects: Only the 21 bytes after "rofl1" (`qzd2jxyr5lujtkdnkpf9x`)
- For proper authentication, we need to ensure these match exactly

### Authentication Process

1. The ROFL app in the TEE authenticates with the contract using the App ID.
2. The contract has a modifier `onlyTEE(bytes21 appId)` that verifies the caller's App ID.
3. If the IDs don't match, the authentication fails and the matcher can't process orders.

## Troubleshooting

If you're still having issues after applying the fix:

1. Check the logs for any errors:
   ```bash
   oasis rofl logs
   ```

2. Verify the Oracle address is correctly set:
   ```bash
   bun python check_contract_app_id.py
   ```

3. Make sure your private key has enough funds for transactions.

4. Ensure the contract has the correct permissions set. 