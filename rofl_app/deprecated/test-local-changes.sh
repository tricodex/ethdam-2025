#!/bin/bash
set -e

echo "==== Testing updated ROFLSwap Matcher ===="

# Check required environment variables
if [ -z "$ROFLSWAP_ADDRESS" ]; then
  echo "Please set ROFLSWAP_ADDRESS environment variable"
  echo "Example: export ROFLSWAP_ADDRESS=0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"
  exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
  echo "Please set PRIVATE_KEY environment variable"
  exit 1
fi

# Export environment variables if not already set
export WEB3_PROVIDER=${WEB3_PROVIDER:-"https://testnet.sapphire.oasis.io"}
export ROFL_APP_ID=${ROFL_APP_ID:-"rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972"}

echo "ROFLSWAP_ADDRESS: $ROFLSWAP_ADDRESS"
echo "WEB3_PROVIDER: $WEB3_PROVIDER"
echo "ROFL_APP_ID: $ROFL_APP_ID"

# Build the Docker image
echo "Building Docker image..."
docker build -t roflswap-matcher-local -f Dockerfile.local .

# Run the matcher once to check if it works
echo "Running matcher once for testing..."
docker run --rm \
  -e PRIVATE_KEY \
  -e ROFLSWAP_ADDRESS \
  -e WEB3_PROVIDER \
  -e ROFL_APP_ID \
  roflswap-matcher-local \
  python roflswap_oracle_matching.py --once --debug

echo "Test complete. Check the logs above for any errors."
echo ""
echo "To run the matcher continuously, use:"
echo "docker-compose -f docker-compose.local.yaml up" 