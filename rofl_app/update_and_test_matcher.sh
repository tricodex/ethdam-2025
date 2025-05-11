#!/bin/bash
# Script to update the ROFL app and test order matching with contract's truncated App ID

set -e

echo "=== ROFLSWAP MATCHER UPDATE AND TEST ==="
echo ""

# Check if we're in the right directory
if [ ! -f "rofl.yaml" ]; then
  echo "ERROR: rofl.yaml not found. Please run this script from the rofl_app directory."
  exit 1
fi

# Environment variables - updated to use ROFLSwapOracle contract
ROFLSWAP_ADDRESS="0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"
export ROFLSWAP_ADDRESS

# 1. Verify contract configuration
echo "Step 1: Verifying contract configuration..."
python check_contract_app_id.py --contract $ROFLSWAP_ADDRESS
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to check contract configuration."
  exit 1
fi

echo ""
echo "Step 2: Updating ROFL app with modified authentication code..."
echo "This will modify the code to use truncated App ID with the contract."

# 3. Update ROFL app with modified files
echo "Running update command..."
oasis rofl update
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to update ROFL app."
  exit 1
fi

# 4. Restart the ROFL machine
echo ""
echo "Step 3: Restarting ROFL machine to apply changes..."
oasis rofl machine restart
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to restart ROFL machine."
  exit 1
fi

echo ""
echo "Step 4: Waiting for ROFL machine to restart (30 seconds)..."
sleep 30

# 5. Check ROFL app status
echo ""
echo "Step 5: Checking ROFL app status..."
oasis rofl show
if [ $? -ne 0 ]; then
  echo "ERROR: Failed to show ROFL app status."
  exit 1
fi

# 6. Place test orders - Updated to use ROFLSwapOracle test scripts
echo ""
echo "Step 6: Placing test orders to verify matcher functionality..."
echo "You should now run the order placement and matching tests using hardhat scripts:"
echo "cd ../contracts"
echo "bun hardhat run scripts/place-oracle-order.js --network sapphire-testnet"
echo ""
echo "After a few minutes, check if the orders were matched:"
echo "bun hardhat run scripts/check-oracle-matches.js --network sapphire-testnet"
echo ""
echo "To manually execute matching (if needed):"
echo "bun hardhat run scripts/execute-oracle-match.js --network sapphire-testnet"
echo ""
echo "To verify the oracle status:"
echo "bun hardhat run scripts/check-oracle-status.js --network sapphire-testnet"

echo ""
echo "=== UPDATE COMPLETE ==="
echo "The ROFL app has been updated to use the truncated App ID format expected by the contract."
echo "Order matching should now work correctly." 