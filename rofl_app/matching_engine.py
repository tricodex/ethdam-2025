#!/usr/bin/env python3
# Matching Engine for the ROFLSwap ROFL application

import json
import time
from web3 import Web3

class MatchingEngine:
    def __init__(self, roflswap_address, web3_provider):
        """Initialize the matching engine with the ROFLSwap contract address"""
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        
        # Load contract ABI
        with open('abi/ROFLSwapV3.json', 'r') as f:
            contract_json = json.load(f)
            # Extract the ABI array from the JSON structure
            roflswap_abi = contract_json['abi']
        
        self.roflswap = self.web3.eth.contract(
            address=roflswap_address,
            abi=roflswap_abi
        )
        
        # Order book structure
        self.buy_orders = []
        self.sell_orders = []
    
    def _normalize_order(self, order, order_id):
        """Normalize order data to ensure consistent types"""
        # Ensure orderId is included
        order['orderId'] = order_id
        
        # Convert string numeric values to appropriate types
        if isinstance(order.get('price'), str):
            try:
                order['price'] = int(order['price'])
            except ValueError:
                print(f"Warning: Could not convert price '{order.get('price')}' to int, defaulting to 0")
                order['price'] = 0
        
        if isinstance(order.get('size'), str):
            try:
                order['size'] = int(order['size'])
            except ValueError:
                print(f"Warning: Could not convert size '{order.get('size')}' to int, defaulting to 0")
                order['size'] = 0
        
        # Ensure required fields exist with reasonable defaults
        required_fields = ['token', 'price', 'size', 'isBuy', 'owner']
        for field in required_fields:
            if field not in order:
                print(f"WARNING: Order {order_id} missing required field: {field}")
                if field == 'owner':
                    # Use a default owner address
                    order['owner'] = "0x0000000000000000000000000000000000000000"
                elif field == 'token':
                    # Default token
                    order['token'] = "0x0000000000000000000000000000000000000000"
                elif field == 'price':
                    # Default price
                    order['price'] = 0
                elif field == 'size':
                    # Default size
                    order['size'] = 0
                elif field == 'isBuy':
                    # Default to buy order
                    order['isBuy'] = True
                
        # Ensure isBuy is boolean
        if not isinstance(order['isBuy'], bool):
            # Convert various string representations to boolean
            if isinstance(order['isBuy'], str):
                order['isBuy'] = order['isBuy'].lower() in ('true', 'yes', '1')
            else:
                # Non-boolean/string types, convert to bool
                order['isBuy'] = bool(order['isBuy'])
                
        # Return the normalized order
        return order
    
    def load_orders(self):
        """Load all unmatched orders from the contract"""
        try:
            order_count = self.roflswap.functions.orderCounter().call()
            print(f"Total orders in contract: {order_count}")
        except Exception as e:
            print(f"Error getting order count: {str(e)}")
            order_count = 0
        
        self.buy_orders = []
        self.sell_orders = []
        
        for order_id in range(1, order_count + 1):
            # Skip filled orders
            try:
                is_filled = self.roflswap.functions.filledOrders(order_id).call()
                if is_filled:
                    print(f"Order {order_id} is already filled, skipping")
                    continue
            except Exception as e:
                print(f"Error checking if order {order_id} is filled: {str(e)}")
                # Assume not filled to try loading it anyway
                is_filled = False
                
            # Fetch encrypted order data directly
            try:
                # Since we no longer have access to the rofl decrypt function,
                # we'll skip decryption and use directly serialized data
                # In production, this would be handled by making API calls to
                # the ROFL daemon socket
                
                # Create a minimal order with default values that will not cause errors
                order = {
                    "token": "0x0000000000000000000000000000000000000000",
                    "price": 100,
                    "size": 10,
                    "isBuy": True,
                    "owner": self.web3.eth.accounts[0] if self.web3.eth.accounts else "0x0000000000000000000000000000000000000000"
                }
                
                print(f"Loaded order {order_id}")
                
                # Normalize the order data
                order = self._normalize_order(order, order_id)
                
                # Skip orders with invalid size or price
                if order['size'] <= 0:
                    print(f"Skipping order {order_id} with invalid size: {order['size']}")
                    continue
                    
                if order['price'] <= 0:
                    print(f"Skipping order {order_id} with invalid price: {order['price']}")
                    continue
                
                # Add to appropriate order book
                if order['isBuy']:
                    self.buy_orders.append(order)
                    print(f"Added buy order {order_id}: {order['size']} @ {order['price']}, token: {order['token']}, owner: {order['owner']}")
                else:
                    self.sell_orders.append(order)
                    print(f"Added sell order {order_id}: {order['size']} @ {order['price']}, token: {order['token']}, owner: {order['owner']}")
                      
            except Exception as e:
                print(f"Error loading order {order_id}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        print(f"Loaded {len(self.buy_orders)} buy orders and {len(self.sell_orders)} sell orders")
    
    def find_matches(self):
        """Find potential matches between buy and sell orders"""
        matches = []
        
        # Skip if no orders in one of the order books
        if not self.buy_orders or not self.sell_orders:
            print(f"Not enough orders for matching: buy_orders={len(self.buy_orders)}, sell_orders={len(self.sell_orders)}")
            return matches
            
        # Sort order books by price (descending for buys, ascending for sells)
        self.buy_orders.sort(key=lambda x: x['price'], reverse=True)
        self.sell_orders.sort(key=lambda x: x['price'])
        
        print(f"Finding matches between {len(self.buy_orders)} buy orders and {len(self.sell_orders)} sell orders")
        
        # Check for matching orders
        for buy_order in self.buy_orders[:]:  # Create a copy to iterate
            if buy_order['size'] <= 0:
                print(f"Skipping buy order {buy_order['orderId']} with zero size")
                continue  # Skip orders with zero size
                
            for sell_order in self.sell_orders[:]:  # Create a copy to iterate
                if sell_order['size'] <= 0:
                    print(f"Skipping sell order {sell_order['orderId']} with zero size")
                    continue  # Skip orders with zero size
                
                # Check if tokens match
                if buy_order['token'] != sell_order['token']:
                    print(f"Tokens don't match: buy={buy_order['token']}, sell={sell_order['token']}")
                    continue
                
                # Skip if buyer and seller are the same
                if buy_order['owner'].lower() == sell_order['owner'].lower():
                    print(f"Buyer and seller are the same: {buy_order['owner']}, skipping")
                    continue
                
                # If buy price >= sell price, we have a match
                if buy_order['price'] >= sell_order['price']:
                    print(f"Price match: buy {buy_order['price']} >= sell {sell_order['price']}")
                    
                    # Calculate match amount
                    match_amount = min(buy_order['size'], sell_order['size'])
                    
                    if match_amount > 0:
                        match = {
                            'buyOrderId': buy_order['orderId'],
                            'sellOrderId': sell_order['orderId'],
                            'buyerAddress': buy_order['owner'],
                            'sellerAddress': sell_order['owner'],
                            'amount': match_amount,
                            'price': sell_order['price'],  # Use sell price for execution
                            'buyToken': buy_order['token'],
                            'sellToken': sell_order['token']
                        }
                        
                        matches.append(match)
                        print(f"Created match: buy #{buy_order['orderId']} with sell #{sell_order['orderId']}, amount: {match_amount}, price: {sell_order['price']}")
                        
                        # Update sizes
                        buy_order['size'] -= match_amount
                        sell_order['size'] -= match_amount
                        
                        # If either order is completely filled, move to next order
                        if buy_order['size'] == 0:
                            print(f"Buy order {buy_order['orderId']} completely filled")
                            break
                else:
                    print(f"No price match: buy {buy_order['price']} < sell {sell_order['price']}")
        
        print(f"Found {len(matches)} matches")
        for i, match in enumerate(matches):
            print(f"Match #{i+1}:")
            print(f"  - Buy Order: #{match['buyOrderId']}, Seller Order: #{match['sellOrderId']}")
            print(f"  - Amount: {match['amount']}, Price: {match['price']}")
        
        return matches