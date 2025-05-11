# ROFLSwapV5: Confidential ERC20 DEX

ROFLSwapV5 is a fully private decentralized exchange built on Oasis Sapphire's confidential EVM. It integrates ROFL (Runtime Off-chain Logic) with PrivateERC20 tokens to create a completely confidential trading experience where:

- Order details remain encrypted on-chain
- Order matching happens privately in Trusted Execution Environment (TEE)
- Token transfers are fully private using confidential ERC20 tokens
- No transaction information is leaked on-chain

## Current Deployment

The system is currently deployed on Sapphire Testnet with the following addresses:

- **ROFLSwapV5**: `0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB`
- **ConfidentialBalanceRegistry**: `0x2a109409a9a3c5A51a8644c374ddd84DF7b44C80`
- **Private WATER Token**: `0x991a85943D05Abcc4599Fc8746188CCcE4019F04`
- **Private FIRE Token**: `0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977`
- **ROFL App ID**: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`

## Prerequisites

- Bun v1.2.9 or later
- Hardhat
- Oasis Sapphire SDK
- Private key with testnet ROSE tokens
- Oasis CLI for ROFL app management

## ROFL App ID Synchronization

**Important**: The ROFLSwapV5 contract uses the `roflEnsureAuthorizedOrigin` check which requires the contract to be deployed with the exact same ROFL app ID that is registered on-chain. If you create a new ROFL app or the app ID changes, you must redeploy the contract with the updated ID.

### Redeploying with a New ROFL App ID

```bash
# Check your current ROFL app ID
cd rofl_app
oasis rofl show

# Deploy ROFLSwapV5 with the new app ID
cd ../contracts
bun hardhat run scripts/deploy-roflswap-v5-with-new-appid.js --network sapphire-testnet

# Request privacy access for the new contract
bun hardhat request-privacy:v5 --contract NEW_CONTRACT_ADDRESS --network sapphire-testnet

# Update the ROFL app with the new contract address
cd ../rofl_app
echo -n "NEW_CONTRACT_ADDRESS" | oasis rofl secret set ROFLSWAP_ADDRESS -
oasis rofl update --account myaccount
oasis rofl machine restart
```

## Quick Start Deployment

We've created a set of Hardhat tasks to simplify deployment:

```bash
# Set environment variables
export PRIVATE_KEY=your_private_key_here
export ROFL_APP_ID=your_rofl_app_id

# Deploy all components at once
bun hardhat deploy:v5 --network sapphire-testnet
```

## Step-by-Step Deployment

For more control, you can deploy each component separately:

### 1. Deploy BalanceRegistry and Private Tokens

```bash
# Deploy BalanceRegistry
bun hardhat deploy:v5 --network sapphire-testnet

# Or if you want to use an existing registry:
bun hardhat deploy:v5 --network sapphire-testnet --registry 0xYourBalanceRegistryAddress
```

### 2. Wrap Base Tokens into Private Tokens

```bash
# Mint and wrap WATER tokens
bun hardhat wrap:v5 --network sapphire-testnet --token water --amount 1000

# Mint and wrap FIRE tokens
bun hardhat wrap:v5 --network sapphire-testnet --token fire --amount 1000
```

### 3. Approve Tokens for ROFLSwapV5

```bash
# Approve WATER tokens
bun hardhat approve:v5 --network sapphire-testnet --token water

# Approve FIRE tokens
bun hardhat approve:v5 --network sapphire-testnet --token fire
```

### 4. Place Orders

```bash
# Place a buy order
bun hardhat place-order:v5 --network sapphire-testnet --token water --price 1 --size 10 --type buy

# Place a sell order
bun hardhat place-order:v5 --network sapphire-testnet --token water --price 1 --size 10 --type sell
```

## ROFL App Integration

After deployment, update your ROFL app with the contract address and required secrets:

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

## Testing TEE Order Matching

We've created comprehensive tools to test that the TEE order matching is working correctly. These tools help diagnose and troubleshoot any issues with the order matching process.

### Quick Testing Workflow

Run our all-in-one testing script:

```bash
# Set environment variables for buyer and seller
export PRIVATE_KEY=your_buyer_private_key_here
export PRIVATE_KEY_SELLER=your_seller_private_key_here

# Run the testing workflow
cd contracts
./scripts/test-order-matching-workflow.sh
```

This script runs through the following steps:
1. Checks ROFL app status and configuration
2. Prepares both buyer and seller accounts with tokens
3. Places matching buy and sell orders
4. Monitors for successful matches

### Individual Testing Components

For more granular testing, you can run each script individually:

#### 1. Check ROFL App Status

This script checks that your ROFL app is correctly configured and running:

```bash
bun hardhat run scripts/check-rofl-app-status.js --network sapphire-testnet
```

It verifies:
- ROFL app ID matches contract deployment
- ROFL machine is running properly
- Required secrets are set correctly

#### 2. Prepare Testing Accounts

This script prepares both buyer and seller accounts with private tokens:

```bash
bun hardhat run scripts/prepare-accounts-for-testing.js --network sapphire-testnet
```

It:
- Mints base tokens if necessary
- Wraps tokens into their private versions
- Verifies balances are sufficient for testing

#### 3. Test Order Matching

This script tests the actual TEE order matching functionality:

```bash
bun hardhat run scripts/test-tee-order-matching.js --network sapphire-testnet
```

It:
- Places a buy order from the buyer account
- Places a matching sell order from the seller account
- Waits for the TEE to process the orders
- Checks balances to confirm if matching occurred
- Provides diagnostic information if matching fails

## Troubleshooting

Common issues:

1. **ROFL App ID Mismatch**: If the contract's ROFL app ID doesn't match the actual app ID, the `roflEnsureAuthorizedOrigin` check will fail. Redeploy the contract with the correct ID.
2. **Privacy Access Errors**: Manually call the `requestPrivacyAccess()` function on ROFLSwapV5
3. **Token Approval Issues**: Check approval with the console: `bun hardhat console --network sapphire-testnet`
4. **Sapphire Compatibility Issues**: Ensure you're using `@oasisprotocol/sapphire-hardhat` correctly
5. **TEE Order Matching Failures**: Run the `check-rofl-app-status.js` script to diagnose issues

## Sapphire-Specific Considerations

Remember these important aspects when working with Sapphire:

1. **Encrypted Transactions**: Sapphire automatically encrypts transactions for privacy
2. **Storage Access Limitations**: Direct storage access is not allowed in Sapphire
3. **Proxy Implementation**: Only implement EIP-1822 directly, avoid using openzeppelin-upgrades
4. **Order of Operations**: Be careful about the order of error checking to avoid leaking information

## License

This project is licensed under the MIT License. 