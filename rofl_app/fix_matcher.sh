#!/bin/bash
# Fix script for ROFLSwap Matcher issues
# This script runs all the necessary checks and fixes in sequence

# Exit on error
set -e

# Check if contract address is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <contract_address>"
  echo "Example: $0 0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"
  exit 1
fi

CONTRACT_ADDRESS=$1
export ROFLSWAP_ADDRESS=$CONTRACT_ADDRESS

echo "=== ROFLSWAP MATCHER FIX SCRIPT ==="
echo "Contract address: $CONTRACT_ADDRESS"
echo ""

# Check if we're in the right directory
if [ ! -f "rofl.yaml" ]; then
  echo "ERROR: rofl.yaml not found. Please run this script from the rofl_app directory."
  exit 1
fi

# 1. Check current configuration
echo "Step 1: Checking current contract configuration..."
python check_contract_app_id.py --contract $CONTRACT_ADDRESS
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to check contract configuration."
  exit 1
fi

echo ""
echo "Continuing with fix in 3 seconds..."
sleep 3

# 2. Update rofl.yaml with the correct App ID
echo ""
echo "Step 2: Updating rofl.yaml with truncated App ID..."
python update-rofl-yaml.py
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to update rofl.yaml."
  exit 1
fi

echo ""
echo "Waiting 2 seconds before verifying..."
sleep 2

# 3. Verify the update worked
echo ""
echo "Step 3: Verifying the update was successful..."
python check_contract_app_id.py --contract $CONTRACT_ADDRESS
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to verify configuration."
  exit 1
fi

echo ""
echo "=== FIX COMPLETE ==="
echo ""
echo "The rofl.yaml file has been updated with the truncated App ID that"
echo "matches what the contract expects. This will allow the TEE to authenticate"
echo "properly with the contract and execute matches against existing orders."
echo ""
echo "Next steps:"
echo "1. Run: oasis rofl update"
echo "2. Run: oasis rofl machine restart"
echo "3. Wait a few minutes for the changes to take effect"
echo "4. Test by placing new orders"
echo ""
echo "Note: The fix_tee_oracle.py script can only be run inside a TEE environment"
echo "where the /run/rofl-appd.sock socket is available. If you need to update"
echo "the oracle address, you'll need to run that script inside the ROFL container." 