#!/usr/bin/env python3
"""
Script to check the current ROFL App ID and oracle address in the ROFLSwapOracle contract.
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
    
    args = parser.parse_args()
    
    if not args.contract:
        print("ERROR: Contract address not provided. Use --contract or set ROFLSWAP_ADDRESS environment variable.")
        return 1
    
    print("=== CHECKING CONTRACT CONFIGURATION ===")
    print(f"Contract address: {args.contract}")
    print(f"Web3 provider: {args.provider}")
    
    # Connect to web3
    w3 = Web3(Web3.HTTPProvider(args.provider))
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
        print(f"\nROFL App ID in contract (hex): {rofl_app_id_bytes.hex()}")
        
        # Convert to text
        rofl_app_id_text = bytes.fromhex(rofl_app_id_bytes.hex()).decode('utf-8', errors='replace')
        print(f"ROFL App ID in contract (text): {rofl_app_id_text}")
        
        # Check if the App ID in the yaml matches
        print("\nMatch verification:")
        try:
            with open("rofl.yaml", "r") as f:
                import yaml
                config = yaml.safe_load(f)
                yaml_app_id = config.get("deployments", {}).get("default", {}).get("app_id", "")
                print(f"Current App ID in rofl.yaml: {yaml_app_id}")
                
                # Extract just the part that should match
                truncated_id = ""
                if yaml_app_id and yaml_app_id.startswith("rofl1"):
                    # Extract the part after "rofl1" with same length as rofl_app_id_text
                    truncated_id = yaml_app_id[5:5+len(rofl_app_id_text)]
                    print(f"Extracted ID from yaml (21 bytes): {truncated_id}")
                    
                    if truncated_id == rofl_app_id_text:
                        print(f"✅ App ID in rofl.yaml MATCHES the contract configuration")
                    else:
                        print(f"❌ App ID MISMATCH! The rofl.yaml App ID does not match the contract")
                else:
                    print(f"❌ Invalid App ID format in rofl.yaml")
        except Exception as e:
            print(f"Error checking rofl.yaml: {e}")
    except Exception as e:
        print(f"Error getting ROFL App ID: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 