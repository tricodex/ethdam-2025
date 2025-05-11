#!/usr/bin/env python3
"""
ROFLSwap Order Matcher Oracle Service

This service runs inside a Trusted Execution Environment (TEE) and authenticates
with the ROFLSwapV5 contract to access encrypted orders and execute matches.
"""

import os
import sys
import argparse
import logging

from rofl_auth import RoflUtility
from roflswap_oracle import ROFLSwapOracle

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('roflswap_matcher.log')
    ]
)
logger = logging.getLogger("roflswap_matcher")

def main():
    """Main function to run the ROFLSwap order matcher oracle"""
    parser = argparse.ArgumentParser(description="ROFLSwap Order Matcher Oracle")
    parser.add_argument("--once", action="store_true", help="Process orders once and exit")
    parser.add_argument("--interval", type=int, default=30, help="Polling interval in seconds")
    parser.add_argument("--socket", type=str, default="", help="ROFL app daemon socket path")
    parser.add_argument("--network", type=str, default="sapphire-testnet", 
                       help="Network name (sapphire-testnet, sapphire-mainnet, sapphire-localnet)")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--key-id", type=str, default="roflswap-matcher", 
                       help="Key ID to use for ROFL app authentication")
    args = parser.parse_args()
    
    # Set log level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    # Get configuration from environment variables
    contract_address = os.environ.get("ROFLSWAP_ADDRESS")
    private_key = os.environ.get("PRIVATE_KEY") or os.environ.get("MATCHER_PRIVATE_KEY")
    
    # Validate configuration
    if not contract_address:
        logger.error("ROFLSWAP_ADDRESS environment variable must be set")
        sys.exit(1)
    
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
        # rather than using environment variables directly
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
        
        logger.info(f"Starting ROFLSwap Order Matcher Oracle")
        logger.info(f"Contract address: {contract_address}")
        logger.info(f"Network: {args.network}")
        
        # Initialize the oracle with proper ROFL authentication
        oracle = ROFLSwapOracle(
            contract_address=contract_address,
            network_name=args.network,
            rofl_utility=rofl_utility,
            private_key=private_key
        )
        
        # Run the oracle
        logger.info("Starting order processing")
        oracle.run(poll_interval=args.interval, once=args.once)
        
    except KeyboardInterrupt:
        logger.info("Shutting down due to keyboard interrupt")
    except Exception as e:
        logger.exception(f"Error in matcher: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()