import { ethers } from "hardhat";
import { parseEther } from "ethers";

// Address of the deployed contracts
const ROFLSWAP_V2_ADDRESS = "0x552F5B746097219537F1041aA406c02F3474417A";
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const FIRE_TOKEN_ADDRESS = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814";

// Create order with proper format required by ROFL app
function createROFLCompatibleOrder(
  isBuy: boolean, 
  token: string, 
  price: bigint, 
  size: bigint, 
  owner: string
): string {
  // Create a structured order with required owner field
  const order = {
    token,
    price: price.toString(),
    size: size.toString(),
    isBuy,
    owner
  };
  
  // Convert to JSON and then to hex
  const orderJson = JSON.stringify(order);
  console.log(`Order JSON: ${orderJson}`);
  return "0x" + Buffer.from(orderJson).toString("hex");
}

async function main() {
  // Get deployer
  const [signer] = await ethers.getSigners();
  const deployerAddress = await signer.getAddress();
  
  console.log("Placing orders with proper format for ROFL app...");
  console.log(`ROFLSwap contract: ${ROFLSWAP_V2_ADDRESS}`);
  console.log(`Deployer address: ${deployerAddress}`);
  
  // Create a contract interface with correct bytes parameter type
  const abi = [
    "function placeOrder(bytes encryptedOrder) returns (uint256)",
    "function orderCounter() view returns (uint256)",
    "function filledOrders(uint256 orderId) view returns (bool)"
  ];
  
  // Create contract instance
  const contract = await ethers.getContractAt(abi, ROFLSWAP_V2_ADDRESS);
  
  // Place a buy order
  console.log("\n--- Placing Buy Order for WATER ---");
  const buyPrice = parseEther("0.02"); // 0.02 FIRE per WATER
  const buySize = parseEther("10"); // 10 WATER tokens
  
  const buyOrderData = createROFLCompatibleOrder(
    true, 
    WATER_TOKEN_ADDRESS, 
    buyPrice, 
    buySize, 
    deployerAddress
  );
  
  console.log(`Hex-encoded order: ${buyOrderData.slice(0, 50)}...`);
  
  console.log("Sending buy order transaction...");
  const buyTx = await contract.placeOrder(buyOrderData);
  console.log(`Buy order transaction hash: ${buyTx.hash}`);
  
  console.log("Waiting for confirmation...");
  const buyReceipt = await buyTx.wait();
  console.log(`Buy order transaction mined in block ${buyReceipt?.blockNumber}`);
  
  // Place a sell order
  console.log("\n--- Placing Sell Order for WATER ---");
  const sellPrice = parseEther("0.02"); // 0.02 FIRE per WATER
  const sellSize = parseEther("10"); // 10 WATER tokens
  
  const sellOrderData = createROFLCompatibleOrder(
    false, 
    WATER_TOKEN_ADDRESS, 
    sellPrice, 
    sellSize, 
    deployerAddress
  );
  
  console.log(`Hex-encoded order: ${sellOrderData.slice(0, 50)}...`);
  
  console.log("Sending sell order transaction...");
  const sellTx = await contract.placeOrder(sellOrderData);
  console.log(`Sell order transaction hash: ${sellTx.hash}`);
  
  console.log("Waiting for confirmation...");
  const sellReceipt = await sellTx.wait();
  console.log(`Sell order transaction mined in block ${sellReceipt?.blockNumber}`);
  
  console.log("\nBoth orders placed successfully! Waiting for ROFL app to match them...");
  
  // Get latest order IDs
  const orderCounter = await contract.orderCounter();
  
  console.log(`Latest order ID: ${orderCounter}`);
  console.log(`Buy order ID: ${orderCounter - 1n}`);
  console.log(`Sell order ID: ${orderCounter}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 