#!/usr/bin/env python3
"""
Fix script for updating TEE Oracle Address in ROFLSwapOracle contract

This script is designed to update the oracle address in the ROFLSwapOracle contract 
from inside the TEE environment. It can only be run inside the ROFL app container
where the socket is available.
"""

import os
import sys
import json
import argparse
import logging
from rofl_app.rofl_auth import RoflUtility

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('fix_tee_oracle')

def main():
    """
    Main function for fixing the TEE oracle address in the ROFLSwapOracle contract
    
    1. Gets the current oracle address from the contract
    2. Sets a new oracle address if needed
    """
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Fix TEE Oracle Address for ROFLSwapOracle contract')
    parser.add_argument('--contract', '-c', help='ROFLSwapOracle contract address', 
                       default=os.environ.get('ROFLSWAP_ADDRESS'))
    parser.add_argument('--oracle', '-o', help='New oracle address to set',
                       default=os.environ.get('NEW_ORACLE_ADDRESS'))
    
    args = parser.parse_args()
    
    # Validate contract address
    if not args.contract:
        logger.error('No contract address provided. Use --contract or set ROFLSWAP_ADDRESS environment variable.')
        return 1
    
    # Create ROFL utility instance for TEE mode
    logger.info(f'Initializing ROFL utility for contract: {args.contract}')
    try:
        rofl_util = RoflUtility(contract_address=args.contract)
    except Exception as e:
        logger.error(f'Error initializing ROFL utility: {e}')
        return 1
    
    # Get current oracle address
    logger.info('Getting current oracle address from contract...')
    oracle_function_data = '0x7dc0d1d0'  # Function selector for oracle()
    try:
        result = rofl_util.call_view_function(args.contract, oracle_function_data)
        if 'data' in result:
            # Parse oracle address from response
            oracle_address = '0x' + result['data'][2+24*2:2+64*2][-40:]  # Extract address from padded hex
            logger.info(f'Current oracle address: {oracle_address}')
        else:
            logger.error(f'Error getting oracle address: {result}')
            return 1
    except Exception as e:
        logger.error(f'Error calling contract: {e}')
        return 1
    
    # Set new oracle address if needed
    if args.oracle:
        new_oracle = args.oracle
        logger.info(f'Setting new oracle address: {new_oracle}')
        
        # Create function call data for setOracle(address)
        set_oracle_data = '0x7ae6cca4'  # Function selector for setOracle(address)
        padding = '0' * 24  # Padding for address to 32 bytes
        new_oracle_hex = new_oracle[2:].lower()  # Remove 0x and ensure lowercase
        function_data = set_oracle_data + padding + new_oracle_hex
        
        try:
            # Send transaction to set oracle
            tx_result = rofl_util.submit_transaction(args.contract, function_data)
            logger.info(f'Transaction result: {tx_result}')
            if 'status' in tx_result and tx_result['status'] == 'ok':
                logger.info('✅ Successfully updated oracle address!')
            else:
                logger.error(f'❌ Failed to update oracle address: {tx_result}')
                return 1
        except Exception as e:
            logger.error(f'Error submitting transaction: {e}')
            return 1
    else:
        logger.info('No new oracle address provided, skipping update.')
    
    return 0

if __name__ == '__main__':
    sys.exit(main()) 