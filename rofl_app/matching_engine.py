#!/usr/bin/env python3
# Matching Engine for the ROFLSwap ROFL application

import json
import time
from web3 import Web3
from rofl import ensure_inside_rofl, get_contract, decrypt, sign_with_tee_key

# Ensure this code runs in a TEE
ensure_inside_rofl()

class MatchingEngine:
    def __init__(self, roflswap_address, web3_provider):
        """Initialize the matching engine with the ROFLSwap contract address"""
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        
        # Load contract ABI
        with open('abi/ROFLSwap.json', 'r') as f:
            roflswap_abi = json.load(f)
        
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
            order['price'] = int(order['price'])
        
        if isinstance(order.get('size'), str):
            order['size'] = int(order['size'])
        
        # Ensure required fields exist
        required_fields = ['token', 'price', 'size', 'isBuy', 'owner']
        for field in required_fields:
            if field not in order:
                print(f"WARNING: Order {order_id} missing required field: {field}")
                if field == 'owner':
                    # Use a default owner address
                    order['owner'] = "0x0000000000000000000000000000000000000000"
                
        # Return the normalized order
        return order
    
    def load_orders(self):
        """Load all unmatched orders from the contract"""
        order_count = self.roflswap.functions.orderCounter().call()
        print(f"Total orders in contract: {order_count}")
        
        self.buy_orders = []
        self.sell_orders = []
        
        for order_id in range(1, order_count + 1):
            # Skip filled orders
            if self.roflswap.functions.filledOrders(order_id).call():
                print(f"Order {order_id} is already filled, skipping")
                continue
                
            # Fetch encrypted order
            try:
                encrypted_order = self.roflswap.functions.getEncryptedOrder(order_id).call()
                print(f"Retrieved encrypted order {order_id}")
                
                # Decrypt the order inside the TEE
                order = decrypt(encrypted_order)
                print(f"Decrypted order {order_id}: {order}")
                
                # Normalize the order data
                order = self._normalize_order(order, order_id)
                
                # Add to appropriate order book
                if order['isBuy']:
                    self.buy_orders.append(order)
                    print(f"Added buy order {order_id}: {order['size']} @ {order['price']}, owner: {order['owner']}")
                else:
                    self.sell_orders.append(order)
                    print(f"Added sell order {order_id}: {order['size']} @ {order['price']}, owner: {order['owner']}")
                      
            except Exception as e:
                print(f"Error loading order {order_id}: {str(e)}")
                import traceback
                traceback.print_exc()
        
        print(f"Loaded {len(self.buy_orders)} buy orders and {len(self.sell_orders)} sell orders")
    
    def find_matches(self):
        """Find potential matches between buy and sell orders"""
        matches = []
        
        # Sort order books by price (descending for buys, ascending for sells)
        self.buy_orders.sort(key=lambda x: x['price'], reverse=True)
        self.sell_orders.sort(key=lambda x: x['price'])
        
        print(f"Finding matches between {len(self.buy_orders)} buy orders and {len(self.sell_orders)} sell orders")
        
        # Check for matching orders
        for buy_order in self.buy_orders[:]:  # Create a copy to iterate
            if buy_order['size'] <= 0:
                continue  # Skip orders with zero size
                
            for sell_order in self.sell_orders[:]:  # Create a copy to iterate
                if sell_order['size'] <= 0:
                    continue  # Skip orders with zero size
                
                # Check if tokens match
                if buy_order['token'] != sell_order['token']:
                    print(f"Tokens don't match: {buy_order['token']} != {sell_order['token']}")
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
                        print(f"Created match: buy #{buy_order['orderId']} with sell #{sell_order['orderId']}, amount: {match_amount}")
                        
                        # Update sizes
                        buy_order['size'] -= match_amount
                        sell_order['size'] -= match_amount
                        
                        # If either order is completely filled, move to next order
                        if buy_order['size'] == 0:
                            break
        
        return matches