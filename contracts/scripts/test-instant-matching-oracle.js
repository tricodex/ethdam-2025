// Test script for instant order matching with ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n=== TESTING INSTANT ORDER MATCHING WITH ROFLSwapOracle ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Set contract addresses
  const roflSwapOracleAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  const waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
  const fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
  
  console.log(`ROFLSwapOracle address: ${roflSwapOracleAddress}`);
  console.log(`WATER token: ${waterTokenAddress}`);
  console.log(`FIRE token: ${fireTokenAddress}`);
  
  // Load the contract
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Request privacy access
  console.log("\nRequesting privacy access for tokens...");
  try {
    const privacyTx = await oracle.requestPrivacyAccess();
    await privacyTx.wait();
    console.log("Privacy access granted");
  } catch (error) {
    console.log("Privacy access already granted or error: ", error.message);
  }
  
  // Load token contracts
  const waterToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", waterTokenAddress);
  const fireToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", fireTokenAddress);
  
  // Check balances
  const waterBalance = await waterToken.balanceOf(signer.address);
  const fireBalance = await fireToken.balanceOf(signer.address);
  console.log(`WATER balance: ${ethers.formatEther(waterBalance)}`);
  console.log(`FIRE balance: ${ethers.formatEther(fireBalance)}`);
  
  // Approve tokens
  console.log("\nApproving tokens for trading...");
  try {
    const waterApprovalTx = await waterToken.approve(roflSwapOracleAddress, ethers.MaxUint256);
    await waterApprovalTx.wait();
    console.log("WATER token approved");
    
    const fireApprovalTx = await fireToken.approve(roflSwapOracleAddress, ethers.MaxUint256);
    await fireApprovalTx.wait();
    console.log("FIRE token approved");
    
    console.log("Token approvals complete");
  } catch (error) {
    console.log("Token approvals may already exist or error: ", error.message);
  }
  
  console.log("\n1. Placing Buy Order...");
  // Create buy order for WATER token
  const buyOrderAmount = ethers.parseEther("1.0");
  const buyOrderPrice = ethers.parseEther("0.5");
  
  // Encode buy order
  const abiCoder = new ethers.AbiCoder();
  const buyOrderData = abiCoder.encode(
    ["uint256", "address", "address", "uint256", "uint256", "bool"],
    [0, signer.address, waterTokenAddress, buyOrderPrice, buyOrderAmount, true]
  );
  
  // Place buy order
  try {
    const buyTx = await oracle.placeOrder(buyOrderData, { gasLimit: 1000000 });
    console.log(`Buy order transaction: ${buyTx.hash}`);
    const buyReceipt = await buyTx.wait();
    
    // Get order ID from events
    const buyOrderEvent = buyReceipt.logs
      .filter(log => log.address === roflSwapOracleAddress)
      .map(log => {
        try {
          return oracle.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
        } catch (e) {
          return null;
        }
      })
      .filter(event => event && event.name === 'OrderPlaced')
      .pop();
    
    const buyOrderId = buyOrderEvent ? buyOrderEvent.args[0] : 'unknown';
    console.log(`Buy order placed successfully with ID: ${buyOrderId}`);
  } catch (error) {
    console.error(`Error placing buy order: ${error.message}`);
    return;
  }
  
  console.log("\n2. Placing Sell Order with matching price...");
  // Create sell order for WATER token
  const sellOrderAmount = ethers.parseEther("1.0");
  const sellOrderPrice = ethers.parseEther("0.5"); // Same price for easy matching
  
  // Encode sell order
  const sellOrderData = abiCoder.encode(
    ["uint256", "address", "address", "uint256", "uint256", "bool"],
    [0, signer.address, waterTokenAddress, sellOrderPrice, sellOrderAmount, false]
  );
  
  // Place sell order
  try {
    const sellTx = await oracle.placeOrder(sellOrderData, { gasLimit: 1000000 });
    console.log(`Sell order transaction: ${sellTx.hash}`);
    const sellReceipt = await sellTx.wait();
    
    // Get order ID from events
    const sellOrderEvent = sellReceipt.logs
      .filter(log => log.address === roflSwapOracleAddress)
      .map(log => {
        try {
          return oracle.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
        } catch (e) {
          return null;
        }
      })
      .filter(event => event && event.name === 'OrderPlaced')
      .pop();
    
    const sellOrderId = sellOrderEvent ? sellOrderEvent.args[0] : 'unknown';
    console.log(`Sell order placed successfully with ID: ${sellOrderId}`);
  } catch (error) {
    console.error(`Error placing sell order: ${error.message}`);
    return;
  }
  
  console.log("\n3. Waiting for matcher to process orders...");
  
  // Wait for the matcher to process the orders
  console.log("Waiting 60 seconds for orders to be matched by the ROFL TEE matcher...");
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  console.log("\n4. Checking order status...");
  try {
    // Get the total order count
    const totalOrders = await oracle.getTotalOrderCount();
    console.log(`Total orders in the system: ${totalOrders}`);
    
    // Check last few orders
    const startIdx = Math.max(1, Number(totalOrders) - 5);
    for (let i = startIdx; i <= Number(totalOrders); i++) {
      try {
        const isFilled = await oracle.filledOrders(i);
        console.log(`Order #${i}: Filled: ${isFilled}`);
      } catch (error) {
        console.log(`Error checking order #${i}: ${error.message}`);
      }
    }
    
    console.log("\nTest completed. Check the log for matched orders.");
    console.log("If orders were not matched, the ROFLSwap matcher may need more time");
    console.log("or there might be an issue with the matcher configuration.");
  } catch (error) {
    console.error(`Error checking order status: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 