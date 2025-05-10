// Script to test the ROFLSwapV4 contract with the full ROFL app ID
const { ethers } = require("ethers");
const fs = require("fs");

// Custom minimal ABI with only the functions we need
const ROFLSWAPV4_ABI = [
  "function roflAppId() view returns (bytes)",
  "function orderCounter() view returns (uint256)",
  "function getTokens() view returns (address, address)"
];

async function main() {
  // Load deployment info
  let deploymentInfo;
  try {
    deploymentInfo = JSON.parse(fs.readFileSync("roflswap-v4-deployment-sapphire-testnet.json", "utf8"));
  } catch (error) {
    console.error("Could not find deployment info file. Please deploy the contract first.");
    process.exit(1);
  }
  
  // Contract address
  const roflSwapAddress = deploymentInfo.contractAddress;
  
  // Set up provider
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  // Create contract instance
  const roflSwap = new ethers.Contract(roflSwapAddress, ROFLSWAPV4_ABI, provider);
  
  console.log(`\nChecking ROFLSwapV4 at ${roflSwapAddress}\n`);
  
  try {
    // Get ROFL app ID
    const roflAppIdBytes = await roflSwap.roflAppId();
    console.log(`ROFL App ID (bytes): ${roflAppIdBytes}`);
    
    // Convert bytes to string
    let roflAppIdString = "";
    try {
      roflAppIdString = ethers.toUtf8String(roflAppIdBytes);
      console.log(`ROFL App ID (decoded): ${roflAppIdString}`);
    } catch (e) {
      console.log("Could not decode ROFL App ID as UTF-8.");
    }
    
    // Get order count
    const orderCount = await roflSwap.orderCounter();
    console.log(`\nTotal orders in the contract: ${orderCount}`);
    
    // Get token addresses
    const [waterToken, fireToken] = await roflSwap.getTokens();
    console.log(`Water Token address: ${waterToken}`);
    console.log(`Fire Token address: ${fireToken}`);
    
    // Compare ROFL App ID with the expected one from deployment
    console.log(`\nExpected ROFL App ID: ${deploymentInfo.roflAppId}`);
    if (roflAppIdString === deploymentInfo.roflAppId) {
      console.log("✅ ROFL App ID matches the expected value.");
    } else {
      console.log("❌ ROFL App ID does not match the expected value.");
      console.log("This might cause issues with the ROFL app authorization.");
    }
    
    console.log("\nNext steps:");
    console.log("1. Make sure the ROFL app's ROFLSWAP_ADDRESS secret is updated with this contract address");
    console.log("2. Run 'oasis rofl update' to update the ROFL app configuration");
    console.log("3. Place test orders to verify the contract is working properly");
    
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