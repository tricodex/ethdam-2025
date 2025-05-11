// Test script for instant order matching with ROFLSwapV5
const hre = require("hardhat");
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("\n=== TESTING INSTANT ORDER MATCHING WITH ROFLSwapV5 ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Use explicit network name
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Load deployment information
  let roflSwapV5Address;
  let waterTokenAddress;
  let fireTokenAddress;
  
  try {
    const deploymentFilePath = `./roflswap-v5-deployment-${networkName}.json`;
    console.log(`Loading deployment from: ${deploymentFilePath}`);
    
    if (!fs.existsSync(deploymentFilePath)) {
      // Fall back to deployment-guide.md values if file doesn't exist
      console.log(`Deployment file not found. Using values from deployment-guide.md`);
      roflSwapV5Address = "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB";
      waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
      fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
    } else {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
      roflSwapV5Address = deploymentInfo.roflSwapV5;
      waterTokenAddress = deploymentInfo.privateWaterToken;
      fireTokenAddress = deploymentInfo.privateFireToken;
    }
    
    console.log(`ROFLSwapV5 address: ${roflSwapV5Address}`);
    console.log(`WATER token: ${waterTokenAddress}`);
    console.log(`FIRE token: ${fireTokenAddress}`);
  } catch (error) {
    console.error(`Error loading deployment info: ${error.message}`);
    return;
  }
  
  // Load the contract
  const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
  const oracle = await ethers.getContractAt("ROFLSwapV5", roflSwapV5Address);
  
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
  const waterToken = await ethers.getContractAt("contracts/confidentialERC20/PrivateERC20.sol:PrivateERC20", waterTokenAddress);
  const fireToken = await ethers.getContractAt("contracts/confidentialERC20/PrivateERC20.sol:PrivateERC20", fireTokenAddress);
  
  // Check balances
  const waterBalance = await waterToken.balanceOf(signer.address);
  const fireBalance = await fireToken.balanceOf(signer.address);
  console.log(`WATER balance: ${ethers.formatEther(waterBalance)}`);
  console.log(`FIRE balance: ${ethers.formatEther(fireBalance)}`);
  
  // Approve tokens
  console.log("\nApproving tokens for trading...");
  try {
    const waterApprovalTx = await waterToken.approve(roflSwapV5Address, ethers.MaxUint256);
    await waterApprovalTx.wait();
    console.log("WATER token approved");
    
    const fireApprovalTx = await fireToken.approve(roflSwapV5Address, ethers.MaxUint256);
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
  
  // Place buy order
  try {
    const buyTx = await oracle.placeBuyOrder(
      waterTokenAddress,
      buyOrderAmount,
      buyOrderPrice,
      { gasLimit: 1000000 }
    );
    console.log(`Buy order transaction: ${buyTx.hash}`);
    const buyReceipt = await buyTx.wait();
    
    // Get order ID from events
    const buyOrderEvent = buyReceipt.logs
      .filter(log => log.address === roflSwapV5Address)
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
  
  // Place sell order
  try {
    const sellTx = await oracle.placeSellOrder(
      waterTokenAddress,
      sellOrderAmount,
      sellOrderPrice,
      { gasLimit: 1000000 }
    );
    console.log(`Sell order transaction: ${sellTx.hash}`);
    const sellReceipt = await sellTx.wait();
    
    // Get order ID from events
    const sellOrderEvent = sellReceipt.logs
      .filter(log => log.address === roflSwapV5Address)
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
    const totalOrders = await oracle.totalOrders();
    console.log(`Total orders in the system: ${totalOrders}`);
    
    // Check last few orders
    const startIdx = Math.max(1, totalOrders - 5);
    for (let i = startIdx; i <= totalOrders; i++) {
      try {
        const isFilled = await oracle.isOrderFilled(i);
        const orderOwner = await oracle.getOrderOwner(i);
        console.log(`Order #${i}: Owner: ${orderOwner}, Filled: ${isFilled}`);
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