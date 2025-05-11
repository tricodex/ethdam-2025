#!/usr/bin/env python3
"""
ROFL authentication utility for interacting with the ROFL app daemon
"""

import logging
import json
import os
import httpx
import time
import requests
from typing import Any, Dict, Optional
from eth_account import Account
from web3.types import TxParams
from web3 import Web3

logger = logging.getLogger("rofl_auth")

# Get ROFL App ID from environment with truncation
ROFL_APP_ID = os.environ.get("ROFL_APP_ID", "")
logger.info(f"Original ROFL App ID: {ROFL_APP_ID}")

# Truncate if needed to match contract's bytes21 format
if ROFL_APP_ID and ROFL_APP_ID.startswith("rofl1") and len(ROFL_APP_ID) > 26:
    # Keep only first 26 chars (rofl1 + 21 bytes)
    TRUNCATED_APP_ID = ROFL_APP_ID[:26]
    logger.info(f"Using truncated ROFL App ID for contract auth: {TRUNCATED_APP_ID}")
else:
    TRUNCATED_APP_ID = ROFL_APP_ID
    logger.info(f"ROFL App ID unchanged: {TRUNCATED_APP_ID}")

class RoflUtility:
    """
    Utility for interacting with ROFL app daemon socket
    """
    
    def __init__(self, contract_address: str, is_tee: bool = True):
        """
        Initialize ROFL utility
        
        Args:
            contract_address: Contract address
            is_tee: Whether to use TEE environment
        """
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.is_tee = is_tee
        self.account = None
        
        # Save original and truncated App IDs
        self.original_app_id = ROFL_APP_ID
        self.truncated_app_id = TRUNCATED_APP_ID
        
        logger.info(f"Contract address: {self.contract_address}")
        logger.info(f"TEE mode: {self.is_tee}")
        logger.info(f"Using truncated App ID for contract auth: {self.truncated_app_id}")
        
        # If not in TEE, set up Web3 for local testing
        if not self.is_tee:
            self.web3 = Web3(Web3.HTTPProvider(os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io")))
            self.setup_local_account()
        else:
            # In TEE mode, we use the ROFL app daemon socket
            self.socket_path = "/run/rofl-appd.sock"
            
            # Log the socket path
            logger.info(f"Using ROFL app daemon socket: {self.socket_path}")
            
            # Check if socket exists in TEE mode
            if os.path.exists(self.socket_path):
                logger.info("ROFL app daemon socket found")
            else:
                logger.warning(f"ROFL app daemon socket not found at {self.socket_path}")
                if self.is_tee:
                    logger.error("Missing socket but running in TEE mode. This will likely cause issues.")
    
    def _truncate_app_id(self, app_id):
        """Truncate ROFL App ID to match contract bytes21 format"""
        # Check if this is a ROFL App ID that needs truncation
        if isinstance(app_id, str) and app_id.startswith("rofl1") and len(app_id) > 26:
            # Keep only first 26 chars (rofl1 + 21 bytes)
            return app_id[:26]
        return app_id
    
    def setup_local_account(self):
        """
        Set up local account for testing
        """
        private_key = os.environ.get("PRIVATE_KEY")
        if private_key:
            from eth_account import Account
            self.account = Account.from_key(private_key)
            logger.info(f"Using account: {self.account.address}")
        else:
            logger.warning("No PRIVATE_KEY environment variable found, using random account")
            self.account = self.web3.eth.account.create()
    
    def get_account(self):
        """
        Get the account for transaction signing
        
        Returns:
            Account instance
        """
        return self.account
    
    def get_auth_token(self):
        """
        Get the authentication token for the ROFL app daemon
        
        Returns:
            Auth token string
        """
        # In TEE mode, this would get the actual auth token
        # For local testing, return a mock token
        if not self.is_tee:
            return "mock_auth_token_for_testing"
        
        try:
            # In TEE mode, read token from file or environment
            token_path = os.environ.get("ROFL_AUTH_TOKEN_PATH", "/run/secrets/rofl/auth-token")
            if os.path.exists(token_path):
                with open(token_path, 'r') as f:
                    return f.read().strip()
            else:
                # Fallback to environment variable
                return os.environ.get("ROFL_AUTH_TOKEN", "")
        except Exception as e:
            logger.error(f"Error getting auth token: {e}")
            return ""
    
    def call_view_function(self, contract_address: str, function_data: str) -> Dict[str, Any]:
        """
        Call a view function on a contract through ROFL daemon
        
        Args:
            contract_address: Target contract address
            function_data: ABI-encoded function data
            
        Returns:
            Dictionary with call result
        """
        try:
            if self.is_tee:
                # Use ROFL daemon to call view function
                payload = {
                    "call": {
                        "kind": "eth",
                        "data": {
                            "to": contract_address.lower().replace("0x", ""),
                            "data": function_data.lower().replace("0x", ""),
                            "value": "0",
                        }
                    }
                }
                
                logger.debug(f"Calling view function with payload: {json.dumps(payload)}")
                try:
                    result = self._appd_post("/rofl/v1/tx/call", payload)
                    logger.debug(f"View function result: {json.dumps(result)}")
                    return result
                except Exception as e:
                    logger.error(f"Error calling view function: {str(e)}")
                    # Try to get more information about the ROFL socket
                    try:
                        if os.path.exists(self.socket_path):
                            logger.debug(f"Socket file exists at {self.socket_path}")
                            file_info = os.stat(self.socket_path)
                            logger.debug(f"Socket file info: {file_info}")
                        else:
                            logger.debug(f"Socket file does not exist at {self.socket_path}")
                            # Try to list /run directory
                            if os.path.exists("/run"):
                                logger.debug("Contents of /run directory:")
                                for item in os.listdir("/run"):
                                    logger.debug(f" - {item}")
                    except Exception as socket_e:
                        logger.error(f"Error checking socket: {str(socket_e)}")
                    return {"error": str(e)}
            else:
                # Local mode mock implementation
                return {"data": "0x" + "0" * 64}  # Mock response
        except Exception as e:
            logger.error(f"Error in call_view_function: {str(e)}")
            return {"error": str(e)}
    
    def submit_transaction(self, contract_address: str, function_data: str) -> Dict[str, Any]:
        """
        Submit a transaction through ROFL app daemon
        
        Args:
            contract_address: Contract address
            function_data: Function data
            
        Returns:
            Dict with transaction result
        """
        # Log the target contract for debugging
        logger.debug(f"Submitting transaction to contract: {contract_address}")
        logger.debug(f"Using App ID: {self.truncated_app_id}")
        
        if not self.is_tee:
            # In local mode, use Web3 for testing
            try:
                # For local testing with Web3
                transaction = {
                    'to': contract_address,
                    'data': function_data,
                    'gas': 500000,
                    'gasPrice': self.web3.eth.gas_price,
                    'nonce': self.web3.eth.get_transaction_count(self.account.address),
                    'chainId': self.web3.eth.chain_id
                }
                
                # Sign and send transaction
                signed_tx = self.account.sign_transaction(transaction)
                tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                # Wait for transaction receipt
                tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                
                # Create response similar to ROFL daemon
                return {
                    'status': 'ok',
                    'txhash': tx_hash.hex(),
                    'receipt': tx_receipt
                }
            except Exception as e:
                logger.error(f"Error in local transaction: {e}")
                return {'status': 'error', 'message': str(e)}
        else:
            # In TEE mode, use ROFL app daemon socket
            try:
                import socket
                import json
                
                # Create Unix socket
                sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                sock.connect(self.socket_path)
                
                # Prepare request
                request = {
                    'type': 'submit_tx',
                    'contract': contract_address,
                    'data': function_data,
                    'auth_token': self.get_auth_token()
                }
                
                # Send request
                sock.sendall(json.dumps(request).encode() + b'\n')
                
                # Receive response
                response = sock.recv(4096).decode()
                sock.close()
                
                # Parse response
                return json.loads(response)
            except Exception as e:
                logger.error(f"Error submitting transaction through ROFL daemon: {e}")
                return {'status': 'error', 'message': str(e)}
    
    def _appd_post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Make a POST request to the ROFL app daemon
        
        Args:
            endpoint: Endpoint path
            data: Request data
            
        Returns:
            Dict with response data
        """
        if not self.is_tee:
            # In local mode, return mock data
            logger.debug(f"Local mode: mock ROFL daemon call to {endpoint}")
            return {"success": True}
        
        try:
            # Construct Unix socket URL for requests
            url = f"http://unix:{self.socket_path}{endpoint}"
            
            # Set up unix socket session
            session = requests.Session()
            session.mount("http+unix://", httpx.HTTPTransport(uds=self.socket_path))
            
            # Modify the payload if it's a transaction to the ROFLSwap contract
            if isinstance(data, dict) and 'call' in data and isinstance(data['call'], dict) and 'data' in data['call']:
                call_data = data['call']['data']
                if isinstance(call_data, dict) and 'to' in call_data and call_data.get('to', '').lower() == self.contract_address.lower().replace('0x', ''):
                    # This is a call to our contract - log for debugging
                    logger.debug(f"Transaction to ROFLSwap contract detected, using truncated App ID: {self.truncated_app_id}")
                    
                    # The payload automatically uses our truncated App ID through the global ROFL_APP_ID
                    # No need to modify further, just log for debugging
                    logger.debug(f"Original payload: {json.dumps(data)}")
            
            # Make request
            headers = {'Content-Type': 'application/json'}
            response = session.post(url, json=data, headers=headers)
            
            # Check response
            if response.status_code != 200:
                logger.error(f"ROFL daemon error: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
            
            return response.json()
        except Exception as e:
            logger.error(f"Error making ROFL daemon request: {e}")
            raise 