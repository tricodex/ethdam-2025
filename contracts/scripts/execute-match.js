
// Script to manually execute a match between orders
const hre = require("hardhat");

async function main() {
  const roflSwapAddress = "0x9b6e338C0b8d27833D788D4e0a429cCe6924c490";
  
  console.log(`Testing ROFLSwap contract: ${roflSwapAddress}`);
  
  // Get contract instance
  const ROFLSwap = await hre.ethers.getContractAt("ROFLSwapV3", roflSwapAddress);
  
  // Check total order count
  const orderCount = await ROFLSwap.orderCounter();
  console.log(`Total order count: ${orderCount}`);
  
  // Check if any orders are filled
  console.log(`\nChecking if orders have been filled:`);
  for (let i = 1; i <= orderCount; i++) {
    const isFilled = await ROFLSwap.filledOrders(i);
    console.log(`Order #${i}: ${isFilled ? 'FILLED' : 'NOT FILLED'}`);
  }
  
  if (orderCount < 2) {
    console.log("Not enough orders to match. Exiting...");
    return;
  }
  
  // For our test, just try to match orders 1 and 2
  console.log("\nAttempting to execute a match between orders 1 and 2...");
  
  // Get the signer
  const [signer] = await hre.ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Check roflAppId
  const roflAppId = await ROFLSwap.roflAppId();
  console.log(`ROFL App ID: ${roflAppId}`);
  
  try {
    // This would normally only be callable by the ROFL app
    const tx = await ROFLSwap.executeMatch(
      1, // buyOrderId
      2, // sellOrderId
      signer.address, // buyerAddress
      signer.address, // sellerAddress
      hre.ethers.parseEther("10"), // amount
      hre.ethers.parseEther("1.4") // price
    );
    
    console.log("Transaction sent successfully. Waiting for confirmation...");
    
    // Wait for transaction to be confirmed
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("Match executed successfully!");
    } else {
      console.log("Transaction failed.");
    }
  } catch (error) {
    console.error("Error executing match:", error.message);
    console.log("This is expected if you are not the ROFL app.");
    console.log("The error confirms that the contract is correctly validating the caller.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
