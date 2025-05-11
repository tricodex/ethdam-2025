#!/usr/bin/env python3
"""
Test script for ROFLSwap Matcher logic
"""

import logging
import sys
import os
import random
from typing import Dict, Any, List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("test_match_logic")

# Test contract address
WATER_TOKEN_ADDRESS = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04"
FIRE_TOKEN_ADDRESS = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977"

def generate_test_orders() -> List[Dict[str, Any]]:
    """
    Generate test orders for matching
    
    Returns:
        List of orders for testing
    """
    orders = []
    
    # Generate 10 orders (5 buy, 5 sell)
    for i in range(1, 11):
        # Create a deterministic address based on order ID
        owner = f"0x{i:040x}"
        
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

def find_matches(orders: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any], int]]:
    """
    Find matches between buy and sell orders
    
    Args:
        orders: List of orders
        
    Returns:
        List of tuples (buy_order, sell_order, quantity)
    """
    # Group orders by token
    buy_orders_by_token = {}
    sell_orders_by_token = {}
    
    for order in orders:
        token = order["token"]
        if order["isBuyOrder"]:
            if token not in buy_orders_by_token:
                buy_orders_by_token[token] = []
            buy_orders_by_token[token].append(order)
        else:
            if token not in sell_orders_by_token:
                sell_orders_by_token[token] = []
            sell_orders_by_token[token].append(order)
    
    # Sort buy orders by price (highest first)
    for token in buy_orders_by_token:
        buy_orders_by_token[token] = sorted(
            buy_orders_by_token[token],
            key=lambda o: o["price"],
            reverse=True
        )
    
    # Sort sell orders by price (lowest first)
    for token in sell_orders_by_token:
        sell_orders_by_token[token] = sorted(
            sell_orders_by_token[token],
            key=lambda o: o["price"]
        )
    
    # Find matches
    matches = []
    
    # Iterate through tokens
    for token in buy_orders_by_token:
        if token not in sell_orders_by_token:
            continue
        
        buy_orders = buy_orders_by_token[token]
        sell_orders = sell_orders_by_token[token]
        
        # Match orders for this token
        for buy_order in buy_orders:
            for sell_order in sell_orders:
                # Skip if sell order is filled
                if sell_order["amount"] == 0:
                    continue
                
                # Skip if buy price is lower than sell price
                if buy_order["price"] < sell_order["price"]:
                    continue
                
                # Skip if owners are the same
                if buy_order["owner"] == sell_order["owner"]:
                    continue
                
                # Determine quantity to match
                quantity = min(buy_order["amount"], sell_order["amount"])
                
                if quantity > 0:
                    matches.append((buy_order, sell_order, quantity))
                    
                    # Update remaining quantities
                    buy_order["amount"] -= quantity
                    sell_order["amount"] -= quantity
                    
                    # If buy order is filled, break
                    if buy_order["amount"] == 0:
                        break
        
    return matches

def test_find_matches():
    """
    Test the matching logic
    """
    # Generate test orders
    orders = generate_test_orders()
    
    # Print orders
    logger.info("Generated test orders:")
    for order in orders:
        order_type = "BUY" if order["isBuyOrder"] else "SELL"
        token_name = "WATER" if order["token"] == WATER_TOKEN_ADDRESS else "FIRE"
        logger.info(f"Order {order['orderId']}: {order_type} {order['amount']} {token_name} @ {order['price']} from {order['owner'][:10]}...")
    
    # Find matches
    matches = find_matches(orders)
    
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
    logger.info("Testing ROFLSwap Matcher logic...")
    
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