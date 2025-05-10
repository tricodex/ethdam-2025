// Script for deploying private versions of WATER and FIRE tokens
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Deploying Private Token Wrappers...");
  
  // Get the contract factories
  const PrivateWrapper = await ethers.getContractFactory("PrivateWrapper");
  const WaterToken = await ethers.getContractFactory("WaterToken");
  const FireToken = await ethers.getContractFactory("FireToken");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Try to load the balance registry address from the deployment file
  let balanceRegistryAddress;
  try {
    const deploymentData = JSON.parse(
      fs.readFileSync(`./balance-registry-deployment-${hre.network.name}.json`)
    );
    balanceRegistryAddress = deploymentData.balanceRegistry;
    console.log(`Using BalanceRegistry at: ${balanceRegistryAddress}`);
  } catch (error) {
    console.log("BalanceRegistry deployment file not found. Please deploy the BalanceRegistry first.");
    console.log("You can provide the address as an argument if you have it elsewhere.");
    console.log("For example: npx hardhat run scripts/deploy-private-tokens.js --network sapphire-testnet -- --registry 0x123...");
    
    // Check if registry address is provided as an argument
    const args = process.argv.slice(2);
    const registryIndex = args.indexOf("--registry");
    if (registryIndex !== -1 && args.length > registryIndex + 1) {
      balanceRegistryAddress = args[registryIndex + 1];
      console.log(`Using provided BalanceRegistry at: ${balanceRegistryAddress}`);
    } else {
      throw new Error("BalanceRegistry address is required");
    }
  }
  
  // Standard Multicall address
  const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";
  
  // Deploy the base tokens first (if they don't exist already)
  let waterTokenAddress, fireTokenAddress;
  
  // Check if we have existing ROFLSwap deployment with token addresses
  try {
    const deploymentData = JSON.parse(
      fs.readFileSync(`./roflswap-v4-deployment-${hre.network.name}.json`)
    );
    waterTokenAddress = deploymentData.waterToken;
    fireTokenAddress = deploymentData.fireToken;
    console.log(`Using existing tokens: WATER=${waterTokenAddress}, FIRE=${fireTokenAddress}`);
  } catch (error) {
    console.log("No existing ROFLSwap deployment found. Deploying new base tokens...");
    
    // Deploy WATER token
    const waterToken = await WaterToken.deploy();
    await waterToken.waitForDeployment();
    waterTokenAddress = await waterToken.getAddress();
    console.log(`WATER token deployed to: ${waterTokenAddress}`);
    
    // Deploy FIRE token
    const fireToken = await FireToken.deploy();
    await fireToken.waitForDeployment();
    fireTokenAddress = await fireToken.getAddress();
    console.log(`FIRE token deployed to: ${fireTokenAddress}`);
  }
  
  // Deploy private wrapper for WATER token
  console.log("Deploying Private WATER token wrapper...");
  const privateWaterToken = await PrivateWrapper.deploy(
    waterTokenAddress,
    multicallAddress,
    balanceRegistryAddress
  );
  await privateWaterToken.waitForDeployment();
  const privateWaterAddress = await privateWaterToken.getAddress();
  console.log(`Private WATER token deployed to: ${privateWaterAddress}`);
  
  // Deploy private wrapper for FIRE token
  console.log("Deploying Private FIRE token wrapper...");
  const privateFireToken = await PrivateWrapper.deploy(
    fireTokenAddress,
    multicallAddress,
    balanceRegistryAddress
  );
  await privateFireToken.waitForDeployment();
  const privateFireAddress = await privateFireToken.getAddress();
  console.log(`Private FIRE token deployed to: ${privateFireAddress}`);
  
  // Save deployment information to a file
  const deploymentInfo = {
    balanceRegistry: balanceRegistryAddress,
    baseWaterToken: waterTokenAddress,
    baseFireToken: fireTokenAddress,
    privateWaterToken: privateWaterAddress,
    privateFireToken: privateFireAddress,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `./private-tokens-deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment information saved to file.");
  
  return {
    privateWaterToken: privateWaterAddress,
    privateFireToken: privateFireAddress
  };
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
