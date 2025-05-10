# ROFLSwapV4 Contract Deployment Guide

This guide explains how to deploy the new ROFLSwapV4 contract with the full ROFL app ID (no truncation).

## Background

The previous ROFLSwapV3 contract stored the ROFL app ID as a `bytes21` type, which truncated the full ROFL app ID. This caused authentication issues when the ROFL app tried to interact with the contract, resulting in errors like "RoflOriginNotAuthorizedForApp".

The new ROFLSwapV4 contract stores the ROFL app ID as a regular `bytes` type, which can accommodate the full ROFL app ID without truncation.

## Deployment Steps

### 1. Compile the Contract

```bash
bun install
npx hardhat compile
```

### 2. Deploy Using Hardhat Task

You can deploy the contract using the Hardhat task provided:

```bash
npx hardhat deploy-roflswap-v4 \
  --watertoken 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4 \
  --firetoken 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C \
  --roflappid "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3" \
  --network sapphire-testnet
```

Make sure to set your private key in the `.env` file:

```
PRIVATE_KEY=your_private_key_here
```

### 3. Verify Deployment

After deployment, a file named `roflswap-v4-deployment-sapphire-testnet.json` will be created with deployment details.

Run the test script to verify the contract works as expected:

```bash
node scripts/test-v4-contract.js
```

### 4. Update ROFL App Configuration

1. Update the ROFL app's `ROFLSWAP_ADDRESS` secret:

```bash
echo -n "0xYourNewContractAddress" | oasis rofl secret set ROFLSWAP_ADDRESS -
```

2. Update the ROFL app configuration:

```bash
oasis rofl update --account myaccount
```

### 5. Test the Integration

1. Place test orders to verify the contract works properly:

```bash
node scripts/simple-place-orders.js
```

2. Check if orders are being filled:

```bash
node scripts/simple-check-orders.js
```

## Understanding the Fix

The previous contract (ROFLSwapV3) used:
```solidity
bytes21 public roflAppId;
```

The new contract (ROFLSwapV4) uses:
```solidity
bytes public roflAppId;
```

However, the Subcall.roflEnsureAuthorizedOrigin function still requires a bytes21 parameter, so we added a helper function:

```solidity
function getRoflAppIdForAuth() internal view returns (bytes21) {
    // Extract the first 21 bytes from the full app ID
    bytes memory fullAppId = roflAppId;
    bytes21 truncatedAppId;
    
    assembly {
        // Load the first 21 bytes (168 bits) from the full app ID
        truncatedAppId := mload(add(fullAppId, 32))
    }
    
    return truncatedAppId;
}
```

This helper function extracts the first 21 bytes from the full ROFL app ID for authentication purposes, while still storing the full ID in the contract.

## Deploying from Scratch

If you want to deploy the ROFL app and contract from scratch:

1. Initialize and create a new ROFL app:
```bash
oasis rofl init
oasis rofl create
```

2. Build the ROFL app bundle:
```bash
oasis rofl build
```

3. Set your secrets:
```bash
echo -n "YOUR_PRIVATE_KEY" | oasis rofl secret set PRIVATE_KEY -
```

4. Deploy the ROFLSwapV4 contract and set its address:
```bash
# Deploy contract first
npx hardhat deploy-roflswap-v4 [parameters]

# Then set the address in ROFL app
echo -n "0xYourNewContractAddress" | oasis rofl secret set ROFLSWAP_ADDRESS -
```

5. Update and deploy the ROFL app:
```bash
oasis rofl update
oasis rofl deploy
``` 