// Deploy ROFLSwapOracle with PrivateERC20 tokens
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

// Helper function to convert ROFL app ID to bytes21
function convertRoflAppIdToBytes21(roflAppId) {
  // Remove 'rofl1' prefix if present
  const cleanAppId = roflAppId.startsWith('rofl1') ? roflAppId.substring(5) : roflAppId;
  
  // Convert to bytes - should be exactly 21 bytes after decoding from base32/base58
  // For now, we'll use a simpler approach and pad/truncate to 21 bytes
  const bytes = ethers.toUtf8Bytes(cleanAppId);
  
  // Pad or truncate to exactly 21 bytes
  const result = new Uint8Array(21);
  const copyLength = Math.min(bytes.length, 21);
  result.set(bytes.slice(0, copyLength));
  
  return result;
}

async function main() {
  console.log("Deploying ROFLSwapOracle with PrivateERC20 tokens...");
  
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
  
  // Convert ROFL app ID to bytes21 format
  const roflAppIdBytes = convertRoflAppIdToBytes21(roflAppId);
  console.log(`Using ROFL App ID: ${roflAppId}`);
  console.log(`Converted to bytes21: 0x${Buffer.from(roflAppIdBytes).toString('hex')}`);
  
  // Set initial oracle address to deployer
  const initialOracle = deployer.address;
  console.log(`Setting initial oracle to: ${initialOracle}`);
  
  // Set SIWE domain for authentication
  const siweDomain = "roflswap.oasis.io";
  console.log(`Using SIWE domain: ${siweDomain}`);
  
  // Get the contract factory
  const ROFLSwapOracle = await ethers.getContractFactory("ROFLSwapOracle");
  
  // Deploy the contract
  console.log("Deploying ROFLSwapOracle...");
  const roflSwapOracle = await ROFLSwapOracle.deploy(
    siweDomain,
    roflAppIdBytes,
    initialOracle,
    privateWaterToken,
    privateFireToken
  );
  
  await roflSwapOracle.waitForDeployment();
  
  const roflSwapOracleAddress = await roflSwapOracle.getAddress();
  console.log(`ROFLSwapOracle deployed to: ${roflSwapOracleAddress}`);
  
  // Request privacy access after deployment
  console.log("Requesting privacy access to token contracts...");
  try {
    const tx = await roflSwapOracle.requestPrivacyAccess();
    await tx.wait();
    console.log("Privacy access requested successfully");
  } catch (error) {
    console.error("Error requesting privacy access:", error.message);
    console.log("You may need to call requestPrivacyAccess() manually after deployment");
  }
  
  // Save deployment information to a file
  const deploymentInfo = {
    roflSwapOracle: roflSwapOracleAddress,
    privateWaterToken,
    privateFireToken,
    roflAppId,
    initialOracle,
    siweDomain,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `./roflswap-oracle-deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment information saved to file.");
  
  // Print next steps
  console.log("\nNext steps:");
  console.log("1. Update the ROFL app configuration with the new contract address");
  console.log("2. Update environment variables in the ROFL app daemon");
  console.log("3. Ensure the oracle has proper permissions in the contract");
  
  return roflSwapOracleAddress;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 