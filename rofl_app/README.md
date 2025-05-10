# ROFLSwap Order Matcher

This project consists of an order matching engine for ROFLSwap.

## Prerequisites

- Docker
- Docker Compose
- An Ethereum private key for transaction signing
- The address of a deployed ROFLSwap contract

## Running the Order Matcher

The order matcher is responsible for matching orders on the ROFLSwap contract and executing trades.

1. Set the required environment variables:
   ```bash
   export ROFLSWAP_ADDRESS=your_roflswap_contract_address
   export WEB3_PROVIDER=your_web3_provider_url
   export PRIVATE_KEY=your_private_key
   ```

2. Build and run the order matcher:
   ```bash
   docker compose build
   docker compose up -d
   ```

3. Check the logs:
   ```bash
   docker compose logs -f
   ```

## Running Tests

A test script is provided to build the image:

```bash
./run_tests.sh
```

## Project Structure

- `main.py`: Main entry point for the order matcher
- `matching_engine.py`: Order matching logic
- `settlement.py`: Trade settlement logic
- `storage.py`: Storage utilities
- `Dockerfile`: Dockerfile for the order matcher
- `compose.yaml`: Docker Compose file for the order matcher
- `requirements.txt`: Python dependencies
- `abi/`: Directory containing contract ABIs 