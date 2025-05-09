# ROFLSwap: Privacy-Preserving DEX on Oasis Sapphire

ROFLSwap is a privacy-preserving decentralized exchange built on the Oasis Sapphire network. It uses ROFL (Runtime Off-chain Logic) for secure order matching in a Trusted Execution Environment (TEE).

## Deployed Contracts (Sapphire Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| ROFLSwapV2 | 0x552F5B746097219537F1041aA406c02F3474417A | Main exchange contract with ROFL integration |
| WaterToken | 0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D | Example ERC20 token (WATER) |
| FireToken | 0xE987534F8E431c2D0F6DDa8D832d8ae622c77814 | Example ERC20 token (FIRE) |
| ROFLSwapTester | 0xf79067DBf4063DbE25b1586E502E068Cd889E1F6 | Test contract for debugging |

## Key Features

- **Privacy-Preserving**: Order data is encrypted and only accessible within the TEE
- **Confidential State**: Uses Sapphire's confidential compute features
- **ROFL Integration**: Compatible with Oasis ROFL framework for TEE execution
- **Dark Pool**: Orders are matched privately without revealing information to the public

## Development Setup

```bash
# Install dependencies
bun install

# Compile contracts
bun hardhat compile

# Deploy contracts
bun hardhat run scripts/deploy-roflswap-v2.ts --network sapphire-testnet

# Test contracts
bun hardhat run scripts/test-roflswap-v2.ts --network sapphire-testnet
bun hardhat run scripts/test-roflswap-tester.ts --network sapphire-testnet
```

## Project Structure

- `contracts/`: Smart contract source code
- `scripts/`: Deployment and testing scripts
- `ROFL_INTEGRATION.md`: Detailed guide for ROFL app integration

## Important Notes on Sapphire Confidentiality

Due to Sapphire's confidential compute features, certain state is private:

- Orders are correctly tracked by owner in the contract's state
- Orders are correctly added to the user's array of orders 
- However, when users call `getMyOrders()`, they may get an empty array due to Sapphire's confidentiality
- Only the ROFL app (running in a TEE) can access the full order data

## ROFL App Integration

See `ROFL_INTEGRATION.md` for a detailed guide on how to integrate with the ROFL framework.

## License

UNLICENSED
