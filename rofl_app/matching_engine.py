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
    
    def load_orders(self):
        """Load all unmatched orders from the contract"""
        order_count = self.roflswap.functions.orderCounter().call()
        print(f"Total orders in contract: {order_count}")
        
        self.buy_orders = []
        self.sell_orders = []
        
        for order_id in range(1, order_count + 1):
            # Skip filled orders
            if self.roflswap.functions.filledOrders(order_id).call():
                continue
                
            # Fetch encrypted order
            try:
                encrypted_order = self.roflswap.functions.getEncryptedOrder(order_id).call()
                
                # Decrypt the order inside the TEE
                order = decrypt(encrypted_order)
                order['orderId'] = order_id
                
                # Add to appropriate order book
                if order['isBuy']:
                    self.buy_orders.append(order)
                else:
                    self.sell_orders.append(order)
                    
                print(f"Loaded order {order_id}: {'Buy' if order['isBuy'] else 'Sell'} "
                      f"{order['size']} @ {order['price']}")
                      
            except Exception as e:
                print(f"Error loading order {order_id}: {str(e)}")
        
        print(f"Loaded {len(self.buy_orders)} buy orders and {len(self.sell_orders)} sell orders")
    
    def find_matches(self):
        """Find potential matches between buy and sell orders"""
        matches = []
        
        # Sort order books by price (descending for buys, ascending for sells)
        self.buy_orders.sort(key=lambda x: x['price'], reverse=True)
        self.sell_orders.sort(key=lambda x: x['price'])
        
        # Check for matching orders
        for buy_order in self.buy_orders:
            for sell_order in self.sell_orders:
                # If buy price >= sell price, we have a match
                if buy_order['price'] >= sell_order['price']:
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
                        
                        # Update sizes
                        buy_order['size'] -= match_amount
                        sell_order['size'] -= match_amount
                        
                        # If either order is completely filled, move to next order
                        if buy_order['size'] == 0:
                            break
        
        return matches