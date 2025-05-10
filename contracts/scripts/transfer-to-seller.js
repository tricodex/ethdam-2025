// Script to transfer tokens from buyer to seller
const { ethers } = require("ethers");

// Token ABIs
const TOKEN_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

async function main() {
  // Private keys from environment variables
  const buyerPrivateKey = process.env.PRIVATE_KEY;
  if (!buyerPrivateKey) {
    console.error("PRIVATE_KEY environment variable is required!");
    process.exit(1);
  }

  // Contract addresses
  const waterTokenAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
  const fireTokenAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";
  
  // Addresses
  const buyerAddress = "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8";
  const sellerAddress = "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1";
  
  console.log(`Buyer address: ${buyerAddress}`);
  console.log(`Seller address: ${sellerAddress}`);
  
  // Set up provider and buyer wallet
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  const buyerWallet = new ethers.Wallet(buyerPrivateKey, provider);
  
  // Create contract instances
  const waterToken = new ethers.Contract(waterTokenAddress, TOKEN_ABI, buyerWallet);
  const fireToken = new ethers.Contract(fireTokenAddress, TOKEN_ABI, buyerWallet);
  
  // Amount to transfer
  const transferAmount = ethers.parseEther("100");
  
  // Check balances before transfer
  try {
    const buyerWaterBalance = await waterToken.balanceOf(buyerAddress);
    const buyerFireBalance = await fireToken.balanceOf(buyerAddress);
    const sellerWaterBalance = await waterToken.balanceOf(sellerAddress);
    const sellerFireBalance = await fireToken.balanceOf(sellerAddress);
    
    console.log("\n=== Balances Before Transfer ===");
    console.log(`Buyer WATER: ${ethers.formatEther(buyerWaterBalance)}`);
    console.log(`Buyer FIRE: ${ethers.formatEther(buyerFireBalance)}`);
    console.log(`Seller WATER: ${ethers.formatEther(sellerWaterBalance)}`);
    console.log(`Seller FIRE: ${ethers.formatEther(sellerFireBalance)}`);
    
    // Transfer tokens to seller
    console.log("\nTransferring tokens to seller...");
    
    if (buyerWaterBalance >= transferAmount) {
      console.log(`Transferring ${ethers.formatEther(transferAmount)} WATER tokens to seller`);
      const transferWaterTx = await waterToken.transfer(sellerAddress, transferAmount);
      await transferWaterTx.wait();
      console.log("WATER transfer successful!");
    } else {
      console.log("Buyer doesn't have enough WATER tokens to transfer");
    }
    
    if (buyerFireBalance >= transferAmount) {
      console.log(`Transferring ${ethers.formatEther(transferAmount)} FIRE tokens to seller`);
      const transferFireTx = await fireToken.transfer(sellerAddress, transferAmount);
      await transferFireTx.wait();
      console.log("FIRE transfer successful!");
    } else {
      console.log("Buyer doesn't have enough FIRE tokens to transfer");
    }
    
    // Check balances after transfer
    const updatedBuyerWaterBalance = await waterToken.balanceOf(buyerAddress);
    const updatedBuyerFireBalance = await fireToken.balanceOf(buyerAddress);
    const updatedSellerWaterBalance = await waterToken.balanceOf(sellerAddress);
    const updatedSellerFireBalance = await fireToken.balanceOf(sellerAddress);
    
    console.log("\n=== Balances After Transfer ===");
    console.log(`Buyer WATER: ${ethers.formatEther(updatedBuyerWaterBalance)}`);
    console.log(`Buyer FIRE: ${ethers.formatEther(updatedBuyerFireBalance)}`);
    console.log(`Seller WATER: ${ethers.formatEther(updatedSellerWaterBalance)}`);
    console.log(`Seller FIRE: ${ethers.formatEther(updatedSellerFireBalance)}`);
    
  } catch (error) {
    console.error("Error during token transfer:", error);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 