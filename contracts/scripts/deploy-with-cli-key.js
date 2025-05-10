// Script to deploy a new ROFLSwapV3 contract with the correct ROFL app ID
// Usage: bun run deploy-with-cli-key.js <private_key>
const { ethers } = require("ethers");
require('dotenv').config();

// Import the contract ABI and bytecode
const contract = require("../artifacts/contracts/ROFLSwapV3.sol/ROFLSwapV3.json");
const bytecode = contract.bytecode;
const abi = contract.abi;

async function main() {
  // Get private key from command line arguments
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Please provide the private key as a command line argument: bun run deploy-with-cli-key.js <private_key>");
    process.exit(1);
  }
  
  let privateKey = args[0];
  
  // Clean private key - remove newlines, spaces, and add 0x prefix if needed
  privateKey = privateKey.replace(/[\n\r\s]+/g, '');
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  // Correct token addresses from the existing contract
  const waterTokenAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
  const fireTokenAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";
  
  // Read the correct ROFL app ID from the rofl_app directory
  const fullRoflAppId = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";
  const correctRoflAppId = fullRoflAppId.substring(0, 21); // Truncate to 21 chars
  console.log(`Using full ROFL app ID: ${fullRoflAppId}`);
  console.log(`Truncated ROFL app ID: ${correctRoflAppId}`);
  
  // Set up provider and signer
  const provider = new ethers.JsonRpcProvider("https://testnet.sapphire.oasis.io");
  
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    console.log(`Using wallet address: ${wallet.address}`);
    
    // Check wallet balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ROSE`);
    
    if (balance < ethers.parseEther("0.1")) {
      console.warn("Warning: Low wallet balance, deployment might fail!");
    }
    
    console.log("Deploying ROFLSwapV3 contract...");
    
    // Create a contract factory
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);
    
    // Convert the ROFL app ID to bytes21
    const roflAppIdBytes = ethers.toUtf8Bytes(correctRoflAppId);
    console.log(`ROFL app ID bytes length: ${roflAppIdBytes.length}`);
    
    // Ensure we're only passing 21 bytes to the contract
    const paddedBytes = new Uint8Array(21);
    paddedBytes.set(roflAppIdBytes.slice(0, 21));
    
    // Deploy the contract with the constructor arguments
    const contract = await factory.deploy(
      waterTokenAddress,
      fireTokenAddress,
      paddedBytes
    );
    
    console.log(`Transaction hash: ${contract.deploymentTransaction().hash}`);
    console.log("Waiting for contract deployment to be confirmed...");
    
    await contract.waitForDeployment();
    const newContractAddress = await contract.getAddress();
    
    console.log(`\n✅ ROFLSwapV3 deployed to: ${newContractAddress}`);
    console.log(`Water token: ${waterTokenAddress}`);
    console.log(`Fire token: ${fireTokenAddress}`);
    console.log(`ROFL app ID: ${correctRoflAppId}`);
    
    // Verify the ROFL app ID was set correctly
    const roflAppId = await contract.roflAppId();
    const roflAppIdHex = roflAppId.toLowerCase();
    
    try {
      const bytes = ethers.getBytes(`0x${roflAppIdHex.substring(2)}`);
      const text = ethers.toUtf8String(bytes);
      console.log(`\nVerified ROFL app ID in contract: ${text}`);
      
      if (text === correctRoflAppId) {
        console.log("✅ ROFL app ID set correctly!");
      } else {
        console.log("❌ ROFL app ID doesn't match the expected value.");
      }
    } catch (e) {
      console.log("Could not decode ROFL app ID to text:", e.message);
    }
    
    console.log("\n🚀 Next steps:");
    console.log(`1. Update the .env file with the new ROFLSwapV3 contract address: ${newContractAddress}`);
    console.log(`2. Update the rofl.yaml file to use the new contract address`);
    console.log(`3. Rebuild and redeploy the ROFL app`);
    
  } catch (error) {
    console.error("Deployment failed:", error.message);
    if (error.message.includes("insufficient funds")) {
      console.error("\nYour wallet doesn't have enough ROSE tokens to deploy the contract.");
      console.error("Please fund your wallet and try again.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  }); 