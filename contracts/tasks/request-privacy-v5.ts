import { task } from "hardhat/config";
import fs from "fs";
import "@nomicfoundation/hardhat-ethers";

task("request-privacy:v5", "Request privacy access for ROFLSwapV5 to see token balances")
  .addOptionalParam("contract", "ROFLSwapV5 contract address")
  .setAction(async (taskArgs, hre) => {
    console.log("Requesting privacy access for ROFLSwapV5...");
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
    
    // Load the ROFLSwapV5 contract
    const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
    const roflSwap = ROFLSwapV5.attach(roflSwapAddress);
    
    // Check who owns the contract
    try {
      const owner = await roflSwap.owner();
      console.log(`Contract owner: ${owner}`);
      
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        console.log(`WARNING: You (${signer.address}) are not the contract owner (${owner})`);
        console.log("This call may fail if only the owner can request privacy access");
      }
    } catch (error) {
      console.log("Could not check contract owner:", error);
      console.log("Continuing anyway...");
    }
    
    // Request privacy access
    console.log("Requesting privacy access...");
    try {
      const tx = await roflSwap.requestPrivacyAccess();
      console.log(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
      
      console.log("Privacy access requested successfully");
      
      return {
        txHash: tx.hash,
        success: true
      };
    } catch (error: any) {
      console.error("Failed to request privacy access:", error);
      console.log("This may fail if:");
      console.log("1. You are not the contract owner");
      console.log("2. Privacy access was already granted");
      console.log("3. The token contracts don't support the privacy interface");
      
      return {
        success: false,
        error: error.message || String(error)
      };
    }
  }); 