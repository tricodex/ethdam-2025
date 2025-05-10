import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';
import * as fs from 'fs';

task('deploy-roflswap-v4', 'Deploy ROFLSwapV4 contract with the full ROFL app ID')
  .addParam('watertoken', 'Address of the WATER token')
  .addParam('firetoken', 'Address of the FIRE token')
  .addParam('roflappid', 'Full ROFL app ID (no truncation)')
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    console.log('Deploying ROFLSwapV4 to network:', hre.network.name);
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer account: ${deployer.address}`);
    
    // Deploy contract
    console.log('Deploying with parameters:');
    console.log(`Water Token: ${args.watertoken}`);
    console.log(`Fire Token: ${args.firetoken}`);
    console.log(`ROFL App ID: ${args.roflappid}`);
    
    // Convert ROFL app ID to bytes
    const roflAppIdBytes = ethers.toUtf8Bytes(args.roflappid);
    
    // Get contract factory and deploy
    const ROFLSwapV4 = await hre.ethers.getContractFactory('ROFLSwapV4');
    const roflSwap = await ROFLSwapV4.deploy(
      args.watertoken,
      args.firetoken,
      roflAppIdBytes
    );
    
    await roflSwap.waitForDeployment();
    const deployedAddress = await roflSwap.getAddress();
    
    console.log(`ROFLSwapV4 deployed to: ${deployedAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      contractAddress: deployedAddress,
      waterToken: args.watertoken,
      fireToken: args.firetoken,
      roflAppId: args.roflappid,
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    };
    
    const filename = `roflswap-v4-deployment-${hre.network.name}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to ${filename}`);
    
    // Print next steps
    console.log('\nNext steps:');
    console.log('1. Update the ROFL app with the new contract address:');
    console.log(`   echo -n "${deployedAddress}" | oasis rofl secret set ROFLSWAP_ADDRESS -`);
    console.log('2. Update the ROFL app configuration:');
    console.log('   oasis rofl update --account myaccount');
    console.log('3. Test that the ROFL app can access the contract');
  }); 