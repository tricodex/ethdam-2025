// Script to deploy a new ROFLSwapV3 contract with the correct ROFL app ID
const { ethers } = require("ethers");
require('dotenv').config();

// Import the contract ABI and bytecode
const contract = require("../artifacts/contracts/ROFLSwapV3.sol/ROFLSwapV3.json");
const bytecode = contract.bytecode;
const abi = contract.abi;

async function main() {
  // Get private key from environment variable
  let privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY environment variable is required!");
    process.exit(1);
  }
  
  // Clean private key - remove newlines, spaces, and add 0x prefix if needed
  privateKey = privateKey.replace(/[\n\r\s]+/g, '');
  if (!privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }
  
  // Token addresses - using the existing tokens from the current deployment
  const waterTokenAddress = "0xe09Ee7Afb0Af1e2E5aA30B8D14CA32b89559530";
  const fireTokenAddress = "0x8B52CeCE15e6f5f3509879624BD9010ec1f1c4ff";
  
  // Read the correct ROFL app ID from the rofl_app directory
  const correctRoflAppId = "rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3";
  console.log(`Using ROFL app ID: ${correctRoflAppId}`);
  
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
    
    // Deploy the contract with the constructor arguments
    const contract = await factory.deploy(
      waterTokenAddress,
      fireTokenAddress,
      roflAppIdBytes
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
      
      if (text === correctRoflAppId.substring(0, 21)) {
        console.log("✅ ROFL app ID set correctly (truncated to 21 bytes)!");
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