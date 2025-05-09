import hre from "hardhat";
import { Address, parseEther } from "viem";

// Address of the deployed contracts
const ROFLSWAP_V2_ADDRESS = "0x552F5B746097219537F1041aA406c02F3474417A";
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const FIRE_TOKEN_ADDRESS = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814";

// Create sample order structure
// In a real application, this would be properly encrypted
function createSampleOrder(isBuy: boolean, token: string, price: bigint, size: bigint, owner: string): `0x${string}` {
  // Create a structured order
  const order = {
    token,
    price: price.toString(), // Fixed point representation (10^18)
    size: size.toString(),
    isBuy,
    owner  // Add the required owner field
  };
  
  // Convert to JSON and then to hex
  const orderJson = JSON.stringify(order);
  return `0x${Buffer.from(orderJson).toString("hex")}` as `0x${string}`;
}

async function main() {
  console.log("Testing ROFLSwap interaction with ROFL machine on:", hre.network.name);

  // Get wallet and client
  const [deployer] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("Using account:", deployer.account.address);
  
  // Get contract instances
  const roflSwapV2 = await hre.viem.getContractAt("ROFLSwapV2", ROFLSWAP_V2_ADDRESS);
  
  console.log("\n--- Checking Contract State ---");
  
  // Get token addresses
  const tokenAddresses = await roflSwapV2.read.getTokens();
  console.log(`Water Token: ${(tokenAddresses as any)[0]}`);
  console.log(`Fire Token: ${(tokenAddresses as any)[1]}`);
  
  // Get ROFL app address
  const roflAppAddress = await roflSwapV2.read.roflApp();
  console.log(`ROFL App Address: ${roflAppAddress}`);
  
  // Get current order counter
  const orderCounter = await roflSwapV2.read.orderCounter();
  console.log(`Current Order Counter: ${orderCounter}`);
  
  // Check if orders are already filled
  console.log("\n--- Checking Previous Orders ---");
  if (orderCounter > 0n) {
    for (let i = 1n; i <= orderCounter; i++) {
      const isFilled = await roflSwapV2.read.filledOrders([i]);
      console.log(`Order #${i} is ${isFilled ? 'FILLED' : 'NOT FILLED'}`);
    }
  }
  
  // Place a buy order for WATER token
  console.log("\n--- Placing Buy Order for WATER ---");
  const buyPrice = parseEther("0.02"); // 0.02 FIRE per WATER
  const buySize = parseEther("10");     // 10 WATER tokens
  const buyOrderData = createSampleOrder(true, WATER_TOKEN_ADDRESS, buyPrice, buySize, deployer.account.address);
  
  console.log(`Order Details (Buy):`);
  console.log(`- Token: WATER (${WATER_TOKEN_ADDRESS})`);
  console.log(`- Price: ${buyPrice.toString()} (${Number(buyPrice) / 1e18} FIRE per WATER)`);
  console.log(`- Size: ${buySize.toString()} (${Number(buySize) / 1e18} WATER tokens)`);
  console.log(`- Encoded Data: ${buyOrderData.slice(0, 100)}...`);
  
  console.log("\nPlacing buy order...");
  const buyTx = await roflSwapV2.write.placeOrder([buyOrderData]);
  
  console.log("Waiting for confirmation...");
  const buyReceipt = await publicClient.waitForTransactionReceipt({ hash: buyTx });
  console.log(`Buy order placed in block ${buyReceipt.blockNumber}`);
  
  // Get the new buy order ID
  const newOrderCounter = await roflSwapV2.read.orderCounter();
  const buyOrderId = newOrderCounter;
  console.log(`Buy Order ID: ${buyOrderId}`);
  
  // Place a sell order for WATER token
  console.log("\n--- Placing Sell Order for WATER ---");
  const sellPrice = parseEther("0.019"); // 0.019 FIRE per WATER (slightly lower than buy)
  const sellSize = parseEther("5");      // 5 WATER tokens
  const sellOrderData = createSampleOrder(false, WATER_TOKEN_ADDRESS, sellPrice, sellSize, deployer.account.address);
  
  console.log(`Order Details (Sell):`);
  console.log(`- Token: WATER (${WATER_TOKEN_ADDRESS})`);
  console.log(`- Price: ${sellPrice.toString()} (${Number(sellPrice) / 1e18} FIRE per WATER)`);
  console.log(`- Size: ${sellSize.toString()} (${Number(sellSize) / 1e18} WATER tokens)`);
  console.log(`- Encoded Data: ${sellOrderData.slice(0, 100)}...`);
  
  console.log("\nPlacing sell order...");
  const sellTx = await roflSwapV2.write.placeOrder([sellOrderData]);
  
  console.log("Waiting for confirmation...");
  const sellReceipt = await publicClient.waitForTransactionReceipt({ hash: sellTx });
  console.log(`Sell order placed in block ${sellReceipt.blockNumber}`);
  
  // Get the new sell order ID
  const finalOrderCounter = await roflSwapV2.read.orderCounter();
  const sellOrderId = finalOrderCounter;
  console.log(`Sell Order ID: ${sellOrderId}`);
  
  // Subscribe to OrderMatched events and monitor for matches
  console.log("\n--- Monitoring for Matches ---");
  console.log("Waiting for the ROFL matching engine to process orders...");
  console.log("This may take a few minutes as the ROFL app runs matching cycles...");
  console.log(`Watching for matches on buy order #${buyOrderId} and sell order #${sellOrderId}`);
  
  // Wait for 30 seconds, checking for filled orders every 5 seconds
  for (let i = 0; i < 6; i++) {
    console.log(`\nWaiting for 5 seconds (${i+1}/6)...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if orders are filled
    const buyFilled = await roflSwapV2.read.filledOrders([buyOrderId]);
    const sellFilled = await roflSwapV2.read.filledOrders([sellOrderId]);
    
    console.log(`Buy Order #${buyOrderId} status: ${buyFilled ? 'FILLED' : 'NOT FILLED'}`);
    console.log(`Sell Order #${sellOrderId} status: ${sellFilled ? 'FILLED' : 'NOT FILLED'}`);
    
    if (buyFilled || sellFilled) {
      console.log("\n✅ MATCH DETECTED! The ROFL matching engine has processed these orders.");
      console.log("This confirms that the ROFL application is working correctly with the contract.");
      break;
    }
  }
  
  // Get past events for OrderMatched to see what happened
  console.log("\n--- Checking OrderMatched Events ---");
  
  const startBlock = Math.min(Number(buyReceipt.blockNumber), Number(sellReceipt.blockNumber));
  const events = await publicClient.getLogs({
    address: ROFLSWAP_V2_ADDRESS as `0x${string}`,
    event: {
      type: 'event',
      name: 'OrderMatched',
      inputs: [
        { indexed: true, name: 'buyOrderId', type: 'uint256' },
        { indexed: true, name: 'sellOrderId', type: 'uint256' },
        { indexed: false, name: 'amount', type: 'uint256' },
        { indexed: false, name: 'price', type: 'uint256' }
      ]
    },
    fromBlock: BigInt(startBlock),
    toBlock: 'latest'
  });
  
  if (events.length > 0) {
    console.log(`Found ${events.length} OrderMatched events:`);
    events.forEach(event => {
      console.log(`- Match: Buy Order #${event.args.buyOrderId} + Sell Order #${event.args.sellOrderId}`);
      console.log(`  Amount: ${event.args.amount} (${Number(event.args.amount) / 1e18} tokens)`);
      console.log(`  Price: ${event.args.price} (${Number(event.args.price) / 1e18} per token)`);
      console.log(`  Block: ${event.blockNumber}`);
    });
  } else {
    console.log("No OrderMatched events found yet.");
    console.log("The ROFL matching engine may need more time to process these orders.");
    console.log("You can check later by looking for events or checking the order filled status.");
  }
  
  console.log("\n🌊 ROFLSwap + ROFL Interaction Test Complete 🌊");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 