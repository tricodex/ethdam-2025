# ROFLSwap ROFL Application

This is the ROFL (Runtime Off-chain Logic) component of the ROFLSwap decentralized exchange. It runs inside a Trusted Execution Environment (TEE) and handles the private order matching and settlement process.

## Components

1. **matching_engine.py**: Handles the order matching logic
2. **settlement.py**: Executes settlements on the ROFLSwap contract
3. **storage.py**: Manages secure storage of orders and matches
4. **main.py**: Entry point for the ROFL application
5. **rofl.py**: Mock implementation of ROFL framework for testing and local development

## How It Works

1. The ROFL app periodically fetches encrypted orders from the ROFLSwap contract
2. Inside the TEE, it decrypts the orders and matches compatible buy and sell orders
3. Matched trades are executed on-chain through the ROFLSwap contract
4. All sensitive information is processed securely inside the TEE

## Setup

1. Create a directory called `abi` and place the contract ABIs there:
   - ROFLSwap.json
   - PrivateERC20.json

2. Set up the required environment variables:
   ```
   export ROFLSWAP_ADDRESS="<deployed-contract-address>"
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

## Testing

The application includes comprehensive tests for all components. To run the tests:

1. Install the development dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Run the tests:
   ```
   python run_tests.py
   ```

This will execute both unittest and pytest test suites. The test runner automatically:
- Creates mock ABI files for testing
- Sets up the necessary environment variables
- Verifies all components function correctly in isolation and together

You can also run individual test modules:
```
python -m unittest tests/test_rofl.py
python -m pytest tests/test_matching_engine.py
```

## Security

This ROFL application enhances the privacy of the ROFLSwap protocol by:

1. Decrypting orders only inside the TEE
2. Processing matching logic securely without exposing order details
3. Signing settlement transactions from within the TEE
4. Storing sensitive information in a secure storage

All processing happens inside the secure ROFL environment, ensuring that order information remains confidential throughout the entire trading lifecycle.
