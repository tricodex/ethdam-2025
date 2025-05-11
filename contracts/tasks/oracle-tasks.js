// Hardhat tasks for ROFLSwapOracle operations
const fs = require("fs");
const { task } = require("hardhat/config");

task("mint-tokens", "Mint WATER and FIRE tokens for testing")
  .addOptionalParam("amount", "Amount of tokens to mint", "100.0")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    console.log("Minting tokens for testing...");
    
    // Get amount from arguments
    const amount = ethers.parseEther(taskArgs.amount);
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Use explicit network name
    const networkName = hre.network.name;
    console.log(`Using network: ${networkName}`);
    
    // Load deployment information
    let privateWaterTokenAddress, privateFireTokenAddress;
    try {
      const deploymentFilePath = `./roflswap-oracle-deployment-${networkName}.json`;
      console.log(`Loading deployment from: ${deploymentFilePath}`);
      
      if (!fs.existsSync(deploymentFilePath)) {
        throw new Error(`Deployment file not found: ${deploymentFilePath}`);
      }
      
      const deploymentData = JSON.parse(fs.readFileSync(deploymentFilePath));
      privateWaterTokenAddress = deploymentData.privateWaterToken;
      privateFireTokenAddress = deploymentData.privateFireToken;
      console.log(`WATER Token: ${privateWaterTokenAddress}`);
      console.log(`FIRE Token: ${privateFireTokenAddress}`);
    } catch (error) {
      console.error("Failed to load deployment information:", error.message);
      throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
    }
    
    // Get contract instances
    const waterToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", privateWaterTokenAddress);
    const fireToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", privateFireTokenAddress);
    
    try {
      // Check current balances
      const waterBalance = await waterToken.balanceOf(signer.address);
      const fireBalance = await fireToken.balanceOf(signer.address);
      
      console.log(`Current WATER balance: ${ethers.formatEther(waterBalance)}`);
      console.log(`Current FIRE balance: ${ethers.formatEther(fireBalance)}`);
      
      // Mint tokens
      console.log(`Minting ${ethers.formatEther(amount)} WATER tokens...`);
      let tx = await waterToken.mint(signer.address, amount);
      await tx.wait();
      
      console.log(`Minting ${ethers.formatEther(amount)} FIRE tokens...`);
      tx = await fireToken.mint(signer.address, amount);
      await tx.wait();
      
      // Check new balances
      const newWaterBalance = await waterToken.balanceOf(signer.address);
      const newFireBalance = await fireToken.balanceOf(signer.address);
      
      console.log(`New WATER balance: ${ethers.formatEther(newWaterBalance)}`);
      console.log(`New FIRE balance: ${ethers.formatEther(newFireBalance)}`);
      
      console.log("✅ Tokens minted successfully!");
    } catch (error) {
      console.error("Error minting tokens:", error);
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }
  });

task("place-order", "Place a buy or sell order in ROFLSwapOracle")
  .addParam("type", "Order type: 'buy' or 'sell'")
  .addOptionalParam("amount", "Amount of tokens to buy/sell", "1.0")
  .addOptionalParam("price", "Price per token", "0.5")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    console.log("Placing order in ROFLSwapOracle...");
    
    // Process arguments
    const isBuy = taskArgs.type.toLowerCase() === "buy";
    const amount = ethers.parseEther(taskArgs.amount);
    const price = ethers.parseEther(taskArgs.price);
    
    // Set token based on the order type
    const token = isBuy ? "WATER" : "FIRE";
    
    console.log(`Order type: ${isBuy ? "buy" : "sell"}`);
    console.log(`Amount: ${ethers.formatEther(amount)} ${token}`);
    console.log(`Price: ${ethers.formatEther(price)} ${isBuy ? "FIRE" : "WATER"} per ${token}`);
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Load deployment information
    let roflSwapOracleAddress, privateWaterTokenAddress, privateFireTokenAddress;
    try {
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-oracle-deployment-${hre.network.name}.json`)
      );
      roflSwapOracleAddress = deploymentData.roflSwapOracle;
      privateWaterTokenAddress = deploymentData.privateWaterToken;
      privateFireTokenAddress = deploymentData.privateFireToken;
      console.log(`ROFLSwapOracle: ${roflSwapOracleAddress}`);
      console.log(`WATER Token: ${privateWaterTokenAddress}`);
      console.log(`FIRE Token: ${privateFireTokenAddress}`);
    } catch (error) {
      console.error("Failed to load deployment information:", error.message);
      throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
    }
    
    // Get contract instances
    const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
    const waterToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", privateWaterTokenAddress);
    const fireToken = await ethers.getContractAt("contracts/PrivateERC20.sol:PrivateERC20", privateFireTokenAddress);
    
    // Check token balances and approvals
    const tokenAddress = isBuy ? privateWaterTokenAddress : privateFireTokenAddress;
    const token1Address = isBuy ? privateFireTokenAddress : privateWaterTokenAddress;
    
    try {
      // Check balances
      const tokenBalance = await (isBuy ? waterToken : fireToken).balanceOf(signer.address);
      const token1Balance = await (isBuy ? fireToken : waterToken).balanceOf(signer.address);
      
      console.log(`${token} balance: ${ethers.formatEther(tokenBalance)}`);
      console.log(`${isBuy ? "FIRE" : "WATER"} balance: ${ethers.formatEther(token1Balance)}`);
      
      // Ensure enough balance
      // Note: We use static BigInt operations instead of BigNumber methods
      const requiredToken1 = isBuy ? 
          (BigInt(price) * BigInt(amount)) / BigInt(10n ** 18n) : 
          BigInt(0);
      
      if ((isBuy && BigInt(token1Balance) < requiredToken1) || 
          (!isBuy && BigInt(tokenBalance) < BigInt(amount))) {
        console.error(`Insufficient balance to place the order`);
        return;
      }
      
      // Ensure approvals
      const tokenApproval = await (isBuy ? waterToken : fireToken).allowance(signer.address, roflSwapOracleAddress);
      const token1Approval = await (isBuy ? fireToken : waterToken).allowance(signer.address, roflSwapOracleAddress);
      
      if (BigInt(tokenApproval) < BigInt(amount)) {
        console.log(`Approving ${token} tokens for ROFLSwapOracle...`);
        const approveTx = await (isBuy ? waterToken : fireToken).approve(roflSwapOracleAddress, ethers.MaxUint256);
        await approveTx.wait();
        console.log("Approval successful");
      }
      
      if (BigInt(token1Approval) < requiredToken1) {
        console.log(`Approving ${isBuy ? "FIRE" : "WATER"} tokens for ROFLSwapOracle...`);
        const approveTx = await (isBuy ? fireToken : waterToken).approve(roflSwapOracleAddress, ethers.MaxUint256);
        await approveTx.wait();
        console.log("Approval successful");
      }
      
      // Create order structure
      const orderId = 0; // Will be assigned by the contract
      const orderOwner = signer.address;
      const orderToken = isBuy ? privateWaterTokenAddress : privateFireTokenAddress;
      
      // Create order data
      const orderData = {
        orderId,
        owner: orderOwner,
        token: orderToken,
        price,
        size: amount,
        isBuy
      };
      
      // Encode order data
      const abiCoder = new ethers.AbiCoder();
      const encodedOrder = abiCoder.encode(
        ["uint256", "address", "address", "uint256", "uint256", "bool"],
        [orderId, orderOwner, orderToken, price, amount, isBuy]
      );
      
      // Place order
      console.log("Placing order in ROFLSwapOracle...");
      const tx = await roflSwapOracle.placeOrder(encodedOrder);
      const receipt = await tx.wait();
      
      // Get order ID from events
      const orderPlacedEvent = receipt.logs
        .filter(log => log.address === roflSwapOracleAddress)
        .map(log => {
          try {
            return roflSwapOracle.interface.parseLog({
              data: log.data,
              topics: log.topics
            });
          } catch (e) {
            return null;
          }
        })
        .filter(event => event && event.name === 'OrderPlaced')
        .pop();
      
      if (orderPlacedEvent) {
        const newOrderId = orderPlacedEvent.args[0];
        console.log(`✅ Order placed successfully! Order ID: ${newOrderId.toString()}`);
      } else {
        console.log("✅ Order transaction successful, but couldn't find the OrderPlaced event");
      }
      
      // Log transaction details
      console.log(`Transaction hash: ${receipt.hash}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      
    } catch (error) {
      console.error("Error placing order:", error);
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }
  });

task("execute-match", "Execute a match between two orders in ROFLSwapOracle")
  .addParam("buyOrder", "ID of the buy order")
  .addParam("sellOrder", "ID of the sell order")
  .addOptionalParam("amount", "Amount to match (if not specified, max possible amount will be used)")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    
    console.log("Executing order match in ROFLSwapOracle...");
    
    // Process arguments
    const buyOrderId = taskArgs.buyOrder;
    const sellOrderId = taskArgs.sellOrder;
    let matchAmount;
    
    if (taskArgs.amount) {
      matchAmount = ethers.parseEther(taskArgs.amount);
      console.log(`Match Amount: ${ethers.formatEther(matchAmount)}`);
    }
    
    console.log(`Buy Order ID: ${buyOrderId}`);
    console.log(`Sell Order ID: ${sellOrderId}`);
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Load deployment information
    let roflSwapOracleAddress, privateWaterTokenAddress, privateFireTokenAddress;
    try {
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-oracle-deployment-${hre.network.name}.json`)
      );
      roflSwapOracleAddress = deploymentData.roflSwapOracle;
      privateWaterTokenAddress = deploymentData.privateWaterToken;
      privateFireTokenAddress = deploymentData.privateFireToken;
      console.log(`ROFLSwapOracle: ${roflSwapOracleAddress}`);
      console.log(`WATER Token: ${privateWaterTokenAddress}`);
      console.log(`FIRE Token: ${privateFireTokenAddress}`);
    } catch (error) {
      console.error("Failed to load deployment information:", error.message);
      throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
    }
    
    // Get contract instance
    const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
    
    try {
      // Check oracle address
      const contractOracle = await roflSwapOracle.oracle();
      if (contractOracle !== signer.address) {
        console.error(`Your address (${signer.address}) does not match the oracle address (${contractOracle})`);
        console.error("You are not authorized to execute matches. Please set yourself as the oracle or use the correct account.");
        return;
      }
      
      // Check if orders exist
      const buyOrderExists = await roflSwapOracle.orderExists(buyOrderId);
      const sellOrderExists = await roflSwapOracle.orderExists(sellOrderId);
      
      if (!buyOrderExists) {
        console.error(`Buy order ${buyOrderId} does not exist`);
        return;
      }
      
      if (!sellOrderExists) {
        console.error(`Sell order ${sellOrderId} does not exist`);
        return;
      }
      
      // Check if orders are already filled
      const isBuyOrderFilled = await roflSwapOracle.filledOrders(buyOrderId);
      const isSellOrderFilled = await roflSwapOracle.filledOrders(sellOrderId);
      
      if (isBuyOrderFilled) {
        console.error(`Buy order ${buyOrderId} is already filled`);
        return;
      }
      
      if (isSellOrderFilled) {
        console.error(`Sell order ${sellOrderId} is already filled`);
        return;
      }
      
      // Need to fetch order details - this is a bit tricky as it requires auth token
      // For simplicity, we'll use empty auth token and let the contract verify that we're the oracle
      const authToken = Buffer.from(""); // Empty auth token for oracle
      
      // Fetch buy order details
      const buyOrderData = await roflSwapOracle.getEncryptedOrder(authToken, buyOrderId);
      const buyOrderOwner = await roflSwapOracle.getOrderOwner(authToken, buyOrderId);
      
      // Fetch sell order details
      const sellOrderData = await roflSwapOracle.getEncryptedOrder(authToken, sellOrderId);
      const sellOrderOwner = await roflSwapOracle.getOrderOwner(authToken, sellOrderId);
      
      console.log(`Buy Order Owner: ${buyOrderOwner}`);
      console.log(`Sell Order Owner: ${sellOrderOwner}`);
      
      // Decode order data
      const abiCoder = new ethers.AbiCoder();
      
      const buyOrderDecoded = abiCoder.decode(
        ["uint256", "address", "address", "uint256", "uint256", "bool"],
        buyOrderData
      );
      
      const sellOrderDecoded = abiCoder.decode(
        ["uint256", "address", "address", "uint256", "uint256", "bool"],
        sellOrderData
      );
      
      const buyOrderToken = buyOrderDecoded[2];
      const buyOrderPrice = buyOrderDecoded[3];
      const buyOrderSize = buyOrderDecoded[4];
      const isBuyOrderBuy = buyOrderDecoded[5];
      
      const sellOrderToken = sellOrderDecoded[2];
      const sellOrderPrice = sellOrderDecoded[3];
      const sellOrderSize = sellOrderDecoded[4];
      const isSellOrderBuy = sellOrderDecoded[5];
      
      // Validate orders
      if (!isBuyOrderBuy) {
        console.error(`Order ${buyOrderId} is not a buy order`);
        return;
      }
      
      if (isSellOrderBuy) {
        console.error(`Order ${sellOrderId} is not a sell order`);
        return;
      }
      
      if (buyOrderToken !== sellOrderToken) {
        console.error(`Token mismatch: Buy order token: ${buyOrderToken}, Sell order token: ${sellOrderToken}`);
        return;
      }
      
      if (buyOrderPrice.lt(sellOrderPrice)) {
        console.error(`Price mismatch: Buy price ${ethers.formatEther(buyOrderPrice)} < Sell price ${ethers.formatEther(sellOrderPrice)}`);
        return;
      }
      
      // Determine match amount
      const maxMatchAmount = matchAmount || 
                           (buyOrderSize.lt(sellOrderSize) ? buyOrderSize : sellOrderSize);
      
      console.log(`Buy Order Size: ${ethers.formatEther(buyOrderSize)}`);
      console.log(`Sell Order Size: ${ethers.formatEther(sellOrderSize)}`);
      console.log(`Buy Order Price: ${ethers.formatEther(buyOrderPrice)}`);
      console.log(`Sell Order Price: ${ethers.formatEther(sellOrderPrice)}`);
      console.log(`Match Amount: ${ethers.formatEther(maxMatchAmount)}`);
      
      // Execute match
      console.log("Executing match...");
      const tx = await roflSwapOracle.executeMatch(
        buyOrderId,
        sellOrderId,
        buyOrderOwner,
        sellOrderOwner,
        buyOrderToken,
        maxMatchAmount,
        buyOrderPrice
      );
      
      const receipt = await tx.wait();
      
      console.log("✅ Match executed successfully");
      console.log(`Transaction hash: ${receipt.hash}`);
      console.log(`Gas used: ${receipt.gasUsed.toString()}`);
      
      // Check if orders are filled now
      const isBuyOrderFilledNow = await roflSwapOracle.filledOrders(buyOrderId);
      const isSellOrderFilledNow = await roflSwapOracle.filledOrders(sellOrderId);
      
      console.log(`Buy order ${buyOrderId} filled: ${isBuyOrderFilledNow}`);
      console.log(`Sell order ${sellOrderId} filled: ${isSellOrderFilledNow}`);
      
    } catch (error) {
      console.error("Error executing match:", error);
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }
  });

task("list-orders", "List all orders in the ROFLSwapOracle contract")
  .setAction(async (_, hre) => {
    const { ethers } = hre;
    
    console.log("Listing orders in ROFLSwapOracle...");
    
    // Get signers
    const [signer] = await ethers.getSigners();
    console.log(`Using account: ${signer.address}`);
    
    // Load deployment information
    let roflSwapOracleAddress;
    try {
      const deploymentData = JSON.parse(
        fs.readFileSync(`./roflswap-oracle-deployment-${hre.network.name}.json`)
      );
      roflSwapOracleAddress = deploymentData.roflSwapOracle;
      console.log(`ROFLSwapOracle: ${roflSwapOracleAddress}`);
    } catch (error) {
      console.error("Failed to load deployment information:", error.message);
      throw new Error("Deployment file not found. Please deploy ROFLSwapOracle first.");
    }
    
    // Get contract instance
    const roflSwapOracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
    
    try {
      // Get total order count
      const orderCount = await roflSwapOracle.getTotalOrderCount();
      console.log(`Total orders: ${orderCount}`);
      
      if (BigInt(orderCount) === 0n) {
        console.log("No orders have been placed yet.");
        return;
      }
      
      // Check if we're the oracle
      const contractOracle = await roflSwapOracle.oracle();
      const isOracle = contractOracle === signer.address;
      
      console.log(`Oracle address: ${contractOracle}`);
      console.log(`Is oracle: ${isOracle}`);
      
      // List orders
      console.log("\nOrder Summary:");
      console.log("-------------");
      
      if (isOracle) {
        // If we're the oracle, we can get all orders
        for (let i = 1; i <= Number(orderCount); i++) {
          const orderExists = await roflSwapOracle.orderExists(i);
          if (!orderExists) continue;
          
          const isFilled = await roflSwapOracle.filledOrders(i);
          const authToken = Buffer.from("");
          const owner = await roflSwapOracle.getOrderOwner(authToken, i);
          
          console.log(`Order #${i} - Owner: ${owner} - Filled: ${isFilled}`);
          
          if (!isFilled) {
            try {
              const orderData = await roflSwapOracle.getEncryptedOrder(authToken, i);
              const abiCoder = new ethers.AbiCoder();
              const decodedOrder = abiCoder.decode(
                ["uint256", "address", "address", "uint256", "uint256", "bool"],
                orderData
              );
              
              const token = decodedOrder[2];
              const price = decodedOrder[3];
              const size = decodedOrder[4];
              const isBuy = decodedOrder[5];
              
              console.log(`  Type: ${isBuy ? "BUY" : "SELL"}`);
              console.log(`  Token: ${token}`);
              console.log(`  Size: ${ethers.formatEther(size)}`);
              console.log(`  Price: ${ethers.formatEther(price)}`);
            } catch (error) {
              console.log("  Unable to decode order data");
            }
          }
          
          console.log("");
        }
      } else {
        // If we're not the oracle, we can only get our own orders
        const authToken = Buffer.from("");
        const userOrders = await roflSwapOracle.getUserOrders(authToken, signer.address);
        
        if (userOrders.length === 0) {
          console.log(`No orders found for your address: ${signer.address}`);
          return;
        }
        
        console.log(`Found ${userOrders.length} orders for your address: ${signer.address}`);
        
        for (const orderId of userOrders) {
          const isFilled = await roflSwapOracle.filledOrders(orderId);
          
          console.log(`Order #${orderId} - Filled: ${isFilled}`);
          
          if (!isFilled) {
            try {
              const orderData = await roflSwapOracle.getEncryptedOrder(authToken, orderId);
              const abiCoder = new ethers.AbiCoder();
              const decodedOrder = abiCoder.decode(
                ["uint256", "address", "address", "uint256", "uint256", "bool"],
                orderData
              );
              
              const token = decodedOrder[2];
              const price = decodedOrder[3];
              const size = decodedOrder[4];
              const isBuy = decodedOrder[5];
              
              console.log(`  Type: ${isBuy ? "BUY" : "SELL"}`);
              console.log(`  Token: ${token}`);
              console.log(`  Size: ${ethers.formatEther(size)}`);
              console.log(`  Price: ${ethers.formatEther(price)}`);
            } catch (error) {
              console.log("  Unable to decode order data");
            }
          }
          
          console.log("");
        }
      }
      
    } catch (error) {
      console.error("Error listing orders:", error);
      if (error.data) {
        console.error("Error data:", error.data);
      }
    }
  });

module.exports = {}; 