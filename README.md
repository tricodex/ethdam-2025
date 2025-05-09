# OceanSwap: Privacy-Preserving DEX with Oasis Sapphire & ROFL

OceanSwap is a privacy-preserving decentralized exchange built for the ETHDam hackathon, showcasing the power of Oasis Sapphire's confidential EVM and ROFL (Runtime Off-chain Logic) framework.

## Key Features

- **Full Privacy Trading**: OceanSwap provides end-to-end privacy for traders
- **Private Token Wrapping**: Wrap standard ERC20 tokens (WATER & FIRE) into private versions
- **Secure Off-chain Matching**: Trade matching happens securely inside a Trusted Execution Environment (TEE)
- **Hidden Orders & Balances**: No one can see your orders or token balances
- **Selective Disclosure**: Control who can see your financial information

## Project Structure

- **/contracts**: Smart contracts for OceanSwap, WATER token, and FIRE token
- **/ethdam-next**: Next.js frontend application
- **/rofl_app**: ROFL application for secure order matching

## Architecture Overview

OceanSwap consists of three main components:

1. **Smart Contracts (Sapphire EVM)**
   - OceanSwap.sol: Main contract for order submission and settlement
   - PrivateWrapper.sol: Wraps standard ERC20s into confidential versions
   - WaterToken.sol & FireToken.sol: Standard ERC20 token implementations

2. **ROFL Application (TEE)**
   - matching_engine.py: Matches buy and sell orders
   - settlement.py: Executes settlements on-chain
   - storage.py: Securely stores order and match data

3. **Frontend (Next.js)**
   - Built using Sapphire's Web3 wrappers for confidential transactions

## How It Works

1. **Token Wrapping**:
   - Users deposit standard WATER or FIRE tokens into the OceanSwap contract
   - These tokens get wrapped into private pWATER and pFIRE tokens
   - Balances of wrapped tokens are hidden from everyone except the owner

2. **Order Submission**:
   - Users submit encrypted orders to the OceanSwap contract
   - Order details (price, size, direction) are only visible inside the TEE

3. **Matching & Settlement**:
   - The ROFL app periodically retrieves and decrypts orders inside the TEE
   - Matching algorithm pairs compatible buy and sell orders
   - Settlement transactions are submitted back to the contract
   - Transfers happen using the private wrapped tokens

4. **Unwrapping**:
   - Users can unwrap their private tokens back to standard ERC20 tokens at any time

## Why Private Token Wrapping?

OceanSwap uses private token wrapping to ensure complete privacy throughout the trading lifecycle:

- **Hidden Balances**: No one can see how many tokens you hold
- **Invisible Transfers**: Token transfers between users remain confidential
- **Protected Positions**: Your trading positions remain private even after execution
- **Selective Disclosure**: Control who gets to see your balance information

This approach provides significantly stronger privacy guarantees compared to only encrypting order data.

## Getting Started

### Smart Contracts

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sapphire-testnet
```

### ROFL Application

```bash
cd rofl_app
pip install -r requirements.txt
export OCEANSWAP_ADDRESS="<deployed-contract-address>"
export PRIVATE_KEY="<your-private-key>"
python main.py
```

### Frontend

```bash
cd ethdam-next
npm install
npm run dev
```

## License

This project is licensed under the MIT License.
