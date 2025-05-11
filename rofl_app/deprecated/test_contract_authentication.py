#!/usr/bin/env python3
"""
Test script for verifying authentication with the ROFLSwapV5 contract
"""

import os
import sys
import json
import argparse
import logging
from web3 import Web3

from rofl_auth import RoflUtility

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_auth")

def main():
    """Test authentication with the ROFLSwapV5 contract"""
    parser = argparse.ArgumentParser(description="Test ROFLSwapV5 Contract Authentication")
    parser.add_argument("--socket", type=str, default="", help="ROFL app daemon socket path")
    parser.add_argument("--network", type=str, default="sapphire-testnet", 
                       help="Network name (sapphire-testnet, sapphire-mainnet, sapphire-localnet)")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--key-id", type=str, default="roflswap-matcher", 
                       help="Key ID to use for ROFL app authentication")
    parser.add_argument("--contract", type=str, help="Contract address (override ROFLSWAP_ADDRESS env var)")
    args = parser.parse_args()
    
    # Set log level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    # Get configuration from environment variables
    contract_address = args.contract or os.environ.get("ROFLSWAP_ADDRESS")
    private_key = os.environ.get("PRIVATE_KEY") or os.environ.get("MATCHER_PRIVATE_KEY")
    
    # Validate configuration
    if not contract_address:
        logger.error("Contract address must be provided via --contract or ROFLSWAP_ADDRESS environment variable")
        sys.exit(1)
    
    # Set up network connection
    rpc_urls = {
        'sapphire-testnet': 'https://testnet.sapphire.oasis.io',
        'sapphire-mainnet': 'https://sapphire.oasis.io',
        'sapphire-localnet': 'http://localhost:8545'
    }
    
    rpc_url = rpc_urls.get(args.network, 'https://testnet.sapphire.oasis.io')
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    
    # Determine socket path - check if we're running inside a ROFL TEE environment
    if os.path.exists("/run/rofl-appd.sock"):
        logger.info("Detected ROFL TEE environment")
        socket_path = "/run/rofl-appd.sock"
    else:
        socket_path = args.socket
        if socket_path:
            logger.info(f"Using custom ROFL socket: {socket_path}")
        else:
            logger.warning("No ROFL socket specified, authentication may fail")
    
    try:
        # Initialize ROFL utility for authentication
        rofl_utility = RoflUtility(socket_path)
        
        # If we're in ROFL environment, try to fetch key from the ROFL app daemon
        if os.path.exists("/run/rofl-appd.sock") and (not private_key or not private_key.startswith("0x")):
            try:
                logger.info(f"Fetching key '{args.key_id}' from ROFL app daemon...")
                private_key = rofl_utility.fetch_key(args.key_id)
                logger.info("Key fetched successfully")
            except Exception as e:
                logger.error(f"Failed to fetch key from ROFL app daemon: {e}")
                if not private_key:
                    logger.error("No private key available, exiting")
                    sys.exit(1)
        elif not private_key:
            logger.error("PRIVATE_KEY or MATCHER_PRIVATE_KEY environment variable must be set when not using ROFL key management")
            sys.exit(1)
        
        # Initialize account
        account = web3.eth.account.from_key(private_key)
        web3.eth.default_account = account.address
        
        logger.info(f"Testing ROFLSwapV5 Contract Authentication")
        logger.info(f"Contract address: {contract_address}")
        logger.info(f"Account address: {account.address}")
        logger.info(f"Network: {args.network}")
        
        # Define minimal ABI for ROFLSwapV5
        minimal_abi = [
            {
                "inputs": [],
                "name": "getTotalOrderCount",
                "outputs": [{"type": "uint256", "name": ""}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"type": "uint256", "name": "orderId"}],
                "name": "getEncryptedOrder",
                "outputs": [{"type": "bytes", "name": ""}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"type": "uint256", "name": "orderId"}],
                "name": "getOrderOwner",
                "outputs": [{"type": "address", "name": ""}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        # Create contract instance
        contract = web3.eth.contract(address=Web3.to_checksum_address(contract_address), abi=minimal_abi)
        
        # Test non-authenticated call
        try:
            order_count = contract.functions.getTotalOrderCount().call()
            logger.info(f"Regular call: Total orders in contract: {order_count}")
        except Exception as e:
            logger.error(f"Error with regular call: {e}")
        
        # Try to get a specific order through regular call (this should fail with 0x6890282f error)
        try:
            order_id = 1
            encrypted_data = contract.functions.getEncryptedOrder(order_id).call()
            logger.info(f"Regular call: Successfully retrieved encrypted data for order {order_id}")
        except Exception as e:
            logger.error(f"Regular call: Error retrieving order {order_id}: {e}")
            logger.info("This error is expected if the contract requires ROFL authentication")
        
        # Test authenticated call through ROFL daemon
        try:
            order_id = 1
            # Get encoded function call data
            function_data = contract.encodeABI(fn_name="getEncryptedOrder", args=[order_id])
            
            # Make authenticated call through ROFL daemon
            result = rofl_utility.call_view_function(contract_address, function_data)
            
            if result.get('data'):
                logger.info(f"Authenticated call: Successfully retrieved encrypted data for order {order_id}")
                
                # Try to decode the result
                output_type = "bytes"
                decoded = web3.codec.decode_abi([output_type], bytes.fromhex(result['data']))
                logger.info(f"Decoded data length: {len(decoded[0])} bytes")
                
                # If successful, we've fixed the authentication issue
                logger.info("✅ Authentication test successful!")
            else:
                logger.error(f"Authenticated call: No data returned from contract")
                
        except Exception as e:
            logger.error(f"Authenticated call: Error retrieving order {order_id}: {e}")
            logger.error("Authentication test failed")
        
    except Exception as e:
        logger.exception(f"Error in test: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 