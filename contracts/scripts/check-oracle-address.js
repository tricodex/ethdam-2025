// Script to check if the Oracle address is correctly set in the ROFLSwapOracle contract
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
  // Get contract factory and attach to deployed contract
  const contractAddress = process.env.ROFLSWAP_ADDRESS || "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  colorLog(`Checking Oracle configuration for ROFLSwapOracle at ${contractAddress}`, COLORS.BLUE);
  
  // Get signer
  const [signer] = await ethers.getSigners();
  colorLog(`Using account: ${signer.address}`, COLORS.YELLOW);
  
  // Get the contract instance
  const ROFLSwapOracle = await ethers.getContractFactory("contracts/ROFLSwapOracle.sol:ROFLSwapOracle");
  const contract = ROFLSwapOracle.attach(contractAddress);
  
  // Get oracle address
  const oracleAddress = await contract.oracle();
  colorLog(`Oracle address in contract: ${oracleAddress}`, COLORS.GREEN);
  
  // Get ROFL App ID
  const roflAppID = await contract.roflAppID();
  colorLog(`ROFL App ID in contract (hex): 0x${Buffer.from(roflAppID).toString('hex')}`, COLORS.GREEN);
  
  // Convert to text if possible
  try {
    const appIDString = Buffer.from(roflAppID).toString('utf8');
    colorLog(`ROFL App ID in contract (text): ${appIDString}`, COLORS.GREEN);
  } catch (e) {
    colorLog("Could not convert ROFL App ID to text", COLORS.RED);
  }
  
  // Check if the oracle is correctly set
  if (oracleAddress === "0x0000000000000000000000000000000000000000") {
    colorLog("WARNING: Oracle address is zero address (not set)", COLORS.RED);
  } else {
    colorLog(`Oracle address is set to: ${oracleAddress}`, COLORS.GREEN);
    
    // Check total order count
    const totalOrders = await contract.getTotalOrderCount();
    colorLog(`Total orders in contract: ${Number(totalOrders)}`, COLORS.GREEN);
    
    // Check if there are any recent orders that are not filled
    let unfilledOrders = [];
    const startOrderId = Math.max(1, Number(totalOrders) - 10); // Check the last 10 orders
    
    for (let i = startOrderId; i <= Number(totalOrders); i++) {
      try {
        const filled = await contract.filledOrders(i);
        if (!filled) {
          unfilledOrders.push(i);
        }
      } catch (e) {
        colorLog(`Error checking order #${i}: ${e.message}`, COLORS.RED);
      }
    }
    
    if (unfilledOrders.length > 0) {
      colorLog(`Found ${unfilledOrders.length} unfilled orders: ${unfilledOrders.join(", ")}`, COLORS.YELLOW);
    } else {
      colorLog("No unfilled orders found in the last 10 orders", COLORS.CYAN);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 