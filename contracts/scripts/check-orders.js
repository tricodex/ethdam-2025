// Script to check order status on ROFLSwapOracle
const hre = require("hardhat");
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
  colorLog("\n=== CHECKING ORDERS ON ROFLSWAPORACLE ===\n", COLORS.BLUE);
  
  try {
    // Get the network and check if we're on a testnet (default to sapphire-testnet if not specified)
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    colorLog(`Using network: ${network}`, COLORS.BLUE);
    
    // Use hardcoded addresses for consistency with the deployed matcher
    const roflSwapAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
    const waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
    const fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
    
    colorLog(`ROFLSwapOracle: ${roflSwapAddress}`, COLORS.CYAN);
    
    // Get signer
    const signer = await ethers.provider.getSigner();
    const signerAddress = await signer.getAddress();
    colorLog(`Using address: ${signerAddress}`, COLORS.BLUE);
    
    // Load ROFLSwapOracle contract
    const roflSwap = await ethers.getContractAt("ROFLSwapOracle", roflSwapAddress);
    
    // Check oracle address
    const oracleAddress = await roflSwap.oracle();
    colorLog(`Oracle address: ${oracleAddress}`, COLORS.CYAN);
    
    // Get total order count
    const totalOrders = await roflSwap.getTotalOrderCount();
    colorLog(`Total orders in the system: ${totalOrders}`, COLORS.CYAN);
    
    // Check filled orders
    colorLog("\n=== CHECKING ORDER STATUS ===", COLORS.MAGENTA);
    
    // Create an array with all order IDs
    const orderIds = Array.from({length: Number(totalOrders)}, (_, i) => i + 1);
    
    // Check the status of each order
    for (const orderId of orderIds) {
      try {
        const isFilled = await roflSwap.filledOrders(orderId);
        
        if (isFilled) {
          colorLog(`Order #${orderId}: FILLED ✅`, COLORS.GREEN);
        } else {
          // Check if the order exists
          const exists = await roflSwap.orderExists(orderId);
          if (exists) {
            colorLog(`Order #${orderId}: OPEN ⏳`, COLORS.YELLOW);
          } else {
            colorLog(`Order #${orderId}: DOES NOT EXIST ❌`, COLORS.RED);
          }
        }
      } catch (error) {
        colorLog(`Error checking order #${orderId}: ${error.message}`, COLORS.RED);
      }
    }
    
    // Check if our address is the oracle
    if (signerAddress.toLowerCase() === oracleAddress.toLowerCase()) {
      colorLog("\n=== ORACLE AUTHENTICATION ===", COLORS.MAGENTA);
      colorLog("Your address matches the oracle address. Using simple oracle authentication.", COLORS.GREEN);
      
      // Try to access orders using empty token (oracle authentication)
      try {
        // Just pass an empty auth token for oracle authentication
        const emptyToken = "0x";
        
        // Try to access some user's orders
        colorLog("Attempting to access orders with oracle privileges...", COLORS.BLUE);
        const userAddress = "0xF449C755DEc0FA9c655869A3D8D89fb2cCC399e6"; // Example user address
        
        colorLog(`Getting orders for user: ${userAddress}`, COLORS.BLUE);
        const userOrders = await roflSwap.getUserOrders(emptyToken, userAddress);
        
        if (userOrders.length === 0) {
          colorLog(`User ${userAddress} has no orders.`, COLORS.YELLOW);
        } else {
          colorLog(`User ${userAddress} has ${userOrders.length} orders:`, COLORS.GREEN);
          
          // List each order
          for (const orderId of userOrders) {
            const isFilled = await roflSwap.filledOrders(orderId);
            colorLog(`  Order #${orderId}: ${isFilled ? 'FILLED ✅' : 'OPEN ⏳'}`, isFilled ? COLORS.GREEN : COLORS.YELLOW);
          }
        }
      } catch (error) {
        colorLog(`Error with oracle authentication: ${error.message}`, COLORS.RED);
      }
    } else {
      colorLog("\n=== YOUR ORDERS ===", COLORS.MAGENTA);
      colorLog(`Your address ${signerAddress} does not match the oracle address ${oracleAddress}`, COLORS.YELLOW);
      colorLog("Cannot access user orders without being the oracle or using SIWE authentication", COLORS.YELLOW);
      colorLog("You can see all orders in the system above.", COLORS.YELLOW);
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
