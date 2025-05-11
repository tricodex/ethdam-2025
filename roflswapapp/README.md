# ROFLSwap Oracle Matcher

This repository contains the ROFLSwap Oracle Matcher implementation for the ROFLSwapOracle contract on Oasis Sapphire. The matcher uses the ROFL (Runtime OFfchain Logic) framework for secure operation in a Trusted Execution Environment (TEE).

## Overview

The ROFLSwap Oracle Matcher is responsible for:

1. Securely authenticating with the ROFL daemon in a TEE
2. Retrieving and decrypting orders from the ROFLSwapOracle contract
3. Finding matching buy and sell orders
4. Executing matches on the contract

## Components

The implementation consists of the following components:

1. **Protocol Components**:
   - `rofl_auth_protocol.py` - Core protocol implementation for TEE authentication
   - `rofl_web3.py` - Web3 integration for blockchain interactions
   - `rofl_siwe.py` - SIWE authentication for secure contract interactions

2. **Matcher Implementation**:
   - `roflswap_matcher.py` - Oracle matcher implementation using the protocol components
   - `main.py` - Main entry point for running the matcher

3. **Tests**:
   - `test_rofl_protocol.py` - Tests for the protocol components
   - `test_roflswap_matcher.py` - Tests for the matcher implementation

4. **Documentation**:
   - `ROFL_PROTOCOL.md` - Documentation for the protocol components
   - `IMPLEMENTATION.md` - Documentation for the matcher implementation

## Key Features

- Secure key management within a TEE
- Proper authentication with the ROFLSwapOracle contract
- Secure order retrieval and decryption
- Efficient order matching
- Secure match execution

## Prerequisites

- Oasis Sapphire node
- ROFL daemon running (for TEE mode)
- Python 3.8+

## Installation

1. Clone the repository
2. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Matcher

```bash
python main.py --contract <CONTRACT_ADDRESS> --interval <POLLING_INTERVAL>
```

Command-line options:
- `--contract`, `-c` - Contract address (default: from ROFLSWAP_ADDRESS environment variable)
- `--provider`, `-p` - Web3 provider URL (default: based on network)
- `--local`, `-l` - Run in local test mode instead of TEE mode
- `--key-id`, `-k` - Key ID for TEE key management (default: "roflswap-oracle-key")
- `--domain`, `-d` - SIWE domain (default: from SIWE_DOMAIN environment variable)
- `--interval`, `-i` - Polling interval in seconds (default: 30)
- `--debug` - Enable debug logging
- `--once` - Run once and exit

## Running Tests

```bash
python -m unittest test_rofl_protocol.py
python -m unittest test_roflswap_matcher.py
```

## Deployment

For deployment to a ROFL TEE environment, use the provided Dockerfile and deployment scripts:

```bash
./deploy.sh
```

## License

MIT
