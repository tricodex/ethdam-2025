// Script to decode the ROFL app ID
const { ethers } = require("ethers");

// Custom ABI with the roflAppId function
const ABI = [
  "function roflAppId() view returns (bytes21)"
];

async function main() {
  // Contract address
  const roflSwapAddress = "0x8d71Ad1fB193DdA7ABC9DD21a05Ef3E913CAE4Df";
  
  // Create provider
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  // Create contract instance
  const roflSwap = new ethers.Contract(roflSwapAddress, ABI, provider);
  
  console.log(`\nDecoding ROFL App ID for contract at ${roflSwapAddress}\n`);
  
  try {
    // Get ROFL app ID as bytes21
    const roflAppIdBytes = await roflSwap.roflAppId();
    console.log(`ROFL App ID (bytes21): ${roflAppIdBytes}`);
    console.log(`ROFL App ID (hex): 0x${roflAppIdBytes.slice(2)}`);
    
    // Try to decode as UTF-8
    try {
      // Remove 0x prefix and convert to Buffer
      const hexString = roflAppIdBytes.slice(2);
      const bytes = Buffer.from(hexString, 'hex');
      const utf8String = bytes.toString('utf-8');
      console.log(`ROFL App ID (decoded): ${utf8String}`);
      
      // Compare with the expected ROFL app ID
      const expectedRoflAppId = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";
      console.log(`\nExpected App ID: ${expectedRoflAppId}`);
      console.log(`Truncated App ID in contract: ${utf8String}`);
      
      if (expectedRoflAppId.startsWith(utf8String)) {
        console.log("\n✅ The App ID in the contract is a truncated prefix of the expected App ID.");
        console.log(`First ${utf8String.length} characters match.`);
        console.log(`Missing characters: "${expectedRoflAppId.substring(utf8String.length)}"`);
      } else {
        console.log("\n❌ The App ID in the contract does NOT match the expected App ID prefix!");
      }
    } catch (e) {
      console.error("Could not decode App ID as UTF-8:", e);
    }
  } catch (error) {
    console.error("Error getting ROFL App ID:", error.message);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 