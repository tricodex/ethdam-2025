#!/usr/bin/env python3
"""
Test script to simulate how the TEE accesses orders from the ROFLSwapOracle contract.
This helps understand what would be happening inside the TEE and why matching might not be working.
"""

import os
import sys
import json
import argparse
import logging
import time
from web3 import Web3
from typing import Dict, Any, Optional

# Import ROFL utility for authenticated calls
from rofl_auth import RoflUtility

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("test-tee-orders")

def main():
    """Main function to test TEE order access"""
    parser = argparse.ArgumentParser(description="Test TEE order access from ROFLSwapOracle contract")
    parser.add_argument("--contract", "-c", help="ROFLSwapOracle contract address", 
                       default=os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"))
    parser.add_argument("--provider", "-p", help="Web3 provider URL", 
                       default=os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io"))
    parser.add_argument("--order-id", "-o", type=int, help="Specific order ID to check", default=None)
    parser.add_argument("--local", "-l", action="store_true", help="Run in local test mode (no real TEE)", default=False)
    
    args = parser.parse_args()
    
    print("=== TESTING TEE ORDER ACCESS FROM ROFLSWAPORACLE ===")
    print(f"Contract address: {args.contract}")
    print(f"Web3 provider: {args.provider}")
    print(f"Mode: {'Local test' if args.local else 'TEE simulation'}")
    
    # Create ROFL utility for authenticated calls
    # Note: In TEE environment, this would use socket communication
    is_tee_mode = not args.local
    rofl_utility = RoflUtility(args.contract, is_tee_mode)
    
    # Connect to web3
    w3 = Web3(Web3.HTTPProvider(args.provider))
    if not w3.is_connected():
        print(f"ERROR: Could not connect to Web3 provider at {args.provider}")
        return 1
    
    print(f"Connected to Web3 provider: {w3.is_connected()}")
    
    # Load ABI - Explicitly use ROFLSwapOracle ABI
    try:
        abi_path = os.path.join(os.path.dirname(__file__), "abi", "ROFLSwapOracle.json")
        with open(abi_path, "r") as f:
            contract_json = json.load(f)
            # Extract the ABI from the JSON file
            contract_abi = contract_json["abi"] if "abi" in contract_json else contract_json
        print(f"Loaded ABI from {abi_path}")
    except FileNotFoundError:
        print(f"ABI file not found. Checking parent directory...")
        try:
            # Try looking in a parent directory
            abi_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "contracts", "artifacts", "contracts", "ROFLSwapOracle.sol", "ROFLSwapOracle.json")
            with open(abi_path, "r") as f:
                abi_data = json.load(f)
                contract_abi = abi_data["abi"]
            print(f"Loaded ABI from {abi_path}")
        except FileNotFoundError:
            print("ERROR: ABI file for ROFLSwapOracle.sol not found. Please ensure it's compiled.")
            return 1
    
    # Create contract instance
    contract = w3.eth.contract(address=args.contract, abi=contract_abi)
    
    # Get oracle address
    try:
        oracle_address = contract.functions.oracle().call()
        print(f"\nOracle address in contract: {oracle_address}")
    except Exception as e:
        print(f"Error getting oracle address: {e}")
        return 1
    
    # Get ROFL App ID
    try:
        rofl_app_id_bytes = contract.functions.roflAppID().call()
        print(f"ROFL App ID in contract (hex): {rofl_app_id_bytes.hex()}")
        
        # Convert to text and print the App ID
        rofl_app_id_text = bytes.fromhex(rofl_app_id_bytes.hex()).decode('utf-8', errors='replace')
        print(f"ROFL App ID in contract (text): {rofl_app_id_text}")
        
        # Print both the original and truncated App IDs from RoflUtility
        print(f"ROFL App ID in environment: {rofl_utility.original_app_id if hasattr(rofl_utility, 'original_app_id') else 'Not available'}")
        print(f"Truncated App ID for auth: {rofl_utility.truncated_app_id if hasattr(rofl_utility, 'truncated_app_id') else 'Not available'}")
    except Exception as e:
        print(f"Error getting ROFL App ID: {e}")
        return 1
    
    # Get total orders count
    try:
        total_orders = contract.functions.getTotalOrderCount().call()
        print(f"\nTotal orders in contract: {total_orders}")
    except Exception as e:
        print(f"Error getting total orders: {e}")
        return 1
    
    # Check active order pairs
    print("\nLooking for active order pairs to match...")
    orders = []
    
    # If a specific order ID was provided, check it
    if args.order_id is not None:
        print(f"\nChecking specific order #{args.order_id}")
        order_data = check_order_with_auth(contract, args.order_id, rofl_utility)
        if order_data:
            orders.append(order_data)
    else:
        # Otherwise, check the last few orders
        print("\nChecking last 5 orders for potential matches:")
        start_index = max(1, total_orders - 5)
        for order_id in range(start_index, total_orders + 1):
            order_data = check_order_with_auth(contract, order_id, rofl_utility)
            if order_data:
                orders.append(order_data)
    
    # Try to find matching pairs
    if len(orders) > 1:
        print("\nAttempting to find matching pairs...")
        find_matches(orders)
    else:
        print("\nNot enough orders available to find matches.")
    
    return 0

def check_order_with_auth(contract, order_id: int, rofl_utility):
    """Check details for a specific order using authenticated calls"""
    try:
        # Check if order exists
        exists = contract.functions.orderExists(order_id).call()
        if not exists:
            print(f"Order #{order_id}: Does not exist")
            return None
        
        # Check if order is filled
        is_filled = contract.functions.filledOrders(order_id).call()
        filled_status = "Filled" if is_filled else "Not filled"
        print(f"Order #{order_id}: {filled_status}")
        
        if is_filled:
            return None  # Skip filled orders
        
        # Try to get order data with authentication
        try:
            # Prepare function data for getEncryptedOrder
            function_data = contract.encodeABI(fn_name="getEncryptedOrder", args=[b'', order_id])
            
            # Make authenticated call through RoflUtility
            result = rofl_utility.call_view_function(contract.address, function_data)
            
            if result and 'data' in result:
                data_hex = result['data']
                if data_hex.startswith('0x'):
                    data_hex = data_hex[2:]
                
                data_bytes = bytes.fromhex(data_hex)
                
                # Try to decode the order data
                try:
                    from eth_abi import decode as abi_decode
                    
                    # Try to decode with the expected order format
                    order_types = ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool']
                    decoded = abi_decode(order_types, data_bytes)
                    
                    # Convert decoded data to a more readable format
                    order_data = {
                        'orderId': decoded[0],
                        'owner': decoded[1],
                        'token': decoded[2],
                        'price': decoded[3],
                        'size': decoded[4],
                        'isBuy': decoded[5],
                    }
                    
                    print(f"  ✅ Successfully retrieved and decoded order data:")
                    print(f"    Order ID: {order_data['orderId']}")
                    print(f"    Owner: {order_data['owner']}")
                    print(f"    Token: {order_data['token']}")
                    print(f"    Price: {order_data['price'] / 10**18} ETH")
                    print(f"    Size: {order_data['size'] / 10**18} tokens")
                    print(f"    Type: {'BUY' if order_data['isBuy'] else 'SELL'}")
                    
                    return order_data
                    
                except Exception as e:
                    print(f"  ⚠️ Could not decode order data: {e}")
                    print(f"  Order data (hex): {data_hex[:40]}...")
                    return None
            else:
                print(f"  ❌ No data returned from authenticated call")
                return None
                
        except Exception as e:
            print(f"  ❌ Error making authenticated call: {e}")
            print(f"  This indicates the TEE environment may not be able to access orders")
            return None
    
    except Exception as e:
        print(f"Error checking order #{order_id}: {e}")
        return None

def find_matches(orders):
    """Find matching buy/sell order pairs"""
    buy_orders = [order for order in orders if order['isBuy']]
    sell_orders = [order for order in orders if not order['isBuy']]
    
    print(f"Found {len(buy_orders)} buy orders and {len(sell_orders)} sell orders")
    
    matches = []
    
    for buy_order in buy_orders:
        for sell_order in sell_orders:
            # Check if orders match on token
            if buy_order['token'] == sell_order['token']:
                # Check if price is acceptable
                if buy_order['price'] >= sell_order['price']:
                    # Calculate matched quantity
                    matched_quantity = min(buy_order['size'], sell_order['size'])
                    
                    matches.append({
                        'buy_order': buy_order,
                        'sell_order': sell_order,
                        'quantity': matched_quantity,
                        'price': sell_order['price'],  # Usually use the sell price
                    })
    
    if matches:
        print(f"\nFound {len(matches)} potential matches:")
        for idx, match in enumerate(matches):
            print(f"\nMatch #{idx+1}:")
            print(f"  Buy Order #{match['buy_order']['orderId']} - {match['buy_order']['size'] / 10**18} tokens at {match['buy_order']['price'] / 10**18} ETH")
            print(f"  Sell Order #{match['sell_order']['orderId']} - {match['sell_order']['size'] / 10**18} tokens at {match['sell_order']['price'] / 10**18} ETH")
            print(f"  Matched Quantity: {match['quantity'] / 10**18} tokens")
            print(f"  Execution Price: {match['price'] / 10**18} ETH")
    else:
        print("\nNo matching order pairs found.")

if __name__ == "__main__":
    sys.exit(main()) 