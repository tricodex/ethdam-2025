#!/usr/bin/env python3
# Check token addresses in the ROFLSwapV3 contract

from web3 import Web3
import json

def main():
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
    
    # Get token addresses
    try:
        water_token = roflswap.functions.waterToken().call()
        fire_token = roflswap.functions.fireToken().call()
        
        print(f"Water token address: {water_token}")
        print(f"Fire token address: {fire_token}")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 