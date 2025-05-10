// Script to check orders in the ROFLSwapV4 contract
const { ethers } = require("ethers");
const fs = require("fs");

// Custom minimal ABI with only the functions we need
const ROFLSWAPV4_ABI = [
  "function orderCounter() view returns (uint256)",
  "function filledOrders(uint256 orderId) view returns (bool)",
  "function getTokens() view returns (address, address)",
  "function roflAppId() view returns (bytes)"
];

async function main() {
  // Load deployment info
  let deploymentInfo;
  let roflSwapAddress = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df"; // Default to the newly deployed contract
  
  try {
    deploymentInfo = JSON.parse(fs.readFileSync("roflswap-v4-deployment-sapphire-testnet.json", "utf8"));
    roflSwapAddress = deploymentInfo.contractAddress;
  } catch (error) {
    console.log("Using default contract address");
  }
  
  // Set up provider
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  // Create contract instance
  const roflSwap = new ethers.Contract(roflSwapAddress, ROFLSWAPV4_ABI, provider);
  
  console.log(`\nChecking ROFLSwapV4 at ${roflSwapAddress}\n`);
  
  try {
    // Get ROFL app ID
    const roflAppIdBytes = await roflSwap.roflAppId();
    const roflAppIdString = ethers.toUtf8String(roflAppIdBytes);
    console.log(`ROFL App ID: ${roflAppIdString}`);
    
    // Get order count
    const orderCount = await roflSwap.orderCounter();
    console.log(`Total orders in the contract: ${orderCount}`);
    
    // Get token addresses
    const [waterToken, fireToken] = await roflSwap.getTokens();
    console.log(`Water Token address: ${waterToken}`);
    console.log(`Fire Token address: ${fireToken}`);
    
    // Check for the most recent orders (if any)
    const orderCountNum = parseInt(orderCount.toString());
    if (orderCountNum > 0) {
      console.log("\nChecking most recent orders:");
      
      const startOrderId = Math.max(1, orderCountNum - 10); // Show up to 10 most recent orders
      
      for (let i = startOrderId; i <= orderCountNum; i++) {
        try {
          const isFilled = await roflSwap.filledOrders(i);
          console.log(`Order #${i}: ${isFilled ? 'FILLED ✅' : 'NOT FILLED ❌'}`);
        } catch (error) {
          console.log(`Order #${i}: Error checking status - ${error.message}`);
        }
      }
      
      console.log("\nNOTE: If orders aren't being filled, make sure you've updated the ROFL app with the new contract address:");
      console.log(`echo -n "${roflSwapAddress}" | oasis rofl secret set ROFLSWAP_ADDRESS -`);
      console.log("oasis rofl update --account myaccount");
    } else {
      console.log("\nNo orders found in the contract.");
      console.log("Try placing some test orders first using scripts/simple-place-orders.js");
    }
    
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 