#!/bin/bash

# Test Order Matching Workflow
# This script runs the complete workflow to test TEE order matching

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

# Check if .env file exists, create a temporary one if not
if [ ! -f ".env" ]; then
  print_color "$YELLOW" "⚠️ No .env file found, checking environment variables..."
  
  if [ -z "$PRIVATE_KEY" ] || [ -z "$PRIVATE_KEY_SELLER" ]; then
    print_color "$RED" "❌ ERROR: PRIVATE_KEY and/or PRIVATE_KEY_SELLER environment variables not set!"
    print_color "$YELLOW" "Please provide these variables before running this script."
    print_color "$YELLOW" "Example:"
    print_color "$YELLOW" "export PRIVATE_KEY=your_buyer_private_key_here"
    print_color "$YELLOW" "export PRIVATE_KEY_SELLER=your_seller_private_key_here"
    exit 1
  else
    print_color "$GREEN" "✅ Environment variables found, creating temporary .env file..."
    echo "PRIVATE_KEY=$PRIVATE_KEY" > .env.temp
    echo "PRIVATE_KEY_SELLER=$PRIVATE_KEY_SELLER" >> .env.temp
    
    # Use the temporary file
    export ENV_FILE=.env.temp
  fi
else
  print_color "$GREEN" "✅ Using existing .env file"
  export ENV_FILE=.env
fi

print_color "$MAGENTA" "\n========================================="
print_color "$MAGENTA" "   ROFLSwapV5 TEE ORDER MATCHER TESTER   "
print_color "$MAGENTA" "=========================================\n"

# Step 1: Check ROFL app status
print_color "$BLUE" "\n=== STEP 1: CHECKING ROFL APP STATUS ==="
print_color "$CYAN" "Running ROFL app status check script...\n"

bun hardhat run scripts/check-rofl-app-status.js --network sapphire-testnet
check_result "ROFL app status check"

# Confirm with user whether to continue
print_color "$YELLOW" "\nDo you want to continue with the testing workflow? (y/n)"
read -r continue_response

if [[ "$continue_response" != "y" && "$continue_response" != "Y" ]]; then
  print_color "$YELLOW" "Test workflow cancelled by user."
  exit 0
fi

# Step 2: Prepare accounts for testing
print_color "$BLUE" "\n=== STEP 2: PREPARING ACCOUNTS ==="
print_color "$CYAN" "Wrapping tokens for both buyer and seller accounts...\n"

bun hardhat run scripts/prepare-accounts-for-testing.js --network sapphire-testnet
check_result "Account preparation"

# Step 3: Test order matching
print_color "$BLUE" "\n=== STEP 3: TESTING ORDER MATCHING ==="
print_color "$CYAN" "Placing buy and sell orders to test TEE matching...\n"

bun hardhat run scripts/test-tee-order-matching.js --network sapphire-testnet
check_result "Order matching test"

# Clean up the temporary .env file if it was created
if [ "$ENV_FILE" = ".env.temp" ]; then
  rm .env.temp
  print_color "$GREEN" "\n✅ Cleaned up temporary .env file"
fi

print_color "$GREEN" "\n===================================="
print_color "$GREEN" "    🎉 TESTING WORKFLOW COMPLETE    "
print_color "$GREEN" "====================================\n"

print_color "$CYAN" "If you didn't see successful order matching, check the following:"
print_color "$CYAN" "1. ROFL app is running correctly (oasis rofl show)"
print_color "$CYAN" "2. ROFLSwapV5 contract was deployed with the correct ROFL app ID"
print_color "$CYAN" "3. Privacy access was requested for the contract"
print_color "$CYAN" "4. Tokens were properly approved for ROFLSwapV5"
print_color "$CYAN" "5. ROFL app has the correct contract address set as a secret"

print_color "$YELLOW" "\nYou can run individual scripts manually for more detailed debugging:"
print_color "$YELLOW" "- scripts/check-rofl-app-status.js"
print_color "$YELLOW" "- scripts/prepare-accounts-for-testing.js"
print_color "$YELLOW" "- scripts/test-tee-order-matching.js"

exit 0 