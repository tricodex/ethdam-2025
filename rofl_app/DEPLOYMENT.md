# OceanSwap ROFL Deployment Guide

This guide provides step-by-step instructions for deploying the OceanSwap DEX system, including the Sapphire smart contracts and the ROFL (Runtime Off-chain Logic) application that enables private order matching in a Trusted Execution Environment (TEE).

## Prerequisites

- Oasis CLI installed ([Download here](https://github.com/oasisprotocol/cli/releases))
- Docker installed (for building the ROFL bundle)
- Node.js and Bun (for smart contract deployment)
- An Oasis wallet with TEST tokens (for testnet) or ROSE tokens (for mainnet)

## 1. Set Up Your Oasis Wallet

If you don't already have an Oasis wallet:

```bash
# Create a new wallet with an Ethereum-compatible address for Sapphire
oasis wallet create myaccount --file.algorithm secp256k1-bip44
```

For testnet deployment, fund your wallet with TEST tokens:
- Visit the Oasis Testnet Faucet
- Join the Oasis Discord (#dev-central channel) to request tokens
- You'll need approximately 110 TEST tokens (100 for ROFL registration + 10 for gas fees)

## 2. Deploy Smart Contracts to Sapphire

Navigate to the contracts directory and install dependencies:

```bash
cd ../contracts
bun install
```

Update your `.env` file with your private key:
```
PRIVATE_KEY="your_private_key_here"
```

Compile the contracts:
```bash
bunx hardhat compile
```

Deploy the contracts to Sapphire Testnet:
```bash
bunx hardhat run scripts/deploy.ts --network sapphire-testnet
```

This will deploy:
1. WaterToken and FireToken (standard ERC20 tokens)
2. OceanSwap contract (with private wrapped token versions pWaterToken and pFireToken)

After deployment, note the contract addresses in the generated `deployment-sapphire-testnet.json` file.

## 3. Initialize the ROFL Application

Navigate to the ROFL app directory:
```bash
cd ../rofl_app
```

Initialize a new ROFL app and register it on the Sapphire Testnet:
```bash
oasis rofl init
oasis rofl create --network testnet --account myaccount
```

Note the ROFL App ID that is generated (format: `rofl1xxxxxxx...`).

## 4. Configure the OceanSwap Contract with the ROFL App ID

After obtaining your ROFL App ID, you need to set it in the OceanSwap contract:

1. Run the setup script to register your ROFL App ID with the OceanSwap contract:
```bash
cd ../contracts
bunx hardhat run scripts/set-rofl-app.ts --network sapphire-testnet
```

Alternatively, you can interact with the contract directly:
```bash
# Using hardhat console
bunx hardhat console --network sapphire-testnet
> const oceanSwap = await ethers.getContractAt("OceanSwap", "YOUR_OCEANSWAP_ADDRESS");
> await oceanSwap.setRoflApp("YOUR_ROFL_APP_ID");
```

## 5. Create ABI Directory

The ROFL app needs access to the contract ABIs:

```bash
cd ../rofl_app
mkdir -p abi
cp ../contracts/artifacts/contracts/OceanSwap.sol/OceanSwap.json abi/
cp ../contracts/artifacts/contracts/confidentialERC20/PrivateERC20.sol/PrivateERC20.json abi/
```

## 6. Set Environment Variables as ROFL Secrets

Set up the required environment variables as encrypted ROFL secrets:

```bash
# Set OceanSwap contract address
echo -n "YOUR_OCEANSWAP_ADDRESS" | oasis rofl secret set OCEANSWAP_ADDRESS -

# Set Web3 provider URL
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -

# Set private key for transactions (in actual production, this should be managed by the TEE)
echo -n "YOUR_PRIVATE_KEY" | oasis rofl secret set PRIVATE_KEY -
```

## 7. Build and Deploy the ROFL App

Build the ROFL bundle:

```bash
# On Linux:
oasis rofl build

# On macOS/Windows:
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

Update the ROFL policy on-chain with the built bundle's signature:

```bash
oasis rofl update --network testnet --account myaccount
```

Deploy the ROFL app to a Testnet node:

```bash
oasis rofl deploy --network testnet --account myaccount
```

## 8. Verify the ROFL Deployment

Check that your ROFL app is running:

```bash
oasis rofl machine show
```

You should see your ROFL app instance listed with its Runtime Attestation Key (RAK).

## 9. Testing the System

Once deployed, you can test the system:

1. Mint some WaterToken and FireToken
2. Wrap them using the OceanSwap contract's `wrapTokens` function
3. Place encrypted orders using the `placeOrder` function
4. The ROFL app should detect these orders, match them, and execute trades

## 10. Monitoring and Maintenance

- Check logs: `oasis rofl machine logs`
- Restart the ROFL app: `oasis rofl machine restart`
- Update configuration: `oasis rofl update --network testnet --account myaccount`

## Production Deployment

For production deployment:

1. Use Oasis Sapphire Mainnet instead of Testnet
2. Ensure sufficient ROSE tokens for deployment and gas fees
3. Update network parameters in all commands from `testnet` to `mainnet`
4. Use a more secure key management strategy for production private keys

## Troubleshooting

- If the ROFL app fails to start, check the logs with `oasis rofl machine logs`
- Ensure all contract ABIs are correctly placed in the `abi` directory
- Verify that the OceanSwap contract has the correct ROFL App ID set
- Check that all environment variables are correctly set as ROFL secrets

## Security Considerations

- The ROFL app runs inside a TEE, keeping all order information confidential
- Private keys should be managed securely (in production, leverage the TEE's key management)
- All encryption/decryption happens inside the TEE
- Matching logic runs off-chain in the TEE, preventing front-running attacks 