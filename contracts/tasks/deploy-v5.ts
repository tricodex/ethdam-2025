import { task } from "hardhat/config";
import fs from "fs";
import "@nomicfoundation/hardhat-ethers";

task("deploy:v5", "Deploy ROFLSwapV5 with private tokens")
  .addOptionalParam("registry", "BalanceRegistry address (if already deployed)")
  .addOptionalParam("water", "Private WATER token address (if already deployed)")
  .addOptionalParam("fire", "Private FIRE token address (if already deployed)")
  .addOptionalParam("appId", "ROFL app ID")
  .setAction(async (taskArgs, hre) => {
    console.log("Deploying ROFLSwapV5 and confidential tokens...");
    const network = hre.network.name;
    const ethers = hre.ethers;
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    
    // 1. Deploy or use existing BalanceRegistry
    let balanceRegistryAddress = taskArgs.registry;
    
    if (!balanceRegistryAddress) {
      try {
        // Try to load from deployment file
        const registryData = JSON.parse(
          fs.readFileSync(`./balance-registry-deployment-${network}.json`, "utf8")
        );
        balanceRegistryAddress = registryData.balanceRegistry;
        console.log(`Using existing BalanceRegistry at: ${balanceRegistryAddress}`);
      } catch (error) {
        console.log("Deploying new BalanceRegistry...");
        
        // Standard multicall address
        const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";
        
        // Deploy the BalanceRegistry
        const BalanceRegistry = await ethers.getContractFactory("ConfidentialBalanceRegistry");
        const balanceRegistry = await BalanceRegistry.deploy(
          deployer.address,  // commiter
          deployer.address,  // owner
          multicallAddress   // multicall
        );
        
        await balanceRegistry.waitForDeployment();
        
        balanceRegistryAddress = await balanceRegistry.getAddress();
        console.log(`ConfidentialBalanceRegistry deployed to: ${balanceRegistryAddress}`);
        
        // Save deployment information
        const deploymentInfo = {
          balanceRegistry: balanceRegistryAddress,
          deployer: deployer.address,
          network: network,
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
          `./balance-registry-deployment-${network}.json`,
          JSON.stringify(deploymentInfo, null, 2)
        );
      }
    }
    
    // 2. Deploy or use existing base tokens
    let waterTokenAddress: string;
    let fireTokenAddress: string;
    
    try {
      // Try to load from existing deployment
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v4-deployment-${network}.json`, "utf8")
      );
      waterTokenAddress = deploymentData.waterToken;
      fireTokenAddress = deploymentData.fireToken;
      console.log(`Using existing tokens: WATER=${waterTokenAddress}, FIRE=${fireTokenAddress}`);
    } catch (error) {
      console.log("Deploying new base tokens...");
      
      // Deploy WATER token
      const WaterToken = await ethers.getContractFactory("WaterToken");
      const waterToken = await WaterToken.deploy();
      await waterToken.waitForDeployment();
      waterTokenAddress = await waterToken.getAddress();
      console.log(`WATER token deployed to: ${waterTokenAddress}`);
      
      // Deploy FIRE token
      const FireToken = await ethers.getContractFactory("FireToken");
      const fireToken = await FireToken.deploy();
      await fireToken.waitForDeployment();
      fireTokenAddress = await fireToken.getAddress();
      console.log(`FIRE token deployed to: ${fireTokenAddress}`);
    }
    
    // 3. Deploy or use existing private token wrappers
    let privateWaterTokenAddress = taskArgs.water;
    let privateFireTokenAddress = taskArgs.fire;
    
    if (!privateWaterTokenAddress || !privateFireTokenAddress) {
      try {
        // Try to load from deployment file
        const privateTokensData = JSON.parse(
          fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
        );
        privateWaterTokenAddress = privateTokensData.privateWaterToken;
        privateFireTokenAddress = privateTokensData.privateFireToken;
        console.log(`Using existing private tokens: WATER=${privateWaterTokenAddress}, FIRE=${privateFireTokenAddress}`);
      } catch (error) {
        console.log("Deploying new private token wrappers...");
        
        // Standard Multicall address
        const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";
        
        // Deploy PrivateWrapper for WATER
        const PrivateWrapper = await ethers.getContractFactory("PrivateWrapper");
        
        console.log("Deploying Private WATER token wrapper...");
        const privateWaterToken = await PrivateWrapper.deploy(
          waterTokenAddress,
          multicallAddress,
          balanceRegistryAddress
        );
        await privateWaterToken.waitForDeployment();
        privateWaterTokenAddress = await privateWaterToken.getAddress();
        console.log(`Private WATER token deployed to: ${privateWaterTokenAddress}`);
        
        // Deploy PrivateWrapper for FIRE
        console.log("Deploying Private FIRE token wrapper...");
        const privateFireToken = await PrivateWrapper.deploy(
          fireTokenAddress,
          multicallAddress,
          balanceRegistryAddress
        );
        await privateFireToken.waitForDeployment();
        privateFireTokenAddress = await privateFireToken.getAddress();
        console.log(`Private FIRE token deployed to: ${privateFireTokenAddress}`);
        
        // Save deployment information
        const deploymentInfo = {
          balanceRegistry: balanceRegistryAddress,
          baseWaterToken: waterTokenAddress,
          baseFireToken: fireTokenAddress,
          privateWaterToken: privateWaterTokenAddress,
          privateFireToken: privateFireTokenAddress,
          deployer: deployer.address,
          network: network,
          timestamp: new Date().toISOString()
        };
        
        fs.writeFileSync(
          `./private-tokens-deployment-${network}.json`,
          JSON.stringify(deploymentInfo, null, 2)
        );
      }
    }
    
    // 4. Deploy ROFLSwapV5
    // Get the ROFL App ID from environment, args, or config
    let roflAppId = taskArgs.appId || process.env.ROFL_APP_ID;
    
    if (!roflAppId) {
      console.log("ROFL_APP_ID not provided. Using default placeholder.");
      roflAppId = "rofl1placeholder000000000000000000000000000000000";
    }
    
    // Convert ROFL app ID to bytes format
    const roflAppIdBytes = ethers.toUtf8Bytes(roflAppId);
    console.log(`Using ROFL App ID: ${roflAppId}`);
    
    // Deploy the contract
    console.log("Deploying ROFLSwapV5...");
    const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
    const roflSwap = await ROFLSwapV5.deploy(
      privateWaterTokenAddress,
      privateFireTokenAddress,
      roflAppIdBytes
    );
    
    await roflSwap.waitForDeployment();
    
    const roflSwapAddress = await roflSwap.getAddress();
    console.log(`ROFLSwapV5 deployed to: ${roflSwapAddress}`);
    
    // Request privacy access after deployment
    console.log("Requesting privacy access to token contracts...");
    try {
      const tx = await roflSwap.requestPrivacyAccess();
      await tx.wait();
      console.log("Privacy access requested successfully");
    } catch (error) {
      console.error("Error requesting privacy access:", error);
      console.log("You may need to call requestPrivacyAccess() manually after deployment");
    }
    
    // Save deployment information
    const deploymentInfo = {
      roflSwapV5: roflSwapAddress,
      privateWaterToken: privateWaterTokenAddress,
      privateFireToken: privateFireTokenAddress,
      roflAppId,
      deployer: deployer.address,
      network: network,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `./roflswap-v5-deployment-${network}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to file.");
    console.log("\nDeployment complete!");
    
    return {
      balanceRegistry: balanceRegistryAddress,
      privateWaterToken: privateWaterTokenAddress,
      privateFireToken: privateFireTokenAddress,
      roflSwapV5: roflSwapAddress
    };
  });

// Add a task for approving tokens
task("approve:v5", "Approve private tokens for ROFLSwapV5")
  .addParam("token", "Token type: 'water' or 'fire'")
  .addOptionalParam("contract", "ROFLSwapV5 contract address")
  .addOptionalParam("amount", "Amount to approve (default: unlimited)")
  .setAction(async (taskArgs, hre) => {
    const network = hre.network.name;
    const ethers = hre.ethers;
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Get contract address
    let roflSwapAddress = taskArgs.contract;
    if (!roflSwapAddress) {
      try {
        const deploymentData = JSON.parse(
          fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
        );
        roflSwapAddress = deploymentData.roflSwapV5;
        console.log(`Using ROFLSwapV5 address from deployment file: ${roflSwapAddress}`);
      } catch (error) {
        console.error("ROFLSwapV5 address not provided and no deployment file found.");
        throw error;
      }
    }
    
    // Get token address based on type
    let tokenAddress: string;
    let tokenType = taskArgs.token.toLowerCase();
    
    try {
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
      );
      
      if (tokenType === "water") {
        tokenAddress = deploymentData.privateWaterToken;
        console.log(`Using Water token: ${tokenAddress}`);
      } else if (tokenType === "fire") {
        tokenAddress = deploymentData.privateFireToken;
        console.log(`Using Fire token: ${tokenAddress}`);
      } else {
        throw new Error("Invalid token type. Use 'water' or 'fire'");
      }
    } catch (error) {
      console.error("Error loading token addresses:", error);
      throw error;
    }
    
    // Amount to approve
    let amount = taskArgs.amount ? ethers.parseEther(taskArgs.amount) : ethers.MaxUint256;
    console.log(`Approving ${amount === ethers.MaxUint256 ? "unlimited" : ethers.formatEther(amount)} tokens`);
    
    // Load the token contract
    const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
    const token = PrivateERC20.attach(tokenAddress);
    
    // Check current allowance
    try {
      const currentAllowance = await token.allowance(signer.address, roflSwapAddress);
      console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} tokens`);
    } catch (error) {
      console.log("Could not check current allowance:", error);
    }
    
    // Approve tokens
    console.log(`Approving tokens for ROFLSwapV5...`);
    const tx = await token.approve(roflSwapAddress, amount);
    console.log(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    
    // Check new allowance
    try {
      const newAllowance = await token.allowance(signer.address, roflSwapAddress);
      console.log(`New allowance: ${ethers.formatEther(newAllowance)} tokens`);
    } catch (error) {
      console.log("Could not check new allowance:", error);
    }
    
    console.log("Token approval completed successfully");
  }); 