
import { task } from "hardhat/config";

task("test-placement", "Test order placement on ROFLSwap")
  .addOptionalParam("contract", "The address of the ROFLSwap contract", "0x9b6e338C0b8d27833D788D4e0a429cCe6924c490")
  .addOptionalParam("watertoken", "The address of the WATER token", "0x06C39E421ec9c6076fC052AC330CcCAB61a2Dd2C")
  .addOptionalParam("firetoken", "The address of the FIRE token", "0x442eAB7743EFDa5a990416F9E5E3B9a20371598A")
  .setAction(async (taskArgs, hre) => {
    console.log(`Testing order placement on ROFLSwap contract: ${taskArgs.contract}`);
    console.log(`WATER Token: ${taskArgs.watertoken}`);
    console.log(`FIRE Token: ${taskArgs.firetoken}`);
    
    // Get the signer
    const [signer] = await hre.ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Get contract instances
    const ROFLSwap = await hre.ethers.getContractAt("ROFLSwapV3", taskArgs.contract);
    const WaterToken = await hre.ethers.getContractAt("MockToken", taskArgs.watertoken);
    const FireToken = await hre.ethers.getContractAt("MockToken", taskArgs.firetoken);
    
    // Check current order count
    const orderCount = await ROFLSwap.orderCounter();
    console.log(`Current order count: ${orderCount}`);
    
    // Check token balances
    const waterBalance = await WaterToken.balanceOf(signer.address);
    const fireBalance = await FireToken.balanceOf(signer.address);
    
    console.log(`WATER token balance: ${hre.ethers.formatEther(waterBalance)}`);
    console.log(`FIRE token balance: ${hre.ethers.formatEther(fireBalance)}`);
    
    // Approve ROFLSwap to spend tokens
    const approveAmount = hre.ethers.parseEther("1000");
    console.log("Approving ROFLSwap to spend WATER tokens...");
    const approveWaterTx = await WaterToken.approve(ROFLSwap.target, approveAmount);
    await approveWaterTx.wait();
    
    console.log("Approving ROFLSwap to spend FIRE tokens...");
    const approveFireTx = await FireToken.approve(ROFLSwap.target, approveAmount);
    await approveFireTx.wait();
    
    // Create buy and sell orders for WATER token
    // The orders need to be encrypted, but for testing, we'll use simple JSON
    // In a real app, we'd use the Sapphire's encryption utilities
    
    // Buy order for WATER tokens
    const buyOrder = JSON.stringify({
      owner: signer.address,
      token: taskArgs.watertoken,
      price: hre.ethers.parseEther("1.5").toString(), // Price in terms of FIRE/WATER
      size: hre.ethers.parseEther("10").toString(),
      isBuy: true
    });
    
    // Sell order for WATER tokens
    const sellOrder = JSON.stringify({
      owner: signer.address,
      token: taskArgs.watertoken,
      price: hre.ethers.parseEther("1.4").toString(), // Price in terms of FIRE/WATER
      size: hre.ethers.parseEther("10").toString(),
      isBuy: false
    });
    
    // Encrypt the orders using Sapphire's encryption utilities
    // For testing, we'll just use the raw JSON as bytes
    const encryptedBuyOrder = hre.ethers.toUtf8Bytes(buyOrder);
    const encryptedSellOrder = hre.ethers.toUtf8Bytes(sellOrder);
    
    // Place the buy order
    console.log("Placing buy order...");
    console.log("Buy order data:", buyOrder);
    try {
      const buyTx = await ROFLSwap.placeOrder(encryptedBuyOrder);
      const buyReceipt = await buyTx.wait();
      
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
      
      const buyOrderId = orderPlacedEvent ? orderPlacedEvent.args.orderId : null;
      console.log(`Buy order placed with ID: ${buyOrderId}`);
    } catch (error) {
      console.error("Error placing buy order:", error);
    }
    
    // Place the sell order
    console.log("Placing sell order...");
    console.log("Sell order data:", sellOrder);
    try {
      const sellTx = await ROFLSwap.placeOrder(encryptedSellOrder);
      const sellReceipt = await sellTx.wait();
      
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
      
      const sellOrderId = orderPlacedEvent ? orderPlacedEvent.args.orderId : null;
      console.log(`Sell order placed with ID: ${sellOrderId}`);
    } catch (error) {
      console.error("Error placing sell order:", error);
    }
    
    // Check updated order count
    const newOrderCount = await ROFLSwap.orderCounter();
    console.log(`New order count: ${newOrderCount}`);
    
    // Get user's orders
    const userOrders = await ROFLSwap.getMyOrders();
    console.log(`User's orders: ${userOrders.join(', ')}`);
    
    console.log("Done placing test orders. The ROFL app should now match them in its next cycle.");
    console.log("Check the ROFL app logs in about a minute to see if the orders were matched.");
  });

export {};
