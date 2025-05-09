import hre from "hardhat";
import { Address } from "viem";

// Addresses will be filled from deployment files
let ROFLSWAP_V2_ADDRESS = "";
let ROFLSWAP_TESTER_ADDRESS = "";

async function main() {
  // Read deployment data from files
  try {
    const fs = require('fs');
    const v2DeploymentData = fs.readFileSync(`roflswap-v2-deployment-${hre.network.name}.json`, 'utf8');
    const v2Deployment = JSON.parse(v2DeploymentData);
    ROFLSWAP_V2_ADDRESS = v2Deployment.roflSwapV2;
    
    const testerDeploymentData = fs.readFileSync(`roflswap-tester-deployment-${hre.network.name}.json`, 'utf8');
    const testerDeployment = JSON.parse(testerDeploymentData);
    ROFLSWAP_TESTER_ADDRESS = testerDeployment.roflSwapTester;
    
    console.log(`Found ROFLSwapV2 deployment: ${ROFLSWAP_V2_ADDRESS}`);
    console.log(`Found ROFLSwapTester deployment: ${ROFLSWAP_TESTER_ADDRESS}`);
  } catch (error) {
    console.error("Deployment files not found or invalid.");
    console.error("Make sure to deploy both ROFLSwapV2 and ROFLSwapTester first.");
    process.exit(1);
  }

  console.log("Testing ROFLSwapTester on network:", hre.network.name);

  // Get wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Using account:", deployer.account.address);
  
  // Get contract instances
  const roflSwapV2 = await hre.viem.getContractAt("ROFLSwapV2", ROFLSWAP_V2_ADDRESS);
  const roflSwapTester = await hre.viem.getContractAt("ROFLSwapTester", ROFLSWAP_TESTER_ADDRESS);
  
  console.log("\n--- Step 1: Getting Current State ---");
  
  // Check current order counter
  const orderCounter = await roflSwapV2.read.orderCounter();
  console.log(`Current order counter: ${orderCounter}`);
  
  // Check if user has orders via tester contract
  const hasOrders = await roflSwapTester.read.checkUserHasOrders();
  console.log(`User has orders (via tester): ${hasOrders}`);
  
  // Try to get user's orders via tester contract
  const myOrders = await roflSwapTester.read.getMyOrdersFromRoflSwap();
  console.log(`User orders (via tester): ${myOrders.map(o => o.toString()).join(', ') || 'none'}`);
  
  console.log("\n--- Step 2: Placing an Order Using ROFLSwapV2 Directly ---");
  
  // Place an order directly using ROFLSwapV2
  const sampleOrderDataDirect = "0xDEADBEEF01020304";
  console.log(`Placing order directly: ${sampleOrderDataDirect}`);
  
  const directTx = await roflSwapV2.write.placeOrder([sampleOrderDataDirect]);
  console.log("Waiting for confirmation...");
  const directReceipt = await publicClient.waitForTransactionReceipt({ hash: directTx });
  
  const newOrderCounter = await roflSwapV2.read.orderCounter();
  const directOrderId = orderCounter + 1n;
  
  console.log(`Order placed in block ${directReceipt.blockNumber}`);
  console.log(`New order counter: ${newOrderCounter}`);
  console.log(`Direct order ID: ${directOrderId}`);
  
  // Check if order exists
  const directOrderExists = await roflSwapV2.read.orderExists([directOrderId]);
  console.log(`Direct order exists: ${directOrderExists ? '✅ Yes' : '❌ No'}`);
  
  // Try to get user's orders again
  const myOrdersAfterDirect = await roflSwapV2.read.getMyOrders();
  console.log(`User orders after direct placement: ${myOrdersAfterDirect.map(o => o.toString()).join(', ') || 'none'}`);
  
  console.log("\n--- Step 3: Placing an Order Through the Tester Contract ---");
  
  // Place an order through the tester contract
  const sampleOrderDataTester = "0xCAFEBABE01020304";
  console.log(`Placing order via tester: ${sampleOrderDataTester}`);
  
  const testerTx = await roflSwapTester.write.placeTestOrder([sampleOrderDataTester]);
  console.log("Waiting for confirmation...");
  const testerReceipt = await publicClient.waitForTransactionReceipt({ hash: testerTx });
  
  const finalOrderCounter = await roflSwapV2.read.orderCounter();
  const testerOrderId = newOrderCounter + 1n;
  
  console.log(`Order placed in block ${testerReceipt.blockNumber}`);
  console.log(`Final order counter: ${finalOrderCounter}`);
  console.log(`Tester order ID: ${testerOrderId}`);
  
  // Check if order exists
  const testerOrderExists = await roflSwapV2.read.orderExists([testerOrderId]);
  console.log(`Tester order exists: ${testerOrderExists ? '✅ Yes' : '❌ No'}`);
  
  // Try to get tester's orders
  console.log("\n--- Step 4: Checking Order Ownership ---");
  
  try {
    // Set the tester contract as the ROFL app temporarily
    console.log("Setting the tester contract as the ROFL app temporarily to access order data...");
    const setRoflAppTx = await roflSwapV2.write.setRoflApp([ROFLSWAP_TESTER_ADDRESS]);
    await publicClient.waitForTransactionReceipt({ hash: setRoflAppTx });
    
    // Now try to access data via privileged functions
    console.log("Checking direct order owner...");
    const directOrderOwner = await roflSwapTester.read.getOrderOwner([directOrderId]);
    console.log(`Owner of direct order #${directOrderId}: ${directOrderOwner}`);
    console.log(`Matches deployer? ${directOrderOwner.toLowerCase() === deployer.account.address.toLowerCase() ? '✅ Yes' : '❌ No'}`);
    
    console.log("Checking tester order owner...");
    const testerOrderOwner = await roflSwapTester.read.getOrderOwner([testerOrderId]);
    console.log(`Owner of tester order #${testerOrderId}: ${testerOrderOwner}`);
    console.log(`Matches tester contract? ${testerOrderOwner.toLowerCase() === ROFLSWAP_TESTER_ADDRESS.toLowerCase() ? '✅ Yes' : '❌ No'}`);
    
    // Get user orders for the deployer
    console.log("Getting deployer's orders via privileged function...");
    const deployerOrders = await roflSwapTester.read.getUserOrders([deployer.account.address]);
    console.log(`Deployer orders: ${deployerOrders.map(o => o.toString()).join(', ') || 'none'}`);
    
    // Get user orders for the tester contract
    console.log("Getting tester contract's orders via privileged function...");
    const testerOrders = await roflSwapTester.read.getUserOrders([ROFLSWAP_TESTER_ADDRESS]);
    console.log(`Tester orders: ${testerOrders.map(o => o.toString()).join(', ') || 'none'}`);
    
    // Reset the ROFL app to the original value
    console.log("Resetting the ROFL app to the original value...");
    const resetRoflAppTx = await roflSwapV2.write.setRoflApp(["0x000000000000000000000000000000002dC37a3b"]);
    await publicClient.waitForTransactionReceipt({ hash: resetRoflAppTx });
    
  } catch (error) {
    console.error("Error accessing privileged functions:", error);
  }
  
  console.log("\n🧪 ROFLSwapTester Testing Completed! 🧪");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 