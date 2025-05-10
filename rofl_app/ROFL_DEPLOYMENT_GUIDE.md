# ROFLSwap ROFL Deployment Guide

This guide explains how to deploy the ROFLSwap order matching engine inside a ROFL (Running oF-chain Logic) container to access encrypted order data with proper authentication.

## Prerequisites

1. Oasis CLI installed ([Installation Guide](https://docs.oasis.io/build/rofl/prerequisites/))
2. Docker and Docker Compose
3. An account on Oasis Sapphire Testnet with ~110 TEST tokens:
   - 100 TEST for ROFL registration escrow
   - ~10 TEST for gas fees
4. Your private key for the account

## Step 1: Prepare Environment

First, create a `.env` file with your configuration:

```bash
# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_here_without_0x_prefix
ROFLSWAP_ADDRESS=0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df
WEB3_PROVIDER=https://testnet.sapphire.oasis.io
EOF
```

## Step 2: Initialize ROFL App

```bash
# Initialize ROFL app manifest
oasis rofl init

# Create ROFL app on Sapphire Testnet
oasis rofl create --network testnet --account your_account_name
```

After creating the ROFL app, you'll receive a ROFL app ID like `rofl1qqn9xndja7e2pnxhttktmecvwzz0yqwxsquqyxdf`. 

```bash
# Add the ROFL App ID to your .env file
echo "ROFL_APP_ID=your_rofl_app_id" >> .env
```

## Step 3: Store Secrets

Store your environment variables as ROFL secrets:

```bash
# Store private key (without 0x prefix)
echo -n "your_private_key_here_without_0x_prefix" | oasis rofl secret set PRIVATE_KEY -

# Store contract address
echo -n "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df" | oasis rofl secret set ROFLSWAP_ADDRESS -

# Store web3 provider URL
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -

# Store ROFL App ID
echo -n "your_rofl_app_id" | oasis rofl secret set ROFL_APP_ID -
```

## Step 4: Update ROFLSwap Contract to Authorize Your ROFL App

You need to ensure your ROFL app ID is authorized on the ROFLSwap contract. This step depends on the specific contract's implementation, but typically requires:

1. The contract owner to call a function that adds your ROFL app ID to an authorized list
2. Alternatively, the contract might use a general pattern where anyone can register their ROFL app 

For example, if the contract has an `authorizeRoflApp(string memory appId)` function, the contract owner would need to call it with your ROFL app ID.

## Step 5: Build Docker Image

```bash
# Build the Docker image
docker compose build
```

## Step 6: Build and Deploy ROFL Bundle

```bash
# Build the ROFL bundle
# For Linux:
oasis rofl build

# For macOS/Windows:
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build

# Update on-chain ROFL configuration
oasis rofl update

# Deploy to a ROFL provider node
oasis rofl deploy
```

## Step 7: Verify Deployment

```bash
# Check ROFL app status
oasis rofl show
```

Visit the Oasis Explorer to see your ROFL app: https://explorer.oasis.io/testnet/rofl/[YOUR_ROFL_APP_ID]

## Step 8: Monitor Logs

Monitor your ROFL application logs:

```bash
oasis rofl logs -f
```

## How Authentication Works

When running inside a ROFL container:

1. The application automatically connects to the ROFL daemon via the UNIX socket at `/run/rofl-appd.sock`
2. The daemon signs all transactions with a TEE-attested identity that's associated with your ROFL app ID
3. The smart contract verifies this identity and grants access to encrypted data
4. This end-to-end encrypted communication creates a secure channel between your ROFL app and the contract

## Troubleshooting

- **RoflOriginNotAuthorizedForApp Error (0x6890282f)**: This error indicates that your ROFL app is not authorized to access the encrypted data. Make sure:
  - You're running inside a ROFL container
  - Your ROFL app ID is correctly authorized in the contract
  - You've followed all deployment steps correctly

- **Connection Issues**: Ensure your ROFL app has network connectivity and can reach the Sapphire RPC endpoint.

- **Authentication Issues**: Check that your secrets are correctly stored and accessible to the ROFL container.

## Access Encrypted Order Data

Once your ROFL app is properly deployed, the code will be able to access encrypted order data without any additional parameters. The ROFL authentication is handled automatically via the UNIX socket connection to the ROFL daemon.

Remember that the decryption of encrypted orders is handled within your application code - the smart contract only provides the encrypted data.

## References

- [Oasis ROFL Documentation](https://docs.oasis.io/build/rofl/)
- [Sapphire Authentication](https://docs.oasis.io/build/sapphire/develop/authentication/)
- [ROFL TEE Guide](https://docs.oasis.io/build/rofl/features/) 