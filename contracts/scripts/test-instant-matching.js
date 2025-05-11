// Test script for instant order matching
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n=== TESTING INSTANT ORDER MATCHING ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Load deployment information
  let roflSwapOracleAddress;
  let waterTokenAddress;
  let fireTokenAddress;
  
  try {
    const deploymentFilePath = `./roflswap-oracle-deployment-${networkName}.json`;
    console.log(`Loading deployment from: ${deploymentFilePath}`);
    
    if (!fs.existsSync(deploymentFilePath)) {
      throw new Error(`Deployment file not found: ${deploymentFilePath}`);
    }
    
    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
    roflSwapOracleAddress = deploymentInfo.roflSwapOracle;
    waterTokenAddress = deploymentInfo.privateWaterToken;
    fireTokenAddress = deploymentInfo.privateFireToken;
    
    console.log(`Oracle address: ${roflSwapOracleAddress}`);
    console.log(`WATER token: ${waterTokenAddress}`);
    console.log(`FIRE token: ${fireTokenAddress}`);
  } catch (error) {
    console.error(`Error loading deployment info: ${error.message}`);
    return;
  }
  
  // Load the contract
  const ROFLSwapOracle = await ethers.getContractFactory("ROFLSwapOracle");
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Request privacy access
  console.log("\nRequesting privacy access for tokens...");
  const privacyTx = await oracle.requestPrivacyAccess();
  await privacyTx.wait();
  console.log("Privacy access granted");
  
  // Load token contracts
  const waterToken = await ethers.getContractAt("PrivateERC20", waterTokenAddress);
  const fireToken = await ethers.getContractAt("PrivateERC20", fireTokenAddress);
  
  // Check balances
  const waterBalance = await waterToken.balanceOf(signer.address);
  const fireBalance = await fireToken.balanceOf(signer.address);
  console.log(`WATER balance: ${ethers.formatEther(waterBalance)}`);
  console.log(`FIRE balance: ${ethers.formatEther(fireBalance)}`);
  
  // Approve tokens
  console.log("\nApproving tokens for trading...");
  await (await waterToken.approve(roflSwapOracleAddress, ethers.MaxUint256)).wait();
  await (await fireToken.approve(roflSwapOracleAddress, ethers.MaxUint256)).wait();
  console.log("Token approvals complete");
  
  console.log("\n1. Placing Buy Order...");
  // Create buy order
  const buyOrderAmount = ethers.parseEther("1.0");
  const buyOrderPrice = ethers.parseEther("0.5");
  
  // Encode buy order
  const abiCoder = new ethers.AbiCoder();
  const buyOrderData = abiCoder.encode(
    ["uint256", "address", "address", "uint256", "uint256", "bool"],
    [0, signer.address, waterTokenAddress, buyOrderPrice, buyOrderAmount, true]
  );
  
  // Place buy order
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
  
  const buyOrderId = buyOrderEvent.args[0];
  console.log(`Buy order placed successfully with ID: ${buyOrderId}`);
  
  console.log("\n2. Placing Sell Order with matching price...");
  // Create sell order
  const sellOrderAmount = ethers.parseEther("1.0");
  const sellOrderPrice = ethers.parseEther("0.5"); // Same price for easy matching
  
  // Encode sell order
  const sellOrderData = abiCoder.encode(
    ["uint256", "address", "address", "uint256", "uint256", "bool"],
    [0, signer.address, waterTokenAddress, sellOrderPrice, sellOrderAmount, false]
  );
  
  // Place sell order
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
  
  const sellOrderId = sellOrderEvent.args[0];
  console.log(`Sell order placed successfully with ID: ${sellOrderId}`);
  
  console.log("\n3. Waiting for matcher to process orders...");
  
  // Wait for the matcher to process the orders
  console.log("Waiting 30 seconds for orders to be matched...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  console.log("\n4. Checking order status...");
  
  // Check order status
  const buyOrderFilled = await oracle.filledOrders(buyOrderId);
  const sellOrderFilled = await oracle.filledOrders(sellOrderId);
  
  console.log(`Buy order ${buyOrderId} filled: ${buyOrderFilled}`);
  console.log(`Sell order ${sellOrderId} filled: ${sellOrderFilled}`);
  
  if (buyOrderFilled && sellOrderFilled) {
    console.log("\n✅ SUCCESS: Orders were matched successfully!");
  } else {
    console.log("\n❌ FAILURE: Orders were not matched within the expected timeframe.");
    console.log("You may need to run the matcher in a TEE environment for this to work properly.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 