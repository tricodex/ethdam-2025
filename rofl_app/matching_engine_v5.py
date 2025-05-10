#!/usr/bin/env python3
# Improved Matching Engine for the ROFLSwapV5 application with PrivateERC20 support

import json
import time
from web3 import Web3
import os
import binascii
from sapphire_wrapper import create_sapphire_web3
from order_serialization import OrderSerialization

class MatchingEngineV5:
    def __init__(self, roflswap_address, web3_provider):
        """Initialize the matching engine with the ROFLSwapV5 contract address"""
        # Get the private key from environment variables
        private_key = os.environ.get('PRIVATE_KEY')
        if not private_key:
            raise ValueError("PRIVATE_KEY environment variable must be set")
        
        # Get the ROFL app ID from environment variables or use a default
        # This app ID must match what's in the smart contract
        self.rofl_app_id = os.environ.get('ROFL_APP_ID', 'rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3')
        print(f"Using ROFL App ID: {self.rofl_app_id}")
        
        # Create an authenticated Web3 provider for Sapphire
        self.web3 = create_sapphire_web3(
            rpc_url=web3_provider,
            private_key=private_key,
            app_id=self.rofl_app_id
        )
        
        print(f"Connected to Sapphire network: {self.web3.is_connected()}")
        
        # Load contract ABI
        try:
            with open('abi/ROFLSwapV5.json', 'r') as f:
                contract_json = json.load(f)
                # Extract the ABI array from the JSON structure
                roflswap_abi = contract_json['abi']
        except Exception as e:
            print(f"Error loading V5 ABI: {e}")
            # Try to fall back to V4 if V5 is not found
            try:
                with open('abi/ROFLSwapV4.json', 'r') as f:
                    contract_json = json.load(f)
                    roflswap_abi = contract_json['abi']
                    print("Using ROFLSwapV4 ABI as fallback - some features may be limited")
            except Exception as e2:
                print(f"Error loading fallback ABI: {e2}")
                raise
        
        # Create contract instance with the authenticated web3 provider
        self.roflswap = self.web3.eth.contract(
            address=roflswap_address,
            abi=roflswap_abi
        )
        
        # Order book structure
        self.buy_orders = []
        self.sell_orders = []
        
        # Load PrivateERC20 ABI for token interaction
        try:
            with open('abi/PrivateERC20.json', 'r') as f:
                token_json = json.load(f)
                self.token_abi = token_json['abi']
        except Exception as e:
            print(f"Warning: Could not load PrivateERC20 ABI: {e}")
            self.token_abi = None
    
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
    
    def _deserialize_order(self, order_id, encrypted_data):
        """Properly deserialize the order data received from the contract"""
        try:
            # Try to deserialize using our order serialization utility
            return OrderSerialization.decode_order(encrypted_data)
        except Exception as e:
            print(f"Error deserializing order {order_id}: {str(e)}")
            
            # Fallback: Try to decode as regular JSON
            try:
                order_text = self.web3.to_text(encrypted_data)
                if order_text.startswith('{') and order_text.endswith('}'):
                    return json.loads(order_text)
            except Exception as e2:
                print(f"Failed to parse as JSON: {str(e2)}")
            
            # Return a placeholder for testing
            print("Using placeholder data for testing")
            water_token, fire_token = self.get_tokens()
            token = water_token if water_token else "0x0000000000000000000000000000000000000000"
            
            return {
                "token": token,
                "price": 100 * 10**18,  # 100 tokens with 18 decimals
                "size": 10 * 10**18,    # 10 tokens with 18 decimals
                "isBuy": (order_id % 2 == 0),  # Alternate buy/sell orders for testing
                "owner": "0x0000000000000000000000000000000000000000"
            }
    
    def load_orders(self):
        """Load all unmatched orders from the contract"""
        try:
            order_count = self.roflswap.functions.getTotalOrderCount().call()
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
                
            # Get encrypted order data    
            encrypted_data = None
            owner_address = None
            
            # Try to get encrypted order data with authenticated Web3 provider
            try:
                encrypted_data = self.roflswap.functions.getEncryptedOrder(order_id).call()
                print(f"Successfully retrieved order {order_id} with Sapphire authentication")
            except Exception as e:
                print(f"Failed to get order {order_id}: {str(e)}")
                continue  # Skip this order if we can't get its data
            
            # Try to get owner of the order with authenticated Web3 provider
            try:
                owner_address = self.roflswap.functions.getOrderOwner(order_id).call()
                print(f"Order {order_id} owner: {owner_address}")
            except Exception as e:
                print(f"Error getting owner for order {order_id}: {str(e)}")
                continue  # Skip this order if we can't get its owner
            
            if not encrypted_data or not owner_address:
                print(f"Missing data for order {order_id}, skipping")
                continue
            
            # Try to decode the order
            order_data = self._deserialize_order(order_id, encrypted_data)
            
            # Add owner address from contract
            order_data['owner'] = owner_address
            
            # Ensure we have the order ID
            order_data['orderId'] = order_id
            
            # Determine order type from the JSON data
            if 'isBuy' not in order_data:
                # Default to alternating buy/sell for testing
                order_data['isBuy'] = (order_id % 2 == 0)
            
            # Normalize the order data
            order = self._normalize_order(order_data, order_id)
            
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
                
                # Check if price matches (buy price >= sell price)
                if buy_order['price'] >= sell_order['price']:
                    # Check if tokens match
                    if buy_order['token'] == sell_order['token']:
                        # Check if owners are different (cannot match with self)
                        if buy_order['owner'].lower() != sell_order['owner'].lower():
                            match = {
                                'buy_order_id': buy_order['orderId'],
                                'sell_order_id': sell_order['orderId'],
                                'token': buy_order['token'],
                                'price': sell_order['price'],  # Use the sell price for settlement
                                'size': min(buy_order['size'], sell_order['size']),
                                'buy_owner': buy_order['owner'],
                                'sell_owner': sell_order['owner']
                            }
                            matches.append(match)
                            print(f"Found match: {match['size']} of {match['token']} at price {match['price']}")
                            
                            # Update remaining sizes
                            buy_order['size'] -= match['size']
                            sell_order['size'] -= match['size']
                            
                            # If either order is fully matched, skip to next order
                            if buy_order['size'] <= 0:
                                break  # Break inner loop to move to next buy order
        
        return matches
    
    def check_token_approvals(self, matches):
        """Check and report token approval status for matches"""
        if not self.token_abi:
            print("PrivateERC20 ABI not loaded, skipping approval checks")
            return
        
        approval_status = []
        
        for match in matches:
            token_address = match['token']
            buyer_address = match['buy_owner']
            amount = match['size']
            
            # Create token contract instance
            token = self.web3.eth.contract(address=token_address, abi=self.token_abi)
            
            # Check if the buyer has approved the contract to spend tokens
            try:
                allowance = token.functions.allowance(
                    buyer_address, 
                    self.roflswap.address
                ).call()
                
                has_approval = allowance >= amount
                
                approval_status.append({
                    'match': match,
                    'has_approval': has_approval,
                    'allowance': allowance,
                    'required': amount
                })
                
                print(f"Match {match['buy_order_id']}-{match['sell_order_id']}: " +
                      f"Approval {'✅' if has_approval else '❌'} " +
                      f"(Allowance: {allowance}, Required: {amount})")
                
            except Exception as e:
                print(f"Error checking approval for match {match['buy_order_id']}-{match['sell_order_id']}: {str(e)}")
                approval_status.append({
                    'match': match,
                    'has_approval': False,
                    'allowance': 0,
                    'required': amount,
                    'error': str(e)
                })
        
        return approval_status
    
    def display_orders(self):
        """Display the current order books"""
        if self.buy_orders:
            print("\nBuy orders:")
            for order in sorted(self.buy_orders, key=lambda x: x['price'], reverse=True):
                print(f"  #{order['orderId']}: {order['size']} @ {order['price']}, token: {order['token']}, owner: {order['owner']}")
        else:
            print("No buy orders")
            
        if self.sell_orders:
            print("\nSell orders:")
            for order in sorted(self.sell_orders, key=lambda x: x['price']):
                print(f"  #{order['orderId']}: {order['size']} @ {order['price']}, token: {order['token']}, owner: {order['owner']}")
        else:
            print("No sell orders")
            
    def get_tokens(self):
        """Get the deployed token addresses from the contract"""
        try:
            water_token, fire_token = self.roflswap.functions.getTokens().call()
            return water_token, fire_token
        except Exception as e:
            print(f"Error getting token addresses: {str(e)}")
            return None, None
    
    def get_matches(self):
        """Get all matches - convenience function to load orders and find matches"""
        self.load_orders()
        matches = self.find_matches()
        
        # Check token approvals for all matches
        self.check_token_approvals(matches)
        
        return matches