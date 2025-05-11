// Check for executed matches in ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n=== CHECKING FOR MATCHES IN ROFLSWAPORACLE ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Load deployment information
  let roflSwapOracleAddress;
  try {
    const deploymentFilePath = `./roflswap-oracle-deployment-${networkName}.json`;
    console.log(`Loading deployment from: ${deploymentFilePath}`);
    
    if (!fs.existsSync(deploymentFilePath)) {
      throw new Error(`Deployment file not found: ${deploymentFilePath}`);
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath));
    roflSwapOracleAddress = deploymentData.roflSwapOracle;
    console.log(`ROFLSwapOracle: ${roflSwapOracleAddress}`);
  } catch (error) {
    console.error("Failed to load deployment information:", error.message);
    throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
  }
  
  // Get contract instance
  const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  try {
    // Check oracle address
    const currentOracle = await roflSwapOracle.oracle();
    console.log(`Oracle address: ${currentOracle}`);
    console.log(`Our address: ${signer.address}`);
    
    // Get total order count
    const orderCount = await roflSwapOracle.getTotalOrderCount();
    console.log(`Total orders placed: ${orderCount}`);
    
    // Check filled orders directly
    console.log("\nChecking filled orders status...");
    let filledCount = 0;
    let filledOrders = [];
    
    for (let i = 1; i <= Number(orderCount); i++) {
      const isFilled = await roflSwapOracle.filledOrders(i);
      if (isFilled) {
        filledCount++;
        filledOrders.push(i);
        console.log(`- Order #${i} is marked as filled`);
      }
    }
    
    if (filledCount === 0) {
      console.log("No orders are marked as filled. The ROFL matcher hasn't executed any matches yet.");
      console.log("\nThis is expected because:");
      console.log("1. The ROFL matcher needs to run in a TEE environment");
      console.log("2. The matcher requires the ROFL daemon socket for authentication");
      console.log("3. Order matching can only be executed by the authorized oracle address");
    } else {
      console.log(`${filledCount} out of ${orderCount} orders are marked as filled`);
      
      // Try to determine which orders were matched
      if (filledOrders.length >= 2) {
        console.log("\nPossible match combinations:");
        for (let i = 0; i < filledOrders.length; i += 2) {
          if (i + 1 < filledOrders.length) {
            console.log(`- Match between orders #${filledOrders[i]} and #${filledOrders[i+1]}`);
          }
        }
      }
    }
    
    console.log("\n=== NEXT STEPS ===");
    console.log("1. Deploy the ROFL app to a TEE environment:");
    console.log("   $ cd ../rofl_app");
    console.log("   $ oasis rofl build");
    console.log("   $ oasis rofl update");
    console.log("   $ oasis rofl deploy");
    
    console.log("\n2. Monitor the deployed ROFL app:");
    console.log("   $ oasis rofl show");
    
    console.log("\n3. Check matcher logs:");
    console.log("   $ oasis rofl logs");
    
  } catch (error) {
    console.error("Error checking for matches:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 