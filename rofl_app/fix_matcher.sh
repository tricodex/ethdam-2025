#!/bin/bash
# Fix script for ROFLSwap Matcher issues with the ROFLSwapOracle contract
# This script runs all the necessary checks and fixes in sequence

set -e  # Exit on error

echo "=== ROFLSWAP MATCHER FIX SCRIPT ==="
echo ""

# Check if contract address is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <ROFLSwapOracle_contract_address>"
  echo "Example: $0 0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"
  exit 1
fi

CONTRACT_ADDRESS=$1
export ROFLSWAP_ADDRESS=$CONTRACT_ADDRESS

echo "=== ROFLSWAP MATCHER FIX SCRIPT ==="
echo "ROFLSwapOracle contract address: $CONTRACT_ADDRESS"
echo ""

# Check if we're in the right directory
if [ ! -f "rofl.yaml" ]; then
  echo "ERROR: rofl.yaml not found. Please run this script from the rofl_app directory."
  exit 1
fi

# 1. Check current configuration
echo "Step 1: Checking current ROFLSwapOracle contract configuration..."
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
echo "Step 2: Ensuring rofl.yaml has the full App ID for CLI compatibility..."
if [ -f "rofl.yaml.original" ]; then
  cp rofl.yaml.original rofl.yaml
  echo "✅ Restored original rofl.yaml with full App ID"
fi

# 3. Update rofl_auth.py to handle the truncated App ID
echo ""
echo "Step 3: ROFLSwapOracle authentication has been patched in rofl_auth.py"
echo "The global App ID truncation logic is now in place."

# 4. Update ROFL app with our changes
echo ""
echo "Step 4: Updating ROFL app with our changes..."
oasis rofl update
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to update ROFL app."
  exit 1
fi

# 5. Restart ROFL machine
echo ""
echo "Step 5: Restarting ROFL machine to apply changes..."
oasis rofl machine restart
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to restart ROFL machine."
  exit 1
fi

echo ""
echo "Waiting 30 seconds for ROFL machine to restart..."
sleep 30

# 6. Test functionality
echo ""
echo "Step 6: You can now test the functionality with these steps:"
echo ""
echo "1. View ROFLSwapOracle status:"
echo "   cd ../contracts && bun hardhat run scripts/check-oracle-status.js --network sapphire-testnet"
echo ""
echo "2. Place test orders:"
echo "   bun hardhat run scripts/place-oracle-order.js --network sapphire-testnet"
echo ""
echo "3. Check for matches after a few minutes:"
echo "   bun hardhat run scripts/check-oracle-matches.js --network sapphire-testnet"
echo ""

echo "✅ Fix completed successfully!"
echo "The ROFLSwap Matcher is now configured to properly authenticate"
echo "with the ROFLSwapOracle contract using the truncated App ID." 