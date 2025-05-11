# ROFLSwapV5 Working Scripts Guide

This document explains how to use the fixed scripts for interacting with ROFLSwapV5 and private tokens on Oasis Sapphire testnet.

## Overview

The following scripts have been fixed and improved to work reliably on the Oasis Sapphire testnet:

1. `wrap-tokens.js`: Wraps base tokens into private tokens
2. `place-buy-order.js`: Places a buy order for WATER tokens using FIRE tokens
3. `place-sell-order.js`: Places a sell order for WATER tokens to receive FIRE tokens
4. `check-order-status.js`: Checks the status of placed orders

## Key Improvements

- All scripts now work without requiring deployment files, using hardcoded contract addresses for the Sapphire testnet
- Fixed BigNumber comparison issues that were causing errors
- Updated the order placement to correctly use the `placeOrder` function with encrypted data
- Added better error handling and logging

## Usage Instructions

### Environment Setup

Make sure you have Bun installed (v1.2.9 or later):

```bash
bun --version
```

### 1. Wrapping Tokens

First, wrap base tokens into private tokens:

```bash
bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet
```

This script:
- Approves base tokens to be wrapped by the wrapper contracts
- Wraps WATER and FIRE tokens into their private versions
- Approves the wrapped tokens to be used by ROFLSwapV5

### 2. Placing Buy Orders

To place a buy order for WATER tokens (paying with FIRE tokens):

```bash
bun hardhat run scripts/place-buy-order.js --network sapphire-testnet
```

This script:
- Creates a buy order for 10 WATER tokens at a price of 1 FIRE token each
- Approves FIRE tokens to be used by ROFLSwapV5 if not already approved
- Encrypts the order data and submits it to the ROFLSwapV5 contract

### 3. Placing Sell Orders

To place a sell order for WATER tokens (to receive FIRE tokens):

```bash
bun hardhat run scripts/place-sell-order.js --network sapphire-testnet
```

This script:
- Creates a sell order offering 10 WATER tokens at a price of 1 FIRE token each
- Approves WATER tokens to be used by ROFLSwapV5 if not already approved
- Encrypts the order data and submits it to the ROFLSwapV5 contract

### 4. Checking Order Status

To check the status of your orders:

```bash
bun hardhat run scripts/check-order-status.js --network sapphire-testnet
```

This script:
- Attempts to check your private token balances (may fail due to privacy features)
- Lists all your orders and their status (open or filled)
- Shows the total number of orders in the system

## Hardcoded Contract Addresses

All scripts use the following contract addresses for the Sapphire testnet:

- ROFLSwapV5: `0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB`
- Base WATER Token: `0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4`
- Base FIRE Token: `0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C`
- Private WATER Token: `0x991a85943D05Abcc4599Fc8746188CCcE4019F04`
- Private FIRE Token: `0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977`

## Troubleshooting

### Unable to See Private Token Balances

Due to the privacy features of Oasis Sapphire, you might not be able to see your private token balances. This is expected behavior and doesn't mean that the operations failed.

### Order Matching

Orders are matched by the Trusted Execution Environment (TEE) in the background. You won't see immediate matching - check back using the `check-order-status.js` script to see if your orders have been matched.

### Network Issues

If you encounter network issues, make sure you're connecting to the Sapphire testnet correctly and have testnet tokens for gas. 