# ROFLSwapV5 Testing Instructions

## Issues Identified and Fixed

1. **Private Key Format Issue**: 
   - The Hardhat configuration expects private keys to be 32 bytes (64 hexadecimal characters without the 0x prefix)
   - The test script now includes validation to check for correct key formats

2. **ERC20Mintable Contract**: 
   - The ERC20Mintable contract was missing but is now created in contracts/contracts/ERC20Mintable.sol
   - This contract is used for minting base tokens for testing

3. **ROFL App Configuration**:
   - ROFL app is running properly with ID: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
   - Three active replicas are functioning as expected

## Step-by-Step Testing Instructions

### 1. Set Correct Environment Variables

Ensure your private keys are in the correct format (32 bytes / 64 hex chars):

```bash
# Example: Add 0x prefix only if using keys with 64 characters
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80  # Example key, DO NOT USE in production
export PRIVATE_KEY_SELLER=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d  # Example key, DO NOT USE in production

# Alternative: Remove 0x prefix if your keys already have it
export PRIVATE_KEY=${PRIVATE_KEY#0x}
export PRIVATE_KEY_SELLER=${PRIVATE_KEY_SELLER#0x}
```

### 2. Compile the Contracts

Ensure all contracts are compiled, including the newly added ERC20Mintable contract:

```bash
bun hardhat compile --force
```

### 3. Mint Base Tokens to Accounts

Use the mint-and-wrap-tokens.js script to fund test accounts:

```bash
bun hardhat run scripts/mint-and-wrap-tokens.js --network sapphire-testnet
```

### 4. Wrap Tokens for Buyer and Seller

Run the wrap-tokens.js script with the buyer's private key:

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet
```

Then with the seller's private key:

```bash
export PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet
```

### 5. Verify ROFL App Configuration

Check that the ROFL app is properly configured and running:

```bash
cd ../rofl_app
oasis rofl show
oasis rofl machine show
```

Ensure the following secrets are set:
- ROFLSWAP_ADDRESS: `0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB`
- ROFL_APP_ID: `rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972`
- WEB3_PROVIDER: `https://testnet.sapphire.oasis.io`

If any secrets are missing, set them with:

```bash
echo -n "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB" | oasis rofl secret set ROFLSWAP_ADDRESS -
echo -n "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972" | oasis rofl secret set ROFL_APP_ID -
echo -n "https://testnet.sapphire.oasis.io" | oasis rofl secret set WEB3_PROVIDER -
oasis rofl update
```

### 6. Run the Complete Test Workflow

For convenience, you can use the complete testing script that handles all the steps:

```bash
cd ../contracts
bash scripts/test-complete-workflow.sh
```

Or run the test-order-matching-workflow.sh script after completing the manual preparations:

```bash
export PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export PRIVATE_KEY_SELLER=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
bash scripts/test-order-matching-workflow.sh
```

## Troubleshooting

### "private key too short, expected 32 bytes"
- Check your private key format. It must be exactly 64 hexadecimal characters without the '0x' prefix or 66 characters with the prefix.
- Current environment variables may have keys that are too short (5 bytes instead of 32).

### "Artifact for contract 'ERC20Mintable' not found"
- Make sure you've compiled the contracts with `bun hardhat compile --force` after adding the ERC20Mintable.sol file.

### No ROFL App Running
- If the ROFL app isn't running, deploy it using:
```bash
cd ../rofl_app
oasis rofl machine create
```

### Token Balances Show as Zero
- Ensure the tokens were properly minted using the mint-and-wrap-tokens.js script.
- Check that the privacy access was requested for the ROFLSwapV5 contract:
```bash
bun hardhat request-privacy:v5 --network sapphire-testnet
```

### Order Matching Not Working
- Verify the ROFL app is running and has the correct contract address in its secrets.
- Check that the ROFLSwapV5 contract was deployed with the correct ROFL app ID.
- Ensure tokens were properly approved for the ROFLSwapV5 contract.
- Allow enough time for the TEE to process matches (at least 60 seconds). 