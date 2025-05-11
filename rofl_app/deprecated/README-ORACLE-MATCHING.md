# ROFLSwap Oracle Matching

## Overview

This implementation of ROFLSwap uses the Oracle pattern for ROFL authentication in Oasis Sapphire. This approach provides better security and reliability compared to the previous direct authentication method.

## Key Components

The system consists of the following components:

1. **ROFLSwapOracle Contract**: A smart contract using SIWE authentication and ROFL app authentication
2. **Private ERC20 Tokens**: Wrapped tokens with privacy features
3. **ROFL Matcher App**: Python service running inside a TEE, acting as an oracle

## How It Works

### Authentication Flow

1. The ROFLSwapOracle contract enforces authentication using `SiweAuth` for users and `roflEnsureAuthorizedOrigin` for the oracle
2. The matcher runs inside a TEE and communicates with the contract through the ROFL app daemon socket
3. The ROFL app daemon manages authentication and ensures the code is running in a trusted environment

### Order Matching Flow

1. Users place encrypted orders in the contract
2. The oracle retrieves orders through authenticated calls
3. The oracle identifies matching orders based on price and token
4. The oracle executes trades by calling `executeMatch` with appropriate parameters
5. The contract handles token transfers securely

## Key Improvements

This implementation addresses several issues found in the previous version:

1. **Authentication Robustness**: Uses the established ROFL app authentication pattern
2. **Oracle Access Control**: Only the designated oracle running in a TEE can access sensitive order data
3. **SIWE Authentication**: Provides secure authentication for users
4. **Socket-based Communication**: Uses the ROFL daemon socket for authentication instead of HTTP headers

## Running the Matcher

1. Set up your environment:
   ```bash
   source ./update_rofl_environment.sh YOUR_PRIVATE_KEY
   ```

2. Run the matcher once to test:
   ```bash
   bun roflswap_oracle_matching.py --once
   ```

3. Run the matcher continuously:
   ```bash
   bun roflswap_oracle_matching.py
   ```

## Troubleshooting

If you encounter issues:

1. Ensure your ROFL app is properly registered with Oasis
2. Check that the oracle address in the contract matches your address
3. Ensure you have the correct ROFL app ID in both the contract and environment
4. Verify that the ROFL daemon socket is accessible at `/run/rofl-appd.sock`

## Test Scripts

Several test scripts are available in the `contracts/scripts` directory:

- `deploy-roflswap-oracle.js`: Deploy the ROFLSwapOracle contract
- `place-oracle-order.js`: Place buy or sell orders in the contract
- `execute-oracle-match.js`: Manually execute a match between two orders
- `test-oracle-workflow.sh`: End-to-end testing workflow

## Configuration

The main configuration files are:

1. `update_rofl_environment.sh`: Environment variables for the matcher
2. `roflswap_oracle_matching.py`: The main matcher script
3. `rofl_auth.py`: ROFL authentication utility
4. `abi/ROFLSwapOracle.json`: Contract ABI 