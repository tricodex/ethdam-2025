# ROFLSwapV5 Testing Guide

This guide shows how to test the ROFLSwapV5 exchange with private tokens using Oasis Sapphire's privacy features.

## Requirements

- Bun v1.2.9 or later
- Access to Oasis Sapphire Testnet
- Private keys with testnet tokens

## Setup Environment Variables

Create a `.env` file with your private keys:

```bash
PRIVATE_KEY=your_buyer_private_key
PRIVATE_KEY_SELLER=your_seller_private_key  # Optional for second account
```

## Testing Workflow

The testing has been broken down into simple, focused scripts to make debugging easier:

### 1. Wrap Base Tokens into Private Tokens

Before placing orders, you need to wrap base tokens into private tokens:

```bash
bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet
```

This script will:
- Check your base token balances
- Mint base tokens if needed
- Approve the private wrapper contracts
- Wrap tokens into private versions

### 2. Place Buy Orders

To place a buy order:

```bash
bun hardhat run scripts/place-buy-order.js --network sapphire-testnet
```

This creates a buy order for WATER tokens using FIRE tokens as payment.

### 3. Place Sell Orders

To place a sell order:

```bash
bun hardhat run scripts/place-sell-order.js --network sapphire-testnet
```

This creates a sell order for WATER tokens to receive FIRE tokens.

### 4. Check Order Status

To check if orders have been matched:

```bash
bun hardhat run scripts/check-order-status.js --network sapphire-testnet
```

This displays:
- Current token balances
- Recent orders and their status
- Current order book status
- Next steps based on current state

## Troubleshooting

### Common Issues

1. **Wrapping Error**: If you see `unsupported addressable value (argument="target", value=null, code=INVALID_ARGUMENT, version=6.14.0)`, make sure you're using the `wrap()` function from the `PrivateWrapper` contract, not `deposit()`.

2. **Privacy Limitations**: Due to privacy features, you might not be able to see token balances. This is expected behavior and doesn't mean the operation failed.

3. **Order Matching**: Orders don't match instantly. The TEE (Trusted Execution Environment) processes them periodically. Check status using the `check-order-status.js` script.

### Oasis ROFL Commands

You can also check the status of the ROFLSwap application using Oasis CLI:

```bash
# Show ROFL application status
oasis rofl show

# Show ROFL machine status 
oasis rofl machine show
```

## Testing with Hardhat Tasks

If you prefer using Hardhat tasks:

```bash
# Create a buy order
bun hardhat create-order:v5 --type buy --token water --price "1" --size "10" --network sapphire-testnet

# Create a sell order
bun hardhat create-order:v5 --type sell --token water --price "1" --size "10" --network sapphire-testnet
```

## Script Details

- `wrap-tokens.js`: Wraps base tokens into private tokens
- `place-buy-order.js`: Places a buy order for tokens
- `place-sell-order.js`: Places a sell order for tokens
- `check-order-status.js`: Checks order status without waiting 