import hre from "hardhat";
import { Address } from "viem";
import fs from "fs";

/**
 * Helper function to convert ROFL app ID to Ethereum address format
 */
function convertRoflAppIdToAddress(roflAppId: string): Address {
  // This is a simplified conversion that creates a valid Ethereum address from a ROFL app ID
  // In a production environment, use the proper conversion function from the ROFL SDK
  
  // Get the last part of the bech32 address (after the last '1')
  const parts = roflAppId.split('1');
  const lastPart = parts[parts.length - 1];
  
  // Create a simple hash of the last part
  let hash = 0;
  for (let i = 0; i < lastPart.length; i++) {
    const char = lastPart.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create a hex string from the hash and pad to 20 bytes (40 hex chars)
  let hexString = Math.abs(hash).toString(16);
  hexString = hexString.padStart(40, '0');
  
  // Return as Ethereum address
  return `0x${hexString}` as Address;
}

async function main() {
  // Read command line arguments
  const args = process.argv.slice(2);
  let roflAppId = "";
  let oceanSwapAddress = "";
  
  if (args.length < 1) {
    console.log("No ROFL App ID provided. Checking for rofl.yaml file...");
    
    try {
      // Try to read from rofl.yaml in the parent directory (rofl_app)
      const yamlContent = fs.readFileSync('../rofl_app/rofl.yaml', 'utf8');
      const appIdMatch = yamlContent.match(/app_id:\s*([^\s]+)/);
      
      if (appIdMatch && appIdMatch[1]) {
        roflAppId = appIdMatch[1];
        console.log(`Found ROFL App ID in rofl.yaml: ${roflAppId}`);
      } else {
        throw new Error("Could not find app_id in rofl.yaml");
      }
    } catch (error) {
      console.error("Error reading rofl.yaml:", error);
      console.log("Please provide a ROFL App ID as an argument");
      console.log("Usage: bunx hardhat run scripts/set-rofl-app.ts --network sapphire-testnet <roflAppId> [oceanSwapAddress]");
      process.exit(1);
    }
  } else {
    roflAppId = args[0];
  }
  
  // If OceanSwap address is provided as second argument, use it
  if (args.length >= 2) {
    oceanSwapAddress = args[1];
  } else {
    console.log("No OceanSwap address provided. Checking for deployment file...");
    
    try {
      // Try to read from deployment JSON file
      const deploymentFile = `deployment-${hre.network.name}.json`;
      const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      
      if (deploymentData.oceanSwap) {
        oceanSwapAddress = deploymentData.oceanSwap;
        console.log(`Found OceanSwap address in ${deploymentFile}: ${oceanSwapAddress}`);
      } else {
        throw new Error("Could not find oceanSwap address in deployment file");
      }
    } catch (error) {
      console.error("Error reading deployment file:", error);
      console.log("Please provide an OceanSwap address as the second argument");
      console.log("Usage: bunx hardhat run scripts/set-rofl-app.ts --network sapphire-testnet <roflAppId> <oceanSwapAddress>");
      process.exit(1);
    }
  }
  
  console.log(`Setting ROFL App ID ${roflAppId} in OceanSwap contract at ${oceanSwapAddress}...`);
  
  // Convert ROFL App ID to Ethereum address format
  const roflEthAddress = convertRoflAppIdToAddress(roflAppId);
  console.log(`Converted ROFL App ID to Ethereum address: ${roflEthAddress}`);
  
  // Get the OceanSwap contract
  const oceanSwap = await hre.viem.getContractAt("OceanSwap", oceanSwapAddress);
  
  // Set the ROFL App ID
  try {
    const tx = await oceanSwap.write.setRoflApp([roflEthAddress]);
    
    // Get the public client
    const publicClient = await hre.viem.getPublicClient();
    
    // Wait for the transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    
    console.log(`Successfully set ROFL App ID in OceanSwap contract!`);
    console.log(`Transaction hash: ${receipt.transactionHash}`);
    
    // Update the deployment file with the ROFL App ID
    try {
      const deploymentFile = `deployment-${hre.network.name}.json`;
      const deploymentData = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
      
      deploymentData.roflAppId = roflAppId;
      deploymentData.roflEthAddress = roflEthAddress;
      
      fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
      console.log(`Updated ${deploymentFile} with ROFL App ID information`);
    } catch (error) {
      console.error("Error updating deployment file:", error);
    }
    
  } catch (error) {
    console.error("Error setting ROFL App ID:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 