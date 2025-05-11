#!/usr/bin/env python3
"""
ROFLSwap Order Matcher Oracle Service

This service runs inside a Trusted Execution Environment (TEE) and authenticates
with the ROFLSwapOracle contract to access encrypted orders and execute matches.

It uses the pattern from oasisprotocol/demo-rofl-chatbot for SIWE authentication.
"""

import os
import sys
import argparse
import logging
import asyncio

# Import the new matcher implementation
from roflswap_matcher import ROFLSwapMatcher

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
    parser.add_argument(
        "contract_address",
        type=str,
        nargs='?',
        help="Contract address",
        default=os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e")
    )
    parser.add_argument("--once", action="store_true", help="Process orders once and exit")
    parser.add_argument("--interval", type=int, default=30, help="Polling interval in seconds")
    parser.add_argument("--network", type=str, default="sapphire-testnet", 
                      help="Network name (sapphire-testnet, sapphire-mainnet, sapphire-localnet)")
    parser.add_argument("--key-id", type=str, default="roflswap-oracle-key",
                      help="Key ID to use for key generation in the TEE")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("--secret", type=str, help="Secret key for local testing (not for production)", default=None)
    args = parser.parse_args()
    
    # Set log level
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    # Get configuration from environment variables
    contract_address = args.contract_address
    web3_provider = os.environ.get("WEB3_PROVIDER")
    
    # Set default Web3 provider URL based on network
    if not web3_provider:
        if args.network == "sapphire-testnet":
            web3_provider = "https://testnet.sapphire.oasis.io"
        elif args.network == "sapphire-mainnet":
            web3_provider = "https://sapphire.oasis.io"
        elif args.network == "sapphire-localnet":
            web3_provider = "http://localhost:8545"
        else:
            web3_provider = args.network  # Use network argument as provider URL
    
    # Validate configuration
    if not contract_address:
        logger.error("Contract address must be provided")
        sys.exit(1)
    
    # Check if we're running inside a ROFL TEE environment
    is_tee_mode = os.path.exists("/run/rofl-appd.sock")
    
    # Override for testing (only if secret is provided)
    if args.secret:
        is_tee_mode = False
        os.environ["ROFL_PRIVATE_KEY"] = args.secret
        logger.warning("Using provided secret key for testing (NOT SECURE FOR PRODUCTION)")
    
    if is_tee_mode:
        logger.info("Detected ROFL TEE environment")
    else:
        logger.warning("Not running in TEE environment, using local test mode")
        if not os.environ.get("ROFL_PRIVATE_KEY"):
            logger.error("No ROFL_PRIVATE_KEY environment variable set for local testing")
            sys.exit(1)
    
    try:
        logger.info(f"Starting ROFLSwap Order Matcher Oracle")
        logger.info(f"Contract address: {contract_address}")
        logger.info(f"Web3 provider: {web3_provider}")
        logger.info(f"Network: {args.network}")
        logger.info(f"Mode: {'TEE' if is_tee_mode else 'Local test'}")
        logger.info(f"Key ID: {args.key_id}")
        logger.info(f"Polling interval: {args.interval} seconds")
        
        # Create matcher
        try:
            matcher = ROFLSwapMatcher(
                contract_address=contract_address,
                web3_provider=web3_provider,
                is_tee_mode=is_tee_mode,
                key_id=args.key_id
            )
            
            # Start the matcher
            logger.info("Starting ROFLSwap Order Matcher")
            matcher.startup()  # Call the startup method to initialize and set oracle address
        except Exception as e:
            logger.error(f"Failed to initialize ROFLSwap matcher: {e}")
            if is_tee_mode:
                logger.error("Cannot continue without proper key management in TEE mode")
                sys.exit(1)
            else:
                raise
        
        # Run the matcher
        if args.once:
            # Run once and exit
            asyncio.run(matcher.process_orders())
            logger.info("Processed orders once, exiting")
        else:
            # Run continuously
            asyncio.run(matcher.process_orders_loop(args.interval))
        
    except KeyboardInterrupt:
        logger.info("Shutting down due to keyboard interrupt")
    except Exception as e:
        logger.exception(f"Error in matcher: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()