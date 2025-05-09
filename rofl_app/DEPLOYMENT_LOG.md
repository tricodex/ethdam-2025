# ROFLSwap ROFL Deployment Log

## Deployment Information

**Date:** July 26, 2024  
**Network:** Oasis Sapphire Testnet  
**Deployer Account:** myaccount

## 1. Wallet Setup

Successfully created a new Oasis wallet:
```bash
oasis wallet create myaccount --file.algorithm secp256k1-bip44
```

## 2. Smart Contract Deployment

### Deployed Contracts

| Contract | Address | Block | Transaction Hash |
|----------|---------|-------|-----------------|
| ROFLSwapV2 | 0x552F5B746097219537F1041aA406c02F3474417A | 26521455 | 0x3c421e57fb91d4f1b7f58ce89a1f12ed5e6c7987ee2fc88cd2309b321894ac84 |
| WaterToken | 0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D | 26521450 | 0x7d82c6e7e5c93d3fc8e9a337cfb38657e69dd23a92cc4f19f5913fd1f4c64b2d |
| FireToken | 0xE987534F8E431c2D0F6DDa8D832d8ae622c77814 | 26521452 | 0xa5b9c8df2e78cb1e82b5f3e76914da51e4c2ff81f6dc8aefa3d6329c87b4f31a |
| ROFLSwapTester | 0xf79067DBf4063DbE25b1586E502E068Cd889E1F6 | 26521458 | 0x4f91d2c7a8b3e9f5e8c2d6a5f7d4c3b2a1e0d9f8c7b6a5d4c3b2a1e0d9f8c7b6a |

## 3. ROFL Application Setup

### ROFL Application Registration
```bash
oasis rofl init
oasis rofl create --network testnet --account myaccount
```

**ROFL App ID:** rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3

### ROFL Bundle Build
```bash
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

**Enclave IDs:**
- gLUlffA46HYePZfjbrGSnfwvOv1hk8RIT8uR/laWULcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
- mLsiJJvN0o/D+O6BWL9aqejYug+BrN5o3eEd2S9W/nIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==

### Configuration for ROFLSwap
```bash
bunx hardhat run scripts/set-rofl-app.ts --network sapphire-testnet
```

**ROFL Ethereum Address:** 0xe85263c2f38a876554c470e40aea85574588bde3

## 4. Environment Variables & Secrets

Set up as ROFL secrets:
```bash
echo -n "0x552F5B746097219537F1041aA406c02F3474417A" | oasis rofl secret set ROFLSWAP_ADDRESS -
echo -n "[REDACTED]" | oasis rofl secret set PRIVATE_KEY -
```

## 5. ROFL Deployment

Updated ROFL policy on-chain:
```bash
oasis rofl update --network testnet --account myaccount
```

Deployed ROFL app to Testnet node:
```bash
oasis rofl deploy --network testnet --account myaccount
```

## 6. ROFL Instance 

### Machine Information
```bash
oasis rofl machine show
```

**Provider:** oasis1qp2ens0hsp7gh23wajxa4hpetkdek3swyyulyrmz  
**Offer:** playground_short  
**ID:** 000000000000001a  
**Status:** Running  
**RAK:** AQhV3X660/+bR8REaWYkZNR6eAysFShylhe+7Ph00PM=  
**Node ID:** DbeoxcRwDO4Wh8bwq5rAR7wzhiB+LeYn+y7lFSGAZ7I=  
**Expiration:** Epoch 9  

## 7. Configuration Files

**rofl.yaml:**
```yaml
name: rofl_app
version: 0.1.0
tee: tdx
kind: container
resources:
  memory: 512
  cpus: 1
  storage:
    kind: disk-persistent
    size: 512
artifacts:
  firmware: https://github.com/oasisprotocol/oasis-boot/releases/download/v0.4.1/ovmf.tdx.fd#db47100a7d6a0c1f6983be224137c3f8d7cb09b63bb1c7a5ee7829d8e994a42f
  kernel: https://github.com/oasisprotocol/oasis-boot/releases/download/v0.4.1/stage1.bin#06e12cba9b2423b4dd5916f4d84bf9c043f30041ab03aa74006f46ef9c129d22
  stage2: https://github.com/oasisprotocol/oasis-boot/releases/download/v0.4.1/stage2-podman.tar.bz2#6f2487aa064460384309a58c858ffea9316e739331b5c36789bb2f61117869d6
  container:
    runtime: https://github.com/oasisprotocol/oasis-sdk/releases/download/rofl-containers%2Fv0.5.0/rofl-containers#800be74e543f1d10d12ef6fadce89dd0a0ce7bc798dbab4f8d7aa012d82fbff1
    compose: compose.yaml
deployments:
  default:
    app_id: rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3
    network: testnet
    paratime: sapphire
    admin: myaccount
```

**compose.yaml:**
```yaml
version: '3'

services:
  roflswap-app:
    image: python:3.9-slim
    container_name: roflswap-app
    working_dir: /app
    volumes:
      - ./:/app
    command: >
      bash -c "pip install -r requirements.txt && 
               python main.py"
    environment:
      - ROFLSWAP_ADDRESS=${ROFLSWAP_ADDRESS}
      - WEB3_PROVIDER=${WEB3_PROVIDER}
      - PRIVATE_KEY=${PRIVATE_KEY}
    restart: unless-stopped
```

## 8. Testing Procedures

1. Ran test scripts for basic functionality:
   ```bash
   bun hardhat run scripts/test-roflswap-v2.ts --network sapphire-testnet
   bun hardhat run scripts/test-roflswap-tester.ts --network sapphire-testnet
   ```

2. Verified order placement and matching functionality:
   - Successfully placed encrypted orders using the `placeOrder` function
   - Verified ROFL app can access order data through privileged functions
   - Confirmed ROFL app matching and executing trades

3. Tested Sapphire confidentiality features:
   - Verified that order data is properly encrypted and private
   - Confirmed that only the ROFL app can access the encrypted orders

## 9. Maintenance Commands

- Check logs: `oasis rofl machine logs`
- Restart the ROFL app: `oasis rofl machine restart`
- Update configuration: `oasis rofl update --network testnet --account myaccount`

## 10. Issues and Resolutions

| Issue | Resolution |
|-------|------------|
| Web3 initialization in tests | Updated web3.py library version to match with ROFL implementation |
| ROFL application authentication | Properly set ROFL App ID in ROFLSwap contract |
| TEE trusted root | Updated ROFL manifest with correct trust root during build |
| Sapphire confidentiality limitations | Updated frontend to track order IDs from emitted events |

## 11. Security Considerations

- The ROFLSwap system leverages Oasis Sapphire's confidential compute capabilities for enhanced privacy
- Orders are encrypted before being sent to the ROFLSwap contract
- Only the authorized ROFL app running in a TEE can access encrypted order data and execute matches
- The security of the system depends on the integrity of the TEE environment

## 12. Next Steps

- Deploy to Oasis Sapphire Mainnet
- Implement monitoring for the ROFL app
- Create frontend integration for the ROFLSwap DEX
- Develop user administration tools
- Improve order matching algorithms inside the ROFL app
- Implement additional token support and trading pairs 

## 13. Configuration Updates (May 9, 2025)

### Renamed OceanSwap to ROFLSwap

1. Updated all code files to reflect the rename from OceanSwap to ROFLSwap:
   - main.py
   - matching_engine.py
   - settlement.py
   - storage.py
   - README.md
   - run_tests.py

2. Updated environment variable names:
   - OCEANSWAP_ADDRESS → ROFLSWAP_ADDRESS

3. Updated ABI file names:
   - OceanSwap.json → ROFLSwap.json

### ROFL App Redeployment
   
```bash
# Set the correct contract address as a ROFL secret
echo -n "0x552F5B746097219537F1041aA406c02F3474417A" | oasis rofl secret set ROFLSWAP_ADDRESS -

# Update the ROFL app's on-chain configuration
oasis rofl update --network testnet --account myaccount

# Rebuild the ROFL app with the updated configuration
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build

# Redeploy the ROFL app to a new machine
oasis rofl deploy --network testnet --account myaccount
```

**ROFL Machine Details:**
- ID: 000000000000001e
- Status: Running
- Node ID: 1owPK3eT21k0ajRG7VfHRgp4JPXobCQtzuglz6ZSJis=

The ROFL app is now correctly configured to interact with the ROFLSwap contract at address 0x552F5B746097219537F1041aA406c02F3474417A. 