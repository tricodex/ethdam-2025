# Correct Setup for ROFLSwapV5 Integration

This document outlines the correct setup for the ROFL app to properly authenticate with the Sapphire contract.

## Key Authentication Issues Fixed

1. **ROFL App ID Format**
   - The correct ROFL App ID is: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
   - Previous code included a "continue" suffix that wasn't in the actual deployment

2. **Sapphire ROFL Authentication Mechanism**
   - The authentication header `X-ROFL-App-Id` is now properly documented
   - This header informs the Sapphire RPC that requests should be authenticated with the ROFL app that has the specified ID

3. **Order Deserialization**
   - Improved with multiple fallback mechanisms to handle different encoding formats
   - Now uses direct ABI decoding if the `OrderSerialization` utility fails

## Setup Instructions

1. **Update Environment Variables**
   We've created a script to update the environment variables correctly:

   ```bash
   # Make the script executable
   chmod +x update_environment.sh
   
   # Run the script
   ./update_environment.sh
   ```

2. **Check ROFL App Registration**
   Verify that the ROFL app is properly registered with the correct ID:

   ```bash
   oasis rofl show
   ```

   The output should show:
   - App ID: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
   - One or more instances running

3. **Verify Contract Integration**
   Ensure the smart contract is using the same ROFL app ID:

   ```bash
   # Check deployment information
   cat ../contracts/roflswap-v5-deployment-sapphire-testnet.json
   ```

   The output should show:
   - `"roflAppId": "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972"`
   - `"roflSwapV5": "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB"`

## Running the ROFL App

Start the ROFL app with the correct environment variables:

```bash
# Source the environment variables
source ./update_environment.sh

# Run the app
python main.py
```

## Troubleshooting

If you encounter authentication issues:

1. **Check Contract Permissions**
   The contract may need to request privacy access for the token contracts:

   ```bash
   # Run from the contracts directory
   bun hardhat request-privacy:v5 --contract 0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB --network sapphire-testnet
   ```

2. **Check ROFL App Status**
   If the app isn't running or has issues:

   ```bash
   # Check app status
   oasis rofl show
   
   # Check machine status
   oasis rofl machine show
   
   # Restart if needed
   oasis rofl machine restart
   ```

3. **Update the App with New Secrets**
   If you need to update the app with the correct secrets:

   ```bash
   # Set the ROFLSWAP_ADDRESS secret
   echo -n "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB" | oasis rofl secret set ROFLSWAP_ADDRESS -
   
   # Set the ROFL_APP_ID secret
   echo -n "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972" | oasis rofl secret set ROFL_APP_ID -
   
   # Set the WEB3_PROVIDER secret
   echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
   
   # Update the app configuration
   oasis rofl update --account myaccount
   
   # Restart the machine
   oasis rofl machine restart
   ```

## How the Authentication Works

The ROFL app authentication works as follows:

1. The ROFL app sets an `X-ROFL-App-Id` header in its requests to the Sapphire RPC
2. The Sapphire RPC verifies that the request is coming from a properly attested ROFL app instance
3. When the app calls contract functions that use `Subcall.roflEnsureAuthorizedOrigin()`, the contract checks that the transaction was signed by the ROFL app with the correct ID

This authentication is what allows the ROFL app to call the restricted functions in the contract, such as `getEncryptedOrder()` and `executeMatch()`.
