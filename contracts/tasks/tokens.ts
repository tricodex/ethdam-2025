import { task } from "hardhat/config";
import { parseEther } from "ethers";

task("deploy-mock-tokens", "Deploy mock ERC20 tokens for testing")
  .setAction(async (_, hre) => {
    console.log("Deploying mock tokens for testing...");
    
    // Get the signer
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    
    // Deploy Water token
    const WaterToken = await hre.ethers.getContractFactory("MockToken");
    const waterToken = await WaterToken.deploy("Water Token", "WATER", parseEther("1000000"));
    await waterToken.waitForDeployment();
    const waterTokenAddress = await waterToken.getAddress();
    
    // Deploy Fire token
    const FireToken = await hre.ethers.getContractFactory("MockToken");
    const fireToken = await FireToken.deploy("Fire Token", "FIRE", parseEther("1000000"));
    await fireToken.waitForDeployment();
    const fireTokenAddress = await fireToken.getAddress();
    
    console.log(`Water Token (WATER) deployed to: ${waterTokenAddress}`);
    console.log(`Fire Token (FIRE) deployed to: ${fireTokenAddress}`);
    
    // Save the deployment to a file
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      waterToken: waterTokenAddress,
      fireToken: fireTokenAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    };
    
    const fileName = `tokens-deployment-${hre.network.name}.json`;
    fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment information saved to ${fileName}`);
    
    return {
      waterToken: waterTokenAddress,
      fireToken: fireTokenAddress
    };
  });

export {};
