// Script to fund accounts with WATER and FIRE tokens
const { ethers } = require("ethers");
require('dotenv').config();

// Contract addresses
const waterTokenAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
const fireTokenAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";

// Token ABIs
const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function mint(address to, uint256 amount)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

async function main() {
  // Get deployer's private key from .env
  const deployerKey = process.env.PRIVATE_KEY;
  if (!deployerKey) {
    console.error("PRIVATE_KEY environment variable is required!");
    process.exit(1);
  }

  // Addresses
  const buyerAddress = "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8";
  const sellerAddress = "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1";
  
  console.log(`Buyer address: ${buyerAddress}`);
  console.log(`Seller address: ${sellerAddress}`);
  
  // Set up provider and signer
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  const deployer = new ethers.Wallet(deployerKey, provider);
  console.log(`Deployer/Token Owner address: ${deployer.address}`);
  
  // Create contract instances
  const waterToken = new ethers.Contract(waterTokenAddress, TOKEN_ABI, deployer);
  const fireToken = new ethers.Contract(fireTokenAddress, TOKEN_ABI, deployer);
  
  // Fund amount
  const fundAmount = ethers.parseEther("100");
  
  // Check token balances before funding
  const buyerWaterBalanceBefore = await waterToken.balanceOf(buyerAddress);
  const buyerFireBalanceBefore = await fireToken.balanceOf(buyerAddress);
  const sellerWaterBalanceBefore = await waterToken.balanceOf(sellerAddress);
  const sellerFireBalanceBefore = await fireToken.balanceOf(sellerAddress);
  
  console.log("=== Balances Before Funding ===");
  console.log(`Buyer WATER: ${ethers.formatEther(buyerWaterBalanceBefore)}`);
  console.log(`Buyer FIRE: ${ethers.formatEther(buyerFireBalanceBefore)}`);
  console.log(`Seller WATER: ${ethers.formatEther(sellerWaterBalanceBefore)}`);
  console.log(`Seller FIRE: ${ethers.formatEther(sellerFireBalanceBefore)}`);
  
  try {
    // Try to mint tokens first (if deployer has minter role)
    console.log("\nAttempting to mint tokens...");
    
    try {
      const mintWaterToBuyer = await waterToken.mint(buyerAddress, fundAmount);
      await mintWaterToBuyer.wait();
      console.log(`Minted ${ethers.formatEther(fundAmount)} WATER tokens to buyer`);
    } catch (error) {
      console.log("Couldn't mint WATER tokens to buyer, will try transfer instead.");
    }

    try {
      const mintFireToBuyer = await fireToken.mint(buyerAddress, fundAmount);
      await mintFireToBuyer.wait();
      console.log(`Minted ${ethers.formatEther(fundAmount)} FIRE tokens to buyer`);
    } catch (error) {
      console.log("Couldn't mint FIRE tokens to buyer, will try transfer instead.");
    }
    
    try {
      const mintWaterToSeller = await waterToken.mint(sellerAddress, fundAmount);
      await mintWaterToSeller.wait();
      console.log(`Minted ${ethers.formatEther(fundAmount)} WATER tokens to seller`);
    } catch (error) {
      console.log("Couldn't mint WATER tokens to seller, will try transfer instead.");
    }
    
    try {
      const mintFireToSeller = await fireToken.mint(sellerAddress, fundAmount);
      await mintFireToSeller.wait();
      console.log(`Minted ${ethers.formatEther(fundAmount)} FIRE tokens to seller`);
    } catch (error) {
      console.log("Couldn't mint FIRE tokens to seller, will try transfer instead.");
    }
    
    // Fallback to transfer tokens if minting failed
    const deployerWaterBalance = await waterToken.balanceOf(deployer.address);
    const deployerFireBalance = await fireToken.balanceOf(deployer.address);
    
    console.log("\nDeployer balances:");
    console.log(`WATER: ${ethers.formatEther(deployerWaterBalance)}`);
    console.log(`FIRE: ${ethers.formatEther(deployerFireBalance)}`);
    
    if (buyerWaterBalanceBefore < ethers.parseEther("10") && deployerWaterBalance >= fundAmount) {
      console.log("\nTransferring WATER tokens to buyer...");
      const transferWaterToBuyer = await waterToken.transfer(buyerAddress, fundAmount);
      await transferWaterToBuyer.wait();
      console.log(`Transferred ${ethers.formatEther(fundAmount)} WATER tokens to buyer`);
    }
    
    if (buyerFireBalanceBefore < ethers.parseEther("10") && deployerFireBalance >= fundAmount) {
      console.log("Transferring FIRE tokens to buyer...");
      const transferFireToBuyer = await fireToken.transfer(buyerAddress, fundAmount);
      await transferFireToBuyer.wait();
      console.log(`Transferred ${ethers.formatEther(fundAmount)} FIRE tokens to buyer`);
    }
    
    if (sellerWaterBalanceBefore < ethers.parseEther("10") && deployerWaterBalance >= fundAmount) {
      console.log("Transferring WATER tokens to seller...");
      const transferWaterToSeller = await waterToken.transfer(sellerAddress, fundAmount);
      await transferWaterToSeller.wait();
      console.log(`Transferred ${ethers.formatEther(fundAmount)} WATER tokens to seller`);
    }
    
    if (sellerFireBalanceBefore < ethers.parseEther("10") && deployerFireBalance >= fundAmount) {
      console.log("Transferring FIRE tokens to seller...");
      const transferFireToSeller = await fireToken.transfer(sellerAddress, fundAmount);
      await transferFireToSeller.wait();
      console.log(`Transferred ${ethers.formatEther(fundAmount)} FIRE tokens to seller`);
    }
  } catch (error) {
    console.error("Error during funding:", error);
  }
  
  // Check balances after funding
  const buyerWaterBalanceAfter = await waterToken.balanceOf(buyerAddress);
  const buyerFireBalanceAfter = await fireToken.balanceOf(buyerAddress);
  const sellerWaterBalanceAfter = await waterToken.balanceOf(sellerAddress);
  const sellerFireBalanceAfter = await fireToken.balanceOf(sellerAddress);
  
  console.log("\n=== Balances After Funding ===");
  console.log(`Buyer WATER: ${ethers.formatEther(buyerWaterBalanceAfter)}`);
  console.log(`Buyer FIRE: ${ethers.formatEther(buyerFireBalanceAfter)}`);
  console.log(`Seller WATER: ${ethers.formatEther(sellerWaterBalanceAfter)}`);
  console.log(`Seller FIRE: ${ethers.formatEther(sellerFireBalanceAfter)}`);
  
  console.log("\nFunding completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 