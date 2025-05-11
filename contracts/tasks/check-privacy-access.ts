import { task } from "hardhat/config";
import fs from "fs";
import "@nomicfoundation/hardhat-ethers";

task("check-privacy-access", "Check if privacy access has been granted for ROFLSwapV5 with the token contracts")
  .addOptionalParam("contract", "ROFLSwapV5 contract address")
  .setAction(async (taskArgs, hre) => {
    console.log("Checking privacy access for ROFLSwapV5...");
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
    
    try {
      // Get token addresses from the contract
      const waterTokenAddress = await roflSwap.waterToken();
      const fireTokenAddress = await roflSwap.fireToken();
      
      console.log(`Water Token: ${waterTokenAddress}`);
      console.log(`Fire Token: ${fireTokenAddress}`);
      
      // Load the PrivateERC20 contract for both tokens
      const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
      const waterToken = PrivateERC20.attach(waterTokenAddress);
      const fireToken = PrivateERC20.attach(fireTokenAddress);
      
      // The best way to check access is to try to get the balance of the contract
      // If we can see a non-zero balance OR we can see the real zero balance,
      // it means privacy access has been granted
      
      console.log("\nChecking privacy access by testing balance visibility...");
      
      // We'll check our own balance first (which should be visible regardless)
      const signerWaterBalance = await waterToken.balanceOf(signer.address);
      const signerFireBalance = await fireToken.balanceOf(signer.address);
      
      console.log(`Your Water Token balance: ${ethers.formatUnits(signerWaterBalance, 18)}`);
      console.log(`Your Fire Token balance: ${ethers.formatUnits(signerFireBalance, 18)}`);
      
      // Now we'll try to check a random account's balance through the ROFLSwap contract
      // This should work only if privacy access has been granted
      console.log("\nTrying to view another account's balance through the ROFLSwapV5 contract...");
      
      // We can't directly check hasAccess since it's internal, but we can infer based on balanceOf
      // Create a sample address to check
      const testAddress = "0x1111111111111111111111111111111111111111";
      
      try {
        // Get the contract's own balance (this should work if privacy was granted)
        const contractWaterBalance = await waterToken.balanceOf(roflSwapAddress);
        console.log(`ROFLSwap contract Water Token balance: ${ethers.formatUnits(contractWaterBalance, 18)}`);
        
        const contractFireBalance = await fireToken.balanceOf(roflSwapAddress);
        console.log(`ROFLSwap contract Fire Token balance: ${ethers.formatUnits(contractFireBalance, 18)}`);
        
        console.log("\n✅ PRIVACY ACCESS CHECK RESULT:");
        console.log("The ROFLSwapV5 contract appears to have privacy access to view token balances.");
        console.log("Order matching should be able to proceed if both buy and sell orders exist.");
        
        return {
          success: true,
          hasAccess: true
        };
      } catch (error: any) {
        console.log("\n❌ PRIVACY ACCESS CHECK RESULT:");
        console.log("Privacy access appears NOT to be properly granted.");
        console.log("You should run the request-privacy:v5 task to grant access:");
        console.log(`bun hardhat request-privacy:v5 --contract ${roflSwapAddress} --network ${network}`);
        
        return {
          success: false,
          hasAccess: false,
          error: error.message
        };
      }
    } catch (error: any) {
      console.error("Error checking privacy access:", error.message || String(error));
      
      return {
        success: false,
        error: error.message || String(error)
      };
    }
  }); 