import { task } from "hardhat/config";

task("deploy-roflswap", "Deploy the ROFLSwapV3 contract")
  .addParam("watertoken", "The address of the WATER token")
  .addParam("firetoken", "The address of the FIRE token")
  .addParam("roflappid", "The ROFL app ID from `oasis rofl create` command")
  .setAction(async (taskArgs, hre) => {
    console.log(`Deploying ROFLSwapV3 with:`);
    console.log(`WATER Token: ${taskArgs.watertoken}`);
    console.log(`FIRE Token: ${taskArgs.firetoken}`);
    console.log(`ROFL App ID: ${taskArgs.roflappid}`);
    
    // Get the signer
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    
    // We need to convert the ROFL app ID (base58 string) to bytes21
    // Note: We need to manually pad the bytes to make it exactly 21 bytes
    const utils = hre.ethers;
    let appIdBytes = utils.toUtf8Bytes(taskArgs.roflappid);
    
    // Create a full 21-byte array by taking the first 21 bytes or padding with zeros
    let bytes21AppId = new Uint8Array(21);
    for (let i = 0; i < Math.min(21, appIdBytes.length); i++) {
      bytes21AppId[i] = appIdBytes[i];
    }
    
    console.log(`ROFL App ID bytes21: 0x${utils.hexlify(bytes21AppId).substring(2)}`);
    
    // Deploy the contract
    const ROFLSwapFactory = await hre.ethers.getContractFactory("ROFLSwapV3");
    const roflSwap = await ROFLSwapFactory.deploy(
      taskArgs.watertoken,
      taskArgs.firetoken,
      bytes21AppId
    );
    
    await roflSwap.waitForDeployment();
    const roflSwapAddress = await roflSwap.getAddress();
    
    console.log(`ROFLSwapV3 deployed to: ${roflSwapAddress}`);
    console.log(`Owner: ${deployer.address}`);
    console.log(`ROFL App ID: ${taskArgs.roflappid}`);
    
    // Save the deployment to a file
    const fs = require('fs');
    const deploymentInfo = {
      network: hre.network.name,
      contractAddress: roflSwapAddress,
      waterToken: taskArgs.watertoken,
      fireToken: taskArgs.firetoken,
      roflAppId: taskArgs.roflappid,
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    };
    
    const fileName = `roflswap-deployment-${hre.network.name}.json`;
    fs.writeFileSync(fileName, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment information saved to ${fileName}`);
    
    return {
      address: roflSwapAddress,
      roflAppId: taskArgs.roflappid
    };
  });

export {};
