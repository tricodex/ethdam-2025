#!/bin/bash
# Test script for ROFLSwap order matcher

echo "Building order matcher Docker image..."
docker compose build

echo "Done building image!"
echo "To run the order matcher: docker compose up -d"
echo "Make sure to set the required environment variables first!" 