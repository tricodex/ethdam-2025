#!/bin/bash
# Script to set the matcher private key for the ROFL app

# Use the provided private key directly
PRIVATE_KEY="0x23de751f6e85d7058d57c1f94b5962101592b34095385f7c6d78247a4b5bfc73"

# Set the MATCHER_PRIVATE_KEY secret for the ROFL app
echo "Setting MATCHER_PRIVATE_KEY in ROFL app..."
echo -n "$PRIVATE_KEY" | oasis rofl secret set MATCHER_PRIVATE_KEY -

echo "Secret set. Updating the ROFL app..."
oasis rofl update

echo "Redeploying the ROFL app..."
oasis rofl deploy

echo "Done! Check the status with: oasis rofl show" 