// Script to update the ROFL App ID in the contract
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== UPDATING ROFL APP ID IN CONTRACT ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Network info
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Contract information
  const roflSwapOracleAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  console.log(`ROFLSwapOracle address: ${roflSwapOracleAddress}`);
  
  // Get the contract instance
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Current App ID in contract
  const currentAppID = await oracle.roflAppID();
  console.log(`Current App ID in contract (hex): ${currentAppID}`);
  
  // Our new ROFL App ID (the one from our deployed ROFL app)
  const deployedAppID = "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972";
  console.log(`New App ID to set: ${deployedAppID}`);
  
  // Convert the App ID to a bytes21 value
  // First remove the "rofl1" prefix
  const appIdWithoutPrefix = deployedAppID.replace("rofl1", "");
  console.log(`App ID without prefix: ${appIdWithoutPrefix}`);
  
  // Convert to bytes - using ethers v6 approach
  const bytes = ethers.toUtf8Bytes(appIdWithoutPrefix);
  
  console.log(`\nAttempting to update the App ID...`);
  
  try {
    // Call the setRoflAppID function
    const tx = await oracle.setRoflAppID(bytes);
    console.log(`Transaction submitted: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    console.log(`Waiting for transaction to be mined...`);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`\n✅ SUCCESS: App ID updated successfully!`);
      
      // Verify the new App ID
      const newAppID = await oracle.roflAppID();
      console.log(`New App ID in contract (hex): ${newAppID}`);
      
      // Decode the hex to make sure it matches
      let appIdAscii = "";
      for (let i = 2; i < newAppID.length; i += 2) {
        appIdAscii += String.fromCharCode(parseInt(newAppID.substr(i, 2), 16));
      }
      console.log(`New App ID decoded: ${appIdAscii}`);
      
      if (appIdAscii === appIdWithoutPrefix) {
        console.log(`\n✅ VERIFICATION PASSED: App ID set correctly!`);
        console.log(`\nYour matcher should now be able to execute trades!`);
      } else {
        console.log(`\n❌ VERIFICATION FAILED: App ID not set correctly.`);
      }
    } else {
      console.log(`\n❌ ERROR: Transaction failed!`);
    }
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    
    // Check if this is a permission error
    if (error.message.includes("ROFL Auth")) {
      console.log(`\nThis appears to be a permission error. Only the contract admin or existing matcher can update the App ID.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 