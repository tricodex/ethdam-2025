// Script to place buy orders on ROFLSwapOracle
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
  colorLog("\n=== PLACING BUY ORDER ON ROFLSWAPORACLE ===\n", COLORS.BLUE);
  
  try {
    // Get the network and check if we're on a testnet (default to sapphire-testnet if not specified)
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    colorLog(`Using network: ${network}`, COLORS.BLUE);
    
    // Use hardcoded addresses for consistency with the deployed matcher
    const roflSwapAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
    const waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
    const fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
    
    // In a buy order, we want to buy WATER tokens using FIRE tokens
    colorLog(`ROFLSwapOracle: ${roflSwapAddress}`, COLORS.CYAN);
    colorLog(`Water Token (to buy): ${waterTokenAddress}`, COLORS.CYAN);
    colorLog(`Fire Token (to pay with): ${fireTokenAddress}`, COLORS.CYAN);
    
    // Get signer
    const signer = await ethers.provider.getSigner();
    const signerAddress = await signer.getAddress();
    colorLog(`Using address: ${signerAddress}`, COLORS.BLUE);
    
    // Load ROFLSwapOracle contract
    const roflSwap = await ethers.getContractAt("ROFLSwapOracle", roflSwapAddress);
    
    // Load FIRE token contract (token we're paying with)
    const fireToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", fireTokenAddress);
    
    // Check FIRE token balance (this might fail due to privacy features)
    try {
      const fireBalance = await fireToken.balanceOf(signerAddress);
      colorLog(`FIRE Balance: ${ethers.formatEther(fireBalance)} tokens`, COLORS.CYAN);
    } catch (error) {
      colorLog("Note: Could not check token balance due to privacy features. Continuing anyway.", COLORS.YELLOW);
    }
    
    // Set price and size for the buy order
    const price = ethers.parseEther("1");   // Price per token (1 FIRE per WATER)
    const size = ethers.parseEther("10");   // Amount to buy (10 WATER tokens)
    
    // Create the order object for a BUY order
    const order = {
      orderId: 0,  // Will be assigned by the contract
      owner: signerAddress,
      token: waterTokenAddress, // Token to BUY (WATER)
      price: price,
      size: size,
      isBuy: true // This is a buy order
    };
    
    colorLog("\n=== ORDER DETAILS ===", COLORS.MAGENTA);
    colorLog(`Type: BUY`, COLORS.CYAN);
    colorLog(`Token: ${order.token}`, COLORS.CYAN);
    colorLog(`Price: ${ethers.formatEther(order.price)} FIRE`, COLORS.CYAN);
    colorLog(`Size: ${ethers.formatEther(order.size)} WATER`, COLORS.CYAN);
    
    // Encode the order data
    const encodedOrder = encodeOrder(order);
    colorLog(`Encoded order (${encodedOrder.length} bytes)`, COLORS.YELLOW);
    
    // With PrivateERC20 tokens, we can't check allowances due to privacy features
    // Just approve tokens directly
    colorLog("Approving FIRE tokens for trading...", COLORS.YELLOW);
    try {
      const approveTx = await fireToken.approve(roflSwapAddress, ethers.MaxUint256);
      await approveTx.wait();
      colorLog(`✅ Tokens approved in transaction: ${approveTx.hash}`, COLORS.GREEN);
    } catch (error) {
      colorLog(`Note: Could not approve tokens: ${error.message}`, COLORS.YELLOW);
      colorLog("Continuing anyway as approval might already be set.", COLORS.YELLOW);
    }
    
    // Request privacy access for the contract to handle private token transfers
    try {
      colorLog("Requesting privacy access for ROFLSwapOracle contract...", COLORS.YELLOW);
      const privacyTx = await roflSwap.requestPrivacyAccess();
      await privacyTx.wait();
      colorLog(`✅ Privacy access granted in transaction: ${privacyTx.hash}`, COLORS.GREEN);
    } catch (error) {
      // If it fails, the contract might already have privacy access
      colorLog("Note: Could not request privacy access. Contract might already have it.", COLORS.YELLOW);
    }
    
    // Place the buy order
    colorLog("\nPlacing buy order on ROFLSwapOracle...", COLORS.YELLOW);
    const tx = await roflSwap.placeOrder(encodedOrder);
    colorLog(`Transaction sent: ${tx.hash}`, COLORS.YELLOW);
    
    const receipt = await tx.wait();
    colorLog(`✅ Transaction confirmed in block ${receipt.blockNumber}`, COLORS.GREEN);
    
    // Extract order ID from the event
    const orderPlacedEvent = receipt.logs
      .map(log => { try { return roflSwap.interface.parseLog(log); } catch (e) { return null; }})
      .filter(Boolean)
      .find(parsedLog => parsedLog.name === 'OrderPlaced');
      
    if (orderPlacedEvent) {
      const orderId = orderPlacedEvent.args[0];
      colorLog(`✅ Buy order placed successfully with ID: ${orderId}`, COLORS.GREEN);
      
      // Wait a bit for the oracle to process the order
      colorLog("\nWaiting for the oracle to process the order...", COLORS.YELLOW);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      // Check if the order has been matched
      try {
        const isFilled = await roflSwap.filledOrders(orderId);
        if (isFilled) {
          colorLog(`✅ Order #${orderId} has been matched by the oracle!`, COLORS.GREEN);
        } else {
          colorLog(`Order #${orderId} has not been matched yet.`, COLORS.YELLOW);
          colorLog("The oracle should match it when a compatible sell order is available.", COLORS.YELLOW);
        }
      } catch (error) {
        colorLog(`Could not check if order is filled: ${error.message}`, COLORS.YELLOW);
      }
    } else {
      colorLog("✅ Buy order placed successfully, but could not extract order ID.", COLORS.GREEN);
    }
    
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
