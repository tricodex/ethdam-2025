#!/usr/bin/env python3
# Simplified Main entry point for the ROFLSwap order matching engine

import json
import time
import os
from web3 import Web3
from matching_engine import MatchingEngine
from settlement import SettlementEngine
from storage import OrderStorage

# Configuration from environment variables
ROFLSWAP_ADDRESS = os.environ.get('ROFLSWAP_ADDRESS')
WEB3_PROVIDER = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
PRIVATE_KEY = os.environ.get('PRIVATE_KEY')

# Make sure we have the required configuration
if not ROFLSWAP_ADDRESS:
    raise ValueError("ROFLSWAP_ADDRESS environment variable is required")

if not PRIVATE_KEY:
    raise ValueError("PRIVATE_KEY environment variable is required")

print("Initializing ROFLSwap order matcher...")
print(f"ROFLSwap contract address: {ROFLSWAP_ADDRESS}")
print(f"Web3 provider: {WEB3_PROVIDER}")

# Setup components
matching_engine = MatchingEngine(ROFLSWAP_ADDRESS, WEB3_PROVIDER)
settlement_engine = SettlementEngine(ROFLSWAP_ADDRESS, WEB3_PROVIDER, PRIVATE_KEY)
storage = OrderStorage(storage_dir="./storage")

def match_and_settle():
    """Main function to match orders and settle trades"""
    print("Starting order matching cycle...")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Load orders from the contract
        matching_engine.load_orders()
        
        # Find potential matches
        matches = matching_engine.find_matches()
        print(f"Found {len(matches)} potential matches")
        
        if matches:
            print("Match details:")
            for i, match in enumerate(matches):
                print(f"Match #{i+1}:")
                print(f"  Buy Order: #{match['buyOrderId']}, Sell Order: #{match['sellOrderId']}")
                print(f"  Buyer: {match['buyerAddress']}, Seller: {match['sellerAddress']}")
                print(f"  Amount: {match['amount']}, Price: {match['price']}")
                print(f"  Buy Token: {match['buyToken']}, Sell Token: {match['sellToken']}")
            
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
        import traceback
        traceback.print_exc()
    
    print("Order matching cycle completed")

if __name__ == "__main__":
    # Run the matching cycle periodically
    while True:
        try:
            match_and_settle()
            
            # Sleep for 60 seconds before the next cycle
            print(f"Sleeping for 60 seconds until next matching cycle...")
            time.sleep(60)
            
        except KeyboardInterrupt:
            print("Stopping ROFLSwap order matcher")
            break
        except Exception as e:
            print(f"Unexpected error: {str(e)}")
            import traceback
            traceback.print_exc()
            time.sleep(60)  # Still wait before retrying