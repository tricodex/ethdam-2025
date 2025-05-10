// Script to check the status of specific order IDs
const { ethers } = require("ethers");
require('dotenv').config();

// Custom minimal ABI with only the functions we need
const ROFLSWAP_ABI = [
  "function filledOrders(uint256 orderId) view returns (bool)",
  "function getEncryptedOrder(uint256 orderId) view returns (bytes)",
  "function getOrderOwner(uint256 orderId) view returns (address)",
  "function orderExists(uint256 orderId) view returns (bool)"
];

async function main() {
  // Read order IDs from command line arguments
  const orderIds = process.argv.slice(2).map(id => parseInt(id));
  
  if (orderIds.length === 0) {
    console.error("Please provide at least one order ID to check");
    process.exit(1);
  }
  
  // Contract address
  const roflSwapAddress = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df";
  
  // Set up provider and signer
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  // Create contract instance
  const roflSwap = new ethers.Contract(roflSwapAddress, ROFLSWAP_ABI, provider);
  
  console.log("Checking status of specified orders...");
  
  for (const orderId of orderIds) {
    console.log(`\nChecking Order #${orderId}:`);
    
    try {
      // Check if order exists
      const exists = await roflSwap.orderExists(orderId);
      if (!exists) {
        console.log(`Order #${orderId} does not exist`);
        continue;
      }
      
      // Check if filled
      const isFilled = await roflSwap.filledOrders(orderId);
      console.log(`Status: ${isFilled ? 'FILLED' : 'NOT FILLED'}`);
      
      // Get owner
      const owner = await roflSwap.getOrderOwner(orderId);
      console.log(`Owner: ${owner}`);
      
      // Get encrypted order data
      const encryptedOrder = await roflSwap.getEncryptedOrder(orderId);
      
      // Try to decode the order if it's just UTF-8 encoded
      try {
        const decodedOrder = ethers.toUtf8String(encryptedOrder);
        const orderObject = JSON.parse(decodedOrder);
        console.log("Decoded Order Data:", JSON.stringify(orderObject, null, 2));
      } catch (e) {
        console.log("Order data is not decodable as UTF-8 text");
        console.log(`Raw order data (hex): ${encryptedOrder}`);
      }
      
    } catch (error) {
      console.error(`Error checking order #${orderId}:`, error.message);
    }
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 