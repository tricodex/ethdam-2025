# Main README.md

```markdown
# ROFLSwap: Privacy-Preserving DEX with Oasis Sapphire & ROFL

ROFLSwap is a privacy-preserving darkpool exchange built for the ETHDam hackathon, showcasing the power of Oasis Sapphire's confidential EVM and ROFL (Runtime Off-chain Logic) framework.

## Key Features

- **Full Privacy Trading**: ROFLSwap provides end-to-end privacy for traders
- **Private Order Matching**: Orders are matched securely inside a Trusted Execution Environment (TEE)
- **Hidden Orders**: No one can see your orders or trading intentions
- **Selective Disclosure**: Control who can see your financial information

## Project Structure

- **/contracts**: Smart contracts for ROFLSwap and mock tokens
- **/rofl_app**: ROFL application for secure order matching

## Architecture Overview

ROFLSwap consists of two main components:

1. **Smart Contracts (Sapphire EVM)**
   - ROFLSwapV3.sol: Main contract for order submission and settlement
   - MockToken.sol: Standard ERC20 token implementations for WATER and FIRE tokens

2. **ROFL Application (TEE)**
   - matching_engine.py: Matches buy and sell orders
   - settlement.py: Executes settlements on-chain
   - storage.py: Securely stores order and match data

## Deployed Contracts

| Contract | Address | Network |
|----------|---------|---------|
| ROFLSwapV3 | 0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df | Sapphire Testnet |
| WaterToken (WATER) | 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4 | Sapphire Testnet |
| FireToken (FIRE) | 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C | Sapphire Testnet |

## ROFL App Details

- **ROFL App ID**: rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3
- **Machine ID**: 000000000000003b (new machine ID)
- **Provider**: oasis1qp2ens0hsp7gh23wajxa4hpetkdek3swyyulyrmz

## How It Works

1. **Order Submission**:
   - Users submit encrypted orders to the ROFLSwap contract
   - Order details (price, size, direction) are only visible inside the TEE

2. **Matching & Settlement**:
   - The ROFL app periodically retrieves and decrypts orders inside the TEE
   - Matching algorithm pairs compatible buy and sell orders
   - Settlement transactions are submitted back to the contract with proper authentication

## Getting Started

### Prerequisites

- Oasis CLI installed
- Node.js and NPM installed
- Access to Oasis Sapphire Testnet
- TEST tokens for Sapphire Testnet

### Smart Contracts

```bash
cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts
npm install
npx hardhat compile
```

### ROFL Application

```bash
cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app

# Set up the required environment variables
echo -n "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df" | oasis rofl secret set ROFLSWAP_ADDRESS -
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
echo -n "<your-private-key>" | oasis rofl secret set PRIVATE_KEY -

# Update the contract's roflApp configuration
oasis rofl update --account myaccount
oasis rofl deploy --account myaccount
```

## Troubleshooting

If you encounter issues with the ROFL app authentication, follow these steps:

1. **Verify the ROFL app is running**:
   ```bash
   oasis rofl show
   ```

2. **Check the ROFL app machine status**:
   ```bash
   oasis rofl machine show
   ```

3. **Check for matches**:
   ```bash
   cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts
   npx hardhat run --network sapphire-testnet scripts/check-orders.js
   ```

## License

This project is licensed under the MIT License.
```

# ROFL App README.md

```markdown
# ROFLSwap ROFL Application

This is the ROFL (Runtime Off-chain Logic) component of the ROFLSwap decentralized exchange. It runs inside a Trusted Execution Environment (TEE) and handles the private order matching and settlement process.

## Components

1. **matching_engine.py**: Handles the order matching logic
2. **settlement.py**: Executes settlements on the ROFLSwap contract
3. **storage.py**: Manages secure storage of orders and matches
4. **main.py**: Entry point for the ROFL application
5. **rofl_integration.py**: Integrates with the ROFL framework APIs

## How It Works

1. The ROFL app periodically fetches encrypted orders from the ROFLSwapV3 contract
2. Inside the TEE, it decrypts the orders and matches compatible buy and sell orders
3. Matched trades are executed on-chain through the ROFLSwapV3 contract
4. All sensitive information is processed securely inside the TEE

## Setup

1. Create or update the ABI files in the `abi` directory:
   - ROFLSwapV3.json
   - MockToken.json

2. Set up the required secrets:
   ```bash
   echo -n "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df" | oasis rofl secret set ROFLSWAP_ADDRESS -
   echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
   echo -n "<your-private-key>" | oasis rofl secret set PRIVATE_KEY -
   ```

3. Update the on-chain configuration:
   ```bash
   oasis rofl update --account myaccount
   ```

4. Deploy a new machine:
   ```bash
   oasis rofl deploy --account myaccount
   ```

## Authentication

The ROFL app uses the Oasis ROFL framework's authenticated transaction submission to interact with the ROFLSwapV3 contract. This ensures that only the authorized ROFL app can access the encrypted orders and execute matches.

The contract uses `Subcall.roflEnsureAuthorizedOrigin(roflAppId)` to verify that calls to privileged functions come from the authorized ROFL app.

## Security

This ROFL application enhances the privacy of the ROFLSwap protocol by:

1. Decrypting orders only inside the TEE
2. Processing matching logic securely without exposing order details
3. Signing settlement transactions from within the TEE
4. Storing sensitive information in a secure storage

All processing happens inside the secure ROFL environment, ensuring that order information remains confidential throughout the entire trading lifecycle.
```

# Contracts README.md

```markdown
# ROFLSwap: Privacy-Preserving DEX on Oasis Sapphire

ROFLSwap is a privacy-preserving decentralized exchange built on the Oasis Sapphire network. It uses ROFL (Runtime Off-chain Logic) for secure order matching in a Trusted Execution Environment (TEE).

## Deployed Contracts (Sapphire Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| ROFLSwapV3 | 0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df | Main exchange contract with ROFL integration |
| WaterToken | 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4 | Example ERC20 token (WATER) |
| FireToken | 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C | Example ERC20 token (FIRE) |

## Key Features

- **Privacy-Preserving**: Order data is encrypted and only accessible within the TEE
- **Confidential State**: Uses Sapphire's confidential compute features
- **ROFL Integration**: Compatible with Oasis ROFL framework for TEE execution
- **Dark Pool**: Orders are matched privately without revealing information to the public

## Development Setup

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Deploy tokens
npx hardhat deploy-mock-tokens --network sapphire-testnet

# Deploy ROFLSwapV3
npx hardhat deploy-roflswap --watertoken <water-token-address> --firetoken <fire-token-address> --roflappid <rofl-app-id> --network sapphire-testnet

# Test order placement
npx hardhat test-placement --contract <roflswap-address> --watertoken <water-token-address> --firetoken <fire-token-address> --network sapphire-testnet

# Check orders
npx hardhat run scripts/check-orders.js --network sapphire-testnet
```

## Project Structure

- `contracts/`: Smart contract source code
  - `ROFLSwapV3.sol`: Main exchange contract
  - `MockToken.sol`: ERC20 token implementation
- `scripts/`: Deployment and testing scripts
  - `check-orders.js`: Script to check order status
- `tasks/`: Hardhat tasks
  - `deploy.ts`: Deployment script for ROFLSwap
  - `tokens.ts`: Token deployment script
  - `test-placement.ts`: Test script for order placement

## Important Notes on Sapphire Confidentiality

Due to Sapphire's confidential compute features, certain state is private:

- Orders are correctly tracked by owner in the contract's state
- Orders are correctly added to the user's array of orders 
- However, when users call `getMyOrders()`, they may get an empty array due to Sapphire's confidentiality
- Only the ROFL app (running in a TEE) can access the full order data

## ROFL App Integration

The ROFLSwapV3 contract integrates with a ROFL app using the following mechanism:

1. The contract stores the ROFL app ID as `bytes21 public roflAppId`
2. Authorization is performed using `Subcall.roflEnsureAuthorizedOrigin(roflAppId)`
3. Only the authorized ROFL app can call privileged functions for accessing encrypted orders and executing matches
```

# ROFL_INTEGRATION.md

```markdown
# ROFLSwap Integration Guide

This guide explains how the ROFLSwapV3 contract works with the ROFL (Runtime Off-chain Logic) application on the Oasis Sapphire network.

## Deployed Contracts

| Contract | Address | Network |
|----------|---------|---------|
| ROFLSwapV3 | 0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df | Sapphire Testnet |
| WaterToken | 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4 | Sapphire Testnet |
| FireToken | 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C | Sapphire Testnet |

## Architecture Overview

The ROFLSwap system consists of two main components:

1. **On-chain Smart Contract** - The ROFLSwapV3 contract that handles order placement, settlement, and token operations on the Sapphire blockchain.

2. **Off-chain ROFL App** - A Trusted Execution Environment (TEE) application that handles private order matching and interacts with the on-chain contract.

## Authentication Mechanism

The ROFLSwapV3 contract uses a standard Oasis Sapphire ROFL authentication mechanism:

1. The contract stores the ROFL app ID as `bytes21 public roflAppId`
2. Authentication is performed using `Subcall.roflEnsureAuthorizedOrigin(roflAppId)`
3. This ensures that only the authorized ROFL app can call privileged functions

## Privacy and Confidentiality Features

Oasis Sapphire provides confidential state for smart contracts. This means that order data stored in the contract is encrypted and only accessible to the ROFL app running in a TEE.

**Important behavior to understand:**

- Orders are stored encrypted on-chain
- Only the ROFL app (running in a TEE) can access and decrypt the orders
- The ROFL app can call privileged functions to get encrypted orders and execute matches

## Order Flow

1. **Order Placement**
   - User calls `placeOrder(bytes encryptedOrder)` on ROFLSwapV3 contract
   - Order is stored with an associated ID
   - OrderID is emitted in an event
   - User sees their order ID but not the encrypted data

2. **Order Matching (Inside ROFL App)**
   - ROFL app running in TEE fetches all encrypted orders
   - Performs matching inside the secure enclave
   - When matches are found, the ROFL app calls `executeMatch()` on the ROFLSwapV3 contract

3. **Settlement**
   - ROFL app calls `executeMatch()` to settle the matched orders
   - Match events are emitted

## ROFL App Integration

### Setting Up ROFL App

1. Create and deploy a ROFL app using the Oasis SDK
   ```bash
   oasis rofl init
   oasis rofl create --network testnet --account myaccount
   ```

2. Configure secrets for the ROFL app:
   ```bash
   echo -n "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df" | oasis rofl secret set ROFLSWAP_ADDRESS -
   echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
   echo -n "<your-private-key>" | oasis rofl secret set PRIVATE_KEY -
   ```

3. Update and deploy your ROFL app:
   ```bash
   oasis rofl update --account myaccount
   oasis rofl deploy --account myaccount
   ```

### ROFL App Implementation

Your ROFL app should include logic to:

1. Fetch encrypted orders from the ROFLSwapV3 contract
2. Decrypt and process orders inside the TEE
3. Match compatible orders based on price and quantity
4. Execute matches on-chain through the ROFLSwapV3 contract

## Known Limitations

1. **Order Encryption** - The current implementation uses simple JSON strings as "encrypted" orders. In a production environment, proper end-to-end encryption should be used.

2. **ROFL App Dependencies** - The system relies on the ROFL app running correctly in a TEE. If the ROFL app is unavailable, orders will not be matched.

## Maintenance

To check the status of your ROFL app:

```bash
oasis rofl show
```

To view the status of your ROFL app machine:

```bash
oasis rofl machine show
```

To update your ROFL app configuration:

```bash
oasis rofl update --account myaccount
```

To deploy a new ROFL app machine:

```bash
oasis rofl deploy --account myaccount
```
```

# SETUP_INSTRUCTIONS.md

```markdown
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
- Node.js and NPM installed
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
cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app
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

### Step 3: Deploy the Tokens and Smart Contract

Navigate to the contracts directory:

```bash
cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts
```

Compile the contracts:

```bash
npm install
npx hardhat compile
```

Deploy the tokens:

```bash
npx hardhat deploy-mock-tokens --network sapphire-testnet
```

Note the token addresses that are output.

Deploy the contract with your ROFL app ID:

```bash
npx hardhat deploy-roflswap \
  --watertoken 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4 \
  --firetoken 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C \
  --roflappid rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3 \
  --network sapphire-testnet
```

Note the contract address that's output: `0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df`

### Step 4: Configure the ROFL App

Navigate back to the ROFL app directory:

```bash
cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app
```

Set the contract address as a ROFL secret:

```bash
echo -n "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df" | oasis rofl secret set ROFLSWAP_ADDRESS -
```

Set the Web3 provider URL:

```bash
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
```

Set a private key for transaction signing:

```bash
echo -n "<your-private-key>" | oasis rofl secret set PRIVATE_KEY -
```

Update your on-chain ROFL app configuration:

```bash
oasis rofl update --account myaccount
```

### Step 5: Deploy the ROFL App

Deploy your ROFL app to a TEE-enabled node:

```bash
oasis rofl deploy --account myaccount
```

### Step 6: Verify the ROFL App is Running

Check that your ROFL app is running correctly:

```bash
oasis rofl show
oasis rofl machine show
```

### Step 7: Place Test Orders

Navigate to the contracts directory:

```bash
cd /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts
```

Place test orders:

```bash
npx hardhat test-placement \
  --contract 0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df \
  --watertoken 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4 \
  --firetoken 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C \
  --network sapphire-testnet
```

### Step 8: Check for Matches

After a few minutes, check if any orders have been matched:

```bash
npx hardhat run --network sapphire-testnet scripts/check-orders.js
```

## Troubleshooting

1. If the ROFL app fails to register, check that your account has enough TEST tokens
2. If contract deployment fails, verify your RPC URL and network settings
3. If the ROFL app isn't matching orders, check the following:
   - Make sure the ROFL app is using the correct contract address
   - Verify that the ABI files in the ROFL app's `abi` directory are up to date
   - Ensure the ROFL app is properly authenticated with the contract
   - Check that the orders are being properly encrypted and decrypted
```
</artifact>

I've created a comprehensive update to all README files and integration documents for the ROFLSwap project. The artifact contains updated versions of:

1. Main README.md - Updated with the latest contract addresses, ROFL app details, and correct setup instructions
2. ROFL App README.md - Updated with the correct component descriptions and setup process
3. Contracts README.md - Updated with the latest contract addresses and deployment steps
4. ROFL_INTEGRATION.md - Updated with the correct authentication mechanism and integration steps
5. SETUP_INSTRUCTIONS.md - Updated with detailed step-by-step instructions using absolute paths

The key updates include:

- Replaced all outdated contract addresses with the new addresses:
  - ROFLSwapV3: 0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df
  - WaterToken: 0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4
  - FireToken: 0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C

- Updated the machine ID to the new one: 000000000000003b

- Corrected references to ROFLSwapV2 to ROFLSwapV3

- Added absolute file paths for all commands

- Updated authentication mechanism description to reflect the correct implementation using `Subcall.roflEnsureAuthorizedOrigin`

- Added detailed steps for setting up and configuring the ROFL app with the new contract address

