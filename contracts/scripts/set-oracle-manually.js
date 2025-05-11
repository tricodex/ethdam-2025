// Script to manually set the oracle address to the one from TEE
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=== SETTING ORACLE ADDRESS MANUALLY ===\n");
  
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
  
  // Get current oracle address
  const currentOracle = await oracle.oracle();
  console.log(`Current Oracle address: ${currentOracle}`);
  
  // Use this prompt to get the TEE oracle address
  // You'll need to run 'oasis rofl machine logs' to find this
  // Look for any mention of an ETH address in the logs
  const teeOracleAddress = "0xF449C755DEc0FA9c655869A3D8D89fb2cCC399e6"; // Currently using existing oracle address
  
  if (!ethers.isAddress(teeOracleAddress)) {
    console.error(`Invalid oracle address: ${teeOracleAddress}`);
    process.exit(1);
  }
  
  console.log(`New Oracle address to set: ${teeOracleAddress}`);
  
  // Check if the oracle address is already correct
  if (currentOracle.toLowerCase() === teeOracleAddress.toLowerCase()) {
    console.log("✅ Oracle address is already set correctly!");
    process.exit(0);
  }
  
  // Set new oracle address
  console.log("\nAttempting to set the oracle address...");
  
  try {
    // We need to be the contract admin or onlyTEE to update this
    // Let's try directly calling the function as the signer
    const tx = await oracle.setOracle(teeOracleAddress);
    console.log(`Transaction submitted: ${tx.hash}`);
    
    // Wait for the transaction to be mined
    console.log(`Waiting for transaction to be mined...`);
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log(`\n✅ SUCCESS: Oracle address updated successfully!`);
      
      // Verify the new oracle address
      const newOracle = await oracle.oracle();
      console.log(`New Oracle address in contract: ${newOracle}`);
      
      if (newOracle.toLowerCase() === teeOracleAddress.toLowerCase()) {
        console.log(`\n✅ VERIFICATION PASSED: Oracle address set correctly!`);
        console.log(`\nYour matcher should now be able to execute trades!`);
      } else {
        console.log(`\n❌ VERIFICATION FAILED: Oracle address not set correctly.`);
      }
    } else {
      console.log(`\n❌ ERROR: Transaction failed!`);
    }
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    
    // Check if this is a permission error
    if (error.message.includes("onlyTEE") || error.message.includes("ROFL Auth")) {
      console.log(`\nThis appears to be a permission error.`);
      console.log(`Only the contract admin or a call from the authorized ROFL app can update the oracle.`);
      console.log(`\nAlternative approaches:`);
      console.log(`1. Deploy a new contract with the correct oracle address and ROFL app ID.`);
      console.log(`2. Use 'oasis rofl machine info' to get machine ID and manually build a ROFL auth message.`);
      console.log(`3. Redeploy the matcher with a new ROFL app ID that matches the one in the contract.`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 