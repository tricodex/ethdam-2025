# ROFL App Deployment Guide

This guide explains how to deploy the ROFLSwap matcher to a TEE environment using Oasis ROFL.

## Prerequisites

1. **Oasis CLI**: Installed and properly configured
2. **Oasis Account**: With at least 110 TEST tokens
   - 100 TEST for ROFL registration escrow 
   - 10 TEST for gas fees

## Deployment Steps

### 1. Prepare Environment Variables

Ensure the following environment variables are set:

```bash
export PRIVATE_KEY=0x23de751f6e85d7058d57c1f94b5962101592b34095385f7c6d78247a4b5bfc73
export ROFLSWAP_ADDRESS=0x1bc94B51C5040E7A64FE5F42F51C328d7398969e
export ROFL_APP_ID=rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972
export WEB3_PROVIDER=https://testnet.sapphire.oasis.io
```

### 2. Check Current ROFL Configuration

```bash
# Check the app ID in rofl.yaml
cat rofl.yaml

# Make sure the app_id is correctly set to: rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972
```

If you need to restart/redeploy, you should remove any existing configuration:

```bash
oasis rofl remove
```

### 3. Initialize ROFL (if needed)

If this is a fresh deployment or you've removed the previous config:

```bash
oasis rofl init
oasis rofl create
```

### 4. Build the ROFL Bundle

On Linux:
```bash
oasis rofl build
```

On Mac/Windows (using Docker):
```bash
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

### 5. Set Required Secrets

Store the environment variables as encrypted secrets:

```bash
echo -n "$ROFLSWAP_ADDRESS" | oasis rofl secret set ROFLSWAP_ADDRESS -
echo -n "$ROFL_APP_ID" | oasis rofl secret set ROFL_APP_ID -
echo -n "$WEB3_PROVIDER" | oasis rofl secret set WEB3_PROVIDER -
echo -n "$PRIVATE_KEY" | oasis rofl secret set MATCHER_PRIVATE_KEY -
```

### 6. Update ROFL App Configuration

```bash
oasis rofl update
```

### 7. Deploy to ROFL TEE Environment

```bash
oasis rofl deploy
```

### 8. Verify Deployment

```bash
oasis rofl show
```

You should see output showing your app is running with properly registered enclave IDs.

### 9. Monitor Logs

```bash
oasis rofl logs
```

## Troubleshooting

If deployment fails, try the following:

1. Check if you have sufficient TEST tokens
2. Verify all environment variables are correctly set
3. If redeploying, make sure to fully remove the previous deployment first

## Testing Order Matching

Once the ROFL app is deployed and running:

1. Place buy and sell orders using the hardhat tasks:
   ```bash
   cd ../contracts
   bun hardhat place-order --type buy --amount 1.0 --price 0.5 --network sapphire-testnet
   bun hardhat place-order --type sell --amount 1.0 --price 0.5 --network sapphire-testnet
   ```

2. Check if orders are being matched:
   ```bash
   bun hardhat run scripts/check-oracle-matches.js --network sapphire-testnet
   ```

3. Monitor the ROFL app logs:
   ```bash
   cd ../rofl_app
   oasis rofl logs
   ``` 