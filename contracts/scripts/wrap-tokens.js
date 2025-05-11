// Script to wrap tokens for testing (assumes base tokens are already minted)
const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

// Color constants for output
const COLORS = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m"
};

// Helper function for colored logging
function colorLog(message, color) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

async function main() {
  colorLog("\n=== WRAPPING TOKENS FOR TESTING ===\n", COLORS.BLUE);
  
  try {
    // Get the network and check if we're on a testnet (default to sapphire-testnet if not specified)
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    colorLog(`Using network: ${network}`, COLORS.BLUE);
    
    // Try to load deployment information
    let baseWaterAddress, baseFireAddress, privateWaterAddress, privateFireAddress, roflswapAddress;
    
    try {
      const tokenDeploymentData = JSON.parse(
        fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
      );
      const roflswapDeployment = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
      );
      
      // Get token addresses
      baseWaterAddress = tokenDeploymentData.baseWaterToken;
      baseFireAddress = tokenDeploymentData.baseFireToken;
      privateWaterAddress = tokenDeploymentData.privateWaterToken;
      privateFireAddress = tokenDeploymentData.privateFireToken;
      roflswapAddress = roflswapDeployment.roflSwapV5;
      
    } catch (error) {
      // Fallback to hardcoded values if files don't exist
      colorLog(`Deployment files not found. Using hardcoded addresses for ${network}.`, COLORS.YELLOW);
      
      if (network === 'sapphire-testnet') {
        // Sapphire testnet known addresses
        baseWaterAddress = "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4";
        baseFireAddress = "0xf2b3B8BE27A7712e06eEA16175cC8BacC6980f5C";
        privateWaterAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
        privateFireAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
        roflswapAddress = "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB";
      } else {
        colorLog(`No known addresses for network: ${network}`, COLORS.RED);
        colorLog(`Please specify a network using --network sapphire-testnet`, COLORS.RED);
        process.exit(1);
      }
    }
    
    colorLog(`Base WATER Token: ${baseWaterAddress}`, COLORS.CYAN);
    colorLog(`Base FIRE Token: ${baseFireAddress}`, COLORS.CYAN);
    colorLog(`Private WATER Token: ${privateWaterAddress}`, COLORS.CYAN);
    colorLog(`Private FIRE Token: ${privateFireAddress}`, COLORS.CYAN);
    colorLog(`ROFLSwapV5 Address: ${roflswapAddress}`, COLORS.CYAN);
    
    // Get signer information
    const signer = await ethers.provider.getSigner();
    const signerAddress = await signer.getAddress();
    colorLog(`Using address for wrapping: ${signerAddress}`, COLORS.BLUE);
    
    // Get contract factories
    const ERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
    const PrivateWrapper = await ethers.getContractFactory("PrivateWrapper");
    
    // Attach to contracts
    const baseWaterToken = ERC20Mintable.attach(baseWaterAddress);
    const baseFireToken = ERC20Mintable.attach(baseFireAddress);
    const privateWaterToken = PrivateWrapper.attach(privateWaterAddress);
    const privateFireToken = PrivateWrapper.attach(privateFireAddress);
    
    // Check if we have tokens to wrap
    const waterBalance = await baseWaterToken.balanceOf(signerAddress);
    const fireBalance = await baseFireToken.balanceOf(signerAddress);
    
    colorLog(`\nBase WATER balance: ${ethers.formatEther(waterBalance)} tokens`, COLORS.CYAN);
    colorLog(`Base FIRE balance: ${ethers.formatEther(fireBalance)} tokens`, COLORS.CYAN);
    
    // Amount to wrap (default to 100 tokens)
    const amountToWrap = ethers.parseEther("100");

    // Wrap WATER tokens
    colorLog(`\nApproving ${ethers.formatEther(amountToWrap)} WATER tokens for wrapping...`, COLORS.YELLOW);
    let tx = await baseWaterToken.approve(privateWaterAddress, amountToWrap);
    await tx.wait();
    colorLog(`✅ Approved WATER tokens for wrapping. Tx: ${tx.hash}`, COLORS.GREEN);
    
    // Wrap the tokens
    colorLog(`Wrapping ${ethers.formatEther(amountToWrap)} WATER tokens...`, COLORS.YELLOW);
    tx = await privateWaterToken.wrap(amountToWrap, signerAddress);
    await tx.wait();
    colorLog(`✅ Wrapped WATER tokens successfully. Tx: ${tx.hash}`, COLORS.GREEN);
    
    // Wrap FIRE tokens
    colorLog(`\nApproving ${ethers.formatEther(amountToWrap)} FIRE tokens for wrapping...`, COLORS.YELLOW);
    tx = await baseFireToken.approve(privateFireAddress, amountToWrap);
    await tx.wait();
    colorLog(`✅ Approved FIRE tokens for wrapping. Tx: ${tx.hash}`, COLORS.GREEN);
    
    // Wrap the tokens
    colorLog(`Wrapping ${ethers.formatEther(amountToWrap)} FIRE tokens...`, COLORS.YELLOW);
    tx = await privateFireToken.wrap(amountToWrap, signerAddress);
    await tx.wait();
    colorLog(`✅ Wrapped FIRE tokens successfully. Tx: ${tx.hash}`, COLORS.GREEN);
    
    // Approve ROFLSwapV5 to spend the wrapped tokens
    colorLog(`\nApproving wrapped tokens for ROFLSwapV5...`, COLORS.YELLOW);
    
    tx = await privateWaterToken.approve(roflswapAddress, ethers.MaxUint256);
    await tx.wait();
    colorLog(`✅ Approved private WATER tokens for ROFLSwapV5. Tx: ${tx.hash}`, COLORS.GREEN);
    
    tx = await privateFireToken.approve(roflswapAddress, ethers.MaxUint256);
    await tx.wait();
    colorLog(`✅ Approved private FIRE tokens for ROFLSwapV5. Tx: ${tx.hash}`, COLORS.GREEN);
    
    colorLog("\n✅ Tokens wrapped and approved successfully!", COLORS.GREEN);
    
  } catch (error) {
    colorLog(`\n❌ Error during wrapping:`, COLORS.RED);
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