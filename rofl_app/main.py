#!/usr/bin/env python3
# Main entry point for the OceanSwap ROFL application

import json
import time
import os
from matching_engine import MatchingEngine
from settlement import SettlementEngine
from storage import OrderStorage
from rofl import ensure_inside_rofl, register_periodic_task

# Ensure this code runs in a TEE
ensure_inside_rofl()

# Configuration
OCEANSWAP_ADDRESS = os.environ.get('OCEANSWAP_ADDRESS')
WEB3_PROVIDER = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
PRIVATE_KEY = os.environ.get('PRIVATE_KEY')  # In a real ROFL app, this would be managed by the TEE

# Make sure we have the required configuration
if not OCEANSWAP_ADDRESS:
    raise ValueError("OCEANSWAP_ADDRESS environment variable is required")

if not PRIVATE_KEY:
    raise ValueError("PRIVATE_KEY environment variable is required")

print("Initializing OceanSwap ROFL app...")
print(f"OceanSwap contract address: {OCEANSWAP_ADDRESS}")
print(f"Web3 provider: {WEB3_PROVIDER}")

# Setup components
matching_engine = MatchingEngine(OCEANSWAP_ADDRESS, WEB3_PROVIDER)
settlement_engine = SettlementEngine(OCEANSWAP_ADDRESS, WEB3_PROVIDER, PRIVATE_KEY)
storage = OrderStorage()

def match_and_settle():
    """Main function to match orders and settle trades"""
    print("Starting order matching cycle...")
    
    try:
        # Load orders from the contract
        matching_engine.load_orders()
        
        # Find potential matches
        matches = matching_engine.find_matches()
        print(f"Found {len(matches)} potential matches")
        
        if matches:
            # Execute the matches
            results = settlement_engine.execute_matches(matches)
            
            # Store match history
            storage.save_matches(results)
            
            # Print results
            successful = sum(1 for r in results if r['success'])
            print(f"Processed {len(matches)} matches: {successful} successful, {len(matches) - successful} failed")
        else:
            print("No matches found in this cycle")
            
    except Exception as e:
        print(f"Error in match and settle cycle: {str(e)}")
    
    print("Order matching cycle completed")

# Run once immediately on startup
match_and_settle()

# Register the task to run periodically (e.g., every 60 seconds)
register_periodic_task(match_and_settle, interval_seconds=60)

print("OceanSwap ROFL app initialized and running")