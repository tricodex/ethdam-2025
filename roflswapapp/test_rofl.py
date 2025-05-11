#!/usr/bin/env python3
"""
Test script for ROFL daemon connection and functionality.
This script tests connection, key generation, and submitting a transaction to set the oracle address.
"""

import os
import sys
import httpx
import json
import logging
import time
from web3 import Web3
from eth_account import Account

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('test_rofl.log')
    ]
)
logger = logging.getLogger("test_rofl")

# Constants
ROFL_SOCKET_PATH = "/run/rofl-appd.sock"
CONTRACT_ADDRESS = os.environ.get("ROFLSWAP_ADDRESS", "0x71b419f2Abe5f1d44246143706489A5F09Ee3727")
WEB3_PROVIDER = os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io")
KEY_ID = os.environ.get("KEY_ID", "roflswap-oracle-key")
# Maximum retry attempts for socket connection
MAX_RETRIES = 5
RETRY_DELAY = 2  # seconds

def rofl_daemon_post(path, payload, retries=MAX_RETRIES):
    """Make a POST request to the ROFL daemon with retries"""
    retry_count = 0
    last_error = None
    
    while retry_count < retries:
        try:
            transport = httpx.HTTPTransport(uds=ROFL_SOCKET_PATH)
            client = httpx.Client(transport=transport)
            
            url = "http://localhost" + path
            
            logger.info(f"Posting to {url}: {json.dumps(payload)}")
            response = client.post(url, json=payload, timeout=None)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            last_error = e
            retry_count += 1
            logger.warning(f"Error communicating with ROFL daemon (attempt {retry_count}/{retries}): {e}")
            if retry_count < retries:
                logger.info(f"Retrying in {RETRY_DELAY} seconds...")
                time.sleep(RETRY_DELAY)
    
    logger.error(f"Failed to communicate with ROFL daemon after {retries} attempts: {last_error}")
    raise last_error

def check_socket_environment():
    """Check the socket environment and provide detailed diagnostics"""
    logger.info("Checking socket environment...")
    if not os.path.exists(ROFL_SOCKET_PATH):
        logger.error(f"Socket file does not exist: {ROFL_SOCKET_PATH}")
        
        # Check if /run directory exists and is accessible
        if os.path.exists("/run"):
            logger.info("Directory /run exists")
            logger.info(f"Contents of /run: {os.listdir('/run')}")
        else:
            logger.error("Directory /run does not exist or is not accessible")
        
        # Check if we're running in TEE environment
        if os.path.exists("/dev/tdx") or os.path.exists("/sys/firmware/tdx"):
            logger.info("Running in Intel TDX TEE environment")
        else:
            logger.warning("Not running in TEE environment")
        
        return False
    
    logger.info(f"Socket file exists: {ROFL_SOCKET_PATH}")
    return True

def test_rofl_health():
    """Test the health of the ROFL daemon"""
    logger.info("Testing ROFL daemon health...")
    try:
        # Using a simple request to test connection
        payload = {}
        path = "/health"
        
        response = rofl_daemon_post(path, payload)
        logger.info(f"Health check succeeded: {response}")
        return True
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return False

def test_fetch_key():
    """Test fetching a key from the ROFL daemon"""
    logger.info(f"Testing key generation with key_id: {KEY_ID}")
    try:
        payload = {
            "key_id": KEY_ID,
            "kind": "secp256k1"
        }
        
        path = '/rofl/v1/keys/generate'
        
        response = rofl_daemon_post(path, payload)
        key = response.get("key")
        
        if key:
            # Create account from key to get public address
            account = Account.from_key(key)
            public_address = account.address
            
            logger.info(f"Successfully generated key")
            logger.info(f"Public address: {public_address}")
            return key, public_address
        else:
            logger.error(f"No key in response: {response}")
            return None, None
    except Exception as e:
        logger.error(f"Key generation failed: {e}")
        return None, None

def test_set_oracle():
    """Test setting the oracle address in the contract"""
    logger.info(f"Testing setting oracle address for contract: {CONTRACT_ADDRESS}")
    try:
        # First get the key and public address
        key, public_address = test_fetch_key()
        if not key or not public_address:
            logger.error("Could not get key or public address")
            return False
            
        # Load ABI for setOracle function
        # This is a minimal ABI just for the setOracle function
        abi = [{
            "inputs": [{"internalType": "address", "name": "addr", "type": "address"}],
            "name": "setOracle",
            "outputs": [],
            "stateMutability": "nonpayable",
            "type": "function"
        }, {
            "inputs": [],
            "name": "oracle",
            "outputs": [{"internalType": "address", "name": "", "type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }]
        
        # Set up web3
        w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))
        contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)
        
        # Check current oracle address
        current_oracle = contract.functions.oracle().call()
        logger.info(f"Current oracle address in contract: {current_oracle}")
        
        # If oracle is already set to our address, no need to update
        if current_oracle.lower() == public_address.lower():
            logger.info("✅ Oracle address already set correctly")
            return True
        
        # Build transaction data
        tx_data = contract.functions.setOracle(public_address).build_transaction({
            'nonce': 0,  # Doesn't matter for ROFL daemon
            'gas': 3000000,
            'value': 0
        })
        
        # Submit the transaction
        payload = {
            "tx": {
                "kind": "eth",
                "data": {
                    "gas_limit": tx_data.get('gas', 3000000),
                    "to": CONTRACT_ADDRESS.lower().replace("0x", ""),
                    "value": 0,
                    "data": tx_data['data'].lower().replace("0x", ""),
                },
            },
            "encrypted": False,
        }
        
        path = '/rofl/v1/tx/sign-submit'
        
        logger.info(f"Submitting setOracle transaction for address: {public_address}")
        response = rofl_daemon_post(path, payload)
        
        tx_hash = response
        logger.info(f"Transaction submitted: {tx_hash}")
        
        logger.info("Waiting for transaction confirmation...")
        try:
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            logger.info(f"Transaction confirmed in block {receipt.blockNumber}, status: {receipt.status}")
            
            # Verify the change
            current_oracle = contract.functions.oracle().call()
            logger.info(f"Current oracle address in contract: {current_oracle}")
            
            if current_oracle.lower() == public_address.lower():
                logger.info("✅ Oracle address set successfully!")
                return True
            else:
                logger.error(f"❌ Oracle address mismatch: expected {public_address}, got {current_oracle}")
                return False
        except Exception as e:
            logger.error(f"Error waiting for transaction: {e}")
            return False
    except Exception as e:
        logger.error(f"Error setting oracle address: {e}")
        return False

def main():
    """Main entry point for testing"""
    logger.info("=== ROFL Daemon Test ===")
    success = False
    
    # Check socket environment and provide detailed info
    if not check_socket_environment():
        logger.warning("Socket environment check failed, but will try to continue...")
    
    # Test health
    if not test_rofl_health():
        logger.error("Health check failed, cannot continue")
        sys.exit(1)
    
    # Test key generation
    key, public_address = test_fetch_key()
    if not key:
        logger.error("Key generation failed, cannot continue")
        sys.exit(1)
    
    # Test setting oracle address
    if test_set_oracle():
        logger.info("All tests passed successfully!")
        success = True
    else:
        logger.error("Failed to set oracle address")
        success = False
    
    # Return success status as exit code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main() 