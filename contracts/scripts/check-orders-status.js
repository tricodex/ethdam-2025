// Check status of orders in ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Checking order status in ROFLSwapOracle...");
  
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
  
  // Get contract instances
  const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Get oracle address from contract
  const contractOracle = await roflSwapOracle.oracle();
  console.log(`Oracle address: ${contractOracle}`);
  console.log(`Our address: ${signer.address}`);
  
  // Get total orders
  const totalOrders = await roflSwapOracle.getTotalOrderCount();
  console.log(`\nTotal orders: ${totalOrders.toString()}`);
  
  // Get filled orders status
  console.log("\nOrder Status:");
  console.log("-------------");
  
  let filledCount = 0;
  
  for (let i = 1; i <= totalOrders; i++) {
    try {
      const exists = await roflSwapOracle.orderExists(i);
      if (!exists) {
        console.log(`Order #${i}: Does not exist`);
        continue;
      }
      
      const isFilled = await roflSwapOracle.filledOrders(i);
      console.log(`Order #${i}: ${isFilled ? 'FILLED' : 'Not filled'}`);
      
      if (isFilled) {
        filledCount++;
      }
    } catch (error) {
      console.log(`Error checking order #${i}: ${error.message}`);
    }
  }
  
  console.log(`\nSummary: ${filledCount} orders filled out of ${totalOrders} total orders`);
  
  if (filledCount > 0) {
    console.log("\n✅ SUCCESS: Some orders have been matched by the ROFL app in TEE!");
  } else {
    console.log("\n❌ NO MATCHED ORDERS: The ROFL app hasn't matched any orders yet.");
    console.log("This could be because:");
    console.log("1. The ROFL app in TEE is still initializing or processing orders");
    console.log("2. The matcher is running on a longer interval");
    console.log("3. There might be an issue with the TEE environment");
    console.log("\nCheck the ROFL app logs to diagnose the issue.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 