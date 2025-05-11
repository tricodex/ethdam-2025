#!/bin/bash

# Script to move deprecated files to appropriate deprecated folders

# Create deprecated directories if they don't exist
mkdir -p /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated
mkdir -p /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated
mkdir -p /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated

# Move deprecated files from root directory
echo "Moving deprecated files from root directory..."
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl.yaml.bak /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl.yaml.bak2 /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/roflswap_matcher.log /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/test_roflswap.py /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated/

# Move old README files
if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/README-ROFLSWAP-MATCHING.md ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/README-ROFLSWAP-MATCHING.md /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/README-TESTING.md ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/README-TESTING.md /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/deprecated/
fi

# Move deprecated contracts
echo "Moving deprecated contract versions..."
# Only keep ROFLSwapV5.sol and ROFLSwapOracle.sol as the current versions
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/ROFLSwap.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/ROFLSwapV2.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/ROFLSwapV3.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/ROFLSwapV4.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/ROFLSwapTester.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/Lock.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/contracts/MockToken.sol /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/

# Move older deployment files
echo "Moving old deployment files..."
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/roflswap-deployment-sapphire-testnet.json /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/
mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/roflswap-v4-deployment-sapphire-testnet.json /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/contracts/deprecated/

# Move deprecated ROFL app files
echo "Moving deprecated ROFL app files..."
# Check if files exist before moving
if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/Dockerfile.local ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/Dockerfile.local /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/docker-compose.local.yaml ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/docker-compose.local.yaml /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/roflswap_matcher.log ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/roflswap_matcher.log /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test-local-changes.sh ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test-local-changes.sh /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test-tokens.py ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test-tokens.py /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test_match_logic.py ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test_match_logic.py /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test_matcher.py ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/test_matcher.py /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

# Move duplicate README if newer version exists
if [ -f /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/README-ORACLE-MATCHING.md ]; then
  mv /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/README-ORACLE-MATCHING.md /Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app/deprecated/
fi

echo "Files have been moved to appropriate deprecated folders."
