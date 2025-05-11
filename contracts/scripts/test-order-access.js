// Script to test order access in the ROFLSwapV5 contract
const hre = require("hardhat");
const ethers = hre.ethers;

// Helper function for better error reporting
function formatError(error) {
  if (error.errorName) {
    return `${error.errorName}: ${error.errorArgs || error.message}`;
  } else if (error.reason) {
    return error.reason;
  } else if (error.data) {
    return `Error data: ${error.data}`;
  } else {
    return error.message;
  }
}

async function main() {
  console.log("\n=== TESTING ORDER ACCESS ON ROFLSWAPV5 ===\n");
  
  try {
    // Get the network
    const network = hre.network.name === 'hardhat' ? 'sapphire-testnet' : hre.network.name;
    console.log(`Using network: ${network}`);
    
    // Hardcoded addresses for Sapphire testnet
    const roflswapAddress = "0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB";
    const waterTokenAddress = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04";
    const fireTokenAddress = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977";
    
    console.log(`ROFLSwapV5: ${roflswapAddress}`);
    console.log(`Water Token: ${waterTokenAddress}`);
    console.log(`Fire Token: ${fireTokenAddress}`);
    
    // Connect to the ROFLSwapV5 contract
    const roflswap = await ethers.getContractAt("ROFLSwapV5", roflswapAddress);
    
    // Get account information
    const [account] = await ethers.getSigners();
    const address = account.address;
    console.log(`Using address: ${address}`);
    
    // Check total order count
    try {
      const totalOrderCount = await roflswap.getTotalOrderCount();
      console.log(`Total Orders in System: ${totalOrderCount}`);
    } catch (error) {
      console.log(`Error getting total order count: ${formatError(error)}`);
    }
    
    // Try to get user's orders
    try {
      const myOrders = await roflswap.getMyOrders();
      console.log(`Your orders: ${myOrders.join(', ')}`);
    } catch (error) {
      console.log(`Error getting my orders: ${formatError(error)}`);
    }
    
    // Try to check specific orders
    for (let orderId = 15; orderId <= 16; orderId++) {
      console.log(`\nTrying to access Order #${orderId}:`);
      
      // Check if order exists
      try {
        const exists = await roflswap.orderExists(orderId);
        console.log(`- Order exists: ${exists}`);
      } catch (error) {
        console.log(`- Error checking if order exists: ${formatError(error)}`);
      }
      
      // Check if order is filled
      try {
        const isFilled = await roflswap.filledOrders(orderId);
        console.log(`- Order is filled: ${isFilled}`);
      } catch (error) {
        console.log(`- Error checking if order is filled: ${formatError(error)}`);
      }
      
      // Try to get encrypted order
      try {
        console.log(`- Attempting to get encrypted order data...`);
        const encryptedData = await roflswap.getEncryptedOrder(orderId);
        console.log(`- Successfully retrieved encrypted data: ${encryptedData.slice(0, 100)}...`);
        
        // Try to decode if it looks like a JSON string
        try {
          const text = new TextDecoder().decode(encryptedData);
          if (text.startsWith('{') && text.endsWith('}')) {
            console.log(`- Decoded data: ${text}`);
          } else {
            console.log(`- Raw data (not JSON): ${text}`);
          }
        } catch (decodeError) {
          console.log(`- Could not decode data: ${decodeError.message}`);
        }
      } catch (error) {
        console.log(`- Error getting encrypted order: ${formatError(error)}`);
        if (error.data) {
          console.log(`- Error data: ${error.data}`);
        }
      }
      
      // Try to get order owner
      try {
        const owner = await roflswap.getOrderOwner(orderId);
        console.log(`- Order owner: ${owner}`);
      } catch (error) {
        console.log(`- Error getting order owner: ${formatError(error)}`);
        if (error.data) {
          console.log(`- Error data: ${error.data}`);
        }
      }
    }
    
    console.log("\n=== TESTING COMPLETED ===");
    
  } catch (error) {
    console.log(`\nGlobal Error: ${formatError(error)}`);
    console.error(error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 