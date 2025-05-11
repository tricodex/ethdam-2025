# ROFLSwap Matcher Oracle

This is a ROFL app that runs on Oasis Sapphire and matches orders for the ROFLSwapOracle smart contract.

## Overview

The ROFLSwap Matcher Oracle is responsible for:

1. Monitoring the ROFLSwapOracle contract for new orders
2. Retrieving and decoding order data
3. Finding matching buy and sell orders
4. Executing trades by calling the `executeMatch` function on the contract

## Prerequisites

- Docker
- Oasis CLI
- An account on Oasis Sapphire with TEST tokens

## Local Testing

You can test the matcher locally using Docker:

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key
export ROFLSWAP_ADDRESS=0x1bc94B51C5040E7A64FE5F42F51C328d7398969e
export WEB3_PROVIDER=https://testnet.sapphire.oasis.io

# Run with Docker Compose
docker-compose -f docker-compose.local.yaml build
docker-compose -f docker-compose.local.yaml up
```

The matcher will run in local mode and simulate matching orders without requiring a real TEE environment.

## Deployment to ROFL

To deploy the matcher to Oasis ROFL:

```bash
# Initialize ROFL app
oasis rofl init

# Create ROFL app
oasis rofl create

# Build ROFL app bundle
oasis rofl build

# Set the private key secret
echo -n "your_private_key" | oasis rofl secret set PRIVATE_KEY -

# Update ROFL app
oasis rofl update

# Deploy ROFL app
oasis rofl deploy
```

## Testing

You can test the contract connection using:

```bash
python test-tokens.py
```

This will verify that the matcher can connect to the contract and retrieve basic information.

## Contract Addresses

The ROFLSwapOracle is deployed on Sapphire Testnet:

- ROFLSwapOracle: `0x1bc94B51C5040E7A64FE5F42F51C328d7398969e`
- WATER Token: `0x991a85943D05Abcc4599Fc8746188CCcE4019F04`
- FIRE Token: `0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977`

## Troubleshooting

If you encounter issues with order matching:

1. Check the matcher logs for errors
2. Make sure the oracle address is set correctly in the contract
3. Verify that orders exist and are not filled
4. Ensure your private key has enough TEST tokens for gas 