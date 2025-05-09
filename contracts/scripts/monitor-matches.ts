import hre from "hardhat";
import { Address } from "viem";

// Address of the deployed contracts
const ROFLSWAP_V2_ADDRESS = "0x552F5B746097219537F1041aA406c02F3474417A" as `0x${string}`;

// Default order IDs (will be updated dynamically unless provided via env vars)
let BUY_ORDER_ID: bigint;
let SELL_ORDER_ID: bigint;

// Parse environment variables if provided
function parseEnvVars() {
  const buyOrderEnv = process.env.BUY_ORDER_ID;
  const sellOrderEnv = process.env.SELL_ORDER_ID;
  
  if (buyOrderEnv && sellOrderEnv) {
    BUY_ORDER_ID = BigInt(buyOrderEnv);
    SELL_ORDER_ID = BigInt(sellOrderEnv);
    console.log(`Using order IDs from environment variables: Buy=${BUY_ORDER_ID}, Sell=${SELL_ORDER_ID}`);
    return true;
  }
  return false;
}

async function main() {
  console.log("Monitoring ROFLSwap for matches on network:", hre.network.name);
  
  // Get client
  const publicClient = await hre.viem.getPublicClient();
  
  // Get contract instance
  const roflSwapV2 = await hre.viem.getContractAt("ROFLSwapV2", ROFLSWAP_V2_ADDRESS);
  
  // Get current order counter to use last two orders if not specified via env vars
  const orderCounter = await roflSwapV2.read.orderCounter();
  
  // If env vars weren't provided, use the last two orders
  const envVarsProvided = parseEnvVars();
  if (!envVarsProvided) {
    if (orderCounter >= 2n) {
      SELL_ORDER_ID = orderCounter;
      BUY_ORDER_ID = orderCounter - 1n;
      console.log(`No order IDs provided. Using last two orders: Buy=${BUY_ORDER_ID}, Sell=${SELL_ORDER_ID}`);
    } else {
      console.error("ERROR: Not enough orders in the system. Please place at least 2 orders first.");
      process.exit(1);
    }
  }
  
  console.log(`Watching orders #${BUY_ORDER_ID} and #${SELL_ORDER_ID}`);
  
  console.log("\n--- Initial Contract State ---");
  
  // Get ROFL app address
  const roflAppAddress = await roflSwapV2.read.roflApp();
  console.log(`ROFL App Address: ${roflAppAddress}`);
  
  // Check initial order status
  const buyFilledInitial = await roflSwapV2.read.filledOrders([BUY_ORDER_ID]);
  const sellFilledInitial = await roflSwapV2.read.filledOrders([SELL_ORDER_ID]);
  
  console.log(`Buy Order #${BUY_ORDER_ID} status: ${buyFilledInitial ? 'FILLED' : 'NOT FILLED'}`);
  console.log(`Sell Order #${SELL_ORDER_ID} status: ${sellFilledInitial ? 'FILLED' : 'NOT FILLED'}`);
  
  // Monitor for changes in filled status
  console.log("\n--- Extended Monitoring for Matches ---");
  console.log("Monitoring orders for matches over a 5-minute period...");
  console.log("Checking every 30 seconds for 10 iterations.");
  
  let matchDetected = false;
  
  for (let i = 0; i < 10; i++) {
    console.log(`\nPoll #${i+1}/10 - Waiting 30 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // Check if orders are filled
    const buyFilled = await roflSwapV2.read.filledOrders([BUY_ORDER_ID]);
    const sellFilled = await roflSwapV2.read.filledOrders([SELL_ORDER_ID]);
    
    console.log(`Buy Order #${BUY_ORDER_ID} status: ${buyFilled ? 'FILLED' : 'NOT FILLED'}`);
    console.log(`Sell Order #${SELL_ORDER_ID} status: ${sellFilled ? 'FILLED' : 'NOT FILLED'}`);
    
    if (buyFilled || sellFilled) {
      console.log("\n✅ MATCH DETECTED! The ROFL matching engine has processed these orders.");
      matchDetected = true;
      break;
    }
  }
  
  if (!matchDetected) {
    console.log("\n⚠️ No matches detected within the 5-minute monitoring period.");
  }
  
  // Get past events for OrderMatched to see what happened
  console.log("\n--- Checking OrderMatched Events ---");
  
  const latestBlock = await publicClient.getBlockNumber();
  const startBlock = latestBlock - BigInt(100); // Look back 100 blocks (reduced from 1000 due to RPC limitations)
  
  const events = await publicClient.getLogs({
    address: ROFLSWAP_V2_ADDRESS,
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
    fromBlock: startBlock,
    toBlock: 'latest'
  });
  
  if (events.length > 0) {
    console.log(`Found ${events.length} OrderMatched events in the last 100 blocks:`);
    events.forEach(event => {
      console.log(`- Match: Buy Order #${event.args.buyOrderId} + Sell Order #${event.args.sellOrderId}`);
      console.log(`  Amount: ${event.args.amount} (${Number(event.args.amount) / 1e18} tokens)`);
      console.log(`  Price: ${event.args.price} (${Number(event.args.price) / 1e18} per token)`);
      console.log(`  Block: ${event.blockNumber}`);
    });
  } else {
    console.log("No OrderMatched events found in the last 100 blocks.");
  }
  
  // Check all orders in the system
  console.log("\n--- Checking All Orders in System ---");
  console.log(`Total orders in system: ${orderCounter}`);
  
  console.log("Order status for all orders:");
  for (let i = 1n; i <= orderCounter; i++) {
    const isFilled = await roflSwapV2.read.filledOrders([i]);
    console.log(`Order #${i} is ${isFilled ? 'FILLED' : 'NOT FILLED'}`);
  }
  
  console.log("\n--- ROFL Connection Check ---");
  console.log("In order for the ROFL app to process orders, it needs to:");
  console.log("1. Be correctly configured with the ROFLSwapV2 contract address");
  console.log("2. Have permission to access encrypted orders (be set as the ROFL app)");
  console.log("3. Be running and polling for new orders periodically");
  
  // Check ROFL app address in the contract
  console.log(`\nROFL App Address in Contract: ${roflAppAddress}`);
  console.log(`This should match the Ethereum address derived from ROFL app ID 'rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3'`);
  
  // Check if any historical matches exist
  console.log("\nChecking if any orders have ever been filled...");
  let anyFilled = false;
  for (let i = 1n; i <= orderCounter; i++) {
    const isFilled = await roflSwapV2.read.filledOrders([i]);
    if (isFilled) {
      anyFilled = true;
      console.log(`✅ Order #${i} is FILLED - This confirms the ROFL app has worked previously`);
    }
  }
  if (!anyFilled) {
    console.log("❌ No orders have ever been filled - The ROFL app may not be properly connected");
  }
  
  console.log("\n🌊 ROFLSwap Monitoring Complete 🌊");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 