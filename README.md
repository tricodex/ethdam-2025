# ROFLSwap/ROFLSwap: Privacy-Preserving DEX with Oasis Sapphire & ROFL

ROFLSwap (also known as ROFLSwap in parts of the codebase) is a privacy-preserving decentralized exchange built for the ETHDam hackathon, showcasing the power of Oasis Sapphire's confidential EVM and ROFL (Runtime Off-chain Logic) framework.

> ⚠️ **Important Update**: The project has been renamed from ROFLSwap to ROFLSwap in some files for better consistency with the Oasis ROFL framework. The functionality remains the same. Look for both names in the codebase.

## Quick Start for Authentication Fix

If you're encountering authentication issues between the ROFL app and the smart contract, see the [Authentication Fix Guide](./AUTHENTICATION_FIX.md) for step-by-step instructions on resolving the issue.

## Key Features

- **Full Privacy Trading**: ROFLSwap provides end-to-end privacy for traders
- **Private Token Wrapping**: Wrap standard ERC20 tokens (WATER & FIRE) into private versions
- **Secure Off-chain Matching**: Trade matching happens securely inside a Trusted Execution Environment (TEE)
- **Hidden Orders & Balances**: No one can see your orders or token balances
- **Selective Disclosure**: Control who can see your financial information

## Project Structure

- **/contracts**: Smart contracts for ROFLSwap, WATER token, and FIRE token
- **/ethdam-next**: Next.js frontend application
- **/rofl_app**: ROFL application for secure order matching

## Architecture Overview

ROFLSwap consists of three main components:

1. **Smart Contracts (Sapphire EVM)**
   - ROFLSwapV2.sol: Main contract for order submission and settlement
   - PrivateWrapper.sol: Wraps standard ERC20s into confidential versions
   - WaterToken.sol & FireToken.sol: Standard ERC20 token implementations

2. **ROFL Application (TEE)**
   - matching_engine.py: Matches buy and sell orders
   - settlement.py: Executes settlements on-chain
   - storage.py: Securely stores order and match data

3. **Frontend (Next.js)**
   - Built using Sapphire's Web3 wrappers for confidential transactions

## Deployed Contracts

| Contract | Address | Network |
|----------|---------|---------|
| ROFLSwapV2 | 0x552F5B746097219537F1041aA406c02F3474417A | Sapphire Testnet |
| WaterToken | 0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D | Sapphire Testnet |
| FireToken | 0xE987534F8E431c2D0F6DDa8D832d8ae622c77814 | Sapphire Testnet |

## ROFL App Details

- **ROFL App ID**: rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3
- **Machine ID**: 0000000000000026
- **Provider**: oasis1qp2ens0hsp7gh23wajxa4hpetkdek3swyyulyrmz

## How It Works

1. **Token Wrapping**:
   - Users deposit standard WATER or FIRE tokens into the ROFLSwap contract
   - These tokens get wrapped into private pWATER and pFIRE tokens
   - Balances of wrapped tokens are hidden from everyone except the owner

2. **Order Submission**:
   - Users submit encrypted orders to the ROFLSwap contract
   - Order details (price, size, direction) are only visible inside the TEE

3. **Matching & Settlement**:
   - The ROFL app periodically retrieves and decrypts orders inside the TEE
   - Matching algorithm pairs compatible buy and sell orders
   - Settlement transactions are submitted back to the contract
   - Transfers happen using the private wrapped tokens

4. **Unwrapping**:
   - Users can unwrap their private tokens back to standard ERC20 tokens at any time

## Why Private Token Wrapping?

ROFLSwap uses private token wrapping to ensure complete privacy throughout the trading lifecycle:

- **Hidden Balances**: No one can see how many tokens you hold
- **Invisible Transfers**: Token transfers between users remain confidential
- **Protected Positions**: Your trading positions remain private even after execution
- **Selective Disclosure**: Control who gets to see your balance information

This approach provides significantly stronger privacy guarantees compared to only encrypting order data.

## Getting Started

### Smart Contracts

```bash
cd contracts
bun install
bunx hardhat compile
bunx hardhat run scripts/deploy.ts --network sapphire-testnet
```

### ROFL Application

```bash
cd rofl_app
pip install -r requirements.txt

# Set up the required environment variables
echo -n "0x552F5B746097219537F1041aA406c02F3474417A" | oasis rofl secret set ROFLSWAP_ADDRESS -
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
echo -n "<your-private-key>" | oasis rofl secret set PRIVATE_KEY -

# Verify the ROFL app address matches the contract's roflApp address
python verify_address.py

# Update the contract's roflApp address if needed
cd ../contracts
bunx hardhat run scripts/update-rofl-app.ts --network sapphire-testnet
```

### Frontend

```bash
cd ethdam-next
npm install
npm run dev
```

## Troubleshooting

If you encounter issues with the ROFL app authentication, follow these steps:

1. **Verify the addresses match**:
   ```bash
   cd rofl_app
   python verify_address.py
   ```

2. **Update the contract's roflApp address**:
   ```bash
   cd contracts
   bunx hardhat run scripts/update-rofl-app.ts --network sapphire-testnet
   ```

3. **Restart the ROFL app**:
   ```bash
   oasis rofl machine restart
   ```

4. **Check the ROFL app logs**:
   ```bash
   oasis rofl machine logs
   ```

For more detailed troubleshooting, see the [Authentication Fix Guide](./AUTHENTICATION_FIX.md).

## License

This project is licensed under the MIT License.
