// Script to check the exact format and encoding of the ROFL App ID
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== CHECKING ROFL APP ID FORMAT ===\n");
  
  // Contract information
  const roflSwapOracleAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  console.log(`ROFLSwapOracle address: ${roflSwapOracleAddress}`);
  
  // Get the contract instance
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Get ROFL app ID in different formats
  const roflAppID = await oracle.roflAppID();
  console.log(`\nROFL App ID as hex: ${roflAppID}`);
  console.log(`ROFL App ID length (bytes): ${(roflAppID.length - 2) / 2}`); // -2 for "0x" prefix
  
  // Convert hex to ASCII
  let appIdAscii = "";
  for (let i = 2; i < roflAppID.length; i += 2) {
    appIdAscii += String.fromCharCode(parseInt(roflAppID.substr(i, 2), 16));
  }
  console.log(`ROFL App ID as ASCII: ${appIdAscii}`);
  
  // Convert hex to bytes (raw binary)
  const appIdBytes = ethers.hexlify(roflAppID);
  console.log(`ROFL App ID as bytes: ${appIdBytes}`);
  
  // Our deployed ROFL App ID
  const deployedAppID = "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972";
  console.log(`\nDeployed ROFL App ID: ${deployedAppID}`);
  console.log(`Deployed App ID length: ${deployedAppID.length} chars`);
  
  // Remove the "rofl1" prefix
  const appIdWithoutPrefix = deployedAppID.replace("rofl1", "");
  console.log(`Without 'rofl1' prefix: ${appIdWithoutPrefix}`);
  console.log(`Length without prefix: ${appIdWithoutPrefix.length} chars`);
  
  // Check if the contract's App ID is a prefix of our deployed App ID
  if (appIdWithoutPrefix.startsWith(appIdAscii)) {
    console.log(`\n⚠️ Contract's App ID is a truncated prefix of our App ID!`);
    
    const matchLength = appIdAscii.length;
    const totalLength = appIdWithoutPrefix.length;
    console.log(`Matching part: ${matchLength} chars`);
    console.log(`Missing part: ${totalLength - matchLength} chars`);
    
    console.log(`\nContract has: "${appIdAscii}"`);
    console.log(`Should have: "${appIdWithoutPrefix}"`);
    console.log(`Missing: "${appIdWithoutPrefix.substring(matchLength)}"`);
    
    console.log(`\nThis explains the authentication issue - the contract is expecting`);
    console.log(`a different (shorter) App ID than what's deployed!`);
    
    console.log(`\nOptions to fix this:`);
    console.log(`1. Update the contract's App ID to the full value (requires admin)`);
    console.log(`2. Redeploy your ROFL app with the truncated ID: "qzd2jxyr5lujtkdnkpf9x"`);
  }
  else if (appIdAscii.startsWith(appIdWithoutPrefix)) {
    console.log(`\n⚠️ Contract's App ID is longer than our App ID!`);
  }
  else {
    console.log(`\n⚠️ App IDs don't match at all!`);
  }
  
  // Check oracle address
  const currentOracle = await oracle.oracle();
  console.log(`\nCurrent oracle address: ${currentOracle}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 