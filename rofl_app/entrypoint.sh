#!/bin/bash
set -e

# Set default values if not provided
CONTRACT_ADDRESS=${ROFLSWAP_ADDRESS:-"0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"}
POLLING_INTERVAL=${POLLING_INTERVAL:-30}
WEB3_PROVIDER=${WEB3_PROVIDER:-"https://testnet.sapphire.oasis.io"}

echo "=== ROFLSwap Matcher Debug Info ==="
echo "Starting ROFLSwap Matcher for contract: $CONTRACT_ADDRESS"
echo "Web3 Provider: $WEB3_PROVIDER"
echo "Polling interval: $POLLING_INTERVAL seconds"
echo "ROFL_APP_ID: ${ROFL_APP_ID:-'Not set'}"
echo "Socket path: /run/rofl-appd.sock"
ls -la /run/

# Test socket connection
if [ -S "/run/rofl-appd.sock" ]; then
  echo "Socket file exists"
else
  echo "WARNING: Socket file does not exist!"
fi

# Add more debug information
echo "Testing Web3 connection..."
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' $WEB3_PROVIDER | grep -q "result"; then
  echo "Web3 provider is responding correctly"
else
  echo "WARNING: Web3 provider not responding correctly!"
fi

# Execute the matcher with debug logging
echo "Starting matcher in debug mode..."
python -m rofl_app.roflswap_oracle_matching --contract "$CONTRACT_ADDRESS" --interval "$POLLING_INTERVAL" --mode "tee" --debug 