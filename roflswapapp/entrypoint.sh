#!/bin/bash
set -e

# Set default values if not provided
CONTRACT_ADDRESS=${ROFLSWAP_ADDRESS:-"0x71b419f2Abe5f1d44246143706489A5F09Ee3727"}
POLLING_INTERVAL=${POLLING_INTERVAL:-30}
WEB3_PROVIDER=${WEB3_PROVIDER:-"https://testnet.sapphire.oasis.io"}
KEY_ID=${KEY_ID:-"roflswap-oracle-key"}

echo "=== ROFLSwap Matcher Debug Info ==="
echo "Starting ROFLSwap Matcher for contract: $CONTRACT_ADDRESS"
echo "Web3 Provider: $WEB3_PROVIDER"
echo "Polling interval: $POLLING_INTERVAL seconds"
echo "ROFL_APP_ID: ${ROFL_APP_ID:-'Not set'}"
echo "Key ID for TEE: $KEY_ID"
echo "Socket path: /run/rofl-appd.sock"

# Enhanced socket connection check
if [ -S "/run/rofl-appd.sock" ]; then
  echo "✅ Socket file exists"
  ls -la /run/rofl-appd.sock
  
  # Try to check socket communication
  echo "Testing socket communication..."
  if command -v curl &> /dev/null; then
    curl --unix-socket /run/rofl-appd.sock http://localhost/health -s || echo "⚠️ Socket communication test failed"
  elif command -v nc &> /dev/null; then
    echo '{"jsonrpc":"2.0","method":"health","params":[],"id":1}' | nc -U /run/rofl-appd.sock || echo "⚠️ Socket communication test failed"
  else
    echo "⚠️ No tools available to test socket communication (nc or curl)"
  fi
  
  # Test key generation from ROFL daemon
  echo "Testing key generation from ROFL daemon..."
  if command -v curl &> /dev/null; then
    # Create a JSON payload for key generation
    KEY_REQUEST="{\"key_id\":\"$KEY_ID\",\"kind\":\"secp256k1\"}"
    
    # Make the request to the ROFL daemon
    KEY_RESPONSE=$(curl --unix-socket /run/rofl-appd.sock -s -X POST -H "Content-Type: application/json" -d "$KEY_REQUEST" http://localhost/rofl/v1/keys/generate)
    
    # Check if the response contains a key
    if echo "$KEY_RESPONSE" | grep -q "key"; then
      echo "✅ Successfully generated key from ROFL daemon"
      
      # Test transaction submission format
      echo "Testing transaction submission format..."
      # Create a minimal transaction payload to test the format
      TEST_TX_PAYLOAD="{\"tx\":{\"kind\":\"eth\",\"data\":{\"gas_limit\":3000000,\"to\":\"71b419f2abe5f1d44246143706489a5f09ee3727\",\"value\":0,\"data\":\"\"}},\"encrypted\":false}"
      echo "Test payload: $TEST_TX_PAYLOAD"
      
      # Send a dry-run request to check format (using /health as a safer endpoint)
      DRYRUN_RESPONSE=$(curl --unix-socket /run/rofl-appd.sock -s -X POST -H "Content-Type: application/json" -d "$TEST_TX_PAYLOAD" http://localhost/health)
      echo "Dry run response: $DRYRUN_RESPONSE"
      
      echo "Note: The payload format with 'encrypted':false is crucial for proper transaction submission"
    else
      echo "⚠️ Key generation test failed: $KEY_RESPONSE"
    fi
  else
    echo "⚠️ curl not available for key generation test"
  fi
else
  echo "❌ WARNING: Socket file does not exist!"
  ls -la /run/
  echo "Without the socket file, the oracle cannot authenticate or sign transactions"
fi

# Check if running in TEE environment
if [ -d "/dev/tdx" ] || [ -d "/sys/firmware/tdx" ]; then
  echo "✅ Running in Intel TDX TEE environment"
else
  echo "❓ Not detected as running in TEE environment"
fi

# Test Web3 connection
echo "Testing Web3 connection..."
if curl -s -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' $WEB3_PROVIDER | grep -q "result"; then
  echo "✅ Web3 provider is responding correctly"
else
  echo "❌ WARNING: Web3 provider not responding correctly!"
fi

# Add more environment info
echo "=== Environment Information ==="
echo "Environment Variables:"
echo "ROFLSWAP_ADDRESS: $ROFLSWAP_ADDRESS"
echo "WEB3_PROVIDER: $WEB3_PROVIDER"
echo "KEY_ID: $KEY_ID"
echo "ROFL_APP_ID: $ROFL_APP_ID"

# Run the test script if it exists (but don't fail if it doesn't work)
if [ -f "/app/test_rofl.py" ]; then
  echo "=== Running ROFL test script ==="
  python /app/test_rofl.py || echo "Test script failed, but continuing with main application"
fi

# Execute the matcher with debug logging
echo "=== Starting Oracle Matcher ==="
python main.py --contract "$CONTRACT_ADDRESS" --interval "$POLLING_INTERVAL" --key-id "$KEY_ID" --debug 