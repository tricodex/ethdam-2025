import { task } from "hardhat/config";
import fs from "fs";
import "@nomicfoundation/hardhat-ethers";

task("wrap:v5", "Wrap base tokens into private ERC20 tokens")
  .addParam("token", "Token type: 'water' or 'fire'")
  .addParam("amount", "Amount to wrap (in token units)")
  .setAction(async (taskArgs, hre) => {
    console.log("Wrapping tokens into private ERC20 tokens...");
    const network = hre.network.name;
    const ethers = hre.ethers;
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Load deployment data
    let baseTokenAddress: string;
    let privateTokenAddress: string;
    let tokenType = taskArgs.token.toLowerCase();
    
    try {
      const deploymentData = JSON.parse(
        fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
      );
      
      if (tokenType === "water") {
        baseTokenAddress = deploymentData.baseWaterToken;
        privateTokenAddress = deploymentData.privateWaterToken;
        console.log(`Using WATER tokens: ${baseTokenAddress} -> ${privateTokenAddress}`);
      } else if (tokenType === "fire") {
        baseTokenAddress = deploymentData.baseFireToken;
        privateTokenAddress = deploymentData.privateFireToken;
        console.log(`Using FIRE tokens: ${baseTokenAddress} -> ${privateTokenAddress}`);
      } else {
        throw new Error("Invalid token type. Use 'water' or 'fire'");
      }
    } catch (error) {
      console.error("Error loading token addresses:", error);
      throw error;
    }
    
    // Amount to wrap
    const amount = ethers.parseEther(taskArgs.amount);
    console.log(`Wrapping ${ethers.formatEther(amount)} ${tokenType.toUpperCase()} tokens`);
    
    // Load contracts
    const ERC20 = await ethers.getContractFactory("MockToken");
    const baseToken = ERC20.attach(baseTokenAddress);
    
    const PrivateWrapper = await ethers.getContractFactory("PrivateWrapper");
    const privateToken = PrivateWrapper.attach(privateTokenAddress);
    
    // Check base token balance
    const baseBalance = await baseToken.balanceOf(signer.address);
    console.log(`Base token balance: ${ethers.formatEther(baseBalance)} ${tokenType.toUpperCase()}`);
    
    if (baseBalance < amount) {
      console.log("Insufficient base token balance. Minting more tokens...");
      
      try {
        // Try to mint more tokens if possible (assuming the token has a mint function)
        const mintTx = await baseToken.mint(signer.address, amount);
        await mintTx.wait();
        console.log(`Minted ${ethers.formatEther(amount)} tokens to ${signer.address}`);
        
        // Check new balance
        const newBaseBalance = await baseToken.balanceOf(signer.address);
        console.log(`New base token balance: ${ethers.formatEther(newBaseBalance)} ${tokenType.toUpperCase()}`);
      } catch (error) {
        console.error("Failed to mint tokens:", error);
        console.log("Make sure you have enough base tokens before wrapping");
        throw error;
      }
    }
    
    // Check if we have sufficient approval
    const allowance = await baseToken.allowance(signer.address, privateTokenAddress);
    console.log(`Current allowance: ${ethers.formatEther(allowance)} tokens`);
    
    if (allowance < amount) {
      console.log("Approving base tokens for wrapping...");
      const approveTx = await baseToken.approve(privateTokenAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log("Base tokens approved for wrapping");
    }
    
    // Wrap tokens
    console.log("Wrapping tokens...");
    const wrapTx = await privateToken.wrap(amount, signer.address);
    console.log(`Transaction sent: ${wrapTx.hash}`);
    
    const receipt = await wrapTx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    
    // Check private token balance
    try {
      // Note: This may fail on Sapphire due to privacy features
      const privateBalance = await privateToken.balanceOf(signer.address);
      console.log(`Private token balance: ${ethers.formatEther(privateBalance)} ${tokenType.toUpperCase()}`);
    } catch (error) {
      console.log("Could not check private token balance (expected on Sapphire)");
      console.log("Privacy features may prevent direct balance queries");
    }
    
    console.log("Tokens wrapped successfully");
    
    return {
      baseToken: baseTokenAddress,
      privateToken: privateTokenAddress,
      amount: amount.toString(),
      txHash: wrapTx.hash
    };
  }); 