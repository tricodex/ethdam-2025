#!/bin/bash
# OceanSwap Deployment Script for Sapphire Networks
# This script helps you deploy OceanSwap contracts to Sapphire testnet or mainnet
# Make sure to set your PRIVATE_KEY in .env file before running this script

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with your PRIVATE_KEY."
  echo "Example:"
  echo "PRIVATE_KEY=your_private_key_here"
  echo "SAPPHIRE_TESTNET_RPC_URL=https://testnet.sapphire.oasis.io"
  exit 1
fi

# Install dependencies using bun
echo "Installing dependencies with bun..."
bun install

# Compile contracts
echo "Compiling contracts..."
bun hardhat compile

# Deploy to Sapphire testnet by default
NETWORK=${1:-sapphire-testnet}

echo "Deploying to $NETWORK..."
echo "This may take a few minutes, please wait..."

# Run the deploy script with bun
bun hardhat run scripts/deploy-with-rofl.ts --network $NETWORK

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "✅ Deployment successful!"
  echo "Check the deployment-$NETWORK.json file for contract addresses."
  
  # Find the ROFL app configuration file
  if [ -f "../rofl_app/rofl.yaml" ]; then
    echo ""
    echo "ROFL app configuration found at ../rofl_app/rofl.yaml"
    echo "Make sure to update your ROFL app with the deployed contract addresses."
  fi
else
  echo "❌ Deployment failed! Check the error messages above."
fi 