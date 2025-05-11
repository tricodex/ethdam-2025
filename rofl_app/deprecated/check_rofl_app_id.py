#!/usr/bin/env python3
"""
Check the ROFL app ID stored in the contract vs. the one we're using for authentication.
"""

import os
import sys
from web3 import Web3
from sapphire_wrapper import create_sapphire_web3

# ABI for the ROFLSwapV5 contract (minimal for this purpose)
ROFLSWAP_ABI = [
    {
        "inputs": [],
        "name": "roflAppId",
        "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def main():
    # Get configuration from environment variables
    rpc_url = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
    private_key = os.environ.get('PRIVATE_KEY') or os.environ.get('MATCHER_PRIVATE_KEY')
    app_id = os.environ.get('ROFL_APP_ID')
    roflswap_address = os.environ.get('ROFLSWAP_ADDRESS')
    
    if not private_key:
        print("ERROR: PRIVATE_KEY or MATCHER_PRIVATE_KEY environment variable must be set")
        sys.exit(1)
    
    if not app_id:
        print("ERROR: ROFL_APP_ID environment variable must be set")
        sys.exit(1)
    
    if not roflswap_address:
        print("ERROR: ROFLSWAP_ADDRESS environment variable must be set")
        sys.exit(1)
    
    # Create web3 instance without app_id for now
    print("Connecting to Sapphire network...")
    web3 = create_sapphire_web3(rpc_url, private_key)
    
    # Connect to the ROFLSwapV5 contract
    print(f"Connecting to ROFLSwapV5 contract at {roflswap_address}...")
    contract = web3.eth.contract(address=roflswap_address, abi=ROFLSWAP_ABI)
    
    # Get the ROFL app ID from the contract
    try:
        print("Fetching roflAppId from the contract...")
        contract_app_id_bytes = contract.functions.roflAppId().call()
        
        # Convert bytes to readable format (assuming it's UTF-8 encoded)
        try:
            contract_app_id_str = contract_app_id_bytes.decode('utf-8')
        except:
            # If decoding fails, show hex representation
            contract_app_id_str = contract_app_id_bytes.hex()
            
        print(f"\nROFL App ID Comparison:")
        print(f"1. App ID in environment: {app_id}")
        print(f"2. App ID in contract (bytes): {contract_app_id_bytes.hex()}")
        
        if app_id == contract_app_id_str:
            print("\n✅ MATCH: The ROFL app IDs match perfectly!")
        else:
            print("\n❌ MISMATCH: The ROFL app IDs are different!")
            
            # Check if one is a prefix of the other (partial match)
            if app_id in contract_app_id_str or contract_app_id_str in app_id:
                print("NOTE: There appears to be a partial match between the IDs.")
                
        # Now try using the app_id for authentication and make a call that requires authorization
        print("\nTesting authentication with the app ID...")
        auth_web3 = create_sapphire_web3(rpc_url, private_key, app_id)
        auth_contract = auth_web3.eth.contract(address=roflswap_address, abi=ROFLSWAP_ABI)
        
        try:
            # Get the roflAppId again but with authenticated web3
            auth_app_id_bytes = auth_contract.functions.roflAppId().call()
            print("✅ Authentication successful: Could make contract call with app ID authentication.")
        except Exception as e:
            print(f"❌ Authentication failed: {str(e)}")
            
    except Exception as e:
        print(f"ERROR: Failed to get roflAppId from contract: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 