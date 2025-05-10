// Script for approving PrivateERC20 tokens for the ROFLSwapV5 contract
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Approving PrivateERC20 tokens for ROFLSwapV5...");
  
  // Get command line arguments
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let roflSwapAddress = null;
  let tokenAddress = null;
  let amount = ethers.parseEther("1000");  // Default: 1000 tokens
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--contract" && i + 1 < args.length) {
      roflSwapAddress = args[i + 1];
      i++;
    } else if (args[i] === "--token" && i + 1 < args.length) {
      tokenAddress = args[i + 1];
      i++;
    } else if (args[i] === "--amount" && i + 1 < args.length) {
      amount = ethers.parseEther(args[i + 1]);
      i++;
    } else if (args[i] === "--all") {
      // Set max uint256 value
      amount = ethers.MaxUint256;
      console.log("Using maximum approval amount (unlimited)");
    } else if (args[i] === "--water") {
      // Flag to use water token from deployment
      tokenAddress = "water";
    } else if (args[i] === "--fire") {
      // Flag to use fire token from deployment
      tokenAddress = "fire";
    }
  }
  
  // Check if contract address provided
  if (!roflSwapAddress) {
    try {
      // Try to load from deployment file
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${hre.network.name}.json`)
      );
      roflSwapAddress = deploymentData.roflSwapV5;
      console.log(`Using ROFLSwapV5 address from deployment file: ${roflSwapAddress}`);
    } catch (error) {
      console.error("ROFLSwapV5 address not provided and no deployment file found.");
      console.error("Please provide the contract address with --contract");
      process.exit(1);
    }
  }
  
  // Check if token address provided directly or via flag
  if (tokenAddress === "water" || tokenAddress === "fire") {
    try {
      // Try to load from deployment file
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${hre.network.name}.json`)
      );
      if (tokenAddress === "water") {
        tokenAddress = deploymentData.privateWaterToken;
      } else {
        tokenAddress = deploymentData.privateFireToken;
      }
      console.log(`Using ${tokenAddress === "water" ? "water" : "fire"} token from deployment: ${tokenAddress}`);
    } catch (error) {
      console.error("Could not load token address from deployment file.");
      console.error("Please provide the token address directly with --token");
      process.exit(1);
    }
  } else if (!tokenAddress) {
    console.error("Token address not provided.");
    console.error("Please provide the token address with --token or use --water or --fire");
    process.exit(1);
  }
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Load the PrivateERC20 contract
  const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
  const token = PrivateERC20.attach(tokenAddress);
  
  // Check token info
  let tokenSymbol, tokenName;
  try {
    tokenSymbol = await token.symbol();
    tokenName = await token.name();
    console.log(`Token: ${tokenName} (${tokenSymbol})`);
  } catch (error) {
    console.log("Could not get token info, continuing anyway");
  }
  
  // Check current allowance
  let currentAllowance;
  try {
    currentAllowance = await token.allowance(signer.address, roflSwapAddress);
    console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} ${tokenSymbol || 'tokens'}`);
  } catch (error) {
    console.error(`Error checking allowance: ${error.message}`);
    console.log("Continuing with approval anyway");
  }
  
  // Approve the token transfer
  console.log(`Approving ${amount === ethers.MaxUint256 ? "unlimited" : ethers.formatEther(amount)} ${tokenSymbol || 'tokens'} for ROFLSwapV5...`);
  
  const tx = await token.approve(roflSwapAddress, amount);
  console.log(`Transaction sent: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  
  // Double-check the new allowance
  try {
    const newAllowance = await token.allowance(signer.address, roflSwapAddress);
    console.log(`New allowance: ${ethers.formatEther(newAllowance)} ${tokenSymbol || 'tokens'}`);
  } catch (error) {
    console.error(`Error checking new allowance: ${error.message}`);
  }
  
  console.log("Token approval completed successfully");
}

// Execute the function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
