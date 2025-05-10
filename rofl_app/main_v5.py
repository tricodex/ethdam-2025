#!/usr/bin/env python3
"""
Main script for the ROFLSwapV5 ROFL application with PrivateERC20 support
"""

import os
import time
import json
import argparse
import logging
from web3 import Web3

from matching_engine_v5 import MatchingEngineV5
from settlement_v5 import execute_matches, SettlementProcessorV5
from sapphire_wrapper import create_sapphire_web3

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("ROFLSwapV5")

class ROFLSwapProcessor:
    """ROFL app for processing ROFLSwapV5 order matching"""
    
    def __init__(self, contract_address, web3_provider, matching_interval=30):
        """
        Initialize the ROFLSwap processor
        
        Args:
            contract_address: Address of the ROFLSwapV5 contract
            web3_provider: URL of the Web3 provider
            matching_interval: Interval in seconds between order matching runs
        """
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.web3_provider = web3_provider
        self.matching_interval = matching_interval
        
        # Initialize the matching engine
        self.matching_engine = MatchingEngineV5(
            self.contract_address, 
            self.web3_provider
        )
        
        # Get token addresses
        water_token, fire_token = self.matching_engine.get_tokens()
        logger.info(f"Token addresses: WATER={water_token}, FIRE={fire_token}")
    
    def run_once(self):
        """Run a single matching cycle"""
        logger.info("Starting order matching cycle")
        
        # Load all orders from the contract
        self.matching_engine.load_orders()
        
        # Display the current order books
        self.matching_engine.display_orders()
        
        # Find matches
        matches = self.matching_engine.find_matches()
        logger.info(f"Found {len(matches)} potential matches")
        
        # Check token approvals for all matches
        approval_status = self.matching_engine.check_token_approvals(matches)
        
        # Filter matches to only those with proper approval
        approved_matches = []
        for match, status in zip(matches, approval_status):
            if status['has_approval']:
                approved_matches.append(match)
            else:
                logger.warning(f"Skipping match {match['buy_order_id']}-{match['sell_order_id']} due to insufficient token approval")
                
        logger.info(f"{len(approved_matches)} of {len(matches)} matches have sufficient token approval")
        
        # Execute approved matches
        if approved_matches:
            logger.info(f"Executing {len(approved_matches)} matches")
            results = execute_matches(
                approved_matches,
                self.contract_address,
                self.web3_provider
            )
            
            # Log results
            successful = sum(1 for r in results if r['success'])
            logger.info(f"Match execution results: {successful} successful, {len(results) - successful} failed")
        else:
            logger.info("No matches to execute")
            
        logger.info("Order matching cycle completed")
    
    def run_continuous(self):
        """Run continuous order matching"""
        logger.info(f"Starting continuous order matching (interval: {self.matching_interval}s)")
        
        while True:
            try:
                self.run_once()
            except Exception as e:
                logger.error(f"Error in matching cycle: {str(e)}")
                
            logger.info(f"Waiting {self.matching_interval} seconds until next cycle")
            time.sleep(self.matching_interval)

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="ROFLSwapV5 Order Matching Service")
    
    # Add arguments
    parser.add_argument("--contract", 
                        default=os.environ.get("ROFLSWAP_ADDRESS"),
                        help="ROFLSwapV5 contract address")
    parser.add_argument("--rpc", 
                        default="https://testnet.sapphire.oasis.io",
                        help="Web3 provider URL")
    parser.add_argument("--interval", 
                        type=int, 
                        default=30,
                        help="Matching interval in seconds (default: 30)")
    parser.add_argument("--once", 
                        action="store_true",
                        help="Run once and exit (default: continuous)")
    
    args = parser.parse_args()
    
    # Validate required parameters
    if not args.contract:
        logger.error("Contract address is required. Set ROFLSWAP_ADDRESS env var or use --contract.")
        return
    
    # Create and run the processor
    processor = ROFLSwapProcessor(
        contract_address=args.contract,
        web3_provider=args.rpc,
        matching_interval=args.interval
    )
    
    if args.once:
        processor.run_once()
    else:
        try:
            processor.run_continuous()
        except KeyboardInterrupt:
            logger.info("Order matching service stopped by user")

if __name__ == "__main__":
    main()