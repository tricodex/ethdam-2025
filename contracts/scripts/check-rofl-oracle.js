#!/usr/bin/env node

// check-rofl-oracle.js - Script to check the oracle address in ROFLSwapOracle contract
// Run with: bun check-rofl-oracle.js

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Contract ABI - only including the functions we need
const ROFLSwapOracleABI = [
  "function oracle() view returns (address)",
  "function roflAppID() view returns (bytes21)",
  "function waterToken() view returns (address)",
  "function fireToken() view returns (address)"
];

async function main() {
  try {
    // Set up provider with Sapphire testnet
    const rpcUrl = process.env.RPC_URL || "https://testnet.sapphire.oasis.io";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`Using RPC URL: ${rpcUrl}`);
    
    // Try to load deployment data from file
    let contractAddress;
    try {
      // Load from deployment file
      const network = "sapphire-testnet";
      const deploymentFile = `./roflswap-oracle-deployment-${network}.json`;
      console.log(`Looking for deployment file: ${deploymentFile}`);
      
      const deploymentData = JSON.parse(fs.readFileSync(deploymentFile));
      contractAddress = deploymentData.roflSwapOracle;
      console.log(`Found contract address in deployment file: ${contractAddress}`);
    } catch (error) {
      console.log(`Couldn't load from deployment file: ${error.message}`);
      
      // If file not found, use command line argument or env var
      contractAddress = process.argv[2] || process.env.ROFLSWAP_ORACLE_ADDRESS;
      
      if (!contractAddress) {
        console.error("Error: ROFLSwapOracle contract address not provided.");
        console.error("Usage: bun check-rofl-oracle.js <contract_address>");
        console.error("Or set ROFLSWAP_ORACLE_ADDRESS environment variable");
        process.exit(1);
      }
    }

    // Create contract instance
    console.log(`Connecting to ROFLSwapOracle at ${contractAddress}...`);
    const contract = new ethers.Contract(contractAddress, ROFLSwapOracleABI, provider);
    
    // Get oracle address
    const oracleAddress = await contract.oracle();
    console.log(`\nOracle Address: ${oracleAddress}`);
    console.log(`Oracle Address is ${oracleAddress === ethers.ZeroAddress ? 'NOT SET (zero address)' : 'SET'}`);
    
    // Get additional info
    const roflAppID = await contract.roflAppID();
    console.log(`\nROFL App ID: ${roflAppID}`);
    
    const waterToken = await contract.waterToken();
    console.log(`Water Token Address: ${waterToken}`);
    
    const fireToken = await contract.fireToken();
    console.log(`Fire Token Address: ${fireToken}`);
    
    console.log("\nContract Configuration Summary:");
    console.log("-------------------------------");
    console.log(`Oracle Status: ${oracleAddress === ethers.ZeroAddress ? '❌ NOT SET' : '✅ SET'}`);
    console.log(`Oracle Address: ${oracleAddress}`);
    console.log(`ROFL App ID: ${roflAppID}`);
    console.log(`Water Token: ${waterToken}`);
    console.log(`Fire Token: ${fireToken}`);
    
  } catch (error) {
    console.error("Error checking oracle:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 