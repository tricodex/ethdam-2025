#!/usr/bin/env node

// redeploy-roflswap-oracle.js - Script to redeploy ROFLSwapOracle with zero address as initial oracle
// Run with: bun redeploy-roflswap-oracle.js

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
  console.log("Redeploying ROFLSwapOracle with zero address as initial oracle...");

  // Get token addresses from existing deployment
  const network = hre.network.name;
  console.log(`Network: ${network}`);
  
  let privateWaterToken, privateFireToken, roflAppId;
  
  try {
    // Load previous deployment data for token addresses
    const deploymentFile = `./private-tokens-deployment-${network}.json`;
    const tokenData = JSON.parse(fs.readFileSync(deploymentFile));
    
    privateWaterToken = tokenData.privateWaterToken;
    privateFireToken = tokenData.privateFireToken;
    
    console.log(`WATER Token: ${privateWaterToken}`);
    console.log(`FIRE Token: ${privateFireToken}`);
  } catch (error) {
    console.error("Failed to load token addresses:", error.message);
    console.error("Please provide token addresses as arguments or deploy tokens first");
    process.exit(1);
  }
  
  // Get ROFL app ID from command line or environment
  roflAppId = process.argv[2] || process.env.ROFL_APP_ID;
  
  if (!roflAppId) {
    // Try to get from existing deployment
    try {
      const oracleDeploymentFile = `./roflswap-oracle-deployment-${network}.json`;
      const oracleData = JSON.parse(fs.readFileSync(oracleDeploymentFile));
      roflAppId = oracleData.roflAppId;
      console.log(`Using ROFL App ID from previous deployment: ${roflAppId}`);
    } catch (error) {
      console.log("ROFL_APP_ID not provided and couldn't be loaded from previous deployment.");
      console.log("Using default placeholder. Update it after deployment!");
      roflAppId = "rofl1placeholder000000000000000000000000000000000";
    }
  }
  
  // Convert ROFL app ID to bytes21 format
  const roflAppIdBytes = convertRoflAppIdToBytes21(roflAppId);
  console.log(`Using ROFL App ID: ${roflAppId}`);
  console.log(`Converted to bytes21: 0x${Buffer.from(roflAppIdBytes).toString('hex')}`);
  
  // Set initial oracle address to zero address
  const zeroAddress = ethers.ZeroAddress;
  console.log(`Setting initial oracle to zero address: ${zeroAddress}`);
  
  // Set SIWE domain for authentication
  const siweDomain = "sapphire-testnet.oasis.io";
  console.log(`Using SIWE domain: ${siweDomain}`);
  
  // Get the contract factory
  const ROFLSwapOracle = await ethers.getContractFactory("ROFLSwapOracle");
  
  // Deploy the contract
  console.log("Deploying ROFLSwapOracle...");
  const roflSwapOracle = await ROFLSwapOracle.deploy(
    siweDomain,
    roflAppIdBytes,
    zeroAddress,  // Zero address as initial oracle
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
  
  // Get deployer address for info
  const [deployer] = await ethers.getSigners();
  
  // Save deployment information to a file
  const deploymentInfo = {
    roflSwapOracle: roflSwapOracleAddress,
    privateWaterToken,
    privateFireToken,
    waterToken: privateWaterToken, // Including for compatibility
    fireToken: privateFireToken,   // Including for compatibility
    roflAppId,
    initialOracle: zeroAddress,
    siweDomain,
    deployer: deployer.address,
    network: network,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `./roflswap-oracle-deployment-${network}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment information saved to file.");
  
  // Print next steps
  console.log("\nNext steps:");
  console.log("1. Update the ROFL app configuration with the new contract address");
  console.log("2. Configure the TEE to set itself as the oracle using setOracle()");
  console.log("3. Verify the oracle is set correctly using check-rofl-oracle.js");
  
  return roflSwapOracleAddress;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 