// Script to place sell orders on ROFLSwapV5
const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

// Color constants for output
const COLORS = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m"
};

// Helper function for colored logging
function colorLog(message, color) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

// Function to encode order data
function encodeOrder(order) {
  // Encode using ethers ABI coder
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
    [
      order.orderId,
      order.owner,
      order.token,
      order.price,
      order.size,
      order.isBuy
    ]
  );
}

async function main() {
  colorLog("\n=== PLACING SELL ORDER ON ROFLSWAPV5 ===\n", COLORS.BLUE);
  
  try {
    // Get the network and check if we're on a testnet (default to sapphire-testnet if not specified)
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    colorLog(`Using network: ${network}`, COLORS.BLUE);
    
    // Try to load deployment information
    let roflSwapAddress, waterTokenAddress, fireTokenAddress;
    
    try {
      const roflSwapDeployment = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
      );
      const tokenDeployment = JSON.parse(
        fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
      );
      
      roflSwapAddress = roflSwapDeployment.roflSwapV5;
      waterTokenAddress = tokenDeployment.privateWaterToken;
      fireTokenAddress = tokenDeployment.privateFireToken;
      
    } catch (error) {
      // Fallback to hardcoded values if files don't exist
      colorLog(`Deployment files not found. Using hardcoded addresses for ${network}.`, COLORS.YELLOW);
      
      if (network === 'sapphire-testnet') {
        roflSwapAddress = "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB";
        waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
        fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
      } else {
        colorLog(`No known addresses for network: ${network}`, COLORS.RED);
        colorLog(`Please specify a network using --network sapphire-testnet`, COLORS.RED);
        process.exit(1);
      }
    }
    
    // In a sell order, we want to sell WATER tokens for FIRE tokens
    colorLog(`ROFLSwapV5: ${roflSwapAddress}`, COLORS.CYAN);
    colorLog(`Water Token (to sell): ${waterTokenAddress}`, COLORS.CYAN);
    colorLog(`Fire Token (to receive): ${fireTokenAddress}`, COLORS.CYAN);
    
    // Get signer
    const signer = await ethers.provider.getSigner();
    const signerAddress = await signer.getAddress();
    colorLog(`Using address: ${signerAddress}`, COLORS.BLUE);
    
    // Load ROFLSwapV5 contract
    const roflSwap = await ethers.getContractAt("ROFLSwapV5", roflSwapAddress);
    
    // Load WATER token contract (token we're selling)
    const waterToken = await ethers.getContractAt("PrivateERC20", waterTokenAddress);
    
    // Check WATER token balance (this might fail due to privacy features)
    try {
      const waterBalance = await waterToken.balanceOf(signerAddress);
      colorLog(`WATER Balance: ${ethers.formatEther(waterBalance)} tokens`, COLORS.CYAN);
    } catch (error) {
      colorLog("Note: Could not check token balance due to privacy features. Continuing anyway.", COLORS.YELLOW);
    }
    
    // Set price and size for the sell order
    const price = ethers.parseEther("1");   // Price per token (1 FIRE per WATER)
    const size = ethers.parseEther("10");   // Amount to sell (10 WATER tokens)
    
    // Create the order object for a SELL order
    const order = {
      orderId: 0,  // Will be assigned by the contract
      owner: signerAddress,
      token: waterTokenAddress, // Token to SELL (WATER)
      price: price,
      size: size,
      isBuy: false // This is a sell order
    };
    
    colorLog("\n=== ORDER DETAILS ===", COLORS.MAGENTA);
    colorLog(`Type: SELL`, COLORS.CYAN);
    colorLog(`Token: ${order.token}`, COLORS.CYAN);
    colorLog(`Price: ${ethers.formatEther(order.price)} FIRE`, COLORS.CYAN);
    colorLog(`Size: ${ethers.formatEther(order.size)} WATER`, COLORS.CYAN);
    
    // Encode the order data
    const encodedOrder = encodeOrder(order);
    colorLog(`Encoded order (${encodedOrder.length} bytes)`, COLORS.YELLOW);
    
    // Check and set approval if needed - for selling we need to approve WATER tokens
    const waterAllowance = await waterToken.allowance(signerAddress, roflSwapAddress);
    colorLog(`Current allowance: ${ethers.formatEther(waterAllowance)} WATER tokens`, COLORS.CYAN);
    
    // Approve tokens if needed - use a simple comparison
    if (Number(ethers.formatEther(waterAllowance)) < Number(ethers.formatEther(size))) {
      colorLog("Approving WATER tokens for trading...", COLORS.YELLOW);
      const approveTx = await waterToken.approve(roflSwapAddress, ethers.MaxUint256);
      await approveTx.wait();
      colorLog(`✅ Tokens approved in transaction: ${approveTx.hash}`, COLORS.GREEN);
    } else {
      colorLog("✅ Token approval is sufficient", COLORS.GREEN);
    }
    
    // Place the sell order
    colorLog("\nPlacing sell order on ROFLSwapV5...", COLORS.YELLOW);
    const tx = await roflSwap.placeOrder(encodedOrder);
    colorLog(`Transaction sent: ${tx.hash}`, COLORS.YELLOW);
    
    const receipt = await tx.wait();
    colorLog(`✅ Transaction confirmed in block ${receipt.blockNumber}`, COLORS.GREEN);
    
    // Extract order ID from the event
    const orderPlacedEvent = receipt.logs
      .map(log => { try { return roflSwap.interface.parseLog(log); } catch (e) { return null; }})
      .find(parsedLog => parsedLog && parsedLog.name === 'OrderPlaced');
      
    if (orderPlacedEvent) {
      const orderId = orderPlacedEvent.args[0];
      colorLog(`✅ Sell order placed successfully with ID: ${orderId}`, COLORS.GREEN);
    } else {
      colorLog("✅ Sell order placed successfully, but could not extract order ID.", COLORS.GREEN);
    }
    
    colorLog("\nTo check if the order has been matched:", COLORS.YELLOW);
    colorLog("Run: bun hardhat run scripts/check-order-status.js --network sapphire-testnet", COLORS.CYAN);
    
  } catch (error) {
    colorLog(`❌ Error: ${error.message}`, COLORS.RED);
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 