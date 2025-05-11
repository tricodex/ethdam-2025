#!/bin/bash

# Complete Test Workflow for ROFLSwapV5
# This script handles all steps from token minting to order matching

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
  local color=$1
  local message=$2
  echo -e "${color}${message}${NC}"
}

# Function to check if a command was successful
check_result() {
  if [ $? -ne 0 ]; then
    print_color "$RED" "❌ ERROR: $1 failed!"
    print_color "$YELLOW" "Check the error message above for more details."
    exit 1
  else
    print_color "$GREEN" "✅ SUCCESS: $1 completed successfully!"
  fi
}

# Function to ask user for confirmation
ask_confirmation() {
  local message=$1
  print_color "$YELLOW" "$message (y/n)"
  read -r response
  if [[ "$response" != "y" && "$response" != "Y" ]]; then
    print_color "$YELLOW" "Operation cancelled by user."
    return 1
  fi
  return 0
}

# Check if we have working environment variables
check_env_vars() {
  print_color "$BLUE" "Checking environment variables..."
  
  # Check for PRIVATE_KEY (buyer key)
  if [ -z "$PRIVATE_KEY" ]; then
    print_color "$RED" "❌ PRIVATE_KEY environment variable is not set!"
    print_color "$YELLOW" "Please set it first using: export PRIVATE_KEY=your_buyer_private_key_here"
    return 1
  fi
  
  # Check for PRIVATE_KEY_SELLER
  if [ -z "$PRIVATE_KEY_SELLER" ]; then
    print_color "$RED" "❌ PRIVATE_KEY_SELLER environment variable is not set!"
    print_color "$YELLOW" "Please set it first using: export PRIVATE_KEY_SELLER=your_seller_private_key_here"
    return 1
  fi
  
  # Check if the private keys are in correct format (should be 64 characters without 0x or 66 with 0x)
  pk_length=${#PRIVATE_KEY}
  if [[ $pk_length != 64 && $pk_length != 66 ]]; then
    print_color "$RED" "❌ PRIVATE_KEY has incorrect length. Should be 64 characters without 0x prefix or 66 with prefix."
    print_color "$YELLOW" "Current length: $pk_length characters"
    return 1
  fi
  
  pk_seller_length=${#PRIVATE_KEY_SELLER}
  if [[ $pk_seller_length != 64 && $pk_seller_length != 66 ]]; then
    print_color "$RED" "❌ PRIVATE_KEY_SELLER has incorrect length. Should be 64 characters without 0x prefix or 66 with prefix."
    print_color "$YELLOW" "Current length: $pk_seller_length characters"
    return 1
  fi
  
  print_color "$GREEN" "✅ Environment variables look good!"
  return 0
}

print_color "$MAGENTA" "\n========================================="
print_color "$MAGENTA" "   COMPLETE ROFLSWAPV5 TESTING WORKFLOW   "
print_color "$MAGENTA" "=========================================\n"

# Step 0: Check environment variables
print_color "$BLUE" "STEP 0: CHECKING ENVIRONMENT SETUP"
if ! check_env_vars; then
  exit 1
fi

# Step 1: Compile contracts
print_color "$BLUE" "\nSTEP 1: COMPILING CONTRACTS"
print_color "$CYAN" "Compiling contracts to ensure all artifacts are fresh..."
bun hardhat compile --force
check_result "Contract compilation"

# Step 2: Check ROFL app status
print_color "$BLUE" "\nSTEP 2: CHECKING ROFL APP STATUS"
print_color "$CYAN" "Checking ROFL app configuration..."

cd ../rofl_app || { print_color "$RED" "❌ rofl_app directory not found!"; exit 1; }
oasis rofl show
ROFL_STATUS=$?
cd ../contracts || { print_color "$RED" "❌ Failed to return to contracts directory!"; exit 1; }

if [ $ROFL_STATUS -ne 0 ]; then
  print_color "$RED" "❌ ROFL app status check failed. Please ensure the ROFL app is properly configured."
  print_color "$YELLOW" "You might need to set the following secrets in the ROFL app:"
  print_color "$YELLOW" "1. echo -n \"0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB\" | oasis rofl secret set ROFLSWAP_ADDRESS -"
  print_color "$YELLOW" "2. echo -n \"rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972\" | oasis rofl secret set ROFL_APP_ID -"
  print_color "$YELLOW" "3. echo -n \"https://testnet.sapphire.oasis.io\" | oasis rofl secret set WEB3_PROVIDER -"
  
  if ask_confirmation "Do you want to continue anyway?"; then
    print_color "$YELLOW" "Continuing despite ROFL app status issues..."
  else
    exit 1
  fi
else
  print_color "$GREEN" "✅ ROFL app is properly configured!"
fi

# Step 3: Mint base tokens for testing
print_color "$BLUE" "\nSTEP 3: MINTING BASE TOKENS"
print_color "$CYAN" "Minting base tokens to buyer and seller accounts..."

# First mint tokens with deployer key (saved from original env)
ORIGINAL_PRIVATE_KEY=$PRIVATE_KEY
bun hardhat run scripts/mint-and-wrap-tokens.js --network sapphire-testnet
check_result "Base token minting"

# Step 4: Wrap tokens for the buyer account
print_color "$BLUE" "\nSTEP 4: WRAPPING TOKENS FOR BUYER"
print_color "$CYAN" "Wrapping tokens for the buyer account..."

export PRIVATE_KEY=$ORIGINAL_PRIVATE_KEY
bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet
check_result "Token wrapping for buyer"

# Step 5: Wrap tokens for the seller account
print_color "$BLUE" "\nSTEP 5: WRAPPING TOKENS FOR SELLER"
print_color "$CYAN" "Wrapping tokens for the seller account..."

export PRIVATE_KEY=$PRIVATE_KEY_SELLER
bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet
check_result "Token wrapping for seller"

# Restore original private key
export PRIVATE_KEY=$ORIGINAL_PRIVATE_KEY

# Step 6: Test order matching
print_color "$BLUE" "\nSTEP 6: TESTING ORDER MATCHING"
print_color "$CYAN" "Placing buy and sell orders to test TEE matching..."

bun hardhat run scripts/test-tee-order-matching.js --network sapphire-testnet
check_result "Order matching test"

print_color "$GREEN" "\n===================================="
print_color "$GREEN" "    🎉 TESTING WORKFLOW COMPLETE    "
print_color "$GREEN" "====================================\n"

print_color "$CYAN" "If you didn't see successful order matching, check the following:"
print_color "$CYAN" "1. ROFL app is running correctly (oasis rofl show)"
print_color "$CYAN" "2. ROFLSwapV5 contract was deployed with the correct ROFL app ID"
print_color "$CYAN" "3. Privacy access was requested for the contract"
print_color "$CYAN" "4. Tokens were properly approved for ROFLSwapV5"
print_color "$CYAN" "5. ROFL app has the correct contract address set as a secret" 