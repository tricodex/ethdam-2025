import { task } from "hardhat/config";
import fs from "fs";
import "@nomicfoundation/hardhat-ethers";

task("place-order:v5", "Place an encrypted order on ROFLSwapV5")
  .addOptionalParam("contract", "ROFLSwapV5 contract address")
  .addParam("token", "Token type: 'water' or 'fire'")
  .addParam("price", "Order price (in token units)")
  .addParam("size", "Order size (in token units)")
  .addParam("type", "Order type: 'buy' or 'sell'")
  .setAction(async (taskArgs, hre) => {
    console.log("Placing encrypted order on ROFLSwapV5...");
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
    
    // Get token address based on type
    let tokenAddress: string;
    let tokenType = taskArgs.token.toLowerCase();
    
    try {
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
      );
      
      if (tokenType === "water") {
        tokenAddress = deploymentData.privateWaterToken;
        console.log(`Using Water token: ${tokenAddress}`);
      } else if (tokenType === "fire") {
        tokenAddress = deploymentData.privateFireToken;
        console.log(`Using Fire token: ${tokenAddress}`);
      } else {
        throw new Error("Invalid token type. Use 'water' or 'fire'");
      }
    } catch (error) {
      console.error("Error loading token addresses:", error);
      throw error;
    }
    
    // Order parameters
    const price = ethers.parseEther(taskArgs.price);
    const size = ethers.parseEther(taskArgs.size);
    const isBuy = taskArgs.type.toLowerCase() === "buy";
    
    console.log(`Creating ${isBuy ? "BUY" : "SELL"} order:`);
    console.log(`- Token: ${tokenType.toUpperCase()}`);
    console.log(`- Price: ${ethers.formatEther(price)} tokens`);
    console.log(`- Size: ${ethers.formatEther(size)} tokens`);
    
    // Create order object
    const orderData = {
      orderId: 0, // Will be assigned by the contract
      owner: signer.address,
      token: tokenAddress,
      price: price,
      size: size,
      isBuy: isBuy
    };
    
    // Encode order data
    console.log("Encoding order data...");
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedOrder = abiCoder.encode(
      ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
      [orderData.orderId, orderData.owner, orderData.token, orderData.price, orderData.size, orderData.isBuy]
    );
    
    console.log(`Encoded order: ${encodedOrder.slice(0, 66)}...`);
    
    // Check if we have sufficient token approval
    console.log("Checking token approval...");
    let tokenContract;
    
    try {
      const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
      tokenContract = PrivateERC20.attach(tokenAddress);
      
      if (isBuy) {
        const allowance = await tokenContract.allowance(signer.address, roflSwapAddress);
        console.log(`Current allowance: ${ethers.formatEther(allowance)} tokens`);
        
        if (allowance < size) {
          console.log("Insufficient token allowance. Approving tokens...");
          const approveTx = await tokenContract.approve(roflSwapAddress, ethers.MaxUint256);
          await approveTx.wait();
          console.log("Tokens approved successfully");
        }
      }
    } catch (error) {
      console.log("Could not check token approval:", error);
      console.log("Continuing anyway - transaction may fail if approvals are insufficient");
    }
    
    // Place the order
    console.log("Placing order on ROFLSwapV5...");
    const tx = await roflSwap.placeOrder(encodedOrder);
    console.log(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    
    // Get the order ID from the events
    try {
      if (receipt && receipt.logs) {
        // Find the OrderPlaced event
        const iface = ROFLSwapV5.interface;
        for (const log of receipt.logs) {
          try {
            const parsedLog = iface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            
            if (parsedLog && parsedLog.name === "OrderPlaced") {
              console.log(`Order placed successfully with ID: ${parsedLog.args[0]}`);
              return {
                orderId: parsedLog.args[0],
                owner: parsedLog.args[1],
                txHash: tx.hash
              };
            }
          } catch (e) {
            // This log was probably from another contract or not a parseable event
            continue;
          }
        }
      }
      
      console.log("Order placed successfully, but couldn't determine the order ID");
    } catch (error) {
      console.log("Error parsing events:", error);
      console.log("Order may have been placed successfully, check the contract state");
    }
    
    return {
      txHash: tx.hash
    };
  }); 