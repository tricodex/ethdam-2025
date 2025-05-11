#!/usr/bin/env node

// set-oracle-to-tee.js - Script to set the oracle address to the current TEE environment
// Run with: bun set-oracle-to-tee.js

const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

// ROFLSwapOracle ABI for the setOracle function
const ROFLSwapOracleABI = [
  "function setOracle(address addr)",
  "function oracle() view returns (address)"
];

async function main() {
  console.log("Setting oracle address to current TEE environment address...");

  // Get network
  const network = hre.network.name;
  console.log(`Network: ${network}`);
  
  // Load deployment data to get the contract address
  let roflSwapOracleAddress;
  
  try {
    const deploymentFile = `./roflswap-oracle-deployment-${network}.json`;
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFile));
    roflSwapOracleAddress = deploymentData.roflSwapOracle;
    console.log(`ROFLSwapOracle: ${roflSwapOracleAddress}`);
  } catch (error) {
    console.error("Failed to load deployment information:", error.message);
    
    // Fall back to command line argument or environment variable
    roflSwapOracleAddress = process.argv[2] || process.env.ROFLSWAP_ORACLE_ADDRESS;
    
    if (!roflSwapOracleAddress) {
      console.error("Error: ROFLSwapOracle contract address not provided.");
      console.error("Usage: bun set-oracle-to-tee.js <contract_address>");
      console.error("Or set ROFLSWAP_ORACLE_ADDRESS environment variable");
      process.exit(1);
    }
  }
  
  // Get the TEE address (signer address)
  const [signer] = await ethers.getSigners();
  const teeAddress = signer.address;
  console.log(`TEE Environment Address: ${teeAddress}`);
  
  // Get the contract instance
  const roflSwapOracle = new ethers.Contract(
    roflSwapOracleAddress,
    ROFLSwapOracleABI,
    signer
  );
  
  // Get current oracle address
  const currentOracle = await roflSwapOracle.oracle();
  console.log(`Current Oracle Address: ${currentOracle}`);
  
  if (currentOracle === teeAddress) {
    console.log("Oracle address is already set to the TEE environment address.");
    process.exit(0);
  }
  
  console.log(`Setting oracle address to TEE environment address: ${teeAddress}`);
  
  try {
    // Call setOracle function - this will only work if executed from the authorized ROFL app
    const tx = await roflSwapOracle.setOracle(teeAddress);
    console.log(`Transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log("Transaction confirmed");
    
    // Verify the oracle was set correctly
    const newOracle = await roflSwapOracle.oracle();
    console.log(`New Oracle Address: ${newOracle}`);
    
    if (newOracle === teeAddress) {
      console.log("✅ Oracle address successfully set to TEE environment address");
    } else {
      console.error("❌ Oracle address not set correctly");
      process.exit(1);
    }
  } catch (error) {
    console.error("Error setting oracle address:", error.message);
    console.error("\nThis error might occur if:");
    console.error("1. The script is not running inside the ROFL app environment");
    console.error("2. The ROFL app ID in the contract doesn't match the current app");
    console.error("3. The contract doesn't have the setOracle function");
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 