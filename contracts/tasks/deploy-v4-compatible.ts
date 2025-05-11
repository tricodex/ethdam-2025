import { task } from 'hardhat/config';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';
import * as fs from 'fs';

task('deploy-roflswap-v5', 'Deploy ROFLSwapV5 contract with the full ROFL app ID')
  .addOptionalParam('watertoken', 'Address of the private WATER token')
  .addOptionalParam('firetoken', 'Address of the private FIRE token')
  .addParam('roflappid', 'Full ROFL app ID (no truncation)')
  .setAction(async (args, hre: HardhatRuntimeEnvironment) => {
    console.log('Deploying ROFLSwapV5 to network:', hre.network.name);
    
    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deployer account: ${deployer.address}`);
    
    // Get private token addresses
    let privateWaterToken = args.watertoken;
    let privateFireToken = args.firetoken;
    
    // If tokens are not provided, load from deployment file
    if (!privateWaterToken || !privateFireToken) {
      try {
        const deploymentData = JSON.parse(
          fs.readFileSync(`./private-tokens-deployment-${hre.network.name}.json`, 'utf8')
        );
        privateWaterToken = deploymentData.privateWaterToken;
        privateFireToken = deploymentData.privateFireToken;
        console.log(`Using tokens from deployment file: WATER=${privateWaterToken}, FIRE=${privateFireToken}`);
      } catch (error) {
        console.error('Token addresses not provided and deployment file not found');
        throw error;
      }
    }
    
    // Deploy contract
    console.log('Deploying with parameters:');
    console.log(`Water Token: ${privateWaterToken}`);
    console.log(`Fire Token: ${privateFireToken}`);
    console.log(`ROFL App ID: ${args.roflappid}`);
    
    // Convert ROFL app ID to bytes
    const roflAppIdBytes = ethers.toUtf8Bytes(args.roflappid);
    console.log(`ROFL App ID length: ${args.roflappid.length} characters`);
    console.log(`ROFL App ID as bytes: 0x${Buffer.from(roflAppIdBytes).toString('hex')}`);
    
    // Get contract factory and deploy
    const ROFLSwapV5 = await hre.ethers.getContractFactory('ROFLSwapV5');
    const roflSwap = await ROFLSwapV5.deploy(
      privateWaterToken,
      privateFireToken,
      roflAppIdBytes
    );
    
    await roflSwap.waitForDeployment();
    const deployedAddress = await roflSwap.getAddress();
    
    console.log(`ROFLSwapV5 deployed to: ${deployedAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      roflSwapV5: deployedAddress,
      privateWaterToken: privateWaterToken,
      privateFireToken: privateFireToken,
      roflAppId: args.roflappid,
      deployer: deployer.address,
      timestamp: new Date().toISOString()
    };
    
    const filename = `roflswap-v5-deployment-${hre.network.name}.json`;
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log(`Deployment info saved to ${filename}`);
    
    // Print next steps
    console.log('\nNext steps:');
    console.log('1. Request privacy access:');
    console.log(`   bun hardhat request-privacy:v5 --contract ${deployedAddress} --network ${hre.network.name}`);
    console.log('2. Update the ROFL app with the new contract address:');
    console.log(`   echo -n "${deployedAddress}" | oasis rofl secret set ROFLSWAP_ADDRESS -`);
    console.log('3. Update the ROFL app configuration:');
    console.log('   oasis rofl update --account myaccount');
    
    return deployedAddress;
  }); 