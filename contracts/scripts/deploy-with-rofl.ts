import hre from "hardhat";
import { Address } from "viem";

// ROFL app ID from rofl.yaml
const ROFL_APP_ID = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";

async function main() {
  console.log("Deploying OceanSwap and tokens to network:", hre.network.name);
  console.log("Using Sapphire's confidential compute features for enhanced privacy");

  // Check if we have a private key
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Deploying with account:", deployer.account.address);

  // Deploy WaterToken
  console.log("Deploying WaterToken...");
  const waterTokenFactory = await hre.viem.deployContract("WaterToken");
  const waterTokenAddress = await waterTokenFactory.address;
  console.log("WaterToken deployed to:", waterTokenAddress);
  
  // Deploy FireToken
  console.log("Deploying FireToken...");
  const fireTokenFactory = await hre.viem.deployContract("FireToken");
  const fireTokenAddress = await fireTokenFactory.address;
  console.log("FireToken deployed to:", fireTokenAddress);

  // Check if on Sapphire network (mainnet or testnet)
  const isSapphireNetwork = 
    hre.network.name === "sapphire" || 
    hre.network.name === "sapphire-testnet" || 
    hre.network.name === "sapphire-localnet";
  
  if (isSapphireNetwork) {
    console.log("Deploying on Sapphire network - Contract state will be confidential");
  } else {
    console.log("WARNING: Not deploying on a Sapphire network - Contract state will NOT be confidential");
  }

  // Using the deployer address as multicall for now - in production should use a proper multicall address
  const multicallAddress = deployer.account.address;
  
  // Deploy OceanSwap with more debug info
  console.log("Deploying OceanSwap...");
  console.log("Constructor params:", [waterTokenAddress, fireTokenAddress, multicallAddress]);
  
  try {
    // Get the public client for more information
    const publicClient = await hre.viem.getPublicClient();
    
    // Check account balance before deployment
    const balance = await publicClient.getBalance({ address: deployer.account.address });
    console.log(`Deployer balance: ${balance} wei`);
    
    // Deploy without special parameters to avoid compatibility issues
    const oceanSwapFactory = await hre.viem.deployContract("OceanSwap", [
      waterTokenAddress,
      fireTokenAddress,
      multicallAddress
    ]);
    
    const oceanSwapAddress = await oceanSwapFactory.address;
    console.log("OceanSwap deployed to:", oceanSwapAddress);
    
    // Get private token addresses
    const oceanSwap = await hre.viem.getContractAt("OceanSwap", oceanSwapAddress);
    const privateTokens = await oceanSwap.read.getPrivateTokens();
    const pWaterTokenAddress = privateTokens[0];
    const pFireTokenAddress = privateTokens[1];
    
    console.log("Private Water Token deployed to:", pWaterTokenAddress);
    console.log("Private Fire Token deployed to:", pFireTokenAddress);
    
    // Set the ROFL app ID in the OceanSwap contract
    console.log("\nSetting ROFL app ID in OceanSwap contract...");
    
    try {
      // Convert the ROFL app ID to an Ethereum address format
      // This function takes the bech32 encoded ROFL app ID and converts it to an Ethereum address
      // For this demo, we're using a placeholder function - in a real app you'd use a proper conversion
      const roflEthAddress = convertRoflAppIdToAddress(ROFL_APP_ID);
      
      console.log(`Setting ROFL app address to: ${roflEthAddress}`);
      const setRoflAppTx = await oceanSwap.write.setRoflApp([roflEthAddress]);
      
      // Wait for the transaction to be mined
      console.log("Waiting for ROFL app ID transaction to be mined...");
      const receipt = await publicClient.waitForTransactionReceipt({ hash: setRoflAppTx });
      
      console.log(`ROFL app ID successfully set! Transaction hash: ${receipt.transactionHash}`);
    } catch (error) {
      console.error("Error setting ROFL app ID:", error);
      console.log("You will need to manually set the ROFL app ID using the setRoflApp function on the contract");
    }
    
    console.log("\nDeployment complete on " + hre.network.name + "!");
    console.log("");
    
    console.log("Contract Addresses:");
    console.log("------------------");
    console.log("WaterToken:", waterTokenAddress);
    console.log("FireToken:", fireTokenAddress);
    console.log("OceanSwap:", oceanSwapAddress);
    console.log("PrivateWaterToken:", pWaterTokenAddress);
    console.log("PrivateFireToken:", pFireTokenAddress);
    
    // Write addresses to a file for easy reference
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      waterToken: waterTokenAddress,
      fireToken: fireTokenAddress,
      oceanSwap: oceanSwapAddress,
      pWaterToken: pWaterTokenAddress,
      pFireToken: pFireTokenAddress,
      roflAppId: ROFL_APP_ID,
      deploymentTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `deployment-${hre.network.name}.json`, 
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`\nDeployment information saved to deployment-${hre.network.name}.json`);
    
    // For Sapphire, explain where to view the transactions
    if (isSapphireNetwork) {
      console.log("\nContract verification is not available on Sapphire networks.");
      if (hre.network.name === "sapphire-testnet") {
        console.log("You can view your transactions on the Sapphire Testnet Explorer at https://testnet.explorer.oasis.io/address/" + oceanSwapAddress);
      } else if (hre.network.name === "sapphire") {
        console.log("You can view your transactions on the Sapphire Mainnet Explorer at https://explorer.oasis.io/address/" + oceanSwapAddress);
      }
    // For non-Sapphire networks, do verification
    } else if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
      console.log("\nWaiting for block explorer to index contracts...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log("Verifying contracts on block explorer...");
      
      try {
        console.log("Verifying WaterToken...");
        await hre.run("verify:verify", {
          address: waterTokenAddress,
          constructorArguments: [],
        });
        
        console.log("Verifying FireToken...");
        await hre.run("verify:verify", {
          address: fireTokenAddress,
          constructorArguments: [],
        });
        
        console.log("Verifying OceanSwap...");
        await hre.run("verify:verify", {
          address: oceanSwapAddress,
          constructorArguments: [
            waterTokenAddress,
            fireTokenAddress,
            multicallAddress
          ],
        });
        
        // Note: Verification of Private Tokens is more complex due to being deployed by OceanSwap
        console.log("Private token verification is a bit more complex and will be handled manually if needed.");
        
      } catch (error) {
        console.error("Error verifying contracts:", error);
      }
    }
  } catch (error) {
    console.error("Error deploying OceanSwap:", error);
    
    // Let's check if we need to debug contract deployment issues
    console.log("\nChecking for existing deployments of WaterToken and FireToken...");
    
    // If WaterToken and FireToken were deployed, let's try to interact with them
    if (waterTokenAddress && fireTokenAddress) {
      try {
        const waterToken = await hre.viem.getContractAt("WaterToken", waterTokenAddress);
        const fireToken = await hre.viem.getContractAt("FireToken", fireTokenAddress);
        
        const waterSymbol = await waterToken.read.symbol();
        const fireSymbol = await fireToken.read.symbol();
        
        console.log(`Successfully connected to ${waterSymbol} at ${waterTokenAddress}`);
        console.log(`Successfully connected to ${fireSymbol} at ${fireTokenAddress}`);
        
        console.log("\nYou can try deploying OceanSwap again with these token addresses");
      } catch (tokenError) {
        console.error("Error connecting to tokens:", tokenError);
      }
    }
    
    // Provide some guidance
    console.log("\nDeployment troubleshooting tips:");
    console.log("1. Check your wallet balance on the network");
    console.log("2. Ensure your network is correctly configured in hardhat.config.ts");
    console.log("3. The OceanSwap contract may be too large - try simplifying it or use a contract splitter pattern");
    console.log("4. Check that all dependencies are correctly imported and compiled");
  }
  
  console.log("\n🌊 OceanSwap Deployment Process Completed! 🌊");
  console.log("Next steps: Configure ROFL app with the deployed contract addresses");
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