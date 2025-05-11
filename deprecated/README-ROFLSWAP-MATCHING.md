# ROFLSwapV5 Order Matching Guide

This document explains the order visibility and matching process in ROFLSwapV5, particularly focusing on why you might not see your orders or why matching might take longer than expected.

## Privacy Features & Order Visibility

ROFLSwapV5 is built on Oasis Sapphire, which provides privacy by default. This means:

1. **Orders are private**: Orders placed on ROFLSwapV5 are encrypted and only visible to:
   - The order owner (you)
   - The Trusted Execution Environment (TEE) that handles matching

2. **Balance privacy**: Your token balances are typically not visible to other users. When using the check-order-status.js script, you might see errors when trying to check balances - this is normal and expected behavior.

3. **Order queries**: When checking orders using `getMyOrders()`, you might not see orders you've placed. This could be due to:
   - Privacy features hiding your orders (encryption)
   - Using a different account than the one that placed the orders
   - Orders might have been matched already

## Order Matching Process

Orders in ROFLSwapV5 are matched by a Trusted Execution Environment (TEE), which operates differently from traditional decentralized exchanges:

1. **Batch processing**: The TEE processes orders in batches, not continuously. This means there might be a delay between placing orders and seeing matches.

2. **Matching requirements**:
   - Both buy and sell orders must exist in the system
   - Orders must have compatible prices
   - Both orders must have sufficient token approvals

3. **Matching delays**: Several factors can affect matching time:
   - TEE processing queue (other operations might be prioritized)
   - Network congestion on Oasis Sapphire
   - The number of orders in the system
   - Optimization for batch matching rather than immediate matching

## Common Issues & Solutions

### "I don't see my orders"

- Privacy features may prevent you from seeing order details
- Try running the check-order-status.js script with the same account that placed the orders
- Check the "Total Orders in System" number to see if your order was registered

### "My orders aren't being matched"

- Ensure you have both buy and sell orders in the system (check the order count)
- Verify prices are compatible (same price for both orders)
- Wait longer - matching can take 5-10 minutes or more
- Network conditions can affect matching time
- The TEE runs in batches, not continuously

### "I can't see my token balances"

- This is expected behavior due to privacy features
- Transactions still execute correctly despite balance visibility issues
- If you need to verify balances, check transaction receipts instead

## Debugging Tips

1. **Check total order count**: This number should increase when you place orders
2. **Place both buy and sell orders**: Matching requires both types of orders
3. **Use the same price**: To ensure orders match, use the same price for both orders
4. **Wait between checks**: Allow 5-10 minutes between checking for matches
5. **Review script logs**: Look for transaction hash confirmation when placing orders

## TEE Matching Process

The Trusted Execution Environment (TEE) in Oasis Sapphire:

1. Securely decrypts order information
2. Attempts to match compatible orders
3. Executes trades when matches are found
4. Updates order status (filled/partially filled)

This process happens in a secure enclave that maintains privacy while enabling order matching. The TEE runs periodically rather than continuously, which explains why matching doesn't happen instantly.

## Typical Matching Timeline

- Order placement: Immediate (transaction confirmation)
- Order registration: 15-30 seconds (block confirmation)
- TEE detection: 1-3 minutes
- Matching process: 2-5 minutes (or longer during congestion)
- Match confirmation: 30 seconds (block confirmation)

Total time from order placement to matching can range from 5 minutes to over 30 minutes depending on system load. 