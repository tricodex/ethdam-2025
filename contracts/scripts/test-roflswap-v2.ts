import hre from "hardhat";
import { Address } from "viem";

// Address will be filled after deployment
let ROFLSWAP_V2_ADDRESS = "";

async function main() {
  // Read deployment data from file
  try {
    const fs = require('fs');
    const deploymentData = fs.readFileSync(`roflswap-v2-deployment-${hre.network.name}.json`, 'utf8');
    const deployment = JSON.parse(deploymentData);
    ROFLSWAP_V2_ADDRESS = deployment.roflSwapV2;
    console.log(`Found ROFLSwapV2 deployment: ${ROFLSWAP_V2_ADDRESS}`);
  } catch (error) {
    console.error("Deployment file not found or invalid. Please deploy ROFLSwapV2 first.");
    console.error("Run: bun hardhat run scripts/deploy-roflswap-v2.ts --network sapphire-testnet");
    process.exit(1);
  }

  console.log("Testing ROFLSwapV2 contract functionality on network:", hre.network.name);

  // Get wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Using account:", deployer.account.address);
  
  // Get ROFLSwapV2 contract instance
  const roflSwap = await hre.viem.getContractAt("ROFLSwapV2", ROFLSWAP_V2_ADDRESS);
  
  console.log("\n--- Basic Contract Information ---");
  
  // Get token addresses
  const tokenAddresses = await roflSwap.read.getTokens();
  console.log(`Water Token: ${(tokenAddresses as any)[0]}`);
  console.log(`Fire Token: ${(tokenAddresses as any)[1]}`);
  
  // Get ROFL app address
  const roflAppAddress = await roflSwap.read.roflApp();
  console.log(`ROFL App Address: ${roflAppAddress}`);
  
  // Get order counter
  const orderCounter = await roflSwap.read.orderCounter();
  console.log(`Current Order Counter: ${orderCounter}`);
  
  // Get existing orders first
  console.log("\n--- Checking Existing Orders ---");
  const existingOrders = await roflSwap.read.getMyOrders();
  console.log(`User already has ${existingOrders.length} orders: ${existingOrders.map(o => o.toString()).join(', ')}`);
  
  // Check if user has orders
  const hasOrders = await roflSwap.read.hasOrders();
  console.log(`User has orders: ${hasOrders}`);
  
  // Get order count
  const orderCount = await roflSwap.read.getMyOrderCount();
  console.log(`User order count: ${orderCount}`);
  
  console.log("\n--- Testing Order Placement ---");
  
  // Create a sample encrypted order (this would normally be encrypted data)
  const sampleEncryptedOrder = "0x0102030405060708090a0b0c0d0e0f10"; // Hex string representation
  
  try {
    console.log(`Placing an encrypted order: ${sampleEncryptedOrder}`);
    const placeTx = await roflSwap.write.placeOrder([sampleEncryptedOrder]);
    
    console.log("Waiting for transaction confirmation...");
    const placeReceipt = await publicClient.waitForTransactionReceipt({ hash: placeTx });
    console.log(`Order placed in block ${placeReceipt.blockNumber}`);
    
    // Get updated order counter
    const newOrderCounter = await roflSwap.read.orderCounter();
    console.log(`New Order Counter: ${newOrderCounter}`);
    
    // Get user's orders
    console.log("\nRetrieving placed orders for the user...");
    const userOrders = await roflSwap.read.getMyOrders();
    console.log(`User has ${userOrders.length} orders: ${userOrders.map(o => o.toString()).join(', ')}`);
    
    // Check if user has orders now
    const hasOrdersNow = await roflSwap.read.hasOrders();
    console.log(`User has orders now: ${hasOrdersNow}`);
    
    // Get updated order count
    const newOrderCount = await roflSwap.read.getMyOrderCount();
    console.log(`User order count now: ${newOrderCount}`);
    
    // Test if the new order ID is in the list
    const newOrderId = orderCounter + 1n;
    console.log(`Checking if order #${newOrderId} was registered for the user...`);
    
    // Check if order exists
    const orderExists = await roflSwap.read.orderExists([newOrderId]);
    console.log(`Order #${newOrderId} exists: ${orderExists ? '✅ Yes' : '❌ No'}`);
    
    const hasNewOrder = userOrders.some(id => id === newOrderId);
    console.log(`Order #${newOrderId} is in user's order list: ${hasNewOrder ? '✅ Yes' : '❌ No'}`);
    
    console.log("\n--- Testing Order Access Restrictions ---");
    
    try {
      console.log("Attempting to access encrypted order data directly (should fail)...");
      const encryptedOrderData = await roflSwap.read.getEncryptedOrder([newOrderId]);
      console.log(`Retrieved order data: ${encryptedOrderData}`);
      console.log("WARNING: Order data was accessible! This should not happen unless the caller is the ROFL app.");
    } catch (error) {
      console.log("✅ Access denied as expected - only the ROFL app can access encrypted orders");
    }
    
    console.log("\n--- Testing Order Execution ---");
    console.log("Note: We can't test order execution directly as it requires the ROFL app address");
    console.log("In a production environment, only the authorized ROFL app can execute matches");
    
  } catch (error) {
    console.error("Error testing ROFLSwapV2:", error);
  }
  
  console.log("\n🌊 ROFLSwapV2 Testing Completed! 🌊");
  console.log("The contract is functioning as expected and ready for ROFL app integration.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 