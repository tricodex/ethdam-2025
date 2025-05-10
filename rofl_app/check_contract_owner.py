#!/usr/bin/env python3
# Check if we own the ROFLSwap contract

from web3 import Web3
import json
import os

def main():
    # Get PRIVATE_KEY from environment
    private_key = os.environ.get('PRIVATE_KEY')
    if not private_key:
        print("PRIVATE_KEY environment variable not set")
        # Try to get it from rofl.yaml
        try:
            with open('rofl.yaml', 'r') as f:
                found_key = False
                for line in f:
                    if 'name: PRIVATE_KEY' in line:
                        found_key = True
                    elif found_key and 'value:' in line:
                        print("Found PRIVATE_KEY in rofl.yaml, but it's encrypted")
                        break
        except Exception as e:
            print(f"Error reading rofl.yaml: {str(e)}")
        return
    
    # Set up provider
    provider = Web3.HTTPProvider('https://testnet.sapphire.oasis.io')
    w3 = Web3(provider)
    
    # Load contract ABI
    with open('abi/ROFLSwapV3.json', 'r') as f:
        contract_json = json.load(f)
        roflswap_abi = contract_json['abi']
    
    # Contract address
    roflswap_address = '0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df'
    
    # Create contract instance
    roflswap = w3.eth.contract(address=roflswap_address, abi=roflswap_abi)
    
    # Get the account from the private key
    account = w3.eth.account.from_key(private_key)
    our_address = account.address
    
    print(f"Our address: {our_address}")
    
    # Call owner function
    try:
        contract_owner = roflswap.functions.owner().call()
        print(f"Contract owner: {contract_owner}")
        
        if our_address.lower() == contract_owner.lower():
            print("\n✅ We are the owner of the contract! We can update the roflAppId.")
        else:
            print("\n❌ We are NOT the owner of the contract. We cannot update the roflAppId.")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 