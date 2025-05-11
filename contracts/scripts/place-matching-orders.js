// Place a pair of matching orders in ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Placing matching orders in ROFLSwapOracle...");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Load deployment information
  let roflSwapOracleAddress, privateWaterTokenAddress, privateFireTokenAddress;
  try {
    const deploymentFilePath = `./roflswap-oracle-deployment-${networkName}.json`;
    console.log(`Loading deployment from: ${deploymentFilePath}`);
    
    if (!fs.existsSync(deploymentFilePath)) {
      throw new Error(`Deployment file not found: ${deploymentFilePath}`);
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath));
    roflSwapOracleAddress = deploymentData.roflSwapOracle;
    privateWaterTokenAddress = deploymentData.privateWaterToken;
    privateFireTokenAddress = deploymentData.privateFireToken;
    console.log(`ROFLSwapOracle: ${roflSwapOracleAddress}`);
    console.log(`WATER Token: ${privateWaterTokenAddress}`);
    console.log(`FIRE Token: ${privateFireTokenAddress}`);
  } catch (error) {
    console.error("Failed to load deployment information:", error.message);
    throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
  }
  
  // Get contract instances
  const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Create order data
  const createOrderData = (token, isBuy, price, amount) => {
    const abiCoder = new ethers.AbiCoder();
    return abiCoder.encode(
      ["uint256", "address", "address", "uint256", "uint256", "bool"],
      [0, signer.address, token, price, amount, isBuy]
    );
  };
  
  // Place orders that match exactly for easier testing
  console.log("\nCreating buy order...");
  const buyAmount = ethers.parseEther("1.0");
  const buyPrice = ethers.parseEther("0.5");
  const buyOrderData = createOrderData(privateWaterTokenAddress, true, buyPrice, buyAmount);
  
  try {
    // Place buy order
    const buyTx = await roflSwapOracle.placeOrder(buyOrderData, { gasLimit: 1000000 });
    console.log(`Buy order transaction hash: ${buyTx.hash}`);
    const buyReceipt = await buyTx.wait();
    
    // Get buy order ID
    const buyOrderId = await roflSwapOracle.getTotalOrderCount();
    console.log(`Buy order placed with ID: ${buyOrderId}`);
    
    // Place sell order with same price to ensure matching
    console.log("\nCreating sell order...");
    const sellAmount = ethers.parseEther("1.0"); // Same amount
    const sellPrice = ethers.parseEther("0.5"); // Same price
    const sellOrderData = createOrderData(privateWaterTokenAddress, false, sellPrice, sellAmount);
    
    const sellTx = await roflSwapOracle.placeOrder(sellOrderData, { gasLimit: 1000000 });
    console.log(`Sell order transaction hash: ${sellTx.hash}`);
    const sellReceipt = await sellTx.wait();
    
    // Get sell order ID
    const sellOrderId = await roflSwapOracle.getTotalOrderCount();
    console.log(`Sell order placed with ID: ${sellOrderId}`);
    
    console.log("\nOrders successfully placed:");
    console.log(`- Buy Order: #${buyOrderId}`);
    console.log(`- Sell Order: #${sellOrderId}`);
    console.log("\nCheck these orders with the check-orders-status.js script");
    
  } catch (error) {
    console.error("Error placing orders:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 