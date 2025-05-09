# OceanSwap ROFL Application

This is the ROFL (Runtime Off-chain Logic) component of the OceanSwap decentralized exchange. It runs inside a Trusted Execution Environment (TEE) and handles the private order matching and settlement process.

## Components

1. **matching_engine.py**: Handles the order matching logic
2. **settlement.py**: Executes settlements on the OceanSwap contract
3. **storage.py**: Manages secure storage of orders and matches
4. **main.py**: Entry point for the ROFL application

## How It Works

1. The ROFL app periodically fetches encrypted orders from the OceanSwap contract
2. Inside the TEE, it decrypts the orders and matches compatible buy and sell orders
3. Matched trades are executed on-chain through the OceanSwap contract
4. All sensitive information is processed securely inside the TEE

## Setup

1. Create a directory called `abi` and place the contract ABIs there:
   - OceanSwap.json
   - PrivateERC20.json

2. Set up the required environment variables:
   ```
   export OCEANSWAP_ADDRESS="<deployed-contract-address>"
   export WEB3_PROVIDER="https://testnet.sapphire.oasis.io"
   export PRIVATE_KEY="<your-private-key>"
   ```

3. Install requirements:
   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python main.py
   ```

## Security

This ROFL application enhances the privacy of the OceanSwap protocol by:

1. Decrypting orders only inside the TEE
2. Processing matching logic securely without exposing order details
3. Signing settlement transactions from within the TEE
4. Storing sensitive information in a secure storage

All processing happens inside the secure ROFL environment, ensuring that order information remains confidential throughout the entire trading lifecycle.
