// Mint WATER and FIRE tokens for testing
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Minting tokens for testing...");
  
  // Get amount from command line or use default
  const amount = process.env.AMOUNT ? ethers.parseEther(process.env.AMOUNT) : ethers.parseEther("100.0");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // The network needs to be explicitly set in the command line with --network
  if (hre.network.name === "hardhat") {
    console.log(`Warning: You are using the default 'hardhat' network.`);
    console.log(`Please specify the network using --network sapphire-testnet`);
    return;
  }
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Load deployment information
  let privateWaterTokenAddress, privateFireTokenAddress;
  try {
    const deploymentFilePath = `./roflswap-oracle-deployment-${networkName}.json`;
    console.log(`Loading deployment from: ${deploymentFilePath}`);
    
    if (!fs.existsSync(deploymentFilePath)) {
      throw new Error(`Deployment file not found: ${deploymentFilePath}`);
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath));
    privateWaterTokenAddress = deploymentData.privateWaterToken;
    privateFireTokenAddress = deploymentData.privateFireToken;
    console.log(`WATER Token: ${privateWaterTokenAddress}`);
    console.log(`FIRE Token: ${privateFireTokenAddress}`);
  } catch (error) {
    console.error("Failed to load deployment information:", error.message);
    throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
  }
  
  // Get contract instances
  const waterToken = await ethers.getContractAt("PrivateERC20", privateWaterTokenAddress);
  const fireToken = await ethers.getContractAt("PrivateERC20", privateFireTokenAddress);
  
  try {
    // Check current balances
    const waterBalance = await waterToken.balanceOf(signer.address);
    const fireBalance = await fireToken.balanceOf(signer.address);
    
    console.log(`Current WATER balance: ${ethers.formatEther(waterBalance)}`);
    console.log(`Current FIRE balance: ${ethers.formatEther(fireBalance)}`);
    
    // Mint tokens
    console.log(`Minting ${ethers.formatEther(amount)} WATER tokens...`);
    let tx = await waterToken.mint(signer.address, amount);
    await tx.wait();
    
    console.log(`Minting ${ethers.formatEther(amount)} FIRE tokens...`);
    tx = await fireToken.mint(signer.address, amount);
    await tx.wait();
    
    // Check new balances
    const newWaterBalance = await waterToken.balanceOf(signer.address);
    const newFireBalance = await fireToken.balanceOf(signer.address);
    
    console.log(`New WATER balance: ${ethers.formatEther(newWaterBalance)}`);
    console.log(`New FIRE balance: ${ethers.formatEther(newFireBalance)}`);
    
    console.log("✅ Tokens minted successfully!");
  } catch (error) {
    console.error("Error minting tokens:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 