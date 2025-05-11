# ROFLSwapOracle

A decentralized exchange implementation on Oasis Sapphire using ROFL app authentication and TEE-based order matching.

## Overview

ROFLSwapOracle is a dark pool DEX for exchanging private tokens on Oasis Sapphire. It uses the oracle pattern with ROFL app authentication to enable secure order matching in a Trusted Execution Environment (TEE).

Key components include:

1. **ROFLSwapOracle Contract**: Handles order placement and execution with SIWE authentication for users
2. **PrivateERC20 Tokens**: Confidential tokens with privacy-preserving transfers
3. **ROFL Matcher App**: Python service running in TEE for secure order matching

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

## Architecture

### Authentication Flow

1. Users authenticate to the contract using SIWE (Sign-In with Ethereum)
2. The oracle authenticates to the contract using `roflEnsureAuthorizedOrigin`
3. Orders are encrypted and stored in the contract
4. The oracle retrieves, matches, and executes trades

### Security Features

- TEE-based execution for the matcher
- Encrypted orders for privacy
- Two-level authentication (SIWE + ROFL)
- Private token transfers

## Troubleshooting

### Common Issues

1. **Compilation errors**: Ensure you're using Solidity 0.8.30 as specified in hardhat.config.ts
2. **Authentication failures**: Verify your ROFL app ID is correctly formatted
3. **Network errors**: Make sure you're connected to Sapphire testnet
4. **Oracle errors**: The account executing matches must be set as the oracle

## License

MIT

## Acknowledgements

- Oasis Protocol Foundation
- ROFL App TEE Framework 