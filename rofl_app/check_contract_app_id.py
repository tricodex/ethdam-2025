#!/usr/bin/env python3
# Check the ROFL App ID in the ROFLSwap contract

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
    
    # Call roflAppId function
    try:
        rofl_app_id_bytes = roflswap.functions.roflAppId().call()
        rofl_app_id_hex = rofl_app_id_bytes.hex()
        
        print(f'roflAppId in contract (hex): 0x{rofl_app_id_hex}')
        
        # Try to decode as UTF-8
        try:
            rofl_app_id_text = bytes.fromhex(rofl_app_id_hex).decode('utf-8')
            print(f'roflAppId in contract (decoded): {rofl_app_id_text}')
        except Exception as e:
            print(f"Could not decode app ID as UTF-8: {str(e)}")
        
        # Get the ROFL app ID from the deployment file
        print("\nROFL App ID from rofl.yaml:")
        with open('rofl.yaml', 'r') as f:
            for line in f:
                if 'app_id:' in line:
                    yaml_app_id = line.strip().split('app_id:')[1].strip()
                    print(f"app_id: {yaml_app_id}")
                    break
        
        # Compare them
        if rofl_app_id_text == yaml_app_id:
            print("\n✅ App IDs match!")
        else:
            print("\n❌ App IDs do NOT match! This is the root cause of the error.")
            print("The contract is expecting a different ROFL app than what's currently deployed.")
            print("Either update the contract's roflAppId or redeploy the ROFL app with the correct ID.")
    
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    main() 