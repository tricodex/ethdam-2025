// Script to prepare accounts for TEE testing by wrapping tokens
// Uses PRIVATE_KEY for the buyer and PRIVATE_KEY_SELLER for the seller
const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

// Colors for console output
const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m"
};

// Helper for colored console logs
function colorLog(message, color) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

// Global error handler
function handleError(error, step) {
  colorLog(`❌ Error during ${step}:`, COLORS.RED);
  
  if (error.reason) {
    colorLog(`Reason: ${error.reason}`, COLORS.RED);
  } else if (error.message) {
    colorLog(`Message: ${error.message}`, COLORS.RED);
  }
  
  if (error.data) {
    try {
      // Try to decode contract revert reason
      const decodedError = ethers.toUtf8String(error.data);
      colorLog(`Contract error: ${decodedError}`, COLORS.RED);
    } catch (e) {
      colorLog(`Data: ${error.data}`, COLORS.RED);
    }
  }
  
  if (error.code) {
    colorLog(`Code: ${error.code}`, COLORS.RED);
  }
  
  if (error.stack) {
    console.error("Stack trace:", error.stack);
  }
  
  return null;
}

// Check token balance
async function checkBalance(tokenContract, account, tokenName) {
  try {
    const balance = await tokenContract.balanceOf(account.address);
    colorLog(`${tokenName} Balance for ${account.address}: ${ethers.formatEther(balance)} tokens`, COLORS.CYAN);
    return balance;
  } catch (error) {
    handleError(error, `checking ${tokenName} balance`);
    return ethers.parseEther("0");
  }
}

// Mint base tokens if needed
async function mintBaseTokens(tokenContract, account, amount, tokenName) {
  try {
    const balance = await tokenContract.balanceOf(account.address);
    if (balance < amount) {
      colorLog(`Minting ${ethers.formatEther(amount)} ${tokenName} tokens...`, COLORS.YELLOW);
      const tx = await tokenContract.connect(account).mint(account.address, amount);
      const receipt = await tx.wait();
      colorLog(`✅ Minting successful. Transaction: ${tx.hash}`, COLORS.GREEN);
      return true;
    } else {
      colorLog(`✅ Account already has sufficient ${tokenName} tokens`, COLORS.GREEN);
      return true;
    }
  } catch (error) {
    handleError(error, `minting ${tokenName}`);
    return false;
  }
}

// Wrap base tokens into private tokens
async function wrapTokens(baseToken, privateToken, account, amount, tokenName) {
  try {
    // Check base token balance
    const baseBalance = await baseToken.balanceOf(account.address);
    if (baseBalance < amount) {
      colorLog(`❌ Insufficient ${tokenName} base tokens to wrap`, COLORS.RED);
      return false;
    }
    
    // Approve private token wrapper to spend base tokens
    colorLog(`Approving ${tokenName} wrapper to spend base tokens...`, COLORS.YELLOW);
    const approveTx = await baseToken.connect(account).approve(privateToken.address, amount);
    await approveTx.wait();
    
    // Wrap tokens
    colorLog(`Wrapping ${ethers.formatEther(amount)} ${tokenName} tokens...`, COLORS.YELLOW);
    const wrapTx = await privateToken.connect(account).deposit(amount);
    const receipt = await wrapTx.wait();
    
    colorLog(`✅ Successfully wrapped ${ethers.formatEther(amount)} ${tokenName} tokens`, COLORS.GREEN);
    colorLog(`Transaction: ${wrapTx.hash}`, COLORS.GREEN);
    
    // Check new balance
    const privateBalance = await privateToken.balanceOf(account.address);
    colorLog(`New Private ${tokenName} Balance: ${ethers.formatEther(privateBalance)} tokens`, COLORS.CYAN);
    
    return true;
  } catch (error) {
    handleError(error, `wrapping ${tokenName} tokens`);
    return false;
  }
}

// Main function
async function main() {
  colorLog("\n=== PREPARING ACCOUNTS FOR TEE TESTING ===\n", COLORS.BLUE);
  
  try {
    // Load deployment data
    const network = hre.network.name;
    let deploymentData, tokenDeploymentData;
    
    try {
      deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
      );
      
      tokenDeploymentData = JSON.parse(
        fs.readFileSync(`./private-tokens-deployment-${network}.json`, "utf8")
      );
    } catch (error) {
      handleError(error, "loading deployment data");
      return;
    }
    
    const baseWaterAddress = tokenDeploymentData.baseWaterToken;
    const baseFireAddress = tokenDeploymentData.baseFireToken;
    const privateWaterAddress = tokenDeploymentData.privateWaterToken;
    const privateFireAddress = tokenDeploymentData.privateFireToken;
    
    colorLog(`Base WATER Token: ${baseWaterAddress}`, COLORS.BLUE);
    colorLog(`Base FIRE Token: ${baseFireAddress}`, COLORS.BLUE);
    colorLog(`Private WATER Token: ${privateWaterAddress}`, COLORS.BLUE);
    colorLog(`Private FIRE Token: ${privateFireAddress}`, COLORS.BLUE);
    
    // Get signers for buyer and seller
    const buyerPrivateKey = process.env.PRIVATE_KEY;
    const sellerPrivateKey = process.env.PRIVATE_KEY_SELLER;
    
    if (!buyerPrivateKey || !sellerPrivateKey) {
      colorLog("❌ Missing private keys. Set PRIVATE_KEY and PRIVATE_KEY_SELLER in environment variables.", COLORS.RED);
      return;
    }
    
    // Connect to wallets
    const buyerWallet = new ethers.Wallet(buyerPrivateKey, ethers.provider);
    const sellerWallet = new ethers.Wallet(sellerPrivateKey, ethers.provider);
    
    colorLog(`Buyer address: ${buyerWallet.address}`, COLORS.BLUE);
    colorLog(`Seller address: ${sellerWallet.address}`, COLORS.BLUE);
    
    // Get contract factories
    const ERC20Mintable = await ethers.getContractFactory("ERC20Mintable");
    const PrivateWrapper = await ethers.getContractFactory("PrivateWrapper");
    
    // Attach to contracts
    const baseWaterToken = ERC20Mintable.attach(baseWaterAddress);
    const baseFireToken = ERC20Mintable.attach(baseFireAddress);
    const privateWaterToken = PrivateWrapper.attach(privateWaterAddress);
    const privateFireToken = PrivateWrapper.attach(privateFireAddress);
    
    // Amount to mint and wrap
    const amountToMint = ethers.parseEther("1000");
    const amountToWrap = ethers.parseEther("100");
    
    // Check initial balances
    colorLog("\n=== CHECKING INITIAL BALANCES ===", COLORS.BLUE);
    
    await checkBalance(baseWaterToken, buyerWallet, "Base WATER");
    await checkBalance(baseFireToken, buyerWallet, "Base FIRE");
    await checkBalance(privateWaterToken, buyerWallet, "Private WATER");
    await checkBalance(privateFireToken, buyerWallet, "Private FIRE");
    
    await checkBalance(baseWaterToken, sellerWallet, "Base WATER");
    await checkBalance(baseFireToken, sellerWallet, "Base FIRE");
    await checkBalance(privateWaterToken, sellerWallet, "Private WATER");
    await checkBalance(privateFireToken, sellerWallet, "Private FIRE");
    
    // Mint base tokens if needed
    colorLog("\n=== MINTING BASE TOKENS ===", COLORS.BLUE);
    
    // Mint for buyer
    await mintBaseTokens(baseWaterToken, buyerWallet, amountToMint, "WATER");
    await mintBaseTokens(baseFireToken, buyerWallet, amountToMint, "FIRE");
    
    // Mint for seller
    await mintBaseTokens(baseWaterToken, sellerWallet, amountToMint, "WATER");
    await mintBaseTokens(baseFireToken, sellerWallet, amountToMint, "FIRE");
    
    // Wrap tokens
    colorLog("\n=== WRAPPING TOKENS ===", COLORS.BLUE);
    
    // Wrap for buyer
    colorLog("\n> Wrapping tokens for BUYER:", COLORS.MAGENTA);
    await wrapTokens(baseWaterToken, privateWaterToken, buyerWallet, amountToWrap, "WATER");
    await wrapTokens(baseFireToken, privateFireToken, buyerWallet, amountToWrap, "FIRE");
    
    // Wrap for seller
    colorLog("\n> Wrapping tokens for SELLER:", COLORS.MAGENTA);
    await wrapTokens(baseWaterToken, privateWaterToken, sellerWallet, amountToWrap, "WATER");
    await wrapTokens(baseFireToken, privateFireToken, sellerWallet, amountToWrap, "FIRE");
    
    // Final balances
    colorLog("\n=== FINAL BALANCES ===", COLORS.BLUE);
    
    colorLog("\n> BUYER BALANCES:", COLORS.MAGENTA);
    await checkBalance(privateWaterToken, buyerWallet, "Private WATER");
    await checkBalance(privateFireToken, buyerWallet, "Private FIRE");
    
    colorLog("\n> SELLER BALANCES:", COLORS.MAGENTA);
    await checkBalance(privateWaterToken, sellerWallet, "Private WATER");
    await checkBalance(privateFireToken, sellerWallet, "Private FIRE");
    
    colorLog("\n✅ ACCOUNT PREPARATION COMPLETE!", COLORS.GREEN);
    colorLog("Both accounts now have private tokens ready for testing", COLORS.GREEN);
    colorLog("Next step: Run test-tee-order-matching.js to test order matching", COLORS.GREEN);
  
  } catch (error) {
    handleError(error, "account preparation");
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 