// Execute a match between two orders in ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Executing order match in ROFLSwapOracle...");
  
  // Get order IDs from command line arguments
  const args = process.argv.slice(2);
  
  const buyOrderIdIndex = args.indexOf("--buy-order");
  const sellOrderIdIndex = args.indexOf("--sell-order");
  
  if (buyOrderIdIndex === -1 || sellOrderIdIndex === -1 || 
      args.length <= buyOrderIdIndex + 1 || args.length <= sellOrderIdIndex + 1) {
    console.error("Usage: bun execute-oracle-match.js --buy-order {id} --sell-order {id} [--amount {amount}]");
    process.exit(1);
  }
  
  const buyOrderId = args[buyOrderIdIndex + 1];
  const sellOrderId = args[sellOrderIdIndex + 1];
  
  console.log(`Buy Order ID: ${buyOrderId}`);
  console.log(`Sell Order ID: ${sellOrderId}`);
  
  // Get optional amount parameter
  let matchAmount;
  const amountIndex = args.indexOf("--amount");
  if (amountIndex !== -1 && args.length > amountIndex + 1) {
    matchAmount = ethers.parseEther(args[amountIndex + 1]);
    console.log(`Match Amount: ${ethers.formatEther(matchAmount)}`);
  }
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Load deployment information
  let roflSwapOracleAddress, privateWaterTokenAddress, privateFireTokenAddress;
  try {
    const deploymentData = JSON.parse(
      fs.readFileSync(`./roflswap-oracle-deployment-${hre.network.name}.json`)
    );
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
  
  // Get contract instance
  const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  try {
    // Check oracle address
    const contractOracle = await roflSwapOracle.oracle();
    if (contractOracle !== signer.address) {
      console.error(`Your address (${signer.address}) does not match the oracle address (${contractOracle})`);
      console.error("You are not authorized to execute matches. Please set yourself as the oracle or use the correct account.");
      return;
    }
    
    // Check if orders exist
    const buyOrderExists = await roflSwapOracle.orderExists(buyOrderId);
    const sellOrderExists = await roflSwapOracle.orderExists(sellOrderId);
    
    if (!buyOrderExists) {
      console.error(`Buy order ${buyOrderId} does not exist`);
      return;
    }
    
    if (!sellOrderExists) {
      console.error(`Sell order ${sellOrderId} does not exist`);
      return;
    }
    
    // Check if orders are already filled
    const isBuyOrderFilled = await roflSwapOracle.filledOrders(buyOrderId);
    const isSellOrderFilled = await roflSwapOracle.filledOrders(sellOrderId);
    
    if (isBuyOrderFilled) {
      console.error(`Buy order ${buyOrderId} is already filled`);
      return;
    }
    
    if (isSellOrderFilled) {
      console.error(`Sell order ${sellOrderId} is already filled`);
      return;
    }
    
    // Need to fetch order details - this is a bit tricky as it requires auth token
    // For simplicity, we'll use empty auth token and let the contract verify that we're the oracle
    const authToken = Buffer.from(""); // Empty auth token for oracle
    
    // Fetch buy order details
    const buyOrderData = await roflSwapOracle.getEncryptedOrder(authToken, buyOrderId);
    const buyOrderOwner = await roflSwapOracle.getOrderOwner(authToken, buyOrderId);
    
    // Fetch sell order details
    const sellOrderData = await roflSwapOracle.getEncryptedOrder(authToken, sellOrderId);
    const sellOrderOwner = await roflSwapOracle.getOrderOwner(authToken, sellOrderId);
    
    console.log(`Buy Order Owner: ${buyOrderOwner}`);
    console.log(`Sell Order Owner: ${sellOrderOwner}`);
    
    // Decode order data
    const abiCoder = new ethers.AbiCoder();
    
    const buyOrderDecoded = abiCoder.decode(
      ["uint256", "address", "address", "uint256", "uint256", "bool"],
      buyOrderData
    );
    
    const sellOrderDecoded = abiCoder.decode(
      ["uint256", "address", "address", "uint256", "uint256", "bool"],
      sellOrderData
    );
    
    const buyOrderToken = buyOrderDecoded[2];
    const buyOrderPrice = buyOrderDecoded[3];
    const buyOrderSize = buyOrderDecoded[4];
    const isBuyOrderBuy = buyOrderDecoded[5];
    
    const sellOrderToken = sellOrderDecoded[2];
    const sellOrderPrice = sellOrderDecoded[3];
    const sellOrderSize = sellOrderDecoded[4];
    const isSellOrderBuy = sellOrderDecoded[5];
    
    // Validate orders
    if (!isBuyOrderBuy) {
      console.error(`Order ${buyOrderId} is not a buy order`);
      return;
    }
    
    if (isSellOrderBuy) {
      console.error(`Order ${sellOrderId} is not a sell order`);
      return;
    }
    
    if (buyOrderToken !== sellOrderToken) {
      console.error(`Token mismatch: Buy order token: ${buyOrderToken}, Sell order token: ${sellOrderToken}`);
      return;
    }
    
    if (buyOrderPrice.lt(sellOrderPrice)) {
      console.error(`Price mismatch: Buy price ${ethers.formatEther(buyOrderPrice)} < Sell price ${ethers.formatEther(sellOrderPrice)}`);
      return;
    }
    
    // Determine match amount
    const maxMatchAmount = matchAmount || 
                         (buyOrderSize.lt(sellOrderSize) ? buyOrderSize : sellOrderSize);
    
    console.log(`Buy Order Size: ${ethers.formatEther(buyOrderSize)}`);
    console.log(`Sell Order Size: ${ethers.formatEther(sellOrderSize)}`);
    console.log(`Buy Order Price: ${ethers.formatEther(buyOrderPrice)}`);
    console.log(`Sell Order Price: ${ethers.formatEther(sellOrderPrice)}`);
    console.log(`Match Amount: ${ethers.formatEther(maxMatchAmount)}`);
    
    // Execute match
    console.log("Executing match...");
    const tx = await roflSwapOracle.executeMatch(
      buyOrderId,
      sellOrderId,
      buyOrderOwner,
      sellOrderOwner,
      buyOrderToken,
      maxMatchAmount,
      buyOrderPrice
    );
    
    const receipt = await tx.wait();
    
    console.log("✅ Match executed successfully");
    console.log(`Transaction hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check if orders are filled now
    const isBuyOrderFilledNow = await roflSwapOracle.filledOrders(buyOrderId);
    const isSellOrderFilledNow = await roflSwapOracle.filledOrders(sellOrderId);
    
    console.log(`Buy order ${buyOrderId} filled: ${isBuyOrderFilledNow}`);
    console.log(`Sell order ${sellOrderId} filled: ${isSellOrderFilledNow}`);
    
  } catch (error) {
    console.error("Error executing match:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 