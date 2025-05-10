
// Script to check if orders have been matched by the ROFL app
const hre = require("hardhat");

async function main() {
  const roflSwapAddress = "0x9b6e338C0b8d27833D788D4e0a429cCe6924c490";
  
  console.log(`Checking orders on ROFLSwap contract: ${roflSwapAddress}`);
  
  // Get contract instance
  const ROFLSwap = await hre.ethers.getContractAt("ROFLSwapV3", roflSwapAddress);
  
  // Check total order count
  const orderCount = await ROFLSwap.orderCounter();
  console.log(`Total order count: ${orderCount}`);
  
  // Check if any orders are filled
  console.log(`\nChecking if orders have been filled:`);
  for (let i = 1; i <= orderCount; i++) {
    const isFilled = await ROFLSwap.filledOrders(i);
    console.log(`Order #${i}: ${isFilled ? 'FILLED' : 'NOT FILLED'}`);
  }
  
  // Try to get OrderMatched events
  const filter = ROFLSwap.filters.OrderMatched();
  console.log("\nAttempting to get recent OrderMatched events...");
  try {
    // Use a smaller block range (100 blocks)
    const events = await ROFLSwap.queryFilter(filter, -100);
    
    console.log(`Found ${events.length} OrderMatched events:`);
    
    for (const event of events) {
      console.log(`Match: Buy Order #${event.args.buyOrderId}, Sell Order #${event.args.sellOrderId}`);
      console.log(`       Amount: ${hre.ethers.formatEther(event.args.amount)}, Price: ${hre.ethers.formatEther(event.args.price)}`);
      console.log(`       Block: ${event.blockNumber}, Transaction: ${event.transactionHash}`);
      console.log(``);
    }
  } catch (error) {
    console.log(`Error getting events: ${error.message}`);
    console.log("This is expected if there are no matching events yet.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
