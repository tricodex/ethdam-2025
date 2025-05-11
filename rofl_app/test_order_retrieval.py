#!/usr/bin/env python3
"""
Test script to check if we can retrieve orders from the ROFLSwapOracle contract.
This helps verify if the TEE environment can access the order data.
"""

import os
import sys
import json
import argparse
import logging
from web3 import Web3
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("test-orders")

def main():
    """Main function to test order retrieval"""
    parser = argparse.ArgumentParser(description="Test order retrieval from ROFLSwapOracle contract")
    parser.add_argument("--contract", "-c", help="ROFLSwapOracle contract address", 
                       default=os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"))
    parser.add_argument("--provider", "-p", help="Web3 provider URL", 
                       default=os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io"))
    parser.add_argument("--order-id", "-o", type=int, help="Specific order ID to check", default=None)
    
    args = parser.parse_args()
    
    print("=== TESTING ORDER RETRIEVAL FROM ROFLSWAPORACLE ===")
    print(f"Contract address: {args.contract}")
    print(f"Web3 provider: {args.provider}")
    
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
        
        # Convert to text
        rofl_app_id_text = bytes.fromhex(rofl_app_id_bytes.hex()).decode('utf-8', errors='replace')
        print(f"ROFL App ID in contract (text): {rofl_app_id_text}")
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
    
    # If a specific order ID was provided, check it
    if args.order_id is not None:
        print(f"\nChecking specific order #{args.order_id}")
        check_specific_order(contract, args.order_id)
    else:
        # Otherwise, check the last few orders
        print("\nChecking last 5 orders:")
        start_index = max(1, total_orders - 5)
        for order_id in range(start_index, total_orders + 1):
            check_specific_order(contract, order_id)
    
    return 0

def check_specific_order(contract, order_id: int):
    """Check details for a specific order"""
    try:
        # Check if order exists
        exists = contract.functions.orderExists(order_id).call()
        if not exists:
            print(f"Order #{order_id}: Does not exist")
            return
        
        # Check if order is filled
        is_filled = contract.functions.filledOrders(order_id).call()
        print(f"Order #{order_id}: {'Filled' if is_filled else 'Not filled'}")
        
        # Try to get owner without auth token (this will likely fail for privacy reasons)
        try:
            # Note: In real contracts, this would require authentication
            # We're just testing public access here
            order_bytes = contract.functions.getEncryptedOrder(b'', order_id).call()
            print(f"  Order data size: {len(order_bytes)} bytes")
            print(f"  Order data available: {'Yes' if order_bytes else 'No'}")
        except Exception as e:
            print(f"  Could not retrieve order data: {str(e)}")
            print(f"  This is expected for private contracts - TEE environment would use authenticated calls")
    
    except Exception as e:
        print(f"Error checking order #{order_id}: {e}")

if __name__ == "__main__":
    sys.exit(main()) 