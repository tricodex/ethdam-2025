# ROFLSwapOracle

A decentralized exchange implementation on Oasis Sapphire using ROFL app authentication and TEE-based order matching.

## Overview

ROFLSwapOracle is a dark pool DEX for exchanging private tokens on Oasis Sapphire. It uses the oracle pattern with ROFL app authentication to enable secure order matching in a Trusted Execution Environment (TEE).

Key components include:

1. **[ROFLSwapOracle Contract](contracts/contracts/ROFLSwapOracle.sol)**: Handles order placement and execution with SIWE authentication for users
2. **[PrivateERC20 Tokens](contracts/contracts/PrivateERC20.sol)**: Confidential tokens with privacy-preserving transfers
3. **[ROFL Matcher App](roflswapapp/main.py)**: Python service running in TEE for secure order matching
4. **[Next.js Frontend](ethdam-next/src/app/page.tsx)**: Web interface for interacting with the ROFLSwapOracle contract

## Technical Architecture

### Smart Contracts

The main smart contract, [`ROFLSwapOracle.sol`](contracts/contracts/ROFLSwapOracle.sol), provides the following functionality:

- **Order Placement**: Users place encrypted orders through the `placeOrder()` function
- **Order Matching**: The oracle (running in TEE) matches and executes orders via `executeMatch()`
- **Authentication**: Uses two-level authentication with SIWE for users and ROFL TEE authentication for the oracle
- **Private Token Transfers**: Handles confidential token transfers between users

The [`PrivateERC20`](contracts/contracts/PrivateERC20.sol) interface extends standard ERC20 functionality with privacy features:
- `transferFromEncrypted()` for confidential token transfers
- `requestPrivacyAccess()` to allow the contract to handle private token balances

### Matcher Oracle Service

The Python-based matcher service ([`main.py`](roflswapapp/main.py) in `roflswapapp`) runs inside a Trusted Execution Environment and:

- Authenticates with the ROFLSwapOracle contract
- Retrieves encrypted orders
- Processes orders for potential matches
- Executes matches through the contract's `executeMatch()` method
- Runs continuously or as a one-off process

The [`ROFLSwapMatcher`](roflswapapp/roflswap_matcher.py) class handles the core matching logic, including:
- Order retrieval and decryption
- Finding compatible order pairs
- Executing matches securely via authenticated calls
- Maintaining state across polling intervals

### Frontend Integration

The frontend uses Next.js with [Wagmi configuration](ethdam-next/src/app/wagmi-config.ts) for Ethereum integration, specifically:
- Connects to Oasis Sapphire testnet through specialized transports
- Uses Sapphire-compatible wallet connectors
- Implements order placement and viewing UI

## Prerequisites

- Node.js and Bun v1.2.9+
- Hardhat development environment
- Oasis Sapphire account with TEST tokens
- ROFL app registration

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/roflswap-oracle.git
   cd roflswap-oracle
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Compile the contracts:
   ```bash
   npx hardhat compile
   ```

## Deployment

1. Set your private key as an environment variable:
   ```bash
   export PRIVATE_KEY=0xYourPrivateKeyHere
   ```

2. Deploy the private tokens:
   ```bash
   bun scripts/deploy-private-tokens.js --network sapphire-testnet
   ```

3. Deploy the ROFLSwapOracle contract:
   ```bash
   bun scripts/deploy-roflswap-oracle.js --network sapphire-testnet
   ```

   If you have a ROFL app ID, you can specify it:
   ```bash
   bun scripts/deploy-roflswap-oracle.js --network sapphire-testnet --rofl-app-id your-rofl-app-id
   ```

4. Verify the setup:
   ```bash
   bun scripts/verify-oracle-setup.js
   ```

## ROFL App Configuration

After deploying the contract, configure the ROFL app:

1. Update environment variables:
   ```bash
   cd rofl_app
   source update_rofl_environment.sh YOUR_PRIVATE_KEY
   ```

2. Test the matcher:
   ```bash
   bun roflswap_oracle_matching.py --once
   ```

3. Run the matcher continuously:
   ```bash
   bun roflswap_oracle_matching.py
   ```

## Running the Matcher Service

The [matcher service](roflswapapp/main.py) can be run in two modes:

1. **TEE Mode** (Production):
   ```bash
   python3 main.py 0xContractAddress --network sapphire-testnet
   ```

2. **Local Test Mode**:
   ```bash
   python3 main.py 0xContractAddress --network sapphire-testnet --secret 0xYourPrivateKey
   ```

Command line options:
- `--once`: Process orders once and exit
- `--interval`: Set polling interval in seconds (default: 30)
- `--network`: Set network (sapphire-testnet, sapphire-mainnet, sapphire-localnet)
- `--key-id`: Set key ID for TEE key generation
- `--debug`: Enable debug logging

## Testing the Exchange

1. Mint and wrap tokens:
   ```bash
   bun scripts/mint-and-wrap-tokens.js --network sapphire-testnet
   ```

2. Place orders:
   ```bash
   # Place a buy order
   bun scripts/place-oracle-order.js --buy --amount 2.0 --price 0.5 --network sapphire-testnet

   # Place a sell order
   bun scripts/place-oracle-order.js --sell --amount 3.0 --price 0.4 --network sapphire-testnet
   ```

3. Execute matches (manually, if needed):
   ```bash
   bun scripts/execute-oracle-match.js --buy-order 1 --sell-order 2 --amount 1.5 --network sapphire-testnet
   ```

4. Automated testing:
   ```bash
   ./scripts/test-oracle-workflow.sh sapphire-testnet
   ```

## Frontend Development

1. Navigate to the frontend directory:
   ```bash
   cd ethdam-next
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run the development server:
   ```bash
   bun run dev
   ```

The frontend includes:
- Wallet connection via [Sapphire-compatible connectors](ethdam-next/src/app/wagmi-config.ts)
- Order placement interface
- Order history view
- Token balance display

## Architecture

### Authentication Flow

1. Users authenticate to the contract using SIWE (Sign-In with Ethereum)
2. The oracle authenticates to the contract using [`roflEnsureAuthorizedOrigin`](contracts/contracts/ROFLSwapOracle.sol#L102)
3. Orders are encrypted and stored in the contract
4. The oracle retrieves, matches, and executes trades

### Security Features

- TEE-based execution for the matcher
- Encrypted orders for privacy
- Two-level authentication (SIWE + ROFL)
- Private token transfers

### Directory Structure

- [`contracts/`](contracts/) - Smart contracts and deployment scripts
  - [`contracts/contracts/`](contracts/contracts/) - Solidity contract files
  - [`contracts/scripts/`](contracts/scripts/) - Deployment and testing scripts
- [`roflswapapp/`](roflswapapp/) - Python-based matcher service
- [`rofl_app/`](rofl_app/) - ROFL app configuration and TEE integration
- [`ethdam-next/`](ethdam-next/) - Next.js frontend

## Troubleshooting

### Common Issues

1. **Compilation errors**: Ensure you're using Solidity 0.8.30 as specified in hardhat.config.ts
2. **Authentication failures**: Verify your ROFL app ID is correctly formatted
3. **Network errors**: Make sure you're connected to Sapphire testnet
4. **Oracle errors**: The account executing matches must be set as the oracle
5. **TEE integration**: If running in TEE mode, check that the ROFL daemon socket exists at `/run/rofl-appd.sock`
6. **Key management**: Ensure proper key ID is set when running in TEE mode

## License

MIT

## Acknowledgements

- Oasis Protocol Foundation
- ROFL App TEE Framework 