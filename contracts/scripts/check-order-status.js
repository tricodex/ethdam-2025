// Script to check order status on ROFLSwapV5
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

async function main() {
  colorLog("\n=== CHECKING ORDER STATUS ON ROFLSWAPV5 ===\n", COLORS.BLUE);
  
  try {
    // Get the network and check if we're on a testnet (default to sapphire-testnet if not specified)
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    colorLog(`Using network: ${network}`, COLORS.YELLOW);
    
    // Hardcoded addresses for Sapphire testnet
    const roflswapAddress = "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB";
    const waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
    const fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
    
    colorLog(`ROFLSwapV5: ${roflswapAddress}`, COLORS.YELLOW);
    colorLog(`Water Token: ${waterTokenAddress}`, COLORS.YELLOW);
    colorLog(`Fire Token: ${fireTokenAddress}`, COLORS.YELLOW);
    
    // Connect to contracts
    const roflswap = await ethers.getContractAt("ROFLSwapV5", roflswapAddress);
    const waterToken = await ethers.getContractAt("PrivateERC20", waterTokenAddress);
    const fireToken = await ethers.getContractAt("PrivateERC20", fireTokenAddress);
    
    // Get account information
    const [account] = await ethers.getSigners();
    const address = account.address;
    colorLog(`Using address: ${address}`, COLORS.YELLOW);
    
    // Check token balances
    colorLog("\n=== TOKEN BALANCES ===", COLORS.MAGENTA);
    try {
      const waterBalance = await waterToken.balanceOf(address);
      const fireBalance = await fireToken.balanceOf(address);
      
      colorLog(`WATER Balance: ${ethers.formatUnits(waterBalance, 18)} tokens`, COLORS.GREEN);
      colorLog(`FIRE Balance: ${ethers.formatUnits(fireBalance, 18)} tokens`, COLORS.GREEN);
    } catch (error) {
      colorLog("Error checking token balances: " + error.message, COLORS.RED);
      colorLog("Note: Due to privacy features, you may not have access to view token balances", COLORS.YELLOW);
    }
    
    // Check user's orders
    colorLog("\n=== MY ORDERS ===", COLORS.MAGENTA);
    let myOrders = [];
    try {
      const orderCount = await roflswap.getMyOrderCount();
      colorLog(`You have ${orderCount} orders`, COLORS.GREEN);
      
      if (orderCount > 0) {
        myOrders = await roflswap.getMyOrders();
        for (let i = 0; i < myOrders.length; i++) {
          const orderId = myOrders[i];
          colorLog(`Order ID: ${orderId}`, COLORS.CYAN);
        }
      } else {
        colorLog("No orders found using getMyOrders(). This could be due to privacy features.", COLORS.YELLOW);
      }
    } catch (error) {
      colorLog("Error checking your orders: " + error.message, COLORS.RED);
    }
    
    // Check system-wide order stats
    try {
      // Get total order count
      const totalOrderCount = await roflswap.getTotalOrderCount();
      colorLog(`\nTotal Orders in System: ${totalOrderCount}`, COLORS.GREEN);
      
      // Try to check a few recent orders - might fail due to privacy
      try {
        // Only check the most recent 5 orders or fewer if totalOrderCount is smaller
        const maxOrdersToCheck = 5;
        const startOrderId = totalOrderCount > maxOrdersToCheck ? 
          Number(totalOrderCount) - maxOrdersToCheck + 1 : 1;
        
        colorLog(`\nRecent orders (may be limited by privacy):`, COLORS.YELLOW);
        for (let i = startOrderId; i <= Number(totalOrderCount); i++) {
          try {
            const exists = await roflswap.orderExists(i);
            colorLog(`Order ${i}: ${exists ? "Exists" : "Not found"}`, COLORS.CYAN);
          } catch (error) {
            // Silently skip orders we can't access due to privacy
          }
        }
      } catch (error) {
        // Don't display errors when checking individual orders - this is expected
        colorLog("Unable to check individual orders due to privacy features", COLORS.YELLOW);
      }
    } catch (error) {
      // If we can't get the total order count, just show a message without the error
      colorLog("Unable to check total order count", COLORS.YELLOW);
    }
    
    // Next steps for the user
    colorLog("\n=== NEXT STEPS ===", COLORS.BLUE);
    colorLog("1. Place a buy order:  bun hardhat run scripts/place-buy-order.js --network sapphire-testnet", COLORS.CYAN);
    colorLog("2. Place a sell order: bun hardhat run scripts/place-sell-order.js --network sapphire-testnet", COLORS.CYAN);
    colorLog("3. Wrap more tokens:   bun hardhat run scripts/wrap-tokens.js --network sapphire-testnet", COLORS.CYAN);
    colorLog("4. Check ROFL app:     oasis rofl show", COLORS.CYAN);
    
  } catch (error) {
    colorLog(`\nError: ${error.message}`, COLORS.RED);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 