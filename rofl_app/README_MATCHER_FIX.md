# ROFLSwap Matcher Fix

## Summary

This fix resolves the issue with the ROFLSwap Matcher not properly matching orders on the Oasis Sapphire network. The problem was caused by a mismatch between the ROFL App ID format in the smart contract and the ROFL app configuration.

## The Issue

The ROFLSwap Matcher was unable to authenticate with the ROFLSwapOracle contract because:

1. The contract used a `bytes21` type parameter for the `roflAppID` (only 21 bytes) that contained only a part of the full ROFL App ID.
2. The actual ROFL app was configured with the full ID (including the `rofl1` prefix): `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`.
3. Because the TEE was trying to authenticate with the full ID while the contract expected only 21 bytes, the authentication failed.

## The Fix

We've created several scripts to diagnose and fix this issue:

- `check_contract_app_id.py`: Examines the current contract configuration and compares it with the rofl.yaml settings
- `update-rofl-yaml.py`: Updates the rofl.yaml file to use the truncated App ID that matches the contract's expectations
- `fix_tee_oracle.py`: Can be run inside the TEE to update the oracle address if needed
- `fix_matcher.sh`: Main script that executes all the necessary steps in sequence

The solution modifies the ROFL app configuration to match what the contract expects, rather than trying to update the contract (which would require admin permissions).

## Verification

We've verified that:

1. The contract's roflAppID is set to: `qzd2jxyr5lujtkdnkpf9x` (21 bytes).
2. The contract's oracle address is: `0xF449C755DEc0FA9c655869A3D8D89fb2cCC399e6`.
3. Our ROFL app now uses the correctly formatted App ID: `rofl1qzd2jxyr5lujtkdnkpf9x`.

## How to Apply the Fix

### Step 1: Run the fix script

```bash
cd rofl_app
./fix_matcher.sh 0x1bc94B51C5040E7A64FE5F42F51C328d7398969e
```

Replace the contract address with your actual ROFLSwapOracle contract address if different.

### Step 2: Update and restart the ROFL app

After the script completes successfully:

```bash
oasis rofl update
oasis rofl machine restart
```

Wait a few minutes for the changes to take effect.

### Step 3: Test with new orders

Place new test orders to verify the matcher is working correctly:

```bash
cd ../contracts
bun hardhat run scripts/place-test-orders.js
```

## Troubleshooting

### Check ROFL logs

If you encounter issues, check the ROFL app logs:

```bash
oasis rofl logs
```

### Verify Oracle Address

If orders are still not being matched, verify the oracle address:

```bash
cd rofl_app
python check_contract_app_id.py --contract <contract_address>
```

If the oracle address doesn't match the TEE account, you'll need to run `fix_tee_oracle.py` inside the ROFL container.

### Update Oracle Address in TEE

To update the oracle address, you must run the fix_tee_oracle.py script from inside the TEE:

```bash
# Connect to the ROFL container
oasis rofl ssh
# Inside the container
python fix_tee_oracle.py
```

## Technical Details

### App ID Format

- Original full App ID: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
- Contract expected format: `qzd2jxyr5lujtkdnkpf9x` (21 bytes without "rofl1" prefix)
- New App ID for rofl.yaml: `rofl1qzd2jxyr5lujtkdnkpf9x`

### Authentication Process

1. The ROFL app in the TEE uses a special Subcall to authenticate with the contract.
2. This authentication includes the App ID in the format expected by the contract.
3. The contract has an `onlyTEE(bytes21 appId)` modifier that verifies the caller using `Subcall.roflEnsureAuthorizedOrigin(appId)`.
4. When the IDs match, the TEE can call privileged functions like `setOracle()` and process orders.

## Future Considerations

For future deployments, ensure that:

1. The contract's `roflAppID` parameter is correctly formatted and matches what the ROFL app expects. 
2. The oracle address is set to the account that will be used inside the TEE.
3. All environment variables and secrets are correctly set in rofl.yaml.

## Contributors

This fix was developed by the ROFLSwap team at ETHDam hackathon. 