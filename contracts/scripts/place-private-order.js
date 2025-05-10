// Script for placing an encrypted order with ROFLSwapV5
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

// Function to encode order data
function encodeOrder(order) {
  // Encode using ethers ABI coder
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
    [
      order.orderId,
      order.owner,
      order.token,
      order.price,
      order.size,
      order.isBuy
    ]
  );
}

async function main() {
  console.log("Placing an encrypted order with ROFLSwapV5...");
  
  // Get command line arguments
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  let contractAddress = null;
  let tokenAddress = null;
  let isBuy = true;
  let price = ethers.parseEther("1");  // Default price: 1 token
  let size = ethers.parseEther("1");   // Default size: 1 token
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--contract" && i + 1 < args.length) {
      contractAddress = args[i + 1];
      i++;
    } else if (args[i] === "--token" && i + 1 < args.length) {
      tokenAddress = args[i + 1];
      i++;
    } else if (args[i] === "--sell") {
      isBuy = false;
    } else if (args[i] === "--buy") {
      isBuy = true;
    } else if (args[i] === "--price" && i + 1 < args.length) {
      price = ethers.parseEther(args[i + 1]);
      i++;
    } else if (args[i] === "--size" && i + 1 < args.length) {
      size = ethers.parseEther(args[i + 1]);
      i++;
    }
  }
  
  // Check if contract address provided
  if (!contractAddress) {
    try {
      // Try to load from deployment file
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${hre.network.name}.json`)
      );
      contractAddress = deploymentData.roflSwapV5;
      console.log(`Using contract address from deployment file: ${contractAddress}`);
    } catch (error) {
      console.error("Contract address not provided and no deployment file found.");
      console.error("Please provide the contract address with --contract");
      process.exit(1);
    }
  }
  
  // Check if token address provided
  if (!tokenAddress) {
    try {
      // Try to load from deployment file
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${hre.network.name}.json`)
      );
      if (isBuy) {
        // For buy orders, we're buying fire tokens with water tokens
        tokenAddress = deploymentData.privateFireToken;
      } else {
        // For sell orders, we're selling fire tokens for water tokens
        tokenAddress = deploymentData.privateFireToken;
      }
      console.log(`Using ${isBuy ? 'buy' : 'sell'} order with token: ${tokenAddress}`);
    } catch (error) {
      console.error("Token address not provided and no deployment file found.");
      console.error("Please provide the token address with --token");
      process.exit(1);
    }
  }
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Load the contract
  const ROFLSwap = await ethers.getContractFactory("ROFLSwapV5");
  const roflSwap = ROFLSwap.attach(contractAddress);
  
  // Create the order object
  const order = {
    orderId: 0,  // Will be assigned by the contract
    owner: signer.address,
    token: tokenAddress,
    price: price,
    size: size,
    isBuy: isBuy
  };
  
  // Print order details
  console.log("Order details:");
  console.log(`- Type: ${isBuy ? 'BUY' : 'SELL'}`);
  console.log(`- Token: ${order.token}`);
  console.log(`- Price: ${ethers.formatEther(order.price)} tokens`);
  console.log(`- Size: ${ethers.formatEther(order.size)} tokens`);
  
  // Encode the order data
  const encodedOrder = encodeOrder(order);
  console.log(`Encoded order (${encodedOrder.length} bytes): ${encodedOrder.slice(0, 64)}...`);
  
  // Place the order
  console.log("Placing order...");
  const tx = await roflSwap.placeOrder(encodedOrder);
  console.log(`Transaction sent: ${tx.hash}`);
  
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
  
  // Extract order ID from the event
  const orderPlacedEvent = receipt.logs
    .map(log => { try { return roflSwap.interface.parseLog(log); } catch (e) { return null; }})
    .find(parsedLog => parsedLog && parsedLog.name === 'OrderPlaced');
    
  if (orderPlacedEvent) {
    const orderId = orderPlacedEvent.args[0];
    console.log(`Order placed with ID: ${orderId}`);
    
    // Return the order ID for use in scripts
    return orderId;
  } else {
    console.log("Could not extract order ID from events");
  }
}

// Execute the function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
