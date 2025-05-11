// Script to update the Oracle address with a transaction from inside the TEE
// This implementation will first deploy a new ROFL machine session and then update the contract
const hre = require("hardhat");
const { ethers } = require("hardhat");
const { execSync } = require("child_process");

async function main() {
  console.log("\n=== SETTING ORACLE TO MATCH TEE IDENTITY ===\n");
  
  // Get signers
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);
  
  // Network info
  const networkName = hre.network.name;
  console.log(`Using network: ${networkName}`);
  
  // Contract information
  const roflSwapOracleAddress = "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e";
  console.log(`ROFLSwapOracle address: ${roflSwapOracleAddress}`);
  
  // Get the contract instance
  const oracle = await ethers.getContractAt("ROFLSwapOracle", roflSwapOracleAddress);
  
  // Get current oracle address and ROFL app ID
  const currentOracle = await oracle.oracle();
  const currentAppID = await oracle.roflAppID();
  
  console.log(`Current Oracle address: ${currentOracle}`);
  console.log(`Current ROFL App ID (hex): ${currentAppID}`);
  
  // Convert app ID from hex to readable format
  let appIdAscii = "";
  for (let i = 2; i < currentAppID.length; i += 2) {
    appIdAscii += String.fromCharCode(parseInt(currentAppID.substr(i, 2), 16));
  }
  console.log(`Current App ID decoded: ${appIdAscii}`);
  
  console.log("\nTo fix the oracle permission issue, we need to:");
  console.log("1. Run a command in the TEE that signs a transaction setting itself as the oracle");
  console.log("2. This will grant the oracle inside the TEE permissions to access orders");
  console.log("");
  console.log("To do this, we need to run an oasis rofl session that calls our contract");
  console.log("Use the following steps:");
  console.log("");
  console.log("1. Open a terminal and run: cd ../rofl_app");
  console.log("2. Run: oasis rofl session shell");
  console.log("3. In the session shell, run a Python script to register the TEE's account:");
  console.log("");
  console.log("```python");
  console.log("import os");
  console.log("from web3 import Web3");
  console.log("from eth_account import Account");
  console.log("from rofl_app.rofl_auth import RoflUtility");
  console.log("");
  console.log("# Get the oracle address inside the TEE");
  console.log("private_key = os.environ.get('MATCHER_PRIVATE_KEY')");
  console.log("if private_key:");
  console.log("    account = Account.from_key(private_key)");
  console.log("    print(f'Oracle address inside TEE: {account.address}')");
  console.log("else:");
  console.log("    print('No MATCHER_PRIVATE_KEY found')");
  console.log("```");
  console.log("");
  console.log("4. Use that address to update the oracle in the contract");
  console.log("5. Restart the ROFL machine: oasis rofl machine restart");
  console.log("");
  console.log("After these steps, your matcher should have permission to execute trades!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 