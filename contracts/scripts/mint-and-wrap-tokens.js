// Script to mint base tokens and wrap them for testing
const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

async function main() {
  console.log("\n=== MINTING AND WRAPPING TOKENS FOR TESTING ===\n");
  
  try {
    // Load deployment information
    const network = hre.network.name;
    const tokenDeploymentData = JSON.parse(
      fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
    );
    
    // Get token addresses
    const baseWaterAddress = tokenDeploymentData.baseWaterToken;
    const baseFireAddress = tokenDeploymentData.baseFireToken;
    const privateWaterAddress = tokenDeploymentData.privateWaterToken;
    const privateFireAddress = tokenDeploymentData.privateFireToken;
    
    console.log(`Base WATER Token: ${baseWaterAddress}`);
    console.log(`Base FIRE Token: ${baseFireAddress}`);
    console.log(`Private WATER Token: ${privateWaterAddress}`);
    console.log(`Private FIRE Token: ${privateFireAddress}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Using deployer account: ${deployer.address}`);
    
    // Get target addresses
    const buyerAddress = "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8";
    const sellerAddress = "0xb067fB16AFcABf8A8974a35CbCee243B8FDF0EA1";
    
    console.log(`Buyer address: ${buyerAddress}`);
    console.log(`Seller address: ${sellerAddress}`);
    
    // Get contract factories
    const ERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
    const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
    
    // Attach to contracts
    const baseWaterToken = ERC20Mintable.attach(baseWaterAddress);
    const baseFireToken = ERC20Mintable.attach(baseFireAddress);
    const privateWaterToken = PrivateERC20.attach(privateWaterAddress);
    const privateFireToken = PrivateERC20.attach(privateFireAddress);
    
    // Amount to mint
    const amountToMint = ethers.parseEther("1000");
    
    // Mint tokens
    console.log(`\nMinting ${ethers.formatEther(amountToMint)} WATER tokens to buyer...`);
    let tx = await baseWaterToken.mint(buyerAddress, amountToMint);
    await tx.wait();
    console.log(`✅ Minted WATER tokens to buyer. Tx: ${tx.hash}`);
    
    console.log(`\nMinting ${ethers.formatEther(amountToMint)} WATER tokens to seller...`);
    tx = await baseWaterToken.mint(sellerAddress, amountToMint);
    await tx.wait();
    console.log(`✅ Minted WATER tokens to seller. Tx: ${tx.hash}`);
    
    console.log(`\nMinting ${ethers.formatEther(amountToMint)} FIRE tokens to buyer...`);
    tx = await baseFireToken.mint(buyerAddress, amountToMint);
    await tx.wait();
    console.log(`✅ Minted FIRE tokens to buyer. Tx: ${tx.hash}`);
    
    console.log(`\nMinting ${ethers.formatEther(amountToMint)} FIRE tokens to seller...`);
    tx = await baseFireToken.mint(sellerAddress, amountToMint);
    await tx.wait();
    console.log(`✅ Minted FIRE tokens to seller. Tx: ${tx.hash}`);
    
    console.log("\n=== CHECKING BASE TOKEN BALANCES ===");
    
    let buyerWaterBalance = await baseWaterToken.balanceOf(buyerAddress);
    let buyerFireBalance = await baseFireToken.balanceOf(buyerAddress);
    let sellerWaterBalance = await baseWaterToken.balanceOf(sellerAddress);
    let sellerFireBalance = await baseFireToken.balanceOf(sellerAddress);
    
    console.log(`Buyer base WATER balance: ${ethers.formatEther(buyerWaterBalance)} tokens`);
    console.log(`Buyer base FIRE balance: ${ethers.formatEther(buyerFireBalance)} tokens`);
    console.log(`Seller base WATER balance: ${ethers.formatEther(sellerWaterBalance)} tokens`);
    console.log(`Seller base FIRE balance: ${ethers.formatEther(sellerFireBalance)} tokens`);
    
    console.log("\n✅ Base tokens minted successfully!");
    
  } catch (error) {
    console.error(`\n❌ Error during minting:`);
    console.error(error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 