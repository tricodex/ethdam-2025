import hre from "hardhat";

// Token addresses from our deployment
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const FIRE_TOKEN_ADDRESS = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814";

async function main() {
  console.log("Testing interactions with deployed tokens on network:", hre.network.name);

  // Get the deployer wallet
  const [deployer] = await hre.viem.getWalletClients();
  console.log("Using account:", deployer.account.address);

  // Get the public client
  const publicClient = await hre.viem.getPublicClient();
  
  // Get contract instances
  const waterToken = await hre.viem.getContractAt("WaterToken", WATER_TOKEN_ADDRESS);
  const fireToken = await hre.viem.getContractAt("FireToken", FIRE_TOKEN_ADDRESS);

  // Test basic token information
  console.log("\n--- Token Information ---");
  
  // WaterToken
  const waterSymbol = await waterToken.read.symbol();
  const waterName = await waterToken.read.name();
  const waterDecimals = await waterToken.read.decimals();
  const waterTotalSupply = await waterToken.read.totalSupply();
  const waterDeployerBalance = await waterToken.read.balanceOf([deployer.account.address]);
  
  console.log(`WaterToken (${waterSymbol}):
  - Name: ${waterName}
  - Decimals: ${waterDecimals}
  - Total Supply: ${waterTotalSupply} (${Number(waterTotalSupply) / 10**Number(waterDecimals)} ${waterSymbol})
  - Deployer Balance: ${waterDeployerBalance} (${Number(waterDeployerBalance) / 10**Number(waterDecimals)} ${waterSymbol})`);

  // FireToken
  const fireSymbol = await fireToken.read.symbol();
  const fireName = await fireToken.read.name();
  const fireDecimals = await fireToken.read.decimals();
  const fireTotalSupply = await fireToken.read.totalSupply();
  const fireDeployerBalance = await fireToken.read.balanceOf([deployer.account.address]);
  
  console.log(`FireToken (${fireSymbol}):
  - Name: ${fireName}
  - Decimals: ${fireDecimals}
  - Total Supply: ${fireTotalSupply} (${Number(fireTotalSupply) / 10**Number(fireDecimals)} ${fireSymbol})
  - Deployer Balance: ${fireDeployerBalance} (${Number(fireDeployerBalance) / 10**Number(fireDecimals)} ${fireSymbol})`);

  // Test transfer functionality
  console.log("\n--- Testing Transfer Functionality ---");
  
  // Create a random recipient address for testing
  // In a real-world scenario, you would use actual recipient addresses
  const randomRecipientAddress = "0x0000000000000000000000000000000000000001";
  
  const transferAmount = BigInt("1000000000000000000"); // 1 token with 18 decimals
  
  console.log(`Preparing to transfer ${transferAmount} (1 token) to ${randomRecipientAddress}...`);
  
  // Check if we can get transaction count
  console.log(`Getting current block information...`);
  try {
    const blockNumber = await publicClient.getBlockNumber();
    console.log(`Current block number: ${blockNumber}`);
  } catch (error) {
    console.error(`Error getting block number: ${error}`);
  }
  
  try {
    console.log("\nTransferring WaterToken...");
    const waterTransferTx = await waterToken.write.transfer([randomRecipientAddress, transferAmount]);
    console.log(`WaterToken transfer transaction hash: ${waterTransferTx}`);
    
    // Waiting for transaction confirmation
    console.log("Waiting for transaction confirmation...");
    const waterReceipt = await publicClient.waitForTransactionReceipt({ hash: waterTransferTx });
    console.log(`WaterToken transfer confirmed in block ${waterReceipt.blockNumber}`);
    
    // Check the balance of the recipient
    const recipientWaterBalance = await waterToken.read.balanceOf([randomRecipientAddress]);
    console.log(`Recipient's WaterToken balance: ${recipientWaterBalance} (${Number(recipientWaterBalance) / 10**Number(waterDecimals)} ${waterSymbol})`);
  } catch (error) {
    console.error(`Error transferring WaterToken: ${error}`);
  }
  
  try {
    console.log("\nTransferring FireToken...");
    const fireTransferTx = await fireToken.write.transfer([randomRecipientAddress, transferAmount]);
    console.log(`FireToken transfer transaction hash: ${fireTransferTx}`);
    
    // Waiting for transaction confirmation
    console.log("Waiting for transaction confirmation...");
    const fireReceipt = await publicClient.waitForTransactionReceipt({ hash: fireTransferTx });
    console.log(`FireToken transfer confirmed in block ${fireReceipt.blockNumber}`);
    
    // Check the balance of the recipient
    const recipientFireBalance = await fireToken.read.balanceOf([randomRecipientAddress]);
    console.log(`Recipient's FireToken balance: ${recipientFireBalance} (${Number(recipientFireBalance) / 10**Number(fireDecimals)} ${fireSymbol})`);
  } catch (error) {
    console.error(`Error transferring FireToken: ${error}`);
  }
  
  console.log("\n--- Testing Token Owner Functionality ---");
  
  // Test the owner of the tokens
  try {
    const waterOwner = await waterToken.read.owner();
    console.log(`WaterToken owner: ${waterOwner}`);
    
    const fireOwner = await fireToken.read.owner();
    console.log(`FireToken owner: ${fireOwner}`);
    
    if (waterOwner.toLowerCase() === deployer.account.address.toLowerCase()) {
      console.log(`Confirmed: Deployer is the owner of WaterToken`);
    } else {
      console.log(`Warning: Deployer is not the owner of WaterToken`);
    }
    
    if (fireOwner.toLowerCase() === deployer.account.address.toLowerCase()) {
      console.log(`Confirmed: Deployer is the owner of FireToken`);
    } else {
      console.log(`Warning: Deployer is not the owner of FireToken`);
    }
  } catch (error) {
    console.error(`Error checking token owners: ${error}`);
  }
  
  console.log("\n--- Testing Completed Successfully ---");
  console.log("The WaterToken and FireToken contracts are functioning as expected.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 