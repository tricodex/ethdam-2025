# ROFLSwap Order Matching Authentication Solution

This project contains the code for the ROFLSwap order matching engine that needs to access encrypted order data on Oasis Sapphire.

## Problem

The ROFLSwap contract stores order data in an encrypted format that can only be accessed by authorized ROFL applications. When trying to access this data from Python, we were getting the error `0x6890282f` (RoflOriginNotAuthorizedForApp).

## Solution

The solution uses the official `oasis-sapphire-py` package to properly authenticate with the Sapphire network and access encrypted order data from the ROFLSwap contract.

### Key Components

1. **sapphire_wrapper.py** - Uses the `sapphirepy.sapphire.wrap()` function from the official package to sign calls with EIP-712 format
2. **test_auth.py** - Tests basic authentication with the Sapphire network
3. **test_get_orders.py** - Tests retrieving order data from the ROFLSwap contract

### Authentication Flow

1. Create a Web3 instance and add the signing middleware
2. Wrap the Web3 instance with `sapphire.wrap()` to enable end-to-end encryption and authentication
3. When making contract calls, the wrapper automatically adds the necessary authentication headers

## Important Notes

- For accessing encrypted data, the code must run inside a ROFL container with the correct ROFL App ID authorized in the contract.
- Outside of a ROFL container, even with proper authentication headers, the contract will reject access to confidential data with the RoflOriginNotAuthorizedForApp error.
- The ROFL App ID must be registered in the contract using the `setRoflAppId()` function.

## Running the Code

### Basic Authentication Test

```bash
export PRIVATE_KEY=your_private_key
python test_auth.py
```

### Testing Order Retrieval (inside ROFL container)

```bash
export PRIVATE_KEY=your_private_key
export ROFLSWAP_ADDRESS=0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df
python test_get_orders.py
```

## ROFL Container Deployment

To access encrypted data, this code must be deployed as a ROFL app. See ROFL_DEPLOYMENT_GUIDE.md for detailed instructions.

## References

- [Oasis Sapphire Documentation](https://docs.oasis.io/build/sapphire/)
- [ROFL Documentation](https://docs.oasis.io/build/rofl/)

# ROFLSwap Order Matching Engine

A decentralized order matching engine for the ROFLSwap protocol, designed to run inside Oasis ROFL Trusted Execution Environment (TEE).

## Overview

This application serves as an order matching engine for the ROFLSwap protocol on Oasis Sapphire. It retrieves encrypted orders from the ROFLSwap smart contract, finds matching orders, and executes trades.

The application is designed to run inside a ROFL (Running oF-chain Logic) container, which is a Trusted Execution Environment (TEE) provided by Oasis Protocol. This ensures that the matching engine can access encrypted order data securely.

## Authentication Mechanisms

The application supports two authentication methods:

1. **External Authentication (for development/testing)**
   - Uses Sapphire's signed queries authentication
   - Limited access (cannot access encrypted order data)

2. **ROFL TEE Authentication (for production)**
   - Uses ROFL's authenticated transaction submission API
   - Full access to encrypted order data
   - Automatic authentication via the ROFL TEE

## Prerequisites

- Oasis Sapphire account with TEST tokens
- Oasis CLI installed
- Docker and Docker Compose
- Private key with access to the ROFLSwap contract

## Deployment Steps

### 1. Set Up Environment Variables

Create a `.env` file with the following variables:

```
PRIVATE_KEY=your_private_key_here
ROFLSWAP_ADDRESS=0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df
WEB3_PROVIDER=https://testnet.sapphire.oasis.io
```

### 2. Build the Docker Image

Update the `image` field in `compose.yaml` to point to your Docker repository:

```yaml
image: "ghcr.io/your-username/roflswap-matcher:latest"
```

Then build and push the image:

```bash
docker compose build
docker compose push
```

### 3. Initialize ROFL App

```bash
# Initialize the ROFL app manifest
oasis rofl init

# Register your ROFL app on the Sapphire Testnet
oasis rofl create --network testnet --account your_account_name
```

This will give you a ROFL app ID like `rofl1qqn9xndja7e2pnxhttktmecvwzz0yqwxsquqyxdf`.

### 4. Store Secrets

Store your private key as a secret:

```bash
echo -n "your_private_key_here" | oasis rofl secret set PRIVATE_KEY -
```

Store the ROFLSwap contract address:

```bash
echo -n "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df" | oasis rofl secret set ROFLSWAP_ADDRESS -
```

Store the Web3 provider URL:

```bash
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
```

### 5. Build ROFL Bundle

```bash
# Native Linux
oasis rofl build

# Docker (Windows, Mac, Linux)
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

### 6. Update and Deploy

```bash
# Update on-chain configuration
oasis rofl update

# Deploy to ROFL node
oasis rofl deploy
```

### 7. Verify Deployment

```bash
# Check that your ROFL app is running
oasis rofl show
```

## Technical Details

### Order Matching Process

1. The engine periodically retrieves all orders from the ROFLSwap contract
2. It matches buy and sell orders based on price and quantity
3. Matched orders are executed by calling the smart contract's `executeMatch` function
4. Transaction history is stored locally

### Authentication Flow

When running inside a ROFL container:
1. The app detects it's running in a ROFL environment
2. It uses the ROFL API to sign and submit authenticated transactions
3. The smart contract verifies that the request comes from the authorized ROFL app

### Development and Testing

For development and testing without a ROFL container:

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_here
export ROFLSWAP_ADDRESS=0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df
export WEB3_PROVIDER=https://testnet.sapphire.oasis.io

# Run the authentication test
python test_auth.py

# Run simplified order retrieval test
python test_get_orders.py
```

## Troubleshooting

- **RoflOriginNotAuthorizedForApp Error (0x6890282f)**: This error occurs when trying to access encrypted order data without ROFL authentication. Make sure you're running inside a ROFL container.

- **Connection Issues**: Check that your Web3 provider URL is correct and that you have network connectivity.

- **Missing Libraries**: If you encounter import errors, ensure all dependencies are installed: `pip install -r requirements.txt`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Project Structure

- `main.py`: Main entry point for the order matcher
- `matching_engine.py`: Order matching logic
- `settlement.py`: Trade settlement logic
- `storage.py`: Storage utilities
- `Dockerfile`: Dockerfile for the order matcher
- `compose.yaml`: Docker Compose file for the order matcher
- `requirements.txt`: Python dependencies
- `abi/`: Directory containing contract ABIs 