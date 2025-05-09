import hre from "hardhat";
import { Address } from "viem";

// Deployed token addresses
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const FIRE_TOKEN_ADDRESS = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814";

async function main() {
  console.log("OceanSwap Deployment Diagnostics");
  console.log("Network:", hre.network.name);

  // Get wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Using account:", deployer.account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: deployer.account.address });
  console.log(`Account balance: ${balance} wei (${Number(balance) / 10**18} ETH)`);
  
  // Get the bytecode size of the OceanSwap contract
  console.log("\nAnalyzing OceanSwap contract size...");
  try {
    const oceanSwapArtifact = await hre.artifacts.readArtifact("OceanSwap");
    
    // Calculate the bytecode size
    const bytecodeSize = oceanSwapArtifact.bytecode.length / 2 - 1; // Dividing by 2 because bytecode is hex encoded
    console.log(`OceanSwap bytecode size: ${bytecodeSize} bytes`);
    
    // Check if the bytecode is too large
    if (bytecodeSize > 24576) {
      console.log("WARNING: Contract size exceeds the 24KB limit of EVM! This may cause deployment issues.");
      console.log("Consider refactoring the contract to reduce its size or split it into multiple contracts.");
    } else {
      console.log("Contract size is within acceptable limits.");
    }
  } catch (error) {
    console.error("Error reading OceanSwap artifact:", error);
  }
  
  // Check gas estimate for deployment
  console.log("\nEstimating gas required for deployment...");
  try {
    // Get contract factory
    const oceanSwapFactory = await hre.ethers.getContractFactory("OceanSwap");
    
    // Estimate gas for deployment
    const deploymentGasEstimate = await oceanSwapFactory.getDeployTransaction(
      WATER_TOKEN_ADDRESS,
      FIRE_TOKEN_ADDRESS,
      deployer.account.address
    ).estimateGas();
    
    console.log(`Estimated gas for deployment: ${deploymentGasEstimate}`);
    
    // Get the current gas price
    const gasPrice = await publicClient.getGasPrice();
    console.log(`Current gas price: ${gasPrice} wei`);
    
    // Calculate the cost
    const deploymentCost = gasPrice * BigInt(deploymentGasEstimate);
    console.log(`Estimated deployment cost: ${deploymentCost} wei (${Number(deploymentCost) / 10**18} ETH)`);
    
    // Check if we have enough balance
    if (balance < deploymentCost) {
      console.log("WARNING: Account balance may not be sufficient for deployment!");
    } else {
      console.log("Account balance is sufficient for deployment.");
    }
  } catch (error) {
    console.error("Error estimating deployment gas:", error);
    console.log("This could indicate an issue with the contract or constructor parameters.");
  }
  
  // Try deploying with more detailed error handling
  console.log("\nAttempting OceanSwap deployment with enhanced error handling...");
  
  try {
    console.log("Deploying contract...");
    // Deploy using viem
    const oceanSwapFactory = await hre.viem.deployContract("OceanSwap", [
      WATER_TOKEN_ADDRESS, 
      FIRE_TOKEN_ADDRESS, 
      deployer.account.address
    ]);
    
    const oceanSwapAddress = await oceanSwapFactory.address;
    console.log(`OceanSwap deployed successfully at: ${oceanSwapAddress}`);
    
    // Test basic interaction with the contract
    console.log("\nTesting basic interaction with OceanSwap...");
    const oceanSwap = await hre.viem.getContractAt("OceanSwap", oceanSwapAddress);
    const privateTokens = await oceanSwap.read.getPrivateTokens();
    console.log(`Private Water Token: ${privateTokens[0]}`);
    console.log(`Private Fire Token: ${privateTokens[1]}`);
    
    console.log("\n✅ Deployment and testing successful!");
    
    // Write deployment info to file
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      waterToken: WATER_TOKEN_ADDRESS,
      fireToken: FIRE_TOKEN_ADDRESS,
      oceanSwap: oceanSwapAddress,
      pWaterToken: privateTokens[0],
      pFireToken: privateTokens[1],
      deploymentTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `oceanswap-deployment-${hre.network.name}.json`, 
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log(`Deployment information saved to oceanswap-deployment-${hre.network.name}.json`);
    
  } catch (error) {
    console.error("Error during deployment:", error);
    
    if (error instanceof Error) {
      // Parse the error for more detailed information
      console.log("\nDetailed error analysis:");
      
      const errorString = error.toString();
      
      // Check for common deployment errors
      if (errorString.includes("out of gas")) {
        console.log("Likely cause: OUT OF GAS - The transaction ran out of gas");
        console.log("Solution: Increase the gas limit in the deployment transaction");
      } 
      else if (errorString.includes("insufficient funds")) {
        console.log("Likely cause: INSUFFICIENT FUNDS - Not enough ETH to pay for the transaction");
        console.log("Solution: Fund your account with more ETH");
      } 
      else if (errorString.includes("nonce too low") || errorString.includes("nonce too high")) {
        console.log("Likely cause: NONCE ISSUE - Transaction nonce is incorrect");
        console.log("Solution: Reset your account nonce or wait for pending transactions to complete");
      }
      else if (errorString.includes("code size") || errorString.includes("bytecode exceeds")) {
        console.log("Likely cause: CONTRACT TOO LARGE - Bytecode exceeds size limits");
        console.log("Solution: Refactor the contract to reduce its size or split it into multiple contracts");
      }
      else if (errorString.includes("execution reverted")) {
        console.log("Likely cause: EXECUTION REVERTED - The contract constructor reverted");
        console.log("Solution: Check the constructor logic and parameters for errors");
      }
      else if (errorString.includes("doesn't contain a contract address")) {
        console.log("Likely cause: DEPLOYMENT FAILED - The transaction was mined but did not create a contract");
        console.log("Solution: This is often due to contract size limits or constructor errors");
        console.log("Try simplifying the contract or splitting it into multiple contracts");

        // Try to get detailed transaction info for more insight
        try {
          // Extract transaction hash from error message if possible
          const txHashMatch = errorString.match(/transaction '(0x[a-fA-F0-9]+)'/);
          if (txHashMatch && txHashMatch[1]) {
            const txHash = txHashMatch[1] as `0x${string}`;
            console.log(`\nAttempting to gather more information about transaction ${txHash}...`);
            
            // Wait briefly to ensure the transaction is processed
            console.log("Waiting for transaction to be fully processed...");
            
            // Get transaction information
            publicClient.getTransaction({ hash: txHash })
              .then(tx => {
                console.log(`Transaction details:`);
                console.log(`Gas limit: ${tx.gas}`);
                console.log(`Gas price: ${tx.gasPrice}`);
                console.log(`Input data size: ${tx.input.length / 2 - 1} bytes`);
              })
              .catch(err => {
                console.log(`Failed to get transaction details: ${err}`);
              });
          }
        } catch (txError) {
          console.error("Error analyzing transaction:", txError);
        }
      }
      else {
        console.log("Unknown error type. Please review the full error message above.");
      }
    }
    
    console.log("\nDeployment failed. Please review the error information above.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 