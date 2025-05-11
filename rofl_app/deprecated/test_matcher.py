#!/usr/bin/env python3
"""
Test script for ROFLSwap Matcher
Verifies that order matching works correctly by generating mock orders and testing matches
"""

import logging
import sys
import os
from typing import Dict, Any, List, Tuple

from roflswap_oracle_matching import ROFLSwapMatcher

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("test_matcher")

# Test contract address
CONTRACT_ADDRESS = os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e")
WEB3_PROVIDER = os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io")

# Token addresses
WATER_TOKEN_ADDRESS = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04"
FIRE_TOKEN_ADDRESS = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977"

def generate_test_orders() -> List[Dict[str, Any]]:
    """
    Generate test orders for matching
    
    Returns:
        List of orders for testing
    """
    from eth_account import Account
    import random
    
    orders = []
    
    # Generate 10 orders (5 buy, 5 sell)
    for i in range(1, 11):
        # Create deterministic account based on order ID
        private_key = f"0x{'0' * 63}{i % 10}"
        account = Account.from_key(private_key)
        owner = account.address
        
        # Alternate between buy and sell orders
        is_buy_order = i % 2 == 0
        
        # Alternate between WATER and FIRE tokens
        token = WATER_TOKEN_ADDRESS if i % 4 <= 1 else FIRE_TOKEN_ADDRESS
        
        # Set amount and price
        # For WATER token buy orders: price 100-110
        # For WATER token sell orders: price 90-100
        # For FIRE token buy orders: price 150-160
        # For FIRE token sell orders: price 140-150
        base_price = 100 if token == WATER_TOKEN_ADDRESS else 150
        price_adjustment = random.randint(0, 10)
        
        if is_buy_order:
            price = base_price + price_adjustment
            amount = random.randint(500, 1000)
        else:
            price = base_price - random.randint(0, 10)
            amount = random.randint(500, 1000)
        
        # Create order
        order = {
            "orderId": i,
            "owner": owner,
            "token": token,
            "amount": amount,
            "price": price,
            "isBuyOrder": is_buy_order
        }
        
        orders.append(order)
        
    return orders

def test_find_matches():
    """
    Test the matching logic
    """
    # Create matcher instance in local mode
    matcher = ROFLSwapMatcher(CONTRACT_ADDRESS, WEB3_PROVIDER, "local_test")
    
    # Generate test orders
    orders = generate_test_orders()
    
    # Print orders
    logger.info("Generated test orders:")
    for order in orders:
        order_type = "BUY" if order["isBuyOrder"] else "SELL"
        token_name = "WATER" if order["token"] == WATER_TOKEN_ADDRESS else "FIRE"
        logger.info(f"Order {order['orderId']}: {order_type} {order['amount']} {token_name} @ {order['price']} from {order['owner'][:10]}...")
    
    # Find matches
    matches = matcher.find_matches(orders)
    
    # Print matches
    logger.info(f"Found {len(matches)} matches:")
    for buy_order, sell_order, quantity in matches:
        token_name = "WATER" if buy_order["token"] == WATER_TOKEN_ADDRESS else "FIRE"
        logger.info(f"Match: Buy order {buy_order['orderId']} and sell order {sell_order['orderId']}")
        logger.info(f"  Token: {token_name}")
        logger.info(f"  Quantity: {quantity}")
        logger.info(f"  Price: {sell_order['price']}")
        logger.info(f"  Buy owner: {buy_order['owner'][:10]}...")
        logger.info(f"  Sell owner: {sell_order['owner'][:10]}...")
    
    # Verify we have at least 2 matches
    if len(matches) >= 2:
        logger.info("SUCCESS: Found at least 2 matches")
        return True
    else:
        logger.error(f"ERROR: Found only {len(matches)} matches, expected at least 2")
        return False

def main():
    """
    Main function
    """
    logger.info("Testing ROFLSwap Matcher...")
    
    # Test matching logic
    success = test_find_matches()
    
    if success:
        logger.info("All tests passed!")
        return 0
    else:
        logger.error("Tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 