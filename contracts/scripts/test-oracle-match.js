// Testing ROFLSwapOracle order matching
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Testing ROFLSwapOracle order matching...");
  
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
  const waterToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", privateWaterTokenAddress);
  const fireToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", privateFireTokenAddress);
  
  // Get oracle address from contract
  const contractOracle = await roflSwapOracle.oracle();
  console.log(`Oracle address: ${contractOracle}`);
  console.log(`Our address: ${signer.address}`);
  
  // Create order data
  const createOrderData = (token, isBuy, price, amount) => {
    const abiCoder = new ethers.AbiCoder();
    return abiCoder.encode(
      ["uint256", "address", "address", "uint256", "uint256", "bool"],
      [0, signer.address, token, price, amount, isBuy]
    );
  };
  
  // Place orders (buy and sell at same price to ensure they match)
  console.log("\nCreating buy order...");
  const buyAmount = ethers.parseEther("1.0");
  const buyPrice = ethers.parseEther("0.5");
  const buyOrderData = createOrderData(privateWaterTokenAddress, true, buyPrice, buyAmount);
  
  try {
    // Place buy order
    const buyTx = await roflSwapOracle.placeOrder(buyOrderData, { gasLimit: 1000000 });
    const buyReceipt = await buyTx.wait();
    
    // Get buy order ID
    const buyOrderId = await roflSwapOracle.getTotalOrderCount();
    console.log(`Buy order placed with ID: ${buyOrderId}`);
    
    // Place sell order
    console.log("\nCreating sell order...");
    const sellAmount = ethers.parseEther("1.0");
    const sellPrice = ethers.parseEther("0.5");
    const sellOrderData = createOrderData(privateWaterTokenAddress, false, sellPrice, sellAmount);
    
    const sellTx = await roflSwapOracle.placeOrder(sellOrderData, { gasLimit: 1000000 });
    const sellReceipt = await sellTx.wait();
    
    // Get sell order ID
    const sellOrderId = await roflSwapOracle.getTotalOrderCount();
    console.log(`Sell order placed with ID: ${sellOrderId}`);
    
    // Wait for orders to be matched by the deployed ROFL app in TEE
    console.log("\nWaiting for orders to be matched by the ROFL app in TEE...");
    console.log("(The matcher should run automatically in the deployed TEE environment)");
    
    // Wait for 300 seconds (5 minutes) - the ROFL app should match orders within this time
    console.log("Waiting 5 minutes for matching...");
    console.log("Started waiting at:", new Date().toISOString());
    await new Promise(resolve => setTimeout(resolve, 300000));
    console.log("Finished waiting at:", new Date().toISOString());
    
    // Check if orders are filled
    const isBuyOrderFilled = await roflSwapOracle.filledOrders(buyOrderId);
    const isSellOrderFilled = await roflSwapOracle.filledOrders(sellOrderId);
    
    console.log(`\nBuy order ${buyOrderId} filled: ${isBuyOrderFilled}`);
    console.log(`Sell order ${sellOrderId} filled: ${isSellOrderFilled}`);
    
    if (isBuyOrderFilled && isSellOrderFilled) {
      console.log("\n✅ SUCCESS: Orders were matched successfully by the ROFL app in TEE!");
    } else {
      console.log("\n❌ ORDERS NOT YET MATCHED: The ROFL app hasn't matched the orders within 5 minutes.");
      console.log("This could be because:");
      console.log("1. The ROFL app in TEE is still initializing or processing orders");
      console.log("2. The matcher is running on a longer interval");
      console.log("3. There might be an issue with the TEE environment");
      console.log("\nCheck the ROFL app logs to diagnose the issue.");
    }
    
  } catch (error) {
    console.error("Error testing order matching:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 