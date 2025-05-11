#!/bin/bash
# Script to update environment variables for the ROFL matcher

# WARNING: This script contains sensitive information and should not be committed to version control
# These variables will be used by the ROFL app running in the TEE

# Accept private key as argument
PRIVATE_KEY=$1

# Set contract address - update this with your deployed ROFLSwapOracle address
echo "Setting ROFLSWAP_ADDRESS environment variable..."
# Default address (from our deployment)
export ROFLSWAP_ADDRESS="0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"

# Load from deployment file if available
if [ -f "../contracts/roflswap-oracle-deployment-sapphire-testnet.json" ]; then
  ORACLE_ADDRESS=$(jq -r '.roflSwapOracle' ../contracts/roflswap-oracle-deployment-sapphire-testnet.json)
  if [ ! -z "$ORACLE_ADDRESS" ]; then
    export ROFLSWAP_ADDRESS=$ORACLE_ADDRESS
    echo "Loaded ROFLSWAP_ADDRESS from deployment file: $ROFLSWAP_ADDRESS"
  fi
fi

# Set ROFL app ID
echo "Setting ROFL_APP_ID environment variable..."
# Default app ID (replace with your actual ROFL app ID)
export ROFL_APP_ID="rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972"

# Load from deployment file if available
if [ -f "../contracts/roflswap-oracle-deployment-sapphire-testnet.json" ]; then
  ROFL_APP=$(jq -r '.roflAppId' ../contracts/roflswap-oracle-deployment-sapphire-testnet.json)
  if [ ! -z "$ROFL_APP" ] && [ "$ROFL_APP" != "null" ]; then
    export ROFL_APP_ID=$ROFL_APP
    echo "Loaded ROFL_APP_ID from deployment file: $ROFL_APP_ID"
  fi
fi

# Set Web3 provider URL
echo "Setting WEB3_PROVIDER environment variable..."
export WEB3_PROVIDER="https://testnet.sapphire.oasis.io"

# Set the private key as both PRIVATE_KEY and MATCHER_PRIVATE_KEY for compatibility
echo "Setting PRIVATE_KEY and MATCHER_PRIVATE_KEY..."
if [ ! -z "$PRIVATE_KEY" ]; then
  # Ensure the private key has 0x prefix
  if [[ ! "$PRIVATE_KEY" == 0x* ]]; then
    PRIVATE_KEY="0x$PRIVATE_KEY"
  fi
  export PRIVATE_KEY=$PRIVATE_KEY
  export MATCHER_PRIVATE_KEY=$PRIVATE_KEY
  echo "Private key set successfully (hidden for security)"
else
  echo "Warning: No private key provided. Make sure PRIVATE_KEY is set in your environment."
fi

# Print summary of environment variables
echo ""
echo "Environment variables set:"
echo "ROFLSWAP_ADDRESS: $ROFLSWAP_ADDRESS"
echo "ROFL_APP_ID: $ROFL_APP_ID"
echo "WEB3_PROVIDER: $WEB3_PROVIDER"
echo "PRIVATE_KEY: [HIDDEN]"
echo "MATCHER_PRIVATE_KEY: [HIDDEN]"
echo ""
echo "Now you can run the matcher with: bun run roflswap_oracle_matching.py" 