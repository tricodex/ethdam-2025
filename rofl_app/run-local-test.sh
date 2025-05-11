#!/bin/bash
set -e

echo "==== Running local matcher test ===="

# Export environment variables
export PRIVATE_KEY="0x23de751f6e85d7058d57c1f94b5962101592b34095385f7c6d78247a4b5bfc73"
export ROFLSWAP_ADDRESS="0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"
export WEB3_PROVIDER="https://testnet.sapphire.oasis.io"
export ROFL_APP_ID="rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972"

# Build the Docker image
echo "Building local Docker image..."
docker build -t roflswap-matcher-local -f Dockerfile.local .

# Run the matcher once
echo "Running matcher once to see if it can match orders..."
docker run --rm \
  -e PRIVATE_KEY \
  -e ROFLSWAP_ADDRESS \
  -e WEB3_PROVIDER \
  -e ROFL_APP_ID \
  roflswap-matcher-local \
  python roflswap_oracle_matching.py --once --debug 