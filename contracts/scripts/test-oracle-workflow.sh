#!/bin/bash
# Test workflow for ROFLSwapOracle

# Set up colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print step header
step() {
  echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Print success message
success() {
  echo -e "${GREEN}✅ $1${NC}"
}

# Print error message
error() {
  echo -e "${RED}❌ $1${NC}"
  exit 1
}

# Print warning message
warning() {
  echo -e "${YELLOW}⚠️ $1${NC}"
}

# Check if a file exists
check_file() {
  if [ ! -f "$1" ]; then
    error "File $1 not found!"
  fi
}

# Check if ROFL_APP_ID is set
if [ -z "$ROFL_APP_ID" ]; then
  warning "ROFL_APP_ID environment variable is not set. Using default placeholder."
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
  error "PRIVATE_KEY environment variable is not set!"
fi

# Set up variables
NETWORK=${1:-"sapphire-testnet"}
step "Using network: $NETWORK"

# Check if tokens are already deployed
if [ -f "./private-tokens-deployment-$NETWORK.json" ]; then
  step "Loading existing token deployment from private-tokens-deployment-$NETWORK.json"
  . <(jq -r 'to_entries|map("export \(.key)=\(.value|tostring)")|.[]' "./private-tokens-deployment-$NETWORK.json")
  success "Loaded token deployment: $privateWaterToken, $privateFireToken"
else
  step "Deploying private tokens..."
  bun scripts/deploy-private-tokens.js --network $NETWORK || error "Failed to deploy private tokens"
  . <(jq -r 'to_entries|map("export \(.key)=\(.value|tostring)")|.[]' "./private-tokens-deployment-$NETWORK.json")
  success "Deployed private tokens: $privateWaterToken, $privateFireToken"
fi

# Deploy ROFLSwapOracle
step "Deploying ROFLSwapOracle..."
bun scripts/deploy-roflswap-oracle.js --network $NETWORK || error "Failed to deploy ROFLSwapOracle"
. <(jq -r 'to_entries|map("export \(.key)=\(.value|tostring)")|.[]' "./roflswap-oracle-deployment-$NETWORK.json")
success "Deployed ROFLSwapOracle: $roflSwapOracle"

# Mint and wrap tokens
step "Minting and wrapping tokens..."
bun scripts/mint-and-wrap-tokens.js --network $NETWORK || warning "Failed to mint and wrap tokens. This may be normal if you already have tokens."

# Approve tokens for use in ROFLSwapOracle
step "Approving private tokens for ROFLSwapOracle..."
bun scripts/approve-private-tokens.js --address $roflSwapOracle --network $NETWORK || warning "Failed to approve tokens. This may be normal if you've already approved."

# Place buy order
step "Placing buy order..."
BUY_OUTPUT=$(bun scripts/place-oracle-order.js --buy --amount 2.0 --price 0.5 --network $NETWORK)
echo "$BUY_OUTPUT"
BUY_ORDER_ID=$(echo "$BUY_OUTPUT" | grep "Order ID:" | sed 's/.*Order ID: //')

if [ -z "$BUY_ORDER_ID" ]; then
  warning "Could not extract buy order ID. Assuming it's 1."
  BUY_ORDER_ID=1
else
  success "Placed buy order with ID: $BUY_ORDER_ID"
fi

# Place sell order
step "Placing sell order..."
SELL_OUTPUT=$(bun scripts/place-oracle-order.js --sell --amount 3.0 --price 0.4 --network $NETWORK)
echo "$SELL_OUTPUT"
SELL_ORDER_ID=$(echo "$SELL_OUTPUT" | grep "Order ID:" | sed 's/.*Order ID: //')

if [ -z "$SELL_ORDER_ID" ]; then
  warning "Could not extract sell order ID. Assuming it's 2."
  SELL_ORDER_ID=2
else
  success "Placed sell order with ID: $SELL_ORDER_ID"
fi

# Execute match
step "Executing match between orders $BUY_ORDER_ID and $SELL_ORDER_ID..."
bun scripts/execute-oracle-match.js --buy-order $BUY_ORDER_ID --sell-order $SELL_ORDER_ID --amount 1.5 --network $NETWORK || warning "Failed to execute match. Check the logs above."

# Setup for ROFL app
step "Creating environment file for ROFL app..."
cat > ../rofl_app/update_rofl_environment.sh << EOL
#!/bin/bash
# Environment variables for ROFL app
export ROFLSWAP_ADDRESS="$roflSwapOracle"
export ROFL_APP_ID="$roflAppId"
export WEB3_PROVIDER="https://testnet.sapphire.oasis.io"

# Set the private key (keep this private!)
if [ -n "\$1" ]; then
  PRIVATE_KEY=\$1
  # Ensure the private key has 0x prefix
  if [[ ! "\$PRIVATE_KEY" == 0x* ]]; then
    PRIVATE_KEY="0x\$PRIVATE_KEY"
  fi
  export PRIVATE_KEY=\$PRIVATE_KEY
  export MATCHER_PRIVATE_KEY=\$PRIVATE_KEY
  echo "Using provided private key"
else
  echo "Warning: No private key provided. Using default or environment value."
fi

echo ""
echo "Environment variables set:"
echo "ROFLSWAP_ADDRESS: \$ROFLSWAP_ADDRESS"
echo "ROFL_APP_ID: \$ROFL_APP_ID"
echo "WEB3_PROVIDER: \$WEB3_PROVIDER"
echo "PRIVATE_KEY: [HIDDEN]"
echo "MATCHER_PRIVATE_KEY: [HIDDEN]"
echo ""
echo "To use these variables, run: source ./update_rofl_environment.sh [YOUR_PRIVATE_KEY]"
echo "Then run the matcher with: bun main.py --once"
echo ""
EOL

chmod +x ../rofl_app/update_rofl_environment.sh
success "Created environment script at ../rofl_app/update_rofl_environment.sh"

# Copy the ABI to the ROFL app if needed
if [ ! -d "../rofl_app/abi" ]; then
  mkdir -p ../rofl_app/abi
fi

# Extract ABI from the compiled contract artifacts
step "Extracting ABI for ROFLSwapOracle..."
if [ -f "./artifacts/contracts/ROFLSwapOracle.sol/ROFLSwapOracle.json" ]; then
  jq '.abi' ./artifacts/contracts/ROFLSwapOracle.sol/ROFLSwapOracle.json > ../rofl_app/abi/ROFLSwapOracle.json
  success "Extracted ABI to ../rofl_app/abi/ROFLSwapOracle.json"
else
  warning "Contract artifact not found. Make sure the contract is compiled."
  warning "You may need to manually copy the ABI to ../rofl_app/abi/ROFLSwapOracle.json"
fi

# Final instructions
step "Next steps:"
echo "1. Update your ROFL app configuration with the new contract address: $roflSwapOracle"
echo "2. Run the ROFL app daemon with the following command:"
echo "   source ../rofl_app/update_rofl_environment.sh [YOUR_PRIVATE_KEY]"
echo "   cd ../rofl_app && bun roflswap_oracle_matching.py --once"
echo ""
echo "3. For continuous matching, run:"
echo "   cd ../rofl_app && bun roflswap_oracle_matching.py"
echo ""
success "Test workflow completed!" 