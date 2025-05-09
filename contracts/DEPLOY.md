# OceanSwap Contract Deployment Guide

This guide explains how to deploy the OceanSwap contracts to the Oasis Sapphire network and integrate them with your ROFL application.

## Pre-requisites

- Bun v1.2.9 or later
- Funds in your wallet on the Sapphire network (testnet or mainnet)
- Your private key for deployment

## Deployment Steps

### 1. Set up environment

Create a `.env` file in the `contracts` directory with the following content:

```
# Network configuration 
SAPPHIRE_TESTNET_RPC_URL=https://testnet.sapphire.oasis.io
SAPPHIRE_RPC_URL=https://sapphire.oasis.io

# Your deployment private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here
```

Replace `your_private_key_here` with your actual private key. Keep this file secure and never commit it to git.

### 2. Run the deployment script

You can deploy the contracts using the provided shell script:

```bash
# Make the script executable
chmod +x deploy-to-sapphire.sh

# Deploy to testnet (default)
./deploy-to-sapphire.sh 

# Or deploy to mainnet
./deploy-to-sapphire.sh sapphire
```

This will:
1. Install dependencies with bun
2. Compile all contracts
3. Deploy WaterToken and FireToken
4. Deploy OceanSwap with references to those tokens
5. Set your ROFL app ID in the OceanSwap contract
6. Save all contract addresses to a JSON file

### 3. Manual deployment

If you prefer to run the commands manually:

```bash
# Install dependencies
bun install

# Compile contracts
bun hardhat compile

# Deploy to testnet
bun hardhat run scripts/deploy-with-rofl.ts --network sapphire-testnet

# Or deploy to mainnet
bun hardhat run scripts/deploy-with-rofl.ts --network sapphire
```

## ROFL Application Integration

After deployment, you need to configure your ROFL application to use the deployed contract addresses:

1. Find the generated `deployment-{network}.json` file in the contracts directory
2. Update your ROFL app with the `oceanSwap` contract address
3. Make sure your ROFL app's ID is correctly set in the OceanSwap contract

## Contract Verification

Contract verification is not available on Sapphire networks due to their confidential nature. However, you can view your transactions on the Sapphire Explorer:

- Testnet: https://testnet.explorer.oasis.io/
- Mainnet: https://explorer.oasis.io/

## Troubleshooting

### Transaction failures

If transactions fail, check:
- You have enough funds for gas
- Your private key is correct
- The network is operational

### ROFL Integration Issues

If you encounter issues with ROFL integration:
- Verify the app ID is correctly set in the OceanSwap contract
- Check that your ROFL app is configured to access the OceanSwap contract
- Ensure you're using the correct contract addresses

For more support, contact the OceanSwap team. 