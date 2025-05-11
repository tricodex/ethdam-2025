#!/usr/bin/env python3
"""
Test script for ROFLSwapMatcher
"""

import os
import sys
import logging
from rofl_app.roflswap_oracle_matching import ROFLSwapMatcher

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("test_roflswap")

# Testnet Sapphire configuration
CONTRACT_ADDRESS = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04"  # Example address
WEB3_PROVIDER = "https://testnet.sapphire.oasis.io"

def test_local_mode():
    """Test matcher in local mode"""
    logger.info("Testing ROFLSwapMatcher in local mode")
    
    # Initialize matcher in local mode
    matcher = ROFLSwapMatcher(CONTRACT_ADDRESS, WEB3_PROVIDER, mode="local_test")
    
    # Test is_local_mode attribute
    logger.info(f"is_local_mode: {matcher.is_local_mode}")
    
    # Try to get an order
    order_id = 12
    order = matcher.retrieve_order(order_id)
    logger.info(f"Retrieved order {order_id}: {order}")
    
    return True

def test_tee_mode():
    """Test matcher in TEE mode"""
    logger.info("Testing ROFLSwapMatcher in TEE mode")
    
    # Initialize matcher in TEE mode
    matcher = ROFLSwapMatcher(CONTRACT_ADDRESS, WEB3_PROVIDER, mode="tee")
    
    # Test is_local_mode attribute
    logger.info(f"is_local_mode: {matcher.is_local_mode}")
    
    # Try to get an order
    order_id = 12
    order = matcher.retrieve_order(order_id)
    logger.info(f"Retrieved order {order_id}: {order}")
    
    return True

def main():
    logger.info("Starting ROFLSwapMatcher tests")
    
    local_result = test_local_mode()
    tee_result = test_tee_mode()
    
    if local_result and tee_result:
        logger.info("All tests passed!")
        return 0
    else:
        logger.error("Tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 