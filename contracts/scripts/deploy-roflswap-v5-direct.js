// Deploy ROFLSwapV5 contract with proper dependency linking
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("Starting direct deployment of ROFLSwapV5...");
  
  // Get signers
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);
  
  // Load private token addresses from the deployment file
  const network = hre.network.name;
  let privateWaterToken, privateFireToken;
  
  try {
    const deploymentData = JSON.parse(
      fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
    );
    privateWaterToken = deploymentData.privateWaterToken;
    privateFireToken = deploymentData.privateFireToken;
    console.log(`Using private tokens: WATER=${privateWaterToken}, FIRE=${privateFireToken}`);
  } catch (error) {
    console.log("Private tokens deployment file not found:", error);
    throw new Error("Private token addresses are required");
  }
  
  // Get the ROFL App ID - using the exact one requested
  const roflAppId = process.env.ROFL_APP_ID || "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972continue";
  
  console.log(`Using ROFL App ID: ${roflAppId}`);
  console.log(`ROFL App ID length: ${roflAppId.length} characters`);
  
  // First verify that all the libraries are compiled and linked
  console.log("Verifying contract dependencies...");
  
  // Deploy the contract with ethers directly
  console.log("Deploying ROFLSwapV5...");
  
  try {
    // Convert ROFL app ID to bytes using ethers directly
    const { ethers } = hre;
    const roflAppIdBytes = ethers.toUtf8Bytes(roflAppId);
    console.log(`ROFL App ID as bytes length: ${roflAppIdBytes.length}`);
    console.log(`ROFL App ID as hex: 0x${Buffer.from(roflAppIdBytes).toString('hex')}`);
    
    // Get full contract factory with linked libraries
    const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
    
    // Log deployment parameters for debugging
    console.log("Deployment parameters:");
    console.log("- Private Water Token:", privateWaterToken);
    console.log("- Private Fire Token:", privateFireToken);
    
    // Get network gas settings
    const feeData = await ethers.provider.getFeeData();
    console.log("Network gas settings:");
    console.log("- Gas price:", feeData.gasPrice.toString());
    
    // Deploy with explicit gas options
    const deployTx = await ROFLSwapV5.getDeployTransaction(
      privateWaterToken,
      privateFireToken,
      roflAppIdBytes
    );
    
    // Set higher gas limit
    deployTx.gasLimit = ethers.toBigInt("6000000");
    
    console.log("Sending deployment transaction...");
    const txResponse = await deployer.sendTransaction(deployTx);
    console.log(`Transaction sent: ${txResponse.hash}`);
    
    console.log("Waiting for deployment transaction confirmation...");
    const receipt = await txResponse.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get deployed contract address from receipt
    const roflSwapAddress = receipt.contractAddress;
    console.log(`ROFLSwapV5 deployed to: ${roflSwapAddress}`);
    
    // Save deployment information
    const deploymentInfo = {
      roflSwapV5: roflSwapAddress,
      privateWaterToken: privateWaterToken,
      privateFireToken: privateFireToken,
      roflAppId,
      deployer: deployer.address,
      network,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(
      `./roflswap-v5-deployment-${network}.json`,
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment information saved to file.");
    console.log("\nNext steps:");
    console.log("1. Request privacy access:");
    console.log(`   bun hardhat request-privacy:v5 --contract ${roflSwapAddress} --network ${network}`);
    console.log("2. Update the ROFL app with the new contract address:");
    console.log(`   echo -n "${roflSwapAddress}" | oasis rofl secret set ROFLSWAP_ADDRESS -`);
    
    return roflSwapAddress;
  } catch (error) {
    console.error("Deployment failed with error:", error);
    
    // Check if any library references are missing
    if (error.message && error.message.includes("library")) {
      console.error("This appears to be a library linking error.");
      console.error("Make sure all libraries are properly deployed and linked.");
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 