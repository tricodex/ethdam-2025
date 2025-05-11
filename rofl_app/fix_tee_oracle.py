#!/usr/bin/env python3
"""
Script to fix TEE oracle permissions for ROFLSwapOracle
This must be run inside a ROFL session with access to the MATCHER_PRIVATE_KEY
"""

import os
import sys
import logging
import json
from web3 import Web3
from eth_account import Account
from rofl_app.rofl_auth import RoflUtility

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("fix_tee_oracle")

def main():
    """Main function to get oracle address and fix permissions"""
    print("=== FIXING TEE ORACLE PERMISSIONS ===")
    
    # Check if we're running in a TEE environment
    socket_path = "/run/rofl-appd.sock"
    if not os.path.exists(socket_path):
        print(f"ERROR: Socket file not found at {socket_path}")
        print("This script must be run inside a ROFL session.")
        return 1
    
    # Get the MATCHER_PRIVATE_KEY from environment
    private_key = os.environ.get('MATCHER_PRIVATE_KEY')
    if not private_key:
        print("ERROR: No MATCHER_PRIVATE_KEY found in environment")
        return 1
    
    # Create account from private key
    try:
        account = Account.from_key(private_key)
        oracle_address = account.address
        print(f"Oracle address inside TEE: {oracle_address}")
    except Exception as e:
        print(f"Error creating account from private key: {e}")
        return 1
    
    # Get ROFL app ID
    rofl_app_id = os.environ.get('ROFL_APP_ID')
    if not rofl_app_id:
        print("WARNING: No ROFL_APP_ID found in environment")
    else:
        print(f"ROFL App ID: {rofl_app_id}")
    
    # Get contract address
    contract_address = os.environ.get('ROFLSWAP_ADDRESS')
    if not contract_address:
        print("ERROR: No ROFLSWAP_ADDRESS found in environment")
        return 1
    
    print(f"Contract address: {contract_address}")
    
    # Initialize RoflUtility for signing transactions
    try:
        rofl_utility = RoflUtility(contract_address, is_tee=True)
        
        # Now check if our oracle address matches the one in the contract
        web3 = Web3(Web3.HTTPProvider(os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io")))
        
        # Load contract ABI (minimal ABI with just the functions we need)
        abi = [
            {"inputs": [], "name": "oracle", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
            {"inputs": [{"internalType": "address", "name": "addr", "type": "address"}], "name": "setOracle", "outputs": [], "stateMutability": "nonpayable", "type": "function"}
        ]
        
        # Create contract instance
        contract = web3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=abi)
        
        # Get current oracle address from contract
        try:
            current_oracle = contract.functions.oracle().call()
            print(f"Current oracle address in contract: {current_oracle}")
            
            if current_oracle.lower() == oracle_address.lower():
                print("✅ Oracle address already matches the TEE account!")
            else:
                print("❌ Oracle address does not match the TEE account.")
                print("Attempting to set oracle address...")
                
                # Set oracle address
                function_data = contract.encodeABI(fn_name="setOracle", args=[oracle_address])
                
                print("Submitting transaction to set oracle address...")
                result = rofl_utility.submit_transaction(contract_address, function_data)
                
                if result and result.get('status') == 'ok':
                    print(f"✅ Transaction submitted! TX hash: {result.get('txhash', 'unknown')}")
                    print("The oracle address should now be updated.")
                else:
                    print(f"❌ Failed to submit transaction: {result}")
        except Exception as e:
            print(f"Error checking oracle address: {e}")
            return 1
        
    except Exception as e:
        print(f"Error initializing RoflUtility: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 