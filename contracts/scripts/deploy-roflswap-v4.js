// Script to deploy ROFLSwapV4 contract with the full ROFL app ID
const { ethers } = require("ethers");
require('dotenv').config();

async function main() {
  // Get the contract factory
  const ROFLSwapV4 = await ethers.getContractFactory("ROFLSwapV4");
  
  // Token addresses - use the existing tokens
  const waterTokenAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
  const fireTokenAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";
  
  // Full ROFL app ID (no truncation)
  const roflAppId = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";
  const roflAppIdBytes = ethers.toUtf8Bytes(roflAppId);
  
  console.log(`Deploying ROFLSwapV4 contract with the following parameters:`);
  console.log(`Water Token: ${waterTokenAddress}`);
  console.log(`Fire Token: ${fireTokenAddress}`);
  console.log(`ROFL App ID: ${roflAppId}`);
  
  // Deploy the contract
  console.log("Deploying...");
  const contract = await ROFLSwapV4.deploy(
    waterTokenAddress,
    fireTokenAddress,
    roflAppIdBytes
  );
  
  // Wait for deployment to finish
  await contract.waitForDeployment();
  
  // Get deployed contract address
  const contractAddress = await contract.getAddress();
  console.log(`ROFLSwapV4 deployed to: ${contractAddress}`);
  
  // Save deployment info to a file
  const fs = require('fs');
  const deploymentInfo = {
    network: "sapphire-testnet",
    contractAddress: contractAddress,
    waterToken: waterTokenAddress,
    fireToken: fireTokenAddress,
    roflAppId: roflAppId,
    deployer: await contract.signer.getAddress(),
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(
    "roflswap-v4-deployment-sapphire-testnet.json", 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("Deployment info saved to roflswap-v4-deployment-sapphire-testnet.json");
  console.log("\nDon't forget to update the ROFL app with the new contract address:");
  console.log(`echo -n "${contractAddress}" | oasis rofl secret set ROFLSWAP_ADDRESS -`);
  console.log("oasis rofl update --account myaccount");
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  }); 