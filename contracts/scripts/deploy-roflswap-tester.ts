import hre from "hardhat";
import { Address } from "viem";

// Address of the deployed ROFLSwapV2 contract
let ROFLSWAP_V2_ADDRESS = "";

async function main() {
  // Read deployment data from file
  try {
    const fs = require('fs');
    const deploymentData = fs.readFileSync(`roflswap-v2-deployment-${hre.network.name}.json`, 'utf8');
    const deployment = JSON.parse(deploymentData);
    ROFLSWAP_V2_ADDRESS = deployment.roflSwapV2;
    console.log(`Found ROFLSwapV2 deployment: ${ROFLSWAP_V2_ADDRESS}`);
  } catch (error) {
    console.error("Deployment file not found or invalid. Please deploy ROFLSwapV2 first.");
    console.error("Run: bun hardhat run scripts/deploy-roflswap-v2.ts --network sapphire-testnet");
    process.exit(1);
  }

  console.log("Deploying ROFLSwapTester to network:", hre.network.name);

  // Get the deployer wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Deploying with account:", deployer.account.address);
  
  // Get account balance
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`Account balance: ${balance} wei (${Number(balance) / 10**18} ETH)`);
  
  try {
    // Deploy ROFLSwapTester
    console.log("Deploying ROFLSwapTester...");
    console.log("Constructor params:", [ROFLSWAP_V2_ADDRESS]);
    
    const testerFactory = await hre.viem.deployContract("ROFLSwapTester", [
      ROFLSWAP_V2_ADDRESS
    ]);
    
    const testerAddress = await testerFactory.address;
    console.log("ROFLSwapTester deployed to:", testerAddress);
    
    // Get contract instance
    const tester = await hre.viem.getContractAt("ROFLSwapTester", testerAddress);
    
    // Verify the linked ROFLSwapV2 address
    const linkedROFLSwap = await tester.read.roflSwap();
    console.log(`Linked ROFLSwapV2 contract: ${linkedROFLSwap}`);
    
    // Write deployment info to file
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      roflSwapV2: ROFLSWAP_V2_ADDRESS,
      roflSwapTester: testerAddress,
      deploymentTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `roflswap-tester-deployment-${hre.network.name}.json`, 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log(`\nDeployment information saved to roflswap-tester-deployment-${hre.network.name}.json`);
    
    console.log("\n🧪 ROFLSwapTester Deployment Completed Successfully! 🧪");
    console.log("You can now use this contract to test the ROFLSwapV2 contract behavior.");
    
  } catch (error) {
    console.error("Error during deployment:", error);
    console.log("Deployment failed. Please check the error message above.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 