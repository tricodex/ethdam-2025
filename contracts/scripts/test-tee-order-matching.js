// Test the TEE order matching functionality by placing buy and sell orders
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

// Check token balance for a specific account
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

// Check token allowance for ROFLSwap contract
async function checkAllowance(tokenContract, account, roflSwapAddress, tokenName) {
  try {
    const allowance = await tokenContract.allowance(account.address, roflSwapAddress);
    colorLog(`${tokenName} Allowance for ROFLSwap: ${ethers.formatEther(allowance)} tokens`, COLORS.CYAN);
    return allowance;
  } catch (error) {
    handleError(error, `checking ${tokenName} allowance`);
    return ethers.parseEther("0");
  }
}

// Approve tokens for ROFLSwap if needed
async function ensureApproval(tokenContract, account, roflSwapAddress, amount, tokenName) {
  try {
    const allowance = await checkAllowance(tokenContract, account, roflSwapAddress, tokenName);
    
    if (allowance < amount) {
      colorLog(`Approving ${tokenName} tokens for ROFLSwap...`, COLORS.YELLOW);
      const tx = await tokenContract.connect(account).approve(roflSwapAddress, ethers.MaxUint256);
      const receipt = await tx.wait();
      colorLog(`✅ Approval successful. Transaction: ${tx.hash}`, COLORS.GREEN);
      return true;
    }
    
    colorLog(`✅ ${tokenName} already has sufficient approval`, COLORS.GREEN);
    return true;
  } catch (error) {
    handleError(error, `approving ${tokenName}`);
    return false;
  }
}

// Place an order on ROFLSwapV5
async function placeOrder(roflSwap, account, tokenAddress, price, size, isBuy, tokenName) {
  try {
    colorLog(`\nCreating ${isBuy ? "BUY" : "SELL"} order:`, COLORS.MAGENTA);
    colorLog(`- Account: ${account.address}`, COLORS.MAGENTA);
    colorLog(`- Token: ${tokenName}`, COLORS.MAGENTA);
    colorLog(`- Price: ${ethers.formatEther(price)} tokens`, COLORS.MAGENTA);
    colorLog(`- Size: ${ethers.formatEther(size)} tokens`, COLORS.MAGENTA);
    
    // Create order object
    const orderData = {
      orderId: 0, // Will be assigned by the contract
      owner: account.address,
      token: tokenAddress,
      price: price,
      size: size,
      isBuy: isBuy
    };
    
    // Encode order data
    colorLog("Encoding order data...", COLORS.YELLOW);
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedOrder = abiCoder.encode(
      ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
      [orderData.orderId, orderData.owner, orderData.token, orderData.price, orderData.size, orderData.isBuy]
    );
    
    // Place the order
    colorLog("Placing order on ROFLSwapV5...", COLORS.YELLOW);
    const tx = await roflSwap.connect(account).placeOrder(encodedOrder);
    colorLog(`Transaction sent: ${tx.hash}`, COLORS.YELLOW);
    
    const receipt = await tx.wait();
    colorLog(`✅ Transaction confirmed in block ${receipt?.blockNumber}`, COLORS.GREEN);
    
    // Get the order ID from the events
    if (receipt && receipt.logs) {
      const iface = roflSwap.interface;
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === "OrderPlaced") {
            colorLog(`✅ Order placed successfully with ID: ${parsedLog.args[0]}`, COLORS.GREEN);
            return {
              orderId: parsedLog.args[0],
              owner: parsedLog.args[1],
              txHash: tx.hash,
              success: true
            };
          }
        } catch (e) {
          // This log was probably from another contract or not a parseable event
          continue;
        }
      }
    }
    
    colorLog("⚠️ Order placed but couldn't determine the order ID", COLORS.YELLOW);
    return { txHash: tx.hash, success: true };
  } catch (error) {
    handleError(error, `placing ${isBuy ? "buy" : "sell"} order`);
    return { success: false };
  }
}

// Wait for a specified time (useful for TEE to process matches)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function to test the TEE order matching
async function main() {
  colorLog("\n=== TESTING TEE ORDER MATCHING ===\n", COLORS.BLUE);
  
  try {
    // Load deployment data
    const network = hre.network.name;
    let deploymentData;
    
    try {
      deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
      );
    } catch (error) {
      handleError(error, "loading deployment data");
      return;
    }
    
    const roflSwapAddress = deploymentData.roflSwapV5;
    const waterTokenAddress = deploymentData.privateWaterToken;
    const fireTokenAddress = deploymentData.privateFireToken;
    
    colorLog(`ROFLSwapV5: ${roflSwapAddress}`, COLORS.BLUE);
    colorLog(`Water Token: ${waterTokenAddress}`, COLORS.BLUE);
    colorLog(`Fire Token: ${fireTokenAddress}`, COLORS.BLUE);
    
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
    
    // Load contracts
    const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
    const roflSwap = ROFLSwapV5.attach(roflSwapAddress);
    
    const PrivateERC20 = await ethers.getContractFactory("PrivateERC20");
    const waterToken = PrivateERC20.attach(waterTokenAddress);
    const fireToken = PrivateERC20.attach(fireTokenAddress);
    
    // Check balances
    colorLog("\n=== CHECKING INITIAL BALANCES ===", COLORS.BLUE);
    
    const buyerWaterBalance = await checkBalance(waterToken, buyerWallet, "WATER");
    const buyerFireBalance = await checkBalance(fireToken, buyerWallet, "FIRE");
    const sellerWaterBalance = await checkBalance(waterToken, sellerWallet, "WATER");
    const sellerFireBalance = await checkBalance(fireToken, sellerWallet, "FIRE");
    
    // Ensure approvals
    colorLog("\n=== ENSURING TOKEN APPROVALS ===", COLORS.BLUE);
    
    // For this example, we'll use WATER as the token to trade
    const buyerWaterApproved = await ensureApproval(
      waterToken, buyerWallet, roflSwapAddress, ethers.parseEther("100"), "WATER"
    );
    
    const sellerWaterApproved = await ensureApproval(
      waterToken, sellerWallet, roflSwapAddress, ethers.parseEther("100"), "WATER"
    );
    
    const buyerFireApproved = await ensureApproval(
      fireToken, buyerWallet, roflSwapAddress, ethers.parseEther("100"), "FIRE"
    );
    
    const sellerFireApproved = await ensureApproval(
      fireToken, sellerWallet, roflSwapAddress, ethers.parseEther("100"), "FIRE"
    );
    
    if (!buyerWaterApproved || !sellerWaterApproved || !buyerFireApproved || !sellerFireApproved) {
      colorLog("❌ Failed to ensure all approvals. Aborting test.", COLORS.RED);
      return;
    }
    
    // Place orders
    colorLog("\n=== PLACING ORDERS ===", COLORS.BLUE);
    
    // Define order parameters - these should match for successful testing
    const price = ethers.parseEther("1.0");  // 1.0 FIRE per WATER
    const size = ethers.parseEther("10.0");  // 10.0 tokens
    
    // Place buy order from buyer
    const buyOrderResult = await placeOrder(
      roflSwap, buyerWallet, waterTokenAddress, price, size, true, "WATER"
    );
    
    if (!buyOrderResult.success) {
      colorLog("❌ Failed to place buy order. Aborting test.", COLORS.RED);
      return;
    }
    
    // Place sell order from seller with matching parameters
    const sellOrderResult = await placeOrder(
      roflSwap, sellerWallet, waterTokenAddress, price, size, false, "WATER"
    );
    
    if (!sellOrderResult.success) {
      colorLog("❌ Failed to place sell order. Aborting test.", COLORS.RED);
      return;
    }
    
    // Wait for TEE to process orders
    colorLog("\n=== WAITING FOR TEE PROCESSING ===", COLORS.BLUE);
    colorLog("Waiting 60 seconds for TEE to process matches...", COLORS.YELLOW);
    await sleep(60000);  // 60 seconds
    
    // Check final balances to see if orders were matched
    colorLog("\n=== CHECKING FINAL BALANCES ===", COLORS.BLUE);
    
    const buyerWaterBalanceAfter = await checkBalance(waterToken, buyerWallet, "WATER");
    const buyerFireBalanceAfter = await checkBalance(fireToken, buyerWallet, "FIRE");
    const sellerWaterBalanceAfter = await checkBalance(waterToken, sellerWallet, "WATER");
    const sellerFireBalanceAfter = await checkBalance(fireToken, sellerWallet, "FIRE");
    
    // Compare balances to see if matching occurred
    colorLog("\n=== MATCHING RESULTS ===", COLORS.BLUE);
    
    const buyerWaterDiff = buyerWaterBalanceAfter - buyerWaterBalance;
    const buyerFireDiff = buyerFireBalanceAfter - buyerFireBalance;
    const sellerWaterDiff = sellerWaterBalanceAfter - sellerWaterBalance;
    const sellerFireDiff = sellerFireBalanceAfter - sellerFireBalance;
    
    if (buyerWaterDiff > 0 && sellerWaterDiff < 0) {
      colorLog("✅ SUCCESS! Orders were matched by the TEE!", COLORS.GREEN);
      colorLog(`Buyer received ${ethers.formatEther(buyerWaterDiff)} WATER tokens`, COLORS.GREEN);
      colorLog(`Seller spent ${ethers.formatEther(Math.abs(sellerWaterDiff))} WATER tokens`, COLORS.GREEN);
    } else {
      colorLog("⚠️ Orders might not have been matched yet.", COLORS.YELLOW);
      colorLog("Possible reasons:", COLORS.YELLOW);
      colorLog("1. TEE needs more time to process", COLORS.YELLOW);
      colorLog("2. Order parameters didn't match correctly", COLORS.YELLOW);
      colorLog("3. ROFL app ID or contract address configuration issue", COLORS.YELLOW);
      colorLog("4. TEE might be experiencing issues", COLORS.YELLOW);
      
      colorLog("\nCheck the ROFL app status:", COLORS.YELLOW);
      colorLog("oasis rofl show", COLORS.YELLOW);
      colorLog("oasis rofl machine show", COLORS.YELLOW);
    }
    
  } catch (error) {
    handleError(error, "main execution");
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 