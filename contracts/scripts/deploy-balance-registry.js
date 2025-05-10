// Script for deploying the ConfidentialBalanceRegistry contract
const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ConfidentialBalanceRegistry...");
  
  // Get the contract factory
  const BalanceRegistry = await ethers.getContractFactory("ConfidentialBalanceRegistry");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Deploy with parameters:
  // - commiter (we'll use the deployer for now)
  // - owner (the deployer)
  // - multicall address (hardcoded to the standard address on most chains)
  const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";
  
  const balanceRegistry = await BalanceRegistry.deploy(
    deployer.address,  // commiter
    deployer.address,  // owner
    multicallAddress   // multicall
  );
  
  await balanceRegistry.waitForDeployment();
  
  const balanceRegistryAddress = await balanceRegistry.getAddress();
  console.log(`ConfidentialBalanceRegistry deployed to: ${balanceRegistryAddress}`);
  
  // Save deployment information to a file
  const fs = require("fs");
  const deploymentInfo = {
    balanceRegistry: balanceRegistryAddress,
    deployer: deployer.address,
    network: hre.network.name,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    `./balance-registry-deployment-${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment information saved to file.");
  
  return balanceRegistryAddress;
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
