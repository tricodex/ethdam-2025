# ROFLSwapV5 and PrivateERC20 Deployment Guide

This document provides a step-by-step guide to deploy the ROFLSwapV5 contract and the confidential ERC20 tokens using Oasis Sapphire.

## Current Deployment

The system is currently deployed on Sapphire Testnet with the following addresses:

- **ROFLSwapV5**: `0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB`
- **ConfidentialBalanceRegistry**: `0x2a109409a9a3c5A51a8644c374ddd84DF7b44C80`
- **Private WATER Token**: `0x991a85943D05Abcc4599Fc8746188CCcE4019F04`
- **Private FIRE Token**: `0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977`
- **ROFL App ID**: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`

## Prerequisites

1. Make sure you have the following installed:
   - Bun (v1.2.9 or later)
   - Hardhat
   - Oasis Sapphire SDK
   - Oasis CLI for ROFL app management

2. Set up your environment variables:
   ```bash
   # Create a .env file in the contracts directory
   echo "PRIVATE_KEY=your_private_key_here" > contracts/.env
   echo "SAPPHIRE_TESTNET_RPC_URL=https://testnet.sapphire.oasis.io" >> contracts/.env
   echo "ROFL_APP_ID=rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972" >> contracts/.env
   ```

3. Install dependencies:
   ```bash
   cd contracts
   bun install
   ```

## ROFL App ID Synchronization

The ROFLSwapV5 contract uses the `roflEnsureAuthorizedOrigin` check which requires the contract to be deployed with the exact same ROFL app ID that is registered on-chain. This ensures that only the authorized ROFL app can execute privileged functions.

### Creating a ROFL App

If you need to create a new ROFL app:

```bash
cd rofl_app
oasis rofl init
oasis rofl create --network testnet --account myaccount
```

This will create a new ROFL app with a unique ID. Note this ID for deployment.

### Redeploying with a New ROFL App ID

If your ROFL app ID changes, you must redeploy the ROFLSwapV5 contract with the updated ID:

```bash
# Deploy with the new app ID
cd contracts
bun hardhat run scripts/deploy-roflswap-v5-with-new-appid.js --network sapphire-testnet

# Request privacy access for the new contract
bun hardhat request-privacy:v5 --contract 0xYourNewContractAddress --network sapphire-testnet
```

## Deployment Steps

Follow these steps in order to deploy the full confidential DEX system:

### 1. Deploy the ConfidentialBalanceRegistry

The BalanceRegistry is the foundation for the confidential tokens.

```bash
cd contracts
bun hardhat run scripts/deploy-balance-registry.js --network sapphire-testnet
```

This will:
- Deploy the ConfidentialBalanceRegistry contract
- Save the deployment information to `balance-registry-deployment-sapphire-testnet.json`
- Output the contract address to the console

### 2. Deploy the Private Token Wrappers

Next, deploy the private wrapper tokens for WATER and FIRE.

```bash
bun hardhat run scripts/deploy-private-tokens.js --network sapphire-testnet
```

If the script can't find the BalanceRegistry address in the deployment file, you can specify it:

```bash
bun hardhat run scripts/deploy-private-tokens.js --network sapphire-testnet -- --registry 0xYourBalanceRegistryAddress
```

This will:
- Check if base tokens (WATER and FIRE) already exist or deploy new ones
- Deploy the PrivateWrapper contracts for WATER and FIRE
- Save the deployment information to `private-tokens-deployment-sapphire-testnet.json`

### 3. Deploy the ROFLSwapV5 Contract

Now deploy the confidential DEX contract with the correct ROFL app ID:

```bash
bun hardhat run scripts/deploy-roflswap-v5-with-new-appid.js --network sapphire-testnet
```

This script:
- Uses the ROFL app ID `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
- Deploys the ROFLSwapV5 contract using the private tokens
- Saves the deployment information to `roflswap-v5-deployment-sapphire-testnet.json`

After deployment, request privacy access:

```bash
bun hardhat request-privacy:v5 --contract 0xYourNewContractAddress --network sapphire-testnet
```

### 4. Update ROFL App Configuration

After deploying the contract, update your ROFL app with the necessary secrets:

```bash
cd ../rofl_app

# Set ROFLSwapV5 contract address
echo -n "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB" | oasis rofl secret set ROFLSWAP_ADDRESS -

# Set ROFL App ID (must match the one used in contract deployment)
echo -n "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972" | oasis rofl secret set ROFL_APP_ID -

# Set Web3 Provider URL
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -

# Update the ROFL app configuration
oasis rofl update --account myaccount

# Restart the ROFL machine to apply changes
oasis rofl machine restart
```

### 5. Approve Private Tokens for ROFLSwapV5

For your account to use the DEX, you need to approve the tokens:

```bash
cd ../contracts

# Approve WATER token
bun hardhat approve:v5 --token water --network sapphire-testnet

# Approve FIRE token
bun hardhat approve:v5 --token fire --network sapphire-testnet
```

You can also specify a limited amount instead of unlimited:

```bash
bun hardhat approve:v5 --token water --amount 1000 --network sapphire-testnet
```

## Testing the Deployment

You can test your deployment by placing an encrypted order:

```bash
cd contracts
bun hardhat place-order:v5 --token water --price 1 --size 10 --type buy --network sapphire-testnet
```

To check if your ROFL app is running correctly:

```bash
cd ../rofl_app
oasis rofl show
oasis rofl machine show
```

## Troubleshooting

### Common Issues

1. **ROFL App ID Mismatch**:
   - If the contract was deployed with a different ROFL app ID than the one that's registered, the `roflEnsureAuthorizedOrigin` check will fail.
   - Solution: Redeploy the ROFLSwapV5 contract with the correct ROFL app ID.

2. **Privacy Access Errors**:
   - If you see errors about privacy access, manually call the `requestPrivacyAccess()` function on the ROFLSwapV5 contract.
   - Solution: `bun hardhat request-privacy:v5 --contract YOUR_CONTRACT_ADDRESS --network sapphire-testnet`

3. **Token Approval Issues**:
   - Check that your tokens were properly approved by running:
     ```bash
     bun hardhat console --network sapphire-testnet
     ```
     Then in the console:
     ```javascript
     const token = await ethers.getContractAt("PrivateERC20", "PRIVATE_TOKEN_ADDRESS");
     const allowance = await token.allowance("YOUR_ADDRESS", "ROFLSWAP_ADDRESS");
     console.log(ethers.formatEther(allowance));
     ```

4. **ROFL App Secrets**:
   - If your ROFL app isn't working correctly, check that all required secrets are set.
   - Solution: Use `oasis rofl show` to verify your secrets are set.

### Verifying Contract Deployment

To verify the contracts were deployed correctly:

```bash
# Check if you can interact with the ROFLSwapV5 contract
bun hardhat console --network sapphire-testnet
```

In the console:
```javascript
const roflSwap = await ethers.getContractAt("ROFLSwapV5", "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB");
const tokens = await roflSwap.getTokens();
console.log("Water token:", tokens[0]);
console.log("Fire token:", tokens[1]);
```

## Sapphire-Specific Considerations

Remember these important aspects when working with Sapphire:

1. **Encrypted Transactions**: Sapphire automatically encrypts transactions for privacy
2. **Storage Access Limitations**: Direct storage access is not allowed in Sapphire
3. **Proxy Implementation**: Only implement EIP-1822 directly, avoid using openzeppelin-upgrades
4. **Order of Operations**: Be careful about the order of error checking to avoid leaking information 