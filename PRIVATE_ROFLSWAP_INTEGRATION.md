# ROFLSwap Confidential ERC20 Integration Guide

This guide provides detailed instructions for integrating ROFLSwap with Confidential ERC20 tokens using Oasis Protocol's ROFL (Runtime Off-chain Logic) and Sapphire TEE (Trusted Execution Environment).

## Current Deployment

The system is currently deployed on Sapphire Testnet with the following addresses:

- **ROFLSwapV5**: `0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB`
- **ConfidentialBalanceRegistry**: `0x2a109409a9a3c5A51a8644c374ddd84DF7b44C80`
- **Private WATER Token**: `0x991a85943D05Abcc4599Fc8746188CCcE4019F04`
- **Private FIRE Token**: `0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977`
- **ROFL App ID**: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`

## Overview

ROFLSwapV5 is an enhancement to the original ROFLSwap dark pool that adds support for fully confidential token transfers using PrivateERC20 tokens. This creates a completely private decentralized exchange where:

1. Order details are encrypted on-chain
2. Order matching happens privately in the TEE
3. Token transfers are confidential through PrivateERC20
4. Balance visibility is controlled by permission

The result is a true dark pool where no information is leaked on-chain.

## Architecture

The system consists of the following components:

1. **ConfidentialBalanceRegistry**: Manages token ownership records with privacy controls
2. **PrivateERC20**: Privacy-enhanced ERC20 implementation that uses the registry
3. **PrivateWrapper**: Wrapper for existing tokens to make them private
4. **ROFLSwapV5**: Exchange contract that integrates with private tokens
5. **ROFL Application**: Trusted off-chain order matching and settlement executed in TEE

## ROFL App ID Synchronization

One of the key security features of ROFLSwapV5 is the `roflEnsureAuthorizedOrigin` check, which verifies that critical functions can only be called by the authorized ROFL app. This requires:

1. The contract must be deployed with the exact same ROFL app ID that is registered on-chain
2. If you create a new ROFL app or the app ID changes, you must redeploy the contract

### Deploying with the Correct ROFL App ID

```bash
# Check your current ROFL app ID
cd rofl_app
oasis rofl show

# Deploy with the correct app ID
cd ../contracts
bun hardhat run scripts/deploy-roflswap-v5-with-new-appid.js --network sapphire-testnet
```

## Deployment Process

### Step 1: Deploy the BalanceRegistry

The BalanceRegistry is the core component that tracks token ownership with privacy controls:

```bash
bun hardhat run scripts/deploy-balance-registry.js --network sapphire-testnet
```

This will deploy the registry and save the address in a deployment file.

### Step 2: Deploy PrivateERC20 Tokens

You can either deploy new PrivateERC20 tokens or wrap existing ones:

```bash
bun hardhat run scripts/deploy-private-tokens.js --network sapphire-testnet
```

This will deploy PrivateWrapper contracts for WATER and FIRE tokens and save the addresses.

### Step 3: Deploy ROFLSwapV5

Deploy the exchange contract that supports PrivateERC20 tokens:

```bash
bun hardhat run scripts/deploy-roflswap-v5-with-new-appid.js --network sapphire-testnet
```

After deployment, request privacy access:

```bash
bun hardhat request-privacy:v5 --contract 0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB --network sapphire-testnet
```

### Step 4: Update ROFL App

Update the ROFL app with the necessary secrets:

```bash
cd ../rofl_app

# Set ROFLSwapV5 contract address
echo -n "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB" | oasis rofl secret set ROFLSWAP_ADDRESS -

# Set ROFL App ID
echo -n "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972" | oasis rofl secret set ROFL_APP_ID -

# Set Web3 Provider URL
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -

# Update and restart
oasis rofl update --account myaccount
oasis rofl machine restart
```

## Token Approvals Process

For ROFLSwapV5 to work properly, users need to:

1. Wrap their base tokens into private tokens:
   ```bash
   bun hardhat wrap:v5 --token water --amount 100 --network sapphire-testnet
   ```

2. Approve the ROFLSwapV5 contract to spend their private tokens:
   ```bash
   bun hardhat approve:v5 --token water --network sapphire-testnet
   ```

## Testing the TEE Order Matcher

To ensure that the TEE order matching functionality is working correctly, we've created a comprehensive set of testing scripts.

### Automated Testing Workflow

The easiest way to test is to use our automated testing workflow:

```bash
# Set environment variables for buyer and seller
export PRIVATE_KEY=your_buyer_private_key_here
export PRIVATE_KEY_SELLER=your_seller_private_key_here

# Run the testing workflow
cd contracts
./scripts/test-order-matching-workflow.sh
```

This script performs the following steps:
1. Checks the ROFL app status and configuration
2. Prepares accounts by minting and wrapping tokens
3. Places matching buy and sell orders
4. Verifies if the matching was successful

### Checking ROFL App Status

To diagnose potential TEE issues, you can use the app status checker:

```bash
cd contracts
bun hardhat run scripts/check-rofl-app-status.js --network sapphire-testnet
```

This tool checks:
- If the ROFL app ID matches the deployment configuration
- If the ROFL machine is running properly
- If all required secrets are set correctly
- Provides troubleshooting advice for common issues

### Preparing Test Accounts

To prepare accounts with tokens for testing:

```bash
cd contracts
bun hardhat run scripts/prepare-accounts-for-testing.js --network sapphire-testnet
```

This script:
- Mints base tokens for both accounts
- Wraps tokens into their private versions 
- Checks balances to ensure they're sufficient for testing

### Testing Order Matching

To specifically test the order matching functionality:

```bash
cd contracts
bun hardhat run scripts/test-tee-order-matching.js --network sapphire-testnet
```

This script:
- Places a buy order from one account
- Places a matching sell order from another account
- Waits for the TEE to process the matching
- Checks if the balances changed, indicating successful matching
- Provides detailed diagnostic information if matching fails

## Order Serialization Format

Orders in ROFLSwapV5 use a specific ABI encoding format to ensure proper decryption in the TEE:

```javascript
// JavaScript/Solidity order encoding
function encodeOrder(order) {
  return ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
    [
      order.orderId,
      order.owner,
      order.token,
      order.price,
      order.size,
      order.isBuy
    ]
  );
}
```

```python
# Python order decoding in ROFL
def decode_order(encoded_data):
    return eth_abi.decode(
        ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
        encoded_data
    )
```

## Running the ROFL App

The ROFL app runs in a Trusted Execution Environment (TEE) on the Oasis network:

```bash
# Check if the app is running
oasis rofl show
oasis rofl machine show
```

The app automatically:
1. Loads orders from the contract
2. Finds matches based on price and token
3. Executes matches that have proper approvals

## Troubleshooting

### Common Issues

1. **ROFL App ID Mismatch**: If the contract was deployed with a different ROFL app ID than the registered one, the `roflEnsureAuthorizedOrigin` check will fail. Redeploy the contract with the correct ID.

2. **Token Approval Failures**: Check allowances and ensure users have approved the ROFLSwapV5 contract.

3. **Order Deserialization Errors**: Verify the order encoding format matches between client and ROFL app.

4. **TEE Decryption Mechanism**: The ROFL app automatically handles decryption when running in the TEE environment.

5. **Permission Model**: Ensure the ROFLSwapV5 contract has requested access to private tokens via `requestPrivacyAccess()`.

6. **ROFL Machine Not Running**: Check if the ROFL machine is stopped and restart it with `oasis rofl machine restart`.

7. **Missing or Incorrect Secrets**: Verify all required secrets are set with `oasis rofl secret list`.

### Diagnosing TEE Issues

When the TEE order matcher doesn't seem to be working:

1. Run the comprehensive status checker:
   ```bash
   bun hardhat run scripts/check-rofl-app-status.js --network sapphire-testnet
   ```

2. Check the ROFL app logs (if available):
   ```bash
   oasis rofl logs
   ```

3. Verify that orders are being properly placed:
   ```bash
   # Connect to the console
   bun hardhat console --network sapphire-testnet
   
   # In the console
   const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
   const roflSwap = ROFLSwapV5.attach("0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB");
   const orderCount = await roflSwap.getOrderCount();
   console.log(`Order count: ${orderCount}`);
   ```

4. If necessary, update the ROFL machine and restart:
   ```bash
   oasis rofl update --account myaccount
   oasis rofl machine restart
   ```

## Security Considerations

1. **Privacy Guarantees**: While the token transfers are confidential, metadata like transaction timing may still leak information.

2. **TEE Security**: Remember that the security model relies on the integrity of the TEE implementation.

3. **Approval Risks**: Users should be cautious about unlimited token approvals.

4. **ROFL App ID Validation**: The contract's `roflEnsureAuthorizedOrigin` check provides an important security guarantee that only the authorized ROFL app can trigger sensitive operations.

## Next Steps

1. Implement token balance caching in the ROFL app for better performance

2. Add support for partial order fills

3. Create a frontend that demonstrates the private token workflow

4. Add multi-hop order routing for complex trades

For more information, refer to the Oasis documentation on ROFL and Sapphire. 