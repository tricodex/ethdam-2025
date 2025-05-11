// Place order in ROFLSwapOracle
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Placing order in ROFLSwapOracle...");
  
  // Get arguments from hre
  const isBuy = hre.buyOrder === true;
  const amount = ethers.parseEther(hre.orderAmount || "1.0");
  const price = ethers.parseEther(hre.orderPrice || "0.5");
  
  // Set token based on the order type
  const token = isBuy ? "WATER" : "FIRE";
  
  console.log(`Order type: ${isBuy ? "buy" : "sell"}`);
  console.log(`Amount: ${ethers.formatEther(amount)} ${token}`);
  console.log(`Price: ${ethers.formatEther(price)} ${isBuy ? "FIRE" : "WATER"} per ${token}`);
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name to ensure correct deployment file is loaded
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
  const waterToken = await ethers.getContractAt("PrivateERC20", privateWaterTokenAddress);
  const fireToken = await ethers.getContractAt("PrivateERC20", privateFireTokenAddress);
  
  // Check token balances and approvals
  const tokenAddress = isBuy ? privateWaterTokenAddress : privateFireTokenAddress;
  const token1Address = isBuy ? privateFireTokenAddress : privateWaterTokenAddress;
  
  try {
    // Check balances
    const tokenBalance = await (isBuy ? waterToken : fireToken).balanceOf(signer.address);
    const token1Balance = await (isBuy ? fireToken : waterToken).balanceOf(signer.address);
    
    console.log(`${token} balance: ${ethers.formatEther(tokenBalance)}`);
    console.log(`${isBuy ? "FIRE" : "WATER"} balance: ${ethers.formatEther(token1Balance)}`);
    
    // Ensure enough balance
    if ((isBuy && token1Balance < price.mul(amount)) || (!isBuy && tokenBalance < amount)) {
      console.error(`Insufficient balance to place the order`);
      return;
    }
    
    // Ensure approvals
    const tokenApproval = await (isBuy ? waterToken : fireToken).allowance(signer.address, roflSwapOracleAddress);
    const token1Approval = await (isBuy ? fireToken : waterToken).allowance(signer.address, roflSwapOracleAddress);
    
    if (tokenApproval < amount) {
      console.log(`Approving ${token} tokens for ROFLSwapOracle...`);
      const approveTx = await (isBuy ? waterToken : fireToken).approve(roflSwapOracleAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log("Approval successful");
    }
    
    if (token1Approval < price.mul(amount)) {
      console.log(`Approving ${isBuy ? "FIRE" : "WATER"} tokens for ROFLSwapOracle...`);
      const approveTx = await (isBuy ? fireToken : waterToken).approve(roflSwapOracleAddress, ethers.MaxUint256);
      await approveTx.wait();
      console.log("Approval successful");
    }
    
    // Create order structure
    const orderId = 0; // Will be assigned by the contract
    const orderOwner = signer.address;
    const orderToken = isBuy ? privateWaterTokenAddress : privateFireTokenAddress;
    
    // Create order data
    const orderData = {
      orderId,
      owner: orderOwner,
      token: orderToken,
      price,
      size: amount,
      isBuy
    };
    
    // Encode order data
    const abiCoder = new ethers.AbiCoder();
    const encodedOrder = abiCoder.encode(
      ["uint256", "address", "address", "uint256", "uint256", "bool"],
      [orderId, orderOwner, orderToken, price, amount, isBuy]
    );
    
    // Place order
    console.log("Placing order in ROFLSwapOracle...");
    const tx = await roflSwapOracle.placeOrder(encodedOrder);
    const receipt = await tx.wait();
    
    // Get order ID from events
    const orderPlacedEvent = receipt.logs
      .filter(log => log.address === roflSwapOracleAddress)
      .map(log => {
        try {
          return roflSwapOracle.interface.parseLog({
            data: log.data,
            topics: log.topics
          });
        } catch (e) {
          return null;
        }
      })
      .filter(event => event && event.name === 'OrderPlaced')
      .pop();
    
    if (orderPlacedEvent) {
      const newOrderId = orderPlacedEvent.args[0];
      console.log(`✅ Order placed successfully! Order ID: ${newOrderId.toString()}`);
    } else {
      console.log("✅ Order transaction successful, but couldn't find the OrderPlaced event");
    }
    
    // Log transaction details
    console.log(`Transaction hash: ${receipt.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
  } catch (error) {
    console.error("Error placing order:", error);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

// Register Hardhat task parameters
if (hre.hardhatArguments && hre.hardhatArguments.params) {
  hre.buyOrder = hre.hardhatArguments.params.buy;
  hre.orderAmount = hre.hardhatArguments.params.amount;
  hre.orderPrice = hre.hardhatArguments.params.price;
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 