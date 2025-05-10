#!/usr/bin/env python3
"""
Test script for verifying Sapphire authentication using oasis-sapphire-py.
This script tests basic connectivity and authentication with the Sapphire network.
"""

import os
import logging
from web3 import Web3
import time

from sapphire_wrapper import create_sapphire_web3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_authentication():
    """Test Sapphire authentication with the official wrapper"""
    # Get configuration from environment or use defaults
    private_key = os.environ.get('PRIVATE_KEY')
    if not private_key:
        logger.error("PRIVATE_KEY environment variable must be set")
        return False
    
    rpc_url = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
    logger.info(f"Testing authentication with RPC: {rpc_url}")
    
    try:
        # Create web3 connection with sapphire authentication
        web3 = create_sapphire_web3(rpc_url=rpc_url, private_key=private_key)
        
        # Test connection
        connected = web3.is_connected()
        account = web3.eth.default_account
        chain_id = web3.eth.chain_id
        gas_price = web3.eth.gas_price
        block = web3.eth.get_block('latest')
        
        logger.info(f"Connected: {connected}")
        logger.info(f"Client version: {web3.client_version}")
        logger.info(f"Chain ID: {chain_id}")
        logger.info(f"Using account: {account}")
        logger.info(f"Current gas price: {gas_price}")
        logger.info(f"Latest block: {block.number}, timestamp: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(block.timestamp))}")
        
        # Get account balance
        balance = web3.eth.get_balance(account)
        logger.info(f"Account balance: {web3.from_wei(balance, 'ether')} ROSE")
        
        # Try a simple view call to see if authentication is working
        network_id = web3.net.version
        logger.info(f"Network ID: {network_id}")
        
        # Check if running in ROFL container
        is_rofl = os.path.exists('/run/rofl-appd.sock')
        if is_rofl:
            logger.info("Running inside ROFL container with proper authentication")
        else:
            logger.info("Not running inside ROFL container")
            logger.info("Note: Some contract functions requiring ROFL authentication will fail")
        
        return True
    except Exception as e:
        logger.error(f"Authentication test failed: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_authentication()
    if success:
        logger.info("Authentication test successful")
    else:
        logger.error("Authentication test failed") 