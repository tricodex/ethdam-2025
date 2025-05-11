// Script to check ROFLSwapOracle contract status
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== CHECKING ORACLE STATUS FOR ROFLSwapOracle ===\n");
  
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
  
  // Check contract status
  console.log("\nChecking contract status...");
  
  try {
    // Get total order count
    const totalOrders = await oracle.getTotalOrderCount();
    console.log(`Total orders in the system: ${totalOrders}`);
    
    // Get matcher address
    try {
      const matcherAddress = await oracle.matcher();
      console.log(`Matcher address: ${matcherAddress}`);
    } catch (error) {
      console.log("Could not retrieve matcher address: ", error.message);
    }
    
    // Get matcher ROFL app ID if available
    try {
      const matcherRoflAppId = await oracle.matcherRoflAppId();
      console.log(`Matcher ROFL App ID: ${matcherRoflAppId}`);
    } catch (error) {
      console.log("Could not retrieve matcher ROFL App ID: ", error.message);
    }
    
    // Check filled orders
    console.log("\nChecking last 5 orders...");
    const startIdx = Math.max(1, Number(totalOrders) - 5);
    for (let i = startIdx; i <= Number(totalOrders); i++) {
      try {
        const isFilled = await oracle.filledOrders(i);
        console.log(`Order #${i}: Filled: ${isFilled}`);
      } catch (error) {
        console.log(`Error checking order #${i}: ${error.message}`);
      }
    }
    
    console.log("\nOracle status check completed.");
  } catch (error) {
    console.error(`Error checking contract status: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 