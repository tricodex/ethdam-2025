// Script to test and verify oracle permissions for ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== TESTING ORACLE PERMISSIONS FOR ROFLSwapOracle ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Set contract address
  const roflSwapOracleAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  console.log(`ROFLSwapOracle address: ${roflSwapOracleAddress}`);
  
  // Load the contract
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Get current oracle and ROFL app ID
  console.log("\nChecking current contract settings...");
  
  try {
    // Get current oracle address
    const currentOracle = await oracle.oracle();
    console.log(`Current oracle address: ${currentOracle}`);
    
    // Get current ROFL app ID
    const roflAppID = await oracle.roflAppID();
    console.log(`ROFL App ID: ${roflAppID}`);
    
    // Check our ROFL app ID from deployment
    const deployedAppID = "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972";
    console.log(`Our deployed ROFL App ID: ${deployedAppID}`);
    
    // Verify if the current oracle has matching permissions
    console.log("\nVerifying if orders can be retrieved...");
    
    // Check if oracle can retrieve orders
    // This won't actually execute in the TEE, but it tells us if the permissions are set up correctly
    console.log("\nListing recent orders and their status:");
    const totalOrders = await oracle.getTotalOrderCount();
    console.log(`Total orders: ${totalOrders}`);
    
    // Check last 5 orders
    const startIdx = Math.max(1, Number(totalOrders) - 5);
    for (let i = startIdx; i <= Number(totalOrders); i++) {
      try {
        const isFilled = await oracle.filledOrders(i);
        console.log(`Order #${i}: Filled: ${isFilled}`);
      } catch (error) {
        console.log(`Error checking order #${i}: ${error.message}`);
      }
    }
    
    console.log("\nOracle permission test completed.");
    console.log("\nNOTE: If the ROFL App ID doesn't match or the oracle address is incorrect,");
    console.log("the TEE won't be able to execute matches!");
    
  } catch (error) {
    console.error(`Error checking oracle settings: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 