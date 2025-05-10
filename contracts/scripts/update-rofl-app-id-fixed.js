// Script to update the ROFL app ID in the ROFLSwapV3 contract
const { ethers } = require("ethers");
require('dotenv').config();

// ROFLSwapV3 contract ABI with only the relevant functions
const ROFLSWAP_ABI = [
  "function roflAppId() view returns (bytes21)",
  "function setRoflAppId(bytes21 _roflAppId) external",
  "function owner() view returns (address)"
];

async function main() {
  // Contract address
  const roflSwapAddress = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df";
  
  // Get private key from environment variable and clean it
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY environment variable is required!");
    process.exit(1);
  }
  
  // Clean private key - remove newlines, spaces, and 0x prefix if present
  privateKey = privateKey.replace(/[\n\r\s]+/g, '');
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  console.log("Private key format fixed");
  
  // Current ROFL app ID from the rofl.yaml file
  const currentRoflAppId = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";
  
  // Set up provider and signer
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create contract instance
    const roflSwap = new ethers.Contract(roflSwapAddress, ROFLSWAP_ABI, wallet);
    
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Check if we're the owner
    const contractOwner = await roflSwap.owner();
    console.log(`Contract owner: ${contractOwner}`);
    
    if (wallet.address.toLowerCase() !== contractOwner.toLowerCase()) {
      console.error("You are not the owner of the contract! Cannot update ROFL app ID.");
      process.exit(1);
    }
    
    // Get current ROFL app ID in the contract
    const currentContractAppId = await roflSwap.roflAppId();
    const currentContractAppIdHex = currentContractAppId.toLowerCase();
    console.log(`Current ROFL app ID in contract: 0x${currentContractAppIdHex.substring(2)}`);
    
    // Try to decode as UTF-8
    try {
      const bytes = ethers.getBytes(`0x${currentContractAppIdHex.substring(2)}`);
      const text = ethers.toUtf8String(bytes);
      console.log(`Current ROFL app ID decoded: ${text}`);
    } catch (e) {
      console.log("Could not decode current ROFL app ID to text");
    }
    
    // Encode the full ROFL app ID to bytes (this will be truncated to 21 bytes by the contract)
    console.log(`\nNew ROFL app ID to set: ${currentRoflAppId}`);
    const newAppIdBytes = ethers.toUtf8Bytes(currentRoflAppId);
    console.log(`Encoded as bytes (hex): 0x${Buffer.from(newAppIdBytes).toString('hex')}`);
    
    if (newAppIdBytes.length > 21) {
      console.warn(`WARNING: Your ROFL app ID is ${newAppIdBytes.length} bytes long, but the contract only stores 21 bytes.`);
      console.warn(`The ID will be truncated to: ${currentRoflAppId.substring(0, 21)}`);
    }
    
    // Update the ROFL app ID
    console.log("\nUpdating ROFL app ID in contract...");
    const tx = await roflSwap.setRoflAppId(newAppIdBytes);
    console.log(`Transaction sent: ${tx.hash}`);
    
    console.log("Waiting for transaction confirmation...");
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Verify the update
    const newContractAppId = await roflSwap.roflAppId();
    const newContractAppIdHex = newContractAppId.toLowerCase();
    console.log(`\nUpdated ROFL app ID in contract: 0x${newContractAppIdHex.substring(2)}`);
    
    // Try to decode as UTF-8
    try {
      const bytes = ethers.getBytes(`0x${newContractAppIdHex.substring(2)}`);
      const text = ethers.toUtf8String(bytes);
      console.log(`Updated ROFL app ID decoded: ${text}`);
      
      // Check if the update was successful
      if (text === currentRoflAppId.substring(0, 21)) {
        console.log("\n✅ ROFL app ID was successfully updated (truncated to 21 bytes)!");
        console.log("The ROFL app should now be able to call restricted functions.");
      } else {
        console.log("\n❌ Updated ROFL app ID doesn't match the expected value.");
      }
    } catch (e) {
      console.log("Could not decode updated ROFL app ID to text");
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 