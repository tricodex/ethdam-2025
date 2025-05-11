// Script to decode and verify the ROFL app ID
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== DECODING ROFL APP ID ===\n");
  
  // Get the contract's ROFL app ID
  const roflSwapOracleAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Get binary ROFL app ID from contract
  const roflAppID = await oracle.roflAppID();
  console.log(`Contract ROFL App ID (hex): ${roflAppID}`);
  
  // Convert hex to ASCII
  let appIdAscii = "";
  for (let i = 2; i < roflAppID.length; i += 2) {
    appIdAscii += String.fromCharCode(parseInt(roflAppID.substr(i, 2), 16));
  }
  console.log(`Contract ROFL App ID (ASCII): ${appIdAscii}`);
  
  // Our deployed app ID
  const deployedAppID = "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972";
  console.log(`Our deployed App ID: ${deployedAppID}`);
  
  // Check if they match
  if (appIdAscii === deployedAppID) {
    console.log("\n✅ App IDs MATCH: The contract is configured correctly for our ROFL app");
  } else {
    console.log("\n❌ App IDs DO NOT MATCH: The contract is NOT configured for our ROFL app");
    console.log("This is why the matcher can't execute matches - it doesn't have permission!");
  }
  
  // Get the current oracle address
  const currentOracle = await oracle.oracle();
  console.log(`\nCurrent oracle address: ${currentOracle}`);
  
  // Print instructions for fixing if needed
  console.log("\nIf the App IDs don't match, you need to update the contract's ROFL App ID.");
  console.log("Run a script to call the setRoflAppID(bytes21 newAppId) function on the contract.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 