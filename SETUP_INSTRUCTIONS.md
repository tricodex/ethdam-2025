# ROFLSwap: Setup & Deployment Instructions

ROFLSwap is a privacy-preserving decentralized exchange built using Oasis Sapphire's confidential EVM and ROFL (Runtime Off-chain Logic) framework.

## Architecture Overview

ROFLSwap consists of two main components:

1. **Smart Contract**: A confidential smart contract deployed on Oasis Sapphire that stores encrypted orders and handles order settlements
2. **ROFL App**: An off-chain component running in a Trusted Execution Environment (TEE) that handles order matching and settlement

## Setup & Deployment Steps

Follow these steps sequentially to properly set up and deploy ROFLSwap:

### Prerequisites

- Oasis CLI installed
- Node.js and NPM/Yarn installed
- Access to Oasis Sapphire Testnet
- TEST tokens for Sapphire Testnet (from [faucet](https://faucet.testnet.oasis.io/))

### Step 1: Set Up Your Account

If you don't already have an Oasis account, create one:

```bash
oasis wallet create myaccount
```

Fund this account with TEST tokens from the [Oasis Testnet faucet](https://faucet.testnet.oasis.io/).

### Step 2: Create and Register the ROFL App

Navigate to the ROFL app directory:

```bash
cd rofl_app
```

Initialize the ROFL app if you haven't already:

```bash
oasis rofl init
```

Register your ROFL app to get an app ID:

```bash
oasis rofl create --network testnet --account myaccount
```

This will create a ROFL app and output an ID like: `rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3`

### Step 3: Deploy the Smart Contract

Navigate to the contracts directory:

```bash
cd ../contracts
```

Compile the contracts:

```bash
npm install
npx hardhat compile
```

Deploy the contract with your ROFL app ID:

```bash
npx hardhat deploy-roflswap \
  --watertoken 0x1234...5678 \
  --firetoken 0x8765...4321 \
  --roflappid rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3 \
  --network sapphire-testnet
```

Note the contract address that's output, e.g.: `0xAbC...123`

### Step 4: Configure the ROFL App

Navigate back to the ROFL app directory:

```bash
cd ../rofl_app
```

Set the contract address as a ROFL secret:

```bash
echo -n "0xAbC...123" | oasis rofl secret set ROFLSWAP_ADDRESS -
```

Set the Web3 provider URL:

```bash
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
```

Update your on-chain ROFL app configuration:

```bash
oasis rofl update
```

### Step 5: Build the ROFL App

Build your ROFL app:

```bash
oasis rofl build
```

This will create an `.orc` bundle file.

### Step 6: Deploy the ROFL App

Deploy your ROFL app to a TEE-enabled node:

```bash
oasis rofl deploy
```

### Step 7: Verify the ROFL App is Running

Check that your ROFL app is running correctly:

```bash
oasis rofl show
```

## Using ROFLSwap

Once deployed, users can:

1. Connect to the deployed contract on Sapphire testnet
2. Place encrypted buy/sell orders
3. The ROFL app will automatically match compatible orders and execute trades

## Key Differences from the Original Implementation

This refactored implementation:

1. Uses `Subcall.roflEnsureAuthorizedOrigin` for proper ROFL authentication instead of an Ethereum address
2. Handles the ROFL app identity and authentication correctly
3. Uses the ROFL REST APIs for key management and authenticated transaction submission
4. Properly mounts the ROFL socket for container communication
5. Removes the dependency on hardcoded private keys

## Troubleshooting

1. If the ROFL app fails to register, check that your account has enough TEST tokens
2. If contract deployment fails, verify your RPC URL and network settings
3. If the ROFL app isn't matching orders, check the logs and ensure the contract address is correctly set
