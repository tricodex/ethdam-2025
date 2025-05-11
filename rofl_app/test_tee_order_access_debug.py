#!/usr/bin/env python3
"""
Test script to debug the TEE order access and matching process.
This shows exactly what's happening with the authentication and data retrieval.
"""

import os
import sys
import json
import argparse
import logging
import time
import traceback
from web3 import Web3
from typing import Dict, Any, Optional

# Import ROFL utility for authenticated calls
try:
    from rofl_auth import RoflUtility
    print("Successfully imported RoflUtility")
except ImportError as e:
    print(f"Error importing RoflUtility: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,  # Use DEBUG level for maximum verbosity
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("tee-debug")

def main():
    """Main function to debug TEE order access"""
    parser = argparse.ArgumentParser(description="Debug TEE order access from ROFLSwapOracle contract")
    parser.add_argument("--contract", "-c", help="ROFLSwapOracle contract address", 
                       default=os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"))
    parser.add_argument("--provider", "-p", help="Web3 provider URL", 
                       default=os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io"))
    parser.add_argument("--order-id", "-o", type=int, help="Specific order ID to check", default=None)
    parser.add_argument("--local", "-l", action="store_true", help="Run in local test mode (no real TEE)", default=False)
    parser.add_argument("--app-id", "-a", help="Explicit ROFL App ID to use", 
                        default=os.environ.get("ROFL_APP_ID", "qzd2jxyr5lujtkdnkpf9x"))
    
    args = parser.parse_args()
    
    print("=== DEBUGGING TEE ORDER ACCESS FROM ROFLSWAPORACLE ===")
    print(f"Contract address: {args.contract}")
    print(f"Web3 provider: {args.provider}")
    print(f"Mode: {'Local test' if args.local else 'TEE simulation'}")
    print(f"ROFL App ID from args/env: {args.app_id}")
    
    # Set environment variable for ROFL App ID
    if args.app_id:
        os.environ["ROFL_APP_ID"] = args.app_id
        print(f"Set environment ROFL_APP_ID to: {args.app_id}")
    
    # Create ROFL utility for authenticated calls
    # Note: In TEE environment, this would use socket communication
    is_tee_mode = not args.local
    rofl_utility = RoflUtility(args.contract, is_tee_mode)
    
    # Debug the rofl_utility instance
    print("\n=== ROFL Utility Debug Info ===")
    print(f"Contract address: {rofl_utility.contract_address}")
    print(f"TEE mode: {rofl_utility.is_tee}")
    print(f"Original App ID: {getattr(rofl_utility, 'original_app_id', 'Not available')}")
    print(f"Truncated App ID: {getattr(rofl_utility, 'truncated_app_id', 'Not available')}")
    
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
    
    # Debug available functions
    print("\n=== Available Contract Functions ===")
    for func in [func for func in contract_abi if func.get('type') == 'function']:
        print(f"- {func.get('name')} ({func.get('stateMutability')}): {[input['type'] for input in func.get('inputs', [])]}")
    
    # Get oracle address
    try:
        oracle_address = contract.functions.oracle().call()
        print(f"\nOracle address in contract: {oracle_address}")
    except Exception as e:
        print(f"Error getting oracle address: {e}")
        traceback.print_exc()
        return 1
    
    # Get ROFL App ID
    try:
        rofl_app_id_bytes = contract.functions.roflAppID().call()
        print(f"ROFL App ID in contract (hex): {rofl_app_id_bytes.hex()}")
        
        # Convert to text and print the App ID
        try:
            rofl_app_id_text = bytes.fromhex(rofl_app_id_bytes.hex()).decode('utf-8', errors='replace')
            print(f"ROFL App ID in contract (text): {rofl_app_id_text}")
        except Exception as e:
            print(f"Error converting ROFL App ID to text: {e}")
        
        # Compare with the App ID from RoflUtility
        if hasattr(rofl_utility, 'truncated_app_id') and rofl_utility.truncated_app_id:
            print(f"\n=== App ID Comparison ===")
            print(f"App ID in contract:    {rofl_app_id_text}")
            print(f"App ID in RoflUtility: {rofl_utility.truncated_app_id}")
            if rofl_app_id_text == rofl_utility.truncated_app_id:
                print("✅ App IDs MATCH")
            else:
                print("⚠️ App IDs DO NOT MATCH")
    except Exception as e:
        print(f"Error getting ROFL App ID: {e}")
        traceback.print_exc()
        return 1
    
    # Get total orders count
    try:
        total_orders = contract.functions.getTotalOrderCount().call()
        print(f"\nTotal orders in contract: {total_orders}")
    except Exception as e:
        print(f"Error getting total orders: {e}")
        traceback.print_exc()
        return 1
    
    # Check active order pairs
    print("\nLooking for active order pairs to match...")
    
    # If a specific order ID was provided, check it
    if args.order_id is not None:
        print(f"\nChecking specific order #{args.order_id}")
        check_order_with_auth_debug(contract, args.order_id, rofl_utility)
    else:
        # Otherwise, check the last few orders
        print("\nChecking last 5 orders for potential matches:")
        start_index = max(1, total_orders - 5)
        for order_id in range(start_index, total_orders + 1):
            check_order_with_auth_debug(contract, order_id, rofl_utility)
    
    return 0

def check_order_with_auth_debug(contract, order_id: int, rofl_utility):
    """Debug order access with detailed logging"""
    print(f"\n=== Checking Order #{order_id} ===")
    
    try:
        # Check if order exists
        print(f"Checking if order #{order_id} exists...")
        exists = contract.functions.orderExists(order_id).call()
        print(f"Order #{order_id} exists: {exists}")
        
        if not exists:
            print(f"Order #{order_id} does not exist")
            return
        
        # Check if order is filled
        print(f"Checking if order #{order_id} is filled...")
        is_filled = contract.functions.filledOrders(order_id).call()
        filled_status = "Filled" if is_filled else "Not filled"
        print(f"Order #{order_id} status: {filled_status}")
        
        if is_filled:
            print(f"Order #{order_id} is already filled, skipping")
            return
        
        # Get the owner of the order
        print(f"Getting owner of order #{order_id}...")
        try:
            owner = contract.functions.getOrderOwner(order_id).call()
            print(f"Order #{order_id} owner: {owner}")
        except Exception as e:
            print(f"Error getting order owner: {e}")
            traceback.print_exc()
        
        # Try to get order data without authentication
        print(f"Attempting to get order data without authentication...")
        try:
            # This will likely fail for confidential orders
            order_data = contract.functions.getEncryptedOrder(b'', order_id).call()
            print(f"Order data without auth: {order_data[:20]}...")
        except Exception as e:
            print(f"Expected error without authentication: {e}")
        
        # Try to get order data with authentication through RoflUtility
        print(f"Attempting to get order data with ROFL authentication...")
        try:
            # Prepare function data
            function_data = contract.encodeABI(fn_name="getEncryptedOrder", args=[b'', order_id])
            print(f"Encoded function data: {function_data[:30]}...")
            
            # Make authenticated call
            print("Making authenticated call...")
            result = rofl_utility.call_view_function(contract.address, function_data)
            print(f"Authentication result: {json.dumps(result, indent=2)}")
            
            if result and 'data' in result:
                data_hex = result['data']
                print(f"Received data (truncated): {data_hex[:50]}...")
                
                if data_hex.startswith('0x'):
                    data_hex = data_hex[2:]
                
                try:
                    data_bytes = bytes.fromhex(data_hex)
                    print(f"Converted to bytes (length): {len(data_bytes)}")
                    
                    # Try to decode the order data
                    try:
                        print("Attempting to decode order data...")
                        from eth_abi import decode as abi_decode
                        
                        # Try different possible order types
                        order_types = [
                            ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
                            ['uint256', 'address', 'address', 'uint256', 'uint256', 'uint8']
                        ]
                        
                        for types in order_types:
                            try:
                                print(f"Trying to decode with types: {types}")
                                decoded = abi_decode(types, data_bytes)
                                print(f"Successfully decoded: {decoded}")
                                
                                # Convert decoded data to a more readable format
                                order_data = {
                                    'orderId': decoded[0],
                                    'owner': decoded[1],
                                    'token': decoded[2],
                                    'price': decoded[3],
                                    'size': decoded[4],
                                    'isBuy': decoded[5],
                                }
                                
                                print(f"✅ Successfully retrieved and decoded order data:")
                                print(f"  Order ID: {order_data['orderId']}")
                                print(f"  Owner: {order_data['owner']}")
                                print(f"  Token: {order_data['token']}")
                                print(f"  Price: {order_data['price']}")
                                print(f"  Size: {order_data['size']}")
                                print(f"  Type: {'BUY' if order_data['isBuy'] else 'SELL'}")
                                
                                # Break if we successfully decoded
                                break
                                
                            except Exception as decode_error:
                                print(f"Error decoding with types {types}: {decode_error}")
                    except Exception as e:
                        print(f"Error in decoding process: {e}")
                        traceback.print_exc()
                except Exception as e:
                    print(f"Error converting hex to bytes: {e}")
                    traceback.print_exc()
            else:
                print("No data returned from authenticated call")
        except Exception as e:
            print(f"Error making authenticated call: {e}")
            traceback.print_exc()
    
    except Exception as e:
        print(f"Error checking order #{order_id}: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    sys.exit(main()) 