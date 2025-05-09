import hre from "hardhat";
import { parseEther } from "viem";

// Address of the deployed contracts
const ROFLSWAP_V2_ADDRESS = "0x552F5B746097219537F1041aA406c02F3474417A";
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const FIRE_TOKEN_ADDRESS = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814";

// Create proper order structure with owner field
function createROFLCompatibleOrder(isBuy: boolean, token: string, price: bigint, size: bigint, owner: string): `0x${string}` {
  // Create a structured order with required owner field
  const order = {
    token,
    price: price.toString(),
    size: size.toString(),
    isBuy,
    owner  // This is required by the ROFL app
  };
  
  // Convert to JSON and then to hex
  const orderJson = JSON.stringify(order);
  return `0x${Buffer.from(orderJson).toString("hex")}` as `0x${string}`;
}

async function main() {
  console.log("Creating new orders with correct format for ROFL app on:", hre.network.name);

  // Get wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Using account:", deployer.account.address);
  
  // Get contract instance
  const roflSwapV2 = await hre.viem.getContractAt("ROFLSwapV2", ROFLSWAP_V2_ADDRESS);
  
  // Get current order counter
  const orderCounter = await roflSwapV2.read.orderCounter();
  console.log(`Current Order Counter: ${orderCounter}`);
  
  // Get ROFL app address to verify integration
  const roflAppAddress = await roflSwapV2.read.roflApp();
  console.log(`ROFL App Address: ${roflAppAddress}`);
  
  // Place a buy order for WATER token with correct owner field
  console.log("\n--- Placing Buy Order for WATER ---");
  const buyPrice = parseEther("0.02"); // 0.02 FIRE per WATER
  const buySize = parseEther("10");     // 10 WATER tokens
  const buyOrderData = createROFLCompatibleOrder(
    true, 
    WATER_TOKEN_ADDRESS, 
    buyPrice, 
    buySize, 
    deployer.account.address
  );
  
  console.log(`Order Details (Buy):`);
  console.log(`- Token: WATER (${WATER_TOKEN_ADDRESS})`);
  console.log(`- Price: ${buyPrice.toString()} (${Number(buyPrice) / 1e18} FIRE per WATER)`);
  console.log(`- Size: ${buySize.toString()} (${Number(buySize) / 1e18} WATER tokens)`);
  console.log(`- Owner: ${deployer.account.address}`);
  
  console.log("\nPlacing buy order...");
  const buyTx = await roflSwapV2.write.placeOrder([buyOrderData]);
  
  console.log("Waiting for confirmation...");
  const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyTx });
  console.log(`Buy order placed in block ${buyReceipt.blockNumber}`);
  
  // Get the new buy order ID
  const newOrderCounter = await roflSwapV2.read.orderCounter();
  const buyOrderId = newOrderCounter;
  console.log(`Buy Order ID: ${buyOrderId}`);
  
  // Place a sell order for WATER token with correct owner field
  console.log("\n--- Placing Sell Order for WATER ---");
  const sellPrice = parseEther("0.019"); // 0.019 FIRE per WATER (slightly lower than buy)
  const sellSize = parseEther("5");      // 5 WATER tokens
  const sellOrderData = createROFLCompatibleOrder(
    false, 
    WATER_TOKEN_ADDRESS, 
    sellPrice, 
    sellSize, 
    deployer.account.address
  );
  
  console.log(`Order Details (Sell):`);
  console.log(`- Token: WATER (${WATER_TOKEN_ADDRESS})`);
  console.log(`- Price: ${sellPrice.toString()} (${Number(sellPrice) / 1e18} FIRE per WATER)`);
  console.log(`- Size: ${sellSize.toString()} (${Number(sellSize) / 1e18} WATER tokens)`);
  console.log(`- Owner: ${deployer.account.address}`);
  
  console.log("\nPlacing sell order...");
  const sellTx = await roflSwapV2.write.placeOrder([sellOrderData]);
  
  console.log("Waiting for confirmation...");
  const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellTx });
  console.log(`Sell order placed in block ${sellReceipt.blockNumber}`);
  
  // Get the new sell order ID
  const finalOrderCounter = await roflSwapV2.read.orderCounter();
  const sellOrderId = finalOrderCounter;
  console.log(`Sell Order ID: ${sellOrderId}`);
  
  console.log("\n--- Next Steps ---");
  console.log("1. Run the monitoring script to watch for matches:");
  console.log(`   bun hardhat run scripts/monitor-matches.ts --network sapphire-testnet`);
  console.log(`2. Update the BUY_ORDER_ID and SELL_ORDER_ID in monitor-matches.ts to: ${buyOrderId} and ${sellOrderId}`);
  console.log("\n🌊 ROFLSwap Orders Created with Correct Format 🌊");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 