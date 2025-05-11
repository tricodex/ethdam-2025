// Script to analyze order matching on ROFLSwapV5
const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

// Color constants for output
const COLORS = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m"
};

// Helper function for colored logging
function colorLog(message, color) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function main() {
  colorLog("\n=== ANALYZING POTENTIAL ORDER MATCHES ON ROFLSWAPV5 ===\n", COLORS.BLUE);
  
  try {
    // Get the network and check if we're on a testnet (default to sapphire-testnet if not specified)
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    console.log(`Using network: ${network}`);
    
    // Get hardcoded addresses for ROFLSwapV5, Water and Fire tokens for testnet
    const roflSwapV5Address = "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB";
    const waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
    const fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
    
    console.log(`ROFLSwapV5: ${roflSwapV5Address}`);
    console.log(`Water Token: ${waterTokenAddress}`);
    console.log(`Fire Token: ${fireTokenAddress}`);
    
    // Get the ROFLSwapV5 and token contracts
    const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
    const roflSwap = ROFLSwapV5.attach(roflSwapV5Address);
    
    const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
    const waterToken = PrivateERC20.attach(waterTokenAddress);
    const fireToken = PrivateERC20.attach(fireTokenAddress);
    
    // Get account
    const [signer] = await ethers.getSigners();
    console.log(`Using address: ${signer.address}`);
    
    // Get total order count
    const totalOrderCount = Number(await roflSwap.orderCounter());
    console.log(`\n${COLORS.GREEN}Total Orders in System: ${totalOrderCount}${COLORS.RESET}`);
    
    // Display recent orders and their status
    colorLog("\n=== RECENT ORDERS ANALYSIS ===", COLORS.MAGENTA);
    
    // Track odd and even orders (simple heuristic for buy/sell)
    const evenOrders = []; // Assume these might be buy orders
    const oddOrders = []; // Assume these might be sell orders
    
    const numOrdersToCheck = Math.min(totalOrderCount, 10); // Check the last 10 orders
    
    for (let i = totalOrderCount; i > totalOrderCount - numOrdersToCheck && i > 0; i--) {
      try {
        const orderExists = await roflSwap.orderExists(i);
        const isFilled = await roflSwap.filledOrders(i);
        
        if (orderExists) {
          console.log(`Order ${i}: Exists (Filled: ${isFilled ? 'YES' : 'NO'})`);
          
          // Simplistic approach: even order IDs are buy, odd are sell
          if (i % 2 === 0) {
            evenOrders.push(i);
          } else {
            oddOrders.push(i);
          }
        } else {
          console.log(`Order ${i}: Does not exist`);
        }
      } catch (error) {
        console.log(`Order ${i}: Error checking - ${error.message}`);
      }
    }
    
    colorLog("\n=== MATCHING ANALYSIS ===", COLORS.CYAN);
    console.log(`Even-numbered Orders (might be buys): ${evenOrders.length > 0 ? evenOrders.join(', ') : 'None detected'}`);
    console.log(`Odd-numbered Orders (might be sells): ${oddOrders.length > 0 ? oddOrders.join(', ') : 'None detected'}`);
    
    // Check if we have both buy and sell orders in the system
    if (evenOrders.length > 0 && oddOrders.length > 0) {
      colorLog("\n✅ POTENTIAL MATCHES EXIST", COLORS.GREEN);
      console.log("There are both odd and even order IDs in the system.");
      console.log("If some orders are buys and others are sells, they should be matched by the ROFL app if:");
      console.log("1. The prices are compatible");
      console.log("2. The ROFL app is running properly");
      console.log("3. Privacy access is granted between contracts");
      console.log("4. The matcher has enough gas tokens to execute matches");
    } else if (evenOrders.length === 0 && oddOrders.length === 0) {
      colorLog("\n❌ NO VISIBLE ORDERS", COLORS.RED);
      console.log("No orders were detected in the system.");
      console.log("Try placing both a buy and sell order to test matching.");
    } else if (evenOrders.length === 0) {
      colorLog("\n❌ ONLY ODD-NUMBERED ORDERS", COLORS.YELLOW);
      console.log("Only odd-numbered orders were detected.");
      console.log("Try placing a buy order (will likely get an even ID) to create a potential match.");
    } else {
      colorLog("\n❌ ONLY EVEN-NUMBERED ORDERS", COLORS.YELLOW);
      console.log("Only even-numbered orders were detected.");
      console.log("Try placing a sell order (will likely get an odd ID) to create a potential match.");
    }
    
    // Check if we need to place more orders
    const needsMoreOrders = evenOrders.length === 0 || oddOrders.length === 0;
    
    colorLog("\n=== NEXT STEPS ===", COLORS.BLUE);
    if (needsMoreOrders) {
      if (evenOrders.length === 0) {
        console.log("1. Place a buy order:  bun hardhat run scripts/place-buy-order.js --network sapphire-testnet");
      } else {
        console.log("1. Place a sell order: bun hardhat run scripts/place-sell-order.js --network sapphire-testnet");
      }
    } else {
      console.log("1. Wait for orders to be matched by the ROFL app");
      console.log("   (Orders are processed asynchronously in batches)");
    }
    console.log("2. Check ROFL app:     cd ../rofl_app && oasis rofl show");
    console.log("3. Verify privacy:      bun hardhat check-privacy-access --contract 0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB --network sapphire-testnet");
    console.log("4. Check order status:  bun hardhat run scripts/check-order-status.js --network sapphire-testnet");
    
  } catch (error) {
    console.error("Error:", error);
    console.log("\nPossible issues:");
    console.log("1. The contract address might be incorrect");
    console.log("2. The network connection might be unstable");
    console.log("3. The ROFLSwapV5 contract might have an unexpected error");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 