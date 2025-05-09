import hre from "hardhat";
import { getAddress } from "viem";

async function main() {
  console.log("Deploying OceanSwap and tokens to network:", hre.network.name);
  console.log("Using Sapphire's confidential compute features for enhanced privacy");

  // Deploy WaterToken
  console.log("Deploying WaterToken...");
  const waterTokenFactory = await hre.viem.deployContract("WaterToken");
  const waterTokenAddress = getAddress(await waterTokenFactory.getAddress());
  console.log("WaterToken deployed to:", waterTokenAddress);
  
  // Deploy FireToken
  console.log("Deploying FireToken...");
  const fireTokenFactory = await hre.viem.deployContract("FireToken");
  const fireTokenAddress = getAddress(await fireTokenFactory.getAddress());
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
  const [deployer] = await hre.viem.getWalletClients();
  const multicallAddress = deployer.account.address;
  
  // Deploy OceanSwap
  console.log("Deploying OceanSwap...");
  const oceanSwapFactory = await hre.viem.deployContract("OceanSwap", [
    waterTokenAddress,
    fireTokenAddress,
    multicallAddress
  ]);
  const oceanSwapAddress = getAddress(await oceanSwapFactory.getAddress());
  console.log("OceanSwap deployed to:", oceanSwapAddress);
  
  // Get private token addresses
  const oceanSwap = await hre.viem.getContractAt("OceanSwap", oceanSwapAddress);
  const privateTokens = await oceanSwap.read.getPrivateTokens();
  const pWaterTokenAddress = getAddress(privateTokens[0]);
  const pFireTokenAddress = getAddress(privateTokens[1]);
  
  console.log("Private Water Token deployed to:", pWaterTokenAddress);
  console.log("Private Fire Token deployed to:", pFireTokenAddress);
  
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
  
  console.log("\n🌊 OceanSwap Deployment Completed Successfully! 🌊");
  console.log("Next steps: Configure ROFL app with the deployed contract addresses");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
