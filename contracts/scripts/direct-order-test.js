// Simplified test for ROFLSwap order matcher - bypassing token transfers
const { ethers } = require("ethers");

// Custom minimal ABI with only the functions we need
const ROFLSWAP_ABI = [
  "function placeOrder(bytes memory encryptedOrder) returns (uint256)",
  "function filledOrders(uint256 orderId) view returns (bool)",
  "event OrderPlaced(uint256 indexed orderId, address indexed owner)"
];

async function main() {
  // Contract address
  const roflSwapAddress = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df";
  const waterTokenAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
  const fireTokenAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";
  
  // Private keys - hardcoded for simplicity
  const buyerPrivateKey = process.env.PRIVATE_KEY || "23de751f6e85d7058d57c1f94b5962101592b34095385f7c6d78247a4b5bfc73";
  const sellerPrivateKey = process.env.PRIVATE_KEY_SELLER || "ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  
  // Addresses to use in orders (these are the addresses we want the TEE to use)
  const buyerAddress = "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8";
  const sellerAddress = "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1";
  
  // Set up provider
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  // Create wallets for signing transactions
  const buyerWallet = new ethers.Wallet(buyerPrivateKey, provider);
  const sellerWallet = new ethers.Wallet(sellerPrivateKey, provider);
  
  console.log("Direct Order Test - Bypassing Token Transfers");
  console.log(`Contract: ${roflSwapAddress}`);
  console.log(`Buyer wallet: ${buyerWallet.address}`);
  console.log(`Seller wallet: ${sellerWallet.address}`);
  console.log(`Using buyer address in order: ${buyerAddress}`);
  console.log(`Using seller address in order: ${sellerAddress}`);
  
  // Create contract instances
  const buyerRoflSwap = new ethers.Contract(roflSwapAddress, ROFLSWAP_ABI, buyerWallet);
  const sellerRoflSwap = new ethers.Contract(roflSwapAddress, ROFLSWAP_ABI, sellerWallet);
  
  // Create the order objects with matching price and size
  // Buy order from buyer for WATER tokens using FIRE tokens
  const buyOrder = {
    owner: buyerAddress,
    token: waterTokenAddress,
    price: ethers.parseEther("1.0").toString(), // 1.0 WATER/FIRE price
    size: ethers.parseEther("5").toString(),    // 5 WATER tokens
    isBuy: true
  };
  
  // Sell order using the correct seller address
  const sellOrder = {
    owner: sellerAddress,
    token: waterTokenAddress,
    price: ethers.parseEther("1.0").toString(), // Same price for matching
    size: ethers.parseEther("5").toString(),    // 5 WATER tokens
    isBuy: false
  };
  
  // Convert the order objects to JSON strings
  const buyOrderStr = JSON.stringify(buyOrder);
  const sellOrderStr = JSON.stringify(sellOrder);
  
  console.log("Buy order:", buyOrderStr);
  console.log("Sell order:", sellOrderStr);
  
  // Convert to properly encrypted formats for Sapphire
  const encryptedBuyOrder = ethers.toUtf8Bytes(buyOrderStr);
  const encryptedSellOrder = ethers.toUtf8Bytes(sellOrderStr);
  
  // Place the buy order
  console.log("\nPlacing buy order...");
  let buyOrderId;
  try {
    const buyTx = await buyerRoflSwap.placeOrder(encryptedBuyOrder);
    console.log("Buy order transaction sent:", buyTx.hash);
    const buyReceipt = await buyTx.wait();
    console.log("Buy order transaction confirmed");
    
    // Get the order ID from the event
    for (const log of buyReceipt.logs) {
      try {
        const parsedLog = buyerRoflSwap.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'OrderPlaced') {
          buyOrderId = parsedLog.args.orderId;
          console.log(`Buy order placed with ID: ${buyOrderId}`);
          break;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    if (!buyOrderId) {
      console.log("Could not extract order ID from transaction logs");
    }
  } catch (error) {
    console.error("Error placing buy order:", error.message);
  }
  
  // Wait a few seconds
  console.log("\nWaiting 5 seconds before placing sell order...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Place the sell order
  console.log("Placing sell order...");
  let sellOrderId;
  try {
    const sellTx = await sellerRoflSwap.placeOrder(encryptedSellOrder);
    console.log("Sell order transaction sent:", sellTx.hash);
    const sellReceipt = await sellTx.wait();
    console.log("Sell order transaction confirmed");
    
    // Get the order ID from the event
    for (const log of sellReceipt.logs) {
      try {
        const parsedLog = sellerRoflSwap.interface.parseLog(log);
        if (parsedLog && parsedLog.name === 'OrderPlaced') {
          sellOrderId = parsedLog.args.orderId;
          console.log(`Sell order placed with ID: ${sellOrderId}`);
          break;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    if (!sellOrderId) {
      console.log("Could not extract order ID from transaction logs");
    }
  } catch (error) {
    console.error("Error placing sell order:", error.message);
  }
  
  if (buyOrderId && sellOrderId) {
    console.log("\nBoth orders placed successfully!");
    console.log(`Buy order ID: ${buyOrderId}`);
    console.log(`Sell order ID: ${sellOrderId}`);
    console.log("\nWaiting 90 seconds for the TEE to process the orders...");
    
    // Wait for the TEE to process the orders (at least one cycle)
    await new Promise(resolve => setTimeout(resolve, 90000));
    
    // Check if orders are filled
    try {
      const isBuyFilled = await buyerRoflSwap.filledOrders(buyOrderId);
      console.log(`Buy order #${buyOrderId} status: ${isBuyFilled ? 'FILLED' : 'NOT FILLED'}`);
      
      const isSellFilled = await sellerRoflSwap.filledOrders(sellOrderId);
      console.log(`Sell order #${sellOrderId} status: ${isSellFilled ? 'FILLED' : 'NOT FILLED'}`);
      
      if (isBuyFilled && isSellFilled) {
        console.log("\n🎉 SUCCESS! Both orders were matched and filled by the TEE! 🎉");
      } else if (!isBuyFilled && !isSellFilled) {
        console.log("\n❌ Neither order was filled. The TEE might not be functioning correctly.");
      } else {
        console.log("\n⚠️ Only one order was filled, which is unexpected behavior.");
      }
    } catch (error) {
      console.log(`Error checking order status: ${error.message}`);
    }
  } else {
    console.log("\nFailed to place both orders. Cannot test order matching.");
  }
}

// Run the test
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  }); 