#!/usr/bin/env python3
"""
Test script to verify token addresses and contract status
"""

import os
import json
import logging
from web3 import Web3

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("token-test")

# Token addresses from the deployment
WATER_TOKEN_ADDRESS = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04"
FIRE_TOKEN_ADDRESS = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977"

def main():
    # Get contract address from environment
    contract_address = os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e")
    web3_provider = os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io")
    
    # Initialize Web3
    logger.info(f"Connecting to {web3_provider}")
    w3 = Web3(Web3.HTTPProvider(web3_provider))
    
    # Load contract ABIs
    try:
        with open("abi/ROFLSwapOracle.json", "r") as f:
            contract_abi = json.load(f)["abi"]
        
        with open("abi/WaterToken.json", "r") as f:
            water_token_abi = json.load(f)["abi"]
            
        with open("abi/FireToken.json", "r") as f:
            fire_token_abi = json.load(f)["abi"]
    except FileNotFoundError as e:
        logger.error(f"ABI file not found: {e}")
        return
    except KeyError as e:
        logger.error(f"Error in ABI format: {e}")
        return
    
    # Create contract instances
    try:
        contract = w3.eth.contract(address=contract_address, abi=contract_abi)
        water_token = w3.eth.contract(address=WATER_TOKEN_ADDRESS, abi=water_token_abi)
        fire_token = w3.eth.contract(address=FIRE_TOKEN_ADDRESS, abi=fire_token_abi)
    except Exception as e:
        logger.error(f"Error creating contract instances: {e}")
        return
    
    # Check contract information
    logger.info(f"\nROFLSwap Oracle Contract Information:")
    logger.info(f"Contract Address: {contract_address}")
    
    try:
        # Get ROFL App ID
        rofl_app_id = contract.functions.roflAppID().call()
        logger.info(f"ROFL App ID: {rofl_app_id.hex()}")
        
        # Get oracle address
        oracle_address = contract.functions.oracle().call()
        logger.info(f"Oracle Address: {oracle_address}")
        
        # Get token addresses
        water_token_address = contract.functions.waterToken().call()
        fire_token_address = contract.functions.fireToken().call()
        logger.info(f"Water Token Address: {water_token_address}")
        logger.info(f"Fire Token Address: {fire_token_address}")
        
        # Get token information
        water_name = water_token.functions.name().call()
        water_symbol = water_token.functions.symbol().call()
        water_decimals = water_token.functions.decimals().call()
        
        fire_name = fire_token.functions.name().call()
        fire_symbol = fire_token.functions.symbol().call()
        fire_decimals = fire_token.functions.decimals().call()
        
        logger.info(f"\nWater Token Information:")
        logger.info(f"Name: {water_name}")
        logger.info(f"Symbol: {water_symbol}")
        logger.info(f"Decimals: {water_decimals}")
        
        logger.info(f"\nFire Token Information:")
        logger.info(f"Name: {fire_name}")
        logger.info(f"Symbol: {fire_symbol}")
        logger.info(f"Decimals: {fire_decimals}")
        
        # Get total order count
        total_orders = contract.functions.getTotalOrderCount().call()
        logger.info(f"\nTotal Orders: {total_orders}")
        
        # Check some orders
        logger.info(f"\nChecking Orders:")
        for order_id in range(1, min(total_orders + 1, 6)):
            try:
                exists = contract.functions.orderExists(order_id).call()
                filled = contract.functions.filledOrders(order_id).call()
                logger.info(f"Order {order_id}: Exists: {exists}, Filled: {filled}")
            except Exception as e:
                logger.error(f"Error checking order {order_id}: {e}")
    
    except Exception as e:
        logger.error(f"Error getting contract information: {e}")

if __name__ == "__main__":
    main() 