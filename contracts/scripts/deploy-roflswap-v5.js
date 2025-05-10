// Deploy ROFLSwapV5 with PrivateERC20 tokens
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying ROFLSwapV5 with PrivateERC20 tokens...");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Load private token addresses from the deployment file
  let privateWaterToken, privateFireToken;
  try {
    const deploymentData = JSON.parse(
      fs.readFileSync(`./private-tokens-deployment-${hre.network.name}.json`)
    );
    privateWaterToken = deploymentData.privateWaterToken;
    privateFireToken = deploymentData.privateFireToken;
    console.log(`Using private tokens: WATER=${privateWaterToken}, FIRE=${privateFireToken}`);
  } catch (error) {
    console.log("Private tokens deployment file not found. Please deploy the private tokens first.");
    
    // Check if tokens are provided as arguments
    const args = process.argv.slice(2);
    const waterIndex = args.indexOf("--water");
    const fireIndex = args.indexOf("--fire");
    
    if (waterIndex !== -1 && args.length > waterIndex + 1) {
      privateWaterToken = args[waterIndex + 1];
    }
    
    if (fireIndex !== -1 && args.length > fireIndex + 1) {
      privateFireToken = args[fireIndex + 1];
    }
    
    if (!privateWaterToken || !privateFireToken) {
      throw new Error("Private token addresses are required");
    }
    
    console.log(`Using provided tokens: WATER=${privateWaterToken}, FIRE=${privateFireToken}`);
  }
  
  // Get the ROFL App ID from environment or arguments
  let roflAppId = process.env.ROFL_APP_ID;
  
  // Check if ROFL app ID is provided as an argument
  const args = process.argv.slice(2);
  const appIdIndex = args.indexOf("--rofl-app-id");
  if (appIdIndex !== -1 && args.length > appIdIndex + 1) {
    roflAppId = args[appIdIndex + 1];
  }
  
  if (!roflAppId) {
    console.log("ROFL_APP_ID not provided in environment or as an argument.");
    console.log("Using default placeholder. Update it after deployment!");
    roflAppId = "rofl1placeholder000000000000000000000000000000000";
  }
  
  // Convert ROFL app ID to bytes format
  const roflAppIdBytes = ethers.toUtf8Bytes(roflAppId);
  console.log(`Using ROFL App ID: ${roflAppId}`);
  
  // Get the contract factory
  const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
  
  // Deploy the contract
  console.log("Deploying ROFLSwapV5...");
  const roflSwap = await ROFLSwapV5.deploy(
    privateWaterToken,
    privateFireToken,
    roflAppIdBytes
  );
  
  await roflSwap.waitForDeployment();
  
  const roflSwapAddress = await roflSwap.getAddress();
  console.log(`ROFLSwapV5 deployed to: ${roflSwapAddress}`);
  
  // Request privacy access after deployment
  console.log("Requesting privacy access to token contracts...");
  try {
    const tx = await roflSwap.requestPrivacyAccess();
    await tx.wait();
    console.log("Privacy access requested successfully");
  } catch (error) {
    console.error("Error requesting privacy access:", error.message);
    console.log("You may need to call requestPrivacyAccess() manually after deployment");
  }
  
  // Save deployment information to a file
  const deploymentInfo = {
    roflSwapV5: roflSwapAddress,
    privateWaterToken,
    privateFireToken,
    roflAppId,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `./roflswap-v5-deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment information saved to file.");
  
  // Print next steps
  console.log("\nNext steps:");
  console.log("1. Update the ROFL app with the new contract address");
  console.log("2. Update the ROFL app to support PrivateERC20 tokens");
  console.log("3. Ensure ROFL app has proper approval from token holders");
  
  return roflSwapAddress;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
