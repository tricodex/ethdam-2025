#!/usr/bin/env python3

import os
import json
import traceback
from web3 import Web3
from sapphire_wrapper import create_sapphire_web3

# Load the private key from environment
def get_private_key():
    private_key = os.environ.get('PRIVATE_KEY') or os.environ.get('MATCHER_PRIVATE_KEY')
    if not private_key:
        raise ValueError("Either PRIVATE_KEY or MATCHER_PRIVATE_KEY must be set")
    if private_key.startswith('0x'):
        private_key = private_key[2:]
    return private_key

# Main diagnostic function
def diagnose_contract_access():
    # Configuration
    roflswap_address = os.environ.get('ROFLSWAP_ADDRESS', '0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB')
    web3_provider = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
    rofl_app_id = os.environ.get('ROFL_APP_ID', 'rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972')
    
    print("=== ROFLSwap Contract Access Diagnostic ===")
    print(f"Contract Address: {roflswap_address}")
    print(f"Web3 Provider: {web3_provider}")
    print(f"ROFL App ID: {rofl_app_id}")
    
    try:
        # Get private key
        private_key = get_private_key()
        print("Private key loaded successfully")
        
        # Create authenticated web3 provider
        web3 = create_sapphire_web3(
            rpc_url=web3_provider,
            private_key=private_key,
            app_id=rofl_app_id
        )
        
        print(f"Web3 connected: {web3.is_connected()}")
        
        # Get chain ID
        chain_id = web3.eth.chain_id
        print(f"Chain ID: {chain_id}")
        
        # Get account (used for signing)
        from eth_account import Account
        account = Account.from_key(private_key)
        address = account.address
        print(f"Account address: {address}")
        
        # Get ETH balance
        balance = web3.eth.get_balance(address)
        print(f"ETH Balance: {web3.from_wei(balance, 'ether')} ETH")
        
        # Load contract ABI
        try:
            with open('abi/ROFLSwapV5.json', 'r') as f:
                contract_json = json.load(f)
                if isinstance(contract_json, dict) and 'abi' in contract_json:
                    roflswap_abi = contract_json['abi']
                elif isinstance(contract_json, list):
                    roflswap_abi = contract_json
                else:
                    raise ValueError("Invalid ABI format")
            print("ROFLSwapV5 ABI loaded successfully")
        except Exception as e:
            print(f"Error loading V5 ABI: {e}")
            # Try to fall back to V4
            with open('abi/ROFLSwapV4.json', 'r') as f:
                contract_json = json.load(f)
                if isinstance(contract_json, dict) and 'abi' in contract_json:
                    roflswap_abi = contract_json['abi']
                elif isinstance(contract_json, list):
                    roflswap_abi = contract_json
                else:
                    raise ValueError("Invalid ABI format")
            print("ROFLSwapV4 ABI loaded as fallback")
        
        # Create contract instance
        roflswap = web3.eth.contract(
            address=roflswap_address,
            abi=roflswap_abi
        )
        print("Contract instance created")
        
        # Get order count
        try:
            order_count = roflswap.functions.getTotalOrderCount().call()
            print(f"Total orders in contract: {order_count}")
        except Exception as e:
            print(f"ERROR getting order count: {e}")
            print(f"Detailed error: {traceback.format_exc()}")
            order_count = 16  # Default for testing
            print(f"Using default order count: {order_count}")
        
        # Try to get a specific order (let's try order #15)
        for order_id in [15, 16]:
            print(f"\nAttempting to get order #{order_id}")
            
            # Check if order is filled
            try:
                is_filled = roflswap.functions.filledOrders(order_id).call()
                print(f"Order {order_id} is filled: {is_filled}")
            except Exception as e:
                print(f"ERROR checking if order {order_id} is filled: {e}")
                print(f"Detailed error: {traceback.format_exc()}")
            
            # Try to get encrypted order data
            try:
                encrypted_data = roflswap.functions.getEncryptedOrder(order_id).call()
                print(f"Successfully retrieved order {order_id}")
                print(f"Raw data: {encrypted_data[:100]}...")  # Show first 100 chars
            except Exception as e:
                print(f"ERROR getting encrypted data for order {order_id}: {e}")
                print(f"Detailed error: {traceback.format_exc()}")
            
            # Try to get owner of the order
            try:
                owner_address = roflswap.functions.getOrderOwner(order_id).call()
                print(f"Order {order_id} owner: {owner_address}")
            except Exception as e:
                print(f"ERROR getting owner for order {order_id}: {e}")
                print(f"Detailed error: {traceback.format_exc()}")
        
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        print(f"Detailed error: {traceback.format_exc()}")

if __name__ == "__main__":
    diagnose_contract_access() 