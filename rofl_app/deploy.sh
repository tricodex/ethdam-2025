#!/bin/bash
set -e  # Exit on error

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to echo with color
echo_color() {
    echo -e "${2}${1}${NC}"
}

echo_color "=========================================" $BLUE
echo_color "ROFLSwap Matcher Deployment Script" $BLUE
echo_color "=========================================" $BLUE
echo ""

# Check if oasis command is available
if ! command -v oasis &> /dev/null; then
    echo_color "Error: oasis command not found. Please install Oasis CLI." $RED
    echo_color "Visit: https://docs.oasis.io/general/manage-tokens/cli/" $RED
    exit 1
fi

# Parse arguments
if [ "$#" -lt 1 ]; then
    echo_color "Usage: $0 <contract_address> [network]" $BLUE
    echo_color "Example: $0 0x1bc94B51C5040E7A64FE5F42F51C328d7398969e sapphire-testnet" $BLUE
    exit 1
fi

CONTRACT_ADDRESS=$1
NETWORK=${2:-"sapphire-testnet"}
DOCKER_REGISTRY="ghcr.io/oasisprotocol"
IMAGE_NAME="roflswap-matcher"
IMAGE_TAG="latest"

echo_color "Deploying ROFLSwap Matcher" $BLUE
echo_color "Contract Address: $CONTRACT_ADDRESS" $BLUE
echo_color "Network: $NETWORK" $BLUE

# Build the docker image
echo_color "Building Docker image..." $YELLOW
docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG .

# Push to registry
echo_color "Pushing to Docker registry..." $YELLOW
docker push --digestfile $IMAGE_NAME.default.orc.digest $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG

# Get the digest
DIGEST=$(cat $IMAGE_NAME.default.orc.digest)
echo_color "Image digest: $DIGEST" $GREEN

# Update compose.yaml with the digest and contract address
echo_color "Updating compose.yaml..." $YELLOW
sed -i.bak "s|image: .*|image: $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG@$DIGEST|g" compose.yaml
sed -i.bak "s|ROFLSWAP_ADDRESS=.*|ROFLSWAP_ADDRESS=$CONTRACT_ADDRESS|g" compose.yaml
sed -i.bak "s|WEB3_PROVIDER=.*|WEB3_PROVIDER=https://$NETWORK.oasis.io|g" compose.yaml

# Remove backup file
rm -f compose.yaml.bak

# Initialize ROFL app if needed
if [ ! -f "rofl.yaml" ]; then
    echo_color "Initializing ROFL app..." $YELLOW
    oasis rofl init
fi

# Build ROFL app
echo_color "Building ROFL app..." $YELLOW
oasis rofl build --update-manifest

# Update ROFL app on-chain
echo_color "Updating ROFL app on-chain..." $YELLOW
oasis rofl update

# Get the ROFL app ID
APP_ID=$(oasis rofl show | grep "App ID:" | awk '{print $3}')
echo_color "ROFL App ID: $APP_ID" $GREEN

# Store ROFL app ID in environment for compose.yaml
echo "ROFL_APP_ID=$APP_ID" > .env

# Deploy ROFL app to Oasis nodes
echo_color "Deploying ROFL app to Oasis nodes..." $YELLOW
oasis rofl deploy

echo_color "Deployment completed successfully!" $GREEN
echo ""
echo_color "To check the status of your ROFL app, run:" $BLUE
echo "oasis rofl show" 