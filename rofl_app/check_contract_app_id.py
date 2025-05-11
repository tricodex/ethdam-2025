#!/usr/bin/env python3
"""
Script to check the current ROFL App ID and oracle address in the contract.
This helps verify the configuration mismatch causing the matcher issues.
"""

import os
import sys
import json
import argparse
from web3 import Web3

def main():
    """Main function to check contract configuration"""
    parser = argparse.ArgumentParser(description="Check ROFL App ID and oracle address in the contract")
    parser.add_argument("--contract", "-c", help="ROFLSwapOracle contract address", 
                        default=os.environ.get("ROFLSWAP_ADDRESS"))
    parser.add_argument("--provider", "-p", help="Web3 provider URL", 
                        default=os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io"))
    parser.add_argument("--abi-file", "-a", help="ABI file for the contract",
                        default="abi/ROFLSwapOracle.json")
    args = parser.parse_args()

    # Check if contract address is provided
    if not args.contract:
        print("ERROR: No contract address provided. Use --contract or set ROFLSWAP_ADDRESS environment variable.")
        return 1

    print("=== CHECKING CONTRACT CONFIGURATION ===")
    print(f"Contract address: {args.contract}")
    print(f"Web3 provider: {args.provider}")

    # Initialize Web3
    web3 = Web3(Web3.HTTPProvider(args.provider))
    if not web3.is_connected():
        print(f"ERROR: Could not connect to Web3 provider at {args.provider}")
        return 1

    print(f"Connected to Web3 provider: {web3.is_connected()}")

    # Load contract ABI
    try:
        abi_path = args.abi_file
        if not os.path.exists(abi_path):
            abi_path = os.path.join(os.path.dirname(__file__), args.abi_file)
        
        if not os.path.exists(abi_path):
            print(f"ERROR: ABI file not found at {abi_path}")
            # Provide minimal ABI for basic functions
            abi = [
                {"inputs": [], "name": "oracle", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
                {"inputs": [], "name": "roflAppID", "outputs": [{"internalType": "bytes21", "name": "", "type": "bytes21"}], "stateMutability": "view", "type": "function"}
            ]
            print("Using minimal ABI for basic functions")
        else:
            with open(abi_path, 'r') as f:
                contract_data = json.load(f)
                abi = contract_data["abi"] if "abi" in contract_data else contract_data
            print(f"Loaded ABI from {abi_path}")
    except Exception as e:
        print(f"Error loading ABI: {e}")
        return 1

    # Create contract instance
    contract = web3.eth.contract(address=Web3.to_checksum_address(args.contract), abi=abi)

    # Get oracle address
    try:
        oracle_address = contract.functions.oracle().call()
        print(f"\nOracle address in contract: {oracle_address}")
        
        # Check if oracle address is empty
        if oracle_address == "0x0000000000000000000000000000000000000000":
            print("WARNING: Oracle address is empty (zero address)")
    except Exception as e:
        print(f"Error getting oracle address: {e}")

    # Get ROFL App ID
    try:
        rofl_app_id_bytes = contract.functions.roflAppID().call()
        
        # Convert bytes to hex string
        rofl_app_id_hex = rofl_app_id_bytes.hex()
        print(f"\nROFL App ID in contract (hex): 0x{rofl_app_id_hex}")
        
        # Try to decode as text
        try:
            rofl_app_id_text = rofl_app_id_bytes.decode('utf-8', errors='replace')
            print(f"ROFL App ID in contract (text): {rofl_app_id_text}")
        except Exception:
            print("Could not decode ROFL App ID as text")
        
        # Compare with expected format
        print("\nMatch verification:")
        yaml_path = os.path.join(os.path.dirname(__file__), "rofl.yaml")
        if os.path.exists(yaml_path):
            import yaml
            with open(yaml_path, 'r') as f:
                config = yaml.safe_load(f)
                current_app_id = config['deployments']['default']['app_id']
                print(f"Current App ID in rofl.yaml: {current_app_id}")
                
                # Extract the part after "rofl1" prefix if it exists
                if current_app_id.startswith("rofl1"):
                    extracted_id = current_app_id[5:26]  # 21 bytes after "rofl1"
                    print(f"Extracted ID from yaml (21 bytes): {extracted_id}")
                    
                    # Check if this matches the contract's bytes21
                    if extracted_id == rofl_app_id_text:
                        print("✅ App ID in rofl.yaml MATCHES the contract configuration")
                    else:
                        print("❌ App ID in rofl.yaml DOES NOT MATCH the contract configuration")
                else:
                    print("WARNING: App ID in rofl.yaml does not have the expected 'rofl1' prefix")
        else:
            print("Could not find rofl.yaml for comparison")
        
    except Exception as e:
        print(f"Error getting ROFL App ID: {e}")

    return 0

if __name__ == "__main__":
    sys.exit(main()) 