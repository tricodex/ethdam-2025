# ROFLSwapOracle Deployment Guide

This guide explains how to deploy and configure the ROFLSwapOracle contract and its related components.

## Overview

ROFLSwapOracle is a dark pool exchange contract that uses the oracle pattern with ROFL app authentication to enable confidential token trading on Oasis Sapphire. The system consists of:

1. **ROFLSwapOracle Contract**: A Solidity contract deployed on Oasis Sapphire
2. **Private ERC20 Tokens**: Wrapped tokens used for trading
3. **ROFL Matcher App**: A Python application running in a Trusted Execution Environment (TEE)

## Prerequisites

- Node.js (v16+) and Bun (v1.2.9+)
- Hardhat development environment
- Oasis Sapphire account with TEST tokens
- ROFL app ID registered with Oasis
- Terminal access

## Environment Setup

1. Set your private key as an environment variable:

```bash
export PRIVATE_KEY=0xYourPrivateKeyHere
```

2. (Optional) Set your ROFL app ID as an environment variable:

```bash
export ROFL_APP_ID=rofl1yourappidherexxxxxxxxxxxxxxxxxxxxxxx
```

## Deployment Steps

### 1. Deploy Private Tokens

If you haven't deployed private tokens yet, run:

```bash
cd contracts
bun scripts/deploy-private-tokens.js --network sapphire-testnet
```

This will deploy the private WATER and FIRE tokens and save the deployment info to `private-tokens-deployment-sapphire-testnet.json`.

### 2. Deploy ROFLSwapOracle Contract

Run the deployment script:

```bash
bun scripts/deploy-roflswap-oracle.js --network sapphire-testnet
```

If you need to specify a custom ROFL app ID:

```bash
bun scripts/deploy-roflswap-oracle.js --network sapphire-testnet --rofl-app-id yourAppId
```

The deployment information will be saved to `roflswap-oracle-deployment-sapphire-testnet.json`.

### 3. Request Privacy Access

The deployment script should automatically request privacy access. If not, you can do it manually:

```bash
bun scripts/approve-private-tokens.js --address YOUR_CONTRACT_ADDRESS --network sapphire-testnet
```

### 4. Test the Contract

Place test orders and execute matches:

```bash
# Place a buy order
bun scripts/place-oracle-order.js --buy --amount 2.0 --price 0.5 --network sapphire-testnet

# Place a sell order
bun scripts/place-oracle-order.js --sell --amount 3.0 --price 0.4 --network sapphire-testnet

# Execute a match (replace with your actual order IDs)
bun scripts/execute-oracle-match.js --buy-order 1 --sell-order 2 --amount 1.5 --network sapphire-testnet
```

### 5. Automatic Testing

You can also use the provided test workflow script to execute all steps automatically:

```bash
./scripts/test-oracle-workflow.sh sapphire-testnet
```

## ROFL App Configuration

After deploying the contract, you need to configure the ROFL app to use the new contract address:

1. Update the environment variables:

```bash
source rofl_app/update_rofl_environment.sh YOUR_PRIVATE_KEY
```

2. Run the matcher once to test:

```bash
cd rofl_app
bun roflswap_oracle_matching.py --once
```

3. For continuous matching:

```bash
bun roflswap_oracle_matching.py
```

## Troubleshooting

### Common Issues:

1. **Authentication Errors (0x6890282f)**:
   - Ensure the ROFL app ID in the contract matches your actual ROFL app ID
   - Check that the oracle address is set correctly in the contract
   - Verify the ROFL daemon socket is accessible at `/run/rofl-appd.sock`

2. **Insufficient Funds**:
   - Ensure your account has enough TEST tokens
   - Mint and wrap tokens using `bun scripts/mint-and-wrap-tokens.js`

3. **Contract Deployment Failures**:
   - Check network status and connection
   - Verify your private key is correct
   - Ensure you have enough gas

## Documentation

For more information, refer to:

- [Oasis ROFL App Documentation](https://docs.oasis.io/build/rofl/app)
- [Sapphire Authentication](https://docs.oasis.io/build/sapphire/develop/authentication)
- [ROFL Deployment](https://docs.oasis.io/build/rofl/deployment)

## Support

If you encounter issues, please check the logs and error messages. For further assistance, reach out to the Oasis team on their Discord channel or open an issue in the repository. 