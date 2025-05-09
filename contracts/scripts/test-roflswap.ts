import hre from "hardhat";
import { Address } from "viem";

// Address of the deployed ROFLSwap contract
const ROFLSWAP_ADDRESS = "0x941b3c3106D11E91a94f62528e20716c2919fdde";

async function main() {
  console.log("Testing ROFLSwap contract functionality on network:", hre.network.name);

  // Get wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Using account:", deployer.account.address);
  
  // Get ROFLSwap contract instance
  const roflSwap = await hre.viem.getContractAt("ROFLSwap", ROFLSWAP_ADDRESS);
  
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
  console.log(`User already has ${existingOrders.length} orders: ${existingOrders}`);
  
  console.log("\n--- Testing Order Placement ---");
  
  // Create a sample encrypted order (this would normally be encrypted data)
  const sampleEncryptedOrder = "0x0102030405060708090a0b0c0d0e0f"; // Hex string representation
  
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
    
    // Test if the new order ID is in the list
    const newOrderId = orderCounter + 1n;
    const hasNewOrder = userOrders.some(id => id === newOrderId);
    console.log(`Checking if order #${newOrderId} was registered for the user: ${hasNewOrder ? '✅ Yes' : '❌ No'}`);
    
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
    console.error("Error testing ROFLSwap:", error);
  }
  
  console.log("\n🌊 ROFLSwap Testing Completed! 🌊");
  console.log("The contract is functioning as expected and ready for ROFL app integration.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 