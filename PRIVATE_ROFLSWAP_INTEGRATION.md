# ROFLSwap Confidential ERC20 Integration Guide

This guide provides detailed instructions for integrating ROFLSwap with Confidential ERC20 tokens using Oasis Protocol's ROFL (Runtime Off-chain Logic) and Sapphire TEE (Trusted Execution Environment).

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

## Deployment Process

### Step 1: Deploy the BalanceRegistry

The BalanceRegistry is the core component that tracks token ownership with privacy controls:

```bash
npx hardhat run scripts/deploy-balance-registry.js --network sapphire-testnet
```

This will deploy the registry and save the address in a deployment file.

### Step 2: Deploy PrivateERC20 Tokens

You can either deploy new PrivateERC20 tokens or wrap existing ones:

```bash
npx hardhat run scripts/deploy-private-tokens.js --network sapphire-testnet
```

This will deploy PrivateWrapper contracts for WATER and FIRE tokens and save the addresses.

### Step 3: Deploy ROFLSwapV5

Deploy the exchange contract that supports PrivateERC20 tokens:

```bash
npx hardhat run scripts/deploy-roflswap-v5.js --network sapphire-testnet --rofl-app-id your_rofl_app_id
```

This will deploy the ROFLSwapV5 contract with the private tokens and request privacy access.

### Step 4: Update ROFL App

Update the ROFL app to use the new contract and support PrivateERC20:

1. Update the ROFL app configuration with the new contract address:
   ```bash
   oasis rofl update --network testnet --account myaccount
   ```

2. Update the ROFL app code to use the enhanced matching and settlement logic:
   ```bash
   cd rofl_app
   # Update the code with the new contract address
   # See matching_engine_v5.py and settlement_v5.py
   ```

## Token Approvals Process

For ROFLSwapV5 to work properly, users need to:

1. Wrap their base tokens into private tokens:
   ```
   npx hardhat run scripts/wrap-tokens.js --network sapphire-testnet --token water --amount 100
   ```

2. Approve the ROFLSwapV5 contract to spend their private tokens:
   ```
   npx hardhat run scripts/approve-private-tokens.js --network sapphire-testnet --token water --amount 100
   ```

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

The enhanced ROFL app (main_v5.py) can be run as follows:

```bash
# Set required environment variables
export ROFLSWAP_ADDRESS="0x..."
export PRIVATE_KEY="0x..."
export ROFL_APP_ID="rofl1..."

# Run the app
python main_v5.py
```

This will:
1. Load orders from the contract
2. Find matches based on price and token
3. Check token approvals for each match
4. Execute matches that have proper approvals

## Testing the Integration

A comprehensive test suite is provided in `test/PrivateROFLSwap.test.js`:

```bash
npx hardhat test test/PrivateROFLSwap.test.js
```

For testing on a live network:

1. Deploy the contracts
2. Place test orders:
   ```bash
   npx hardhat run scripts/place-private-order.js --network sapphire-testnet --buy --token [TOKEN_ADDRESS] --price 1 --size 10
   ```
3. Run the ROFL app in test mode:
   ```bash
   python main_v5.py --once
   ```

## Troubleshooting

### Common Issues

1. **Token Approval Failures**: Check allowances and ensure users have approved the ROFLSwapV5 contract.

2. **Order Deserialization Errors**: Verify the order encoding format matches between client and ROFL app.

3. **TEE Decryption Mechanism**: The ROFL app automatically handles decryption when running in the TEE environment.

4. **Permission Model**: Ensure the ROFLSwapV5 contract has requested access to private tokens via `requestPrivacyAccess()`.

### Debugging Tools

- Check token approvals:
  ```bash
  npx hardhat run scripts/check-approvals.js --network sapphire-testnet
  ```

- Inspect order data:
  ```bash
  python inspect_order.py --contract [ADDRESS] --order-id 1
  ```

## Security Considerations

1. **Privacy Guarantees**: While the token transfers are confidential, metadata like transaction timing may still leak information.

2. **TEE Security**: Remember that the security model relies on the integrity of the TEE implementation.

3. **Approval Risks**: Users should be cautious about unlimited token approvals.

## Next Steps

1. Implement token balance caching in the ROFL app for better performance

2. Add support for partial order fills

3. Create a frontend that demonstrates the private token workflow

4. Add multi-hop order routing for complex trades

For more information, refer to the Oasis documentation on ROFL and Sapphire.
