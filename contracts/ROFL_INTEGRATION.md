# ROFLSwap Integration Guide

This guide explains how the ROFLSwap contracts work with the ROFL (Runtime Off-chain Logic) application on the Oasis Sapphire network. It covers the privacy-preserving features of the system and how developers should interact with it.

## Deployed Contracts

| Contract | Address | Network |
|----------|---------|---------|
| ROFLSwapV2 | 0x552F5B746097219537F1041aA406c02F3474417A | Sapphire Testnet |
| WaterToken | 0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D | Sapphire Testnet |
| FireToken | 0xE987534F8E431c2D0F6DDa8D832d8ae622c77814 | Sapphire Testnet |

## Architecture Overview

The ROFLSwap system consists of two main components:

1. **On-chain Smart Contracts** - The ROFLSwap, WaterToken, and FireToken contracts that handle order placement, settlement, and token operations on the Sapphire blockchain.

2. **Off-chain ROFL App** - A Trusted Execution Environment (TEE) application that handles private order matching and interacts with the on-chain contracts.

## Privacy and Confidentiality Features

### Sapphire's Confidential Compute

Oasis Sapphire provides confidential state for smart contracts. This means that certain data stored in the contract is not directly accessible, even to the users who placed orders. 

**Important behavior to understand:**

- Orders are correctly tracked by owner in the contract's state
- Orders are correctly added to the user's array of orders
- HOWEVER, when users call `getMyOrders()`, they may get an empty array due to Sapphire's confidentiality
- Only the ROFL app (running in a TEE) can access the full order data using the privileged functions (`getUserOrders`, `getOrderOwner`, `getEncryptedOrder`)

This design ensures that order information remains private and can only be accessed by the trusted ROFL app running in a secure enclave.

## Order Flow

1. **Order Placement**
   - User calls `placeOrder(bytes encryptedOrder)` on ROFLSwap contract
   - Order is stored with an associated ID
   - OrderID is emitted in an event
   - User sees their order ID but not the encrypted data

2. **Order Matching (Inside ROFL App)**
   - ROFL app running in TEE fetches all encrypted orders
   - Performs matching inside the secure enclave
   - When matches are found, the ROFL app calls `executeMatch()` on the ROFLSwap contract

3. **Settlement**
   - ROFL app calls `executeMatch()` to settle the matched orders
   - Token transfers are performed on-chain
   - Match events are emitted

## ROFL App Integration

### Setting Up ROFL App

1. Create and deploy a ROFL app using the Oasis SDK
   ```bash
   oasis rofl create --network testnet --account myaccount
   ```

2. Configure environment variables for the ROFL app:
   ```bash
   echo -n "0x552F5B746097219537F1041aA406c02F3474417A" | oasis rofl secret set ROFLSWAP_ADDRESS -
   echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
   echo -n "<your-private-key>" | oasis rofl secret set PRIVATE_KEY -
   ```

3. Update and restart your ROFL app:
   ```bash
   oasis rofl update --network testnet --account myaccount
   oasis rofl machine restart
   ```

### ROFL App Implementation

Your ROFL app should include logic to:

1. Fetch encrypted orders from the ROFLSwap contract
2. Decrypt and process orders inside the TEE
3. Match compatible orders based on price and quantity
4. Execute matches on-chain through the ROFLSwap contract

## Testing and Debugging

We've provided several test scripts to help understand how the ROFLSwap contracts work with Sapphire's confidentiality features:

- `test-roflswap-v2.ts` - Tests basic functionality of the ROFLSwapV2 contract
- `test-roflswap-tester.ts` - Demonstrates how the ROFL app can access order data

To run these tests:
```bash
bun hardhat run scripts/test-roflswap-v2.ts --network sapphire-testnet
bun hardhat run scripts/test-roflswap-tester.ts --network sapphire-testnet
```

## Known Limitations

1. **Order Visibility** - Due to Sapphire's confidentiality, users cannot directly see their own orders through the contract. The frontend application should track order IDs from events.

2. **ROFL App Dependencies** - The system relies on the ROFL app running correctly in a TEE. If the ROFL app is unavailable, orders will not be matched.

## Security Considerations

1. **TEE Security** - The security of the system depends on the security of the TEE environment. Ensure your ROFL app is properly secured.

2. **Order Encryption** - Orders should be properly encrypted before being sent to the ROFLSwap contract.

3. **Authorization** - Only the authorized ROFL app can access encrypted order data and execute matches. Keep the ROFL app's private key secure.

## Frontend Integration

Frontend applications should:

1. Track order IDs emitted in events
2. Provide users with order status updates
3. Allow users to place encrypted orders
4. Subscribe to match events to update user balances

## Conclusion

The ROFLSwap system provides a privacy-preserving DEX using Oasis Sapphire's confidential compute capabilities and the ROFL framework. By understanding the unique privacy properties, developers can build secure applications that protect user trading data. 