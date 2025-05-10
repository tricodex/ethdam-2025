#!/usr/bin/env python3
# Script to test connection to the ROFLSwapV4 contract

import json
import os
from web3 import Web3

# Configuration
V4_CONTRACT_ADDRESS = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df"
WEB3_PROVIDER = os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io")
PRIVATE_KEY = os.environ.get("PRIVATE_KEY")

def print_separator():
    print("\n" + "=" * 60 + "\n")

def test_connection():
    """Test connection to the ROFLSwapV4 contract"""
    print_separator()
    print("TESTING CONNECTION TO ROFLSWAPV4 CONTRACT")
    print_separator()
    
    print(f"Contract address: {V4_CONTRACT_ADDRESS}")
    print(f"Web3 provider: {WEB3_PROVIDER}")
    
    if not PRIVATE_KEY:
        print("WARNING: PRIVATE_KEY environment variable not set")
    
    try:
        # Initialize Web3
        web3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))
        
        # Check connection
        if not web3.is_connected():
            print("ERROR: Could not connect to Web3 provider")
            return False
        
        print(f"Connected to Web3 provider")
        print(f"Chain ID: {web3.eth.chain_id}")
        
        if PRIVATE_KEY:
            account = web3.eth.account.from_key(PRIVATE_KEY)
            account_address = account.address
            print(f"Account address: {account_address}")
            balance = web3.eth.get_balance(account_address)
            print(f"Account balance: {web3.from_wei(balance, 'ether')} ETH")
        
        # Load contract ABI
        with open("abi/ROFLSwapV4.json", "r") as f:
            contract_json = json.load(f)
            roflswap_abi = contract_json["abi"]
        
        # Create contract instance
        contract_address = Web3.to_checksum_address(V4_CONTRACT_ADDRESS)
        contract = web3.eth.contract(address=contract_address, abi=roflswap_abi)
        
        # Get order counter
        order_counter = contract.functions.orderCounter().call()
        print(f"Current order counter: {order_counter}")
        
        # Get filled orders
        print("\nChecking order status:")
        buy_orders = 0
        sell_orders = 0
        filled_orders = 0
        
        for order_id in range(1, order_counter + 1):
            is_filled = contract.functions.filledOrders(order_id).call()
            if is_filled:
                filled_orders += 1
                print(f"Order #{order_id} is filled")
            else:
                # Try to get order type (buy/sell)
                try:
                    # This is just a dummy call to try to get order info if possible
                    # In a real implementation, we'd need to decrypt the order data
                    # For now, we're just demonstrating connectivity
                    pass
                except:
                    pass
                
                print(f"Order #{order_id} is NOT filled")
        
        print(f"\nTotal orders: {order_counter}")
        print(f"Filled orders: {filled_orders}")
        print(f"Unfilled orders: {order_counter - filled_orders}")
        
        # Get complete ROFL app ID (no truncation)
        try:
            rofl_app_id = contract.functions.roflAppId().call()
            print(f"\nROFL App ID (full): {Web3.to_hex(rofl_app_id)}")
        except Exception as e:
            print(f"Error getting ROFL App ID: {str(e)}")
        
        print_separator()
        print("CONTRACT CONNECTION TEST SUCCESSFUL")
        print_separator()
        return True
        
    except Exception as e:
        print(f"Error in contract connection test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_connection() 