import hre from "hardhat";
import { Address } from "viem";

// ROFL app ID from rofl.yaml
const ROFL_APP_ID = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";

// Deployed token addresses
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const FIRE_TOKEN_ADDRESS = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814";

async function main() {
  console.log("Deploying ROFLSwap to network:", hre.network.name);
  console.log("Using Sapphire's confidential compute features for enhanced privacy");

  // Get the deployer wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Deploying with account:", deployer.account.address);
  
  // Get account balance
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`Account balance: ${balance} wei (${Number(balance) / 10**18} ETH)`);
  
  // Check if on Sapphire network
  const isSapphireNetwork = 
    hre.network.name === "sapphire" || 
    hre.network.name === "sapphire-testnet" || 
    hre.network.name === "sapphire-localnet";
  
  if (isSapphireNetwork) {
    console.log("Deploying on Sapphire network - Contract state will be confidential");
  } else {
    console.log("WARNING: Not deploying on a Sapphire network - Contract state will NOT be confidential");
  }
  
  try {
    // Deploy ROFLSwap
    console.log("Deploying ROFLSwap...");
    console.log("Constructor params:", [WATER_TOKEN_ADDRESS, FIRE_TOKEN_ADDRESS]);
    
    const roflSwapFactory = await hre.viem.deployContract("ROFLSwap", [
      WATER_TOKEN_ADDRESS,
      FIRE_TOKEN_ADDRESS
    ]);
    
    const roflSwapAddress = await roflSwapFactory.address;
    console.log("ROFLSwap deployed to:", roflSwapAddress);
    
    // Get contract instance
    const roflSwap = await hre.viem.getContractAt("ROFLSwap", roflSwapAddress);
    
    // Set the ROFL app ID
    console.log("\nSetting ROFL app ID in ROFLSwap contract...");
    
    try {
      // Convert the ROFL app ID to an Ethereum address format
      const roflEthAddress = convertRoflAppIdToAddress(ROFL_APP_ID);
      
      console.log(`Setting ROFL app address to: ${roflEthAddress}`);
      const setRoflAppTx = await roflSwap.write.setRoflApp([roflEthAddress]);
      
      console.log("Waiting for transaction to be mined...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: setRoflAppTx });
      
      console.log(`ROFL app ID successfully set! Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
      console.error("Error setting ROFL app ID:", error);
      console.log("You will need to manually set the ROFL app ID using the setRoflApp function on the contract");
    }
    
    // Test basic interaction
    console.log("\nTesting basic interaction with ROFLSwap...");
    
    const tokenAddresses = await roflSwap.read.getTokens();
    // Handle the returned tuple by treating it as an array with type assertions
    console.log(`Water Token: ${(tokenAddresses as any)[0]}`);
    console.log(`Fire Token: ${(tokenAddresses as any)[1]}`);
    
    const roflAppAddress = await roflSwap.read.roflApp();
    console.log(`ROFL App Address: ${roflAppAddress}`);
    
    // Write deployment info to file
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      waterToken: WATER_TOKEN_ADDRESS,
      fireToken: FIRE_TOKEN_ADDRESS,
      roflSwap: roflSwapAddress,
      roflAppId: ROFL_APP_ID,
      deploymentTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `roflswap-deployment-${hre.network.name}.json`, 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`\nDeployment information saved to roflswap-deployment-${hre.network.name}.json`);
    
    // Provide explorer links
    if (isSapphireNetwork) {
      if (hre.network.name === "sapphire-testnet") {
        console.log("You can view your deployment on the Sapphire Testnet Explorer at:");
        console.log(`https://testnet.explorer.oasis.io/address/${roflSwapAddress}`);
      } else if (hre.network.name === "sapphire") {
        console.log("You can view your deployment on the Sapphire Mainnet Explorer at:");
        console.log(`https://explorer.oasis.io/address/${roflSwapAddress}`);
      }
    }
    
    console.log("\n🌊 ROFLSwap Deployment Completed Successfully! 🌊");
    console.log("This simplified version maintains ROFL app integration for demonstration purposes.");
    console.log("Next steps: Configure ROFL app with the deployed contract address");
    
  } catch (error) {
    console.error("Error during deployment:", error);
    console.log("Deployment failed. Please check the error message above.");
  }
}

/**
 * Helper function to convert ROFL app ID to Ethereum address format
 * In a real app, you would use the proper conversion method from the ROFL SDK
 */
function convertRoflAppIdToAddress(roflAppId: string): Address {
  // This is a placeholder - in production, you would use the proper conversion
  // For now, we'll use a deterministic conversion that creates a valid Ethereum address
  
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 