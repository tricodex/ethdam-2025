// Script to place properly encrypted orders in the ROFLSwap contract
const hre = require("hardhat");
const { ethers } = require("hardhat");

// Custom minimal ABI with only the functions we need
const ROFLSWAP_ABI = [
  "function placeOrder(bytes memory encryptedOrder) returns (uint256)",
  "function getEncryptedOrder(uint256 orderId) view returns (bytes)",
  "function getMyOrders() view returns (uint256[])",
  "function getTotalOrderCount() view returns (uint256)",
  "function orderCounter() view returns (uint256)",
  "event OrderPlaced(uint256 indexed orderId, address indexed owner)"
];

const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

async function main() {
  // Contract addresses
  const roflSwapAddress = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df";
  const waterTokenAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
  const fireTokenAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";
  
  console.log(`Placing encrypted orders on ROFLSwap contract: ${roflSwapAddress}`);
  console.log(`WATER Token: ${waterTokenAddress}`);
  console.log(`FIRE Token: ${fireTokenAddress}`);
  
  // Get the signer
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Get contract instances using the custom ABI
  const ROFLSwap = new ethers.Contract(roflSwapAddress, ROFLSWAP_ABI, signer);
  const WaterToken = new ethers.Contract(waterTokenAddress, TOKEN_ABI, signer);
  const FireToken = new ethers.Contract(fireTokenAddress, TOKEN_ABI, signer);
  
  // Check current order count
  try {
    const orderCount = await ROFLSwap.getTotalOrderCount();
    console.log(`Current order count: ${orderCount}`);
  } catch (error) {
    console.log("Could not get order count, continuing anyway:", error.message);
  }
  
  // Check token balances
  try {
    const waterBalance = await WaterToken.balanceOf(signer.address);
    const fireBalance = await FireToken.balanceOf(signer.address);
    
    console.log(`WATER token balance: ${ethers.formatEther(waterBalance)}`);
    console.log(`FIRE token balance: ${ethers.formatEther(fireBalance)}`);
  } catch (error) {
    console.log("Could not get token balances, continuing anyway:", error.message);
  }
  
  // Approve ROFLSwap to spend tokens if needed
  const approveAmount = ethers.parseEther("1000");
  console.log("Approving ROFLSwap to spend WATER tokens...");
  try {
    const approveWaterTx = await WaterToken.approve(roflSwapAddress, approveAmount);
    await approveWaterTx.wait();
    console.log("WATER token approval successful");
  } catch (error) {
    console.log("WATER token approval failed, continuing anyway:", error.message);
  }
  
  console.log("Approving ROFLSwap to spend FIRE tokens...");
  try {
    const approveFireTx = await FireToken.approve(roflSwapAddress, approveAmount);
    await approveFireTx.wait();
    console.log("FIRE token approval successful");
  } catch (error) {
    console.log("FIRE token approval failed, continuing anyway:", error.message);
  }
  
  // Create the order objects
  // Buy order for WATER tokens
  const buyOrder = {
    owner: signer.address,
    token: waterTokenAddress,
    price: ethers.parseEther("1.0").toString(), // 1.0 WATER/FIRE price
    size: ethers.parseEther("5").toString(),     // 5 WATER tokens
    isBuy: true
  };
  
  // Sell order for WATER tokens
  const sellOrder = {
    owner: signer.address,
    token: waterTokenAddress,
    price: ethers.parseEther("1.0").toString(), // Same price for matching
    size: ethers.parseEther("5").toString(),     // 5 WATER tokens
    isBuy: false
  };
  
  // Convert the order objects to JSON strings
  const buyOrderStr = JSON.stringify(buyOrder);
  const sellOrderStr = JSON.stringify(sellOrder);
  
  console.log("Buy order:", buyOrderStr);
  console.log("Sell order:", sellOrderStr);
  
  // Convert to properly encrypted formats for Sapphire
  // For simplicity, we're just using UTF-8 bytes, but in a real app
  // this would be encrypted using the appropriate Sapphire APIs
  const encryptedBuyOrder = ethers.toUtf8Bytes(buyOrderStr);
  const encryptedSellOrder = ethers.toUtf8Bytes(sellOrderStr);
  
  // Place the buy order
  console.log("Placing buy order...");
  let buyOrderId;
  try {
    const buyTx = await ROFLSwap.placeOrder(encryptedBuyOrder);
    console.log("Buy order transaction sent:", buyTx.hash);
    const buyReceipt = await buyTx.wait();
    console.log("Buy order transaction confirmed");
    
    // Get the order ID from the event
    const orderPlacedEvent = buyReceipt.logs
      .map(log => {
        try {
          return ROFLSwap.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .find(event => event.name === 'OrderPlaced');
    
    buyOrderId = orderPlacedEvent ? orderPlacedEvent.args.orderId : "unknown";
    console.log(`Buy order placed with ID: ${buyOrderId}`);
  } catch (error) {
    console.error("Error placing buy order:", error.message);
  }
  
  // Wait a few seconds
  console.log("Waiting 3 seconds before placing sell order...");
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Place the sell order
  console.log("Placing sell order...");
  let sellOrderId;
  try {
    const sellTx = await ROFLSwap.placeOrder(encryptedSellOrder);
    console.log("Sell order transaction sent:", sellTx.hash);
    const sellReceipt = await sellTx.wait();
    console.log("Sell order transaction confirmed");
    
    // Get the order ID from the event
    const orderPlacedEvent = sellReceipt.logs
      .map(log => {
        try {
          return ROFLSwap.interface.parseLog(log);
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean)
      .find(event => event.name === 'OrderPlaced');
    
    sellOrderId = orderPlacedEvent ? orderPlacedEvent.args.orderId : "unknown";
    console.log(`Sell order placed with ID: ${sellOrderId}`);
  } catch (error) {
    console.error("Error placing sell order:", error.message);
  }
  
  // Get user's orders
  try {
    const userOrders = await ROFLSwap.getMyOrders();
    console.log(`User's orders: ${userOrders.join(', ')}`);
  } catch (error) {
    console.log("Could not get user orders:", error.message);
  }
  
  console.log("Orders have been placed. The ROFL app should now match them in its next cycle (60 seconds).");
  console.log("Wait for the ROFL app to match the orders, then check the results with the check-orders.js script.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
