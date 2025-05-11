#!/usr/bin/env python3
"""
ROFL Core Authentication Protocol Implementation

This utility handles authentication with the ROFL daemon and provides
the core methods for secure key management in the TEE environment.
"""

import os
import json
import httpx
import logging
from typing import Dict, Any
from web3 import Web3
# Import middleware based on web3 version
try:
    # For newer web3.py versions
    from web3.middleware import construct_sign_and_send_raw_middleware
except ImportError:
    # For latest web3.py versions
    from web3.middleware import construct_signer
    # Create a compatibility function that behaves like the old middleware
    def construct_sign_and_send_raw_middleware(account):
        return construct_signer(account)
from eth_account.signers.local import LocalAccount
from eth_account import Account
from eth_utils import to_hex
try:
    from sapphirepy import sapphire
except ImportError:
    # Mock for local testing
    class sapphire:
        @staticmethod
        def wrap(w3, account):
            return w3

logger = logging.getLogger("rofl_protocol")

class RoflProtocol:
    """
    Core ROFL Protocol implementation for TEE authentication
    """
    
    # Standard ROFL daemon socket path
    ROFL_SOCKET_PATH = "/run/rofl-appd.sock"
    
    def __init__(self, is_tee_mode: bool = True, key_id: str = "rofl-app-key"):
        """
        Initialize ROFL Protocol
        
        Args:
            is_tee_mode: Whether running in TEE mode
            key_id: Key ID to use for retrieving the key from ROFL daemon
        """
        self.is_tee_mode = is_tee_mode
        self.key_id = key_id
        
        # Get private key from ROFL daemon or environment
        if is_tee_mode:
            # Fetch key from ROFL daemon
            self.secret = self.fetch_key(key_id)
            logger.info(f"Successfully fetched key from ROFL daemon with ID: {key_id}")
        else:
            # In local test mode, use environment variable
            self.secret = os.environ.get("ROFL_PRIVATE_KEY")
            if not self.secret:
                raise ValueError("No key available for local testing")
        
        # Create Web3 account from private key
        self.account = Account.from_key(self.secret)
        logger.info(f"Account address: {self.account.address}")
    
    def _appd_post(self, path: str, payload: Any) -> Any:
        """
        Make a POST request to the ROFL daemon
        
        Args:
            path: API path
            payload: Request payload
            
        Returns:
            Response JSON
        """
        if not self.is_tee_mode:
            raise EnvironmentError("Cannot communicate with ROFL daemon in local test mode")
        
        transport = httpx.HTTPTransport(uds=self.ROFL_SOCKET_PATH)
        client = httpx.Client(transport=transport)
        
        url = "http://localhost" + path
        
        try:
            response = client.post(url, json=payload, timeout=None)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Error communicating with ROFL daemon: {e}")
            raise
    
    def fetch_key(self, id: str) -> str:
        """
        Fetch or generate a key from the ROFL daemon
        
        Args:
            id: Key ID
            
        Returns:
            Private key as hex string
        """
        payload = {
            "key_id": id,
            "kind": "secp256k1"
        }
        
        path = '/rofl/v1/keys/generate'
        
        response = self._appd_post(path, payload)
        return response["key"]
    
    def get_public_address(self) -> str:
        """
        Get the public address associated with this key
        
        Returns:
            Account address
        """
        return self.account.address
    
    def sign_message(self, message: bytes) -> str:
        """
        Sign a message with the TEE-protected key
        
        Args:
            message: Message to sign
            
        Returns:
            Signature as hex string
        """
        if self.is_tee_mode:
            # In TEE, use ROFL daemon to sign
            payload = {
                "key_id": self.key_id,
                "message": message.hex()
            }
            
            path = '/rofl/v1/keys/sign'
            
            response = self._appd_post(path, payload)
            return response["signature"]
        else:
            # In local mode, use the account to sign
            signed = self.account.sign_message(message)
            return signed.signature.hex()
    
    def submit_transaction(self, to_address: str, data: str, value: int = 0) -> Dict[str, Any]:
        """
        Submit a transaction using the ROFL daemon
        
        Args:
            to_address: Recipient address
            data: Transaction data
            value: ETH value to send
            
        Returns:
            Transaction hash
        """
        if self.is_tee_mode:
            # Use ROFL daemon to submit transaction in TEE
            payload = {
                "tx": {
                    "kind": "eth",
                    "data": {
                        "gas_limit": 3000000,
                        "to": to_address.lower().replace("0x", ""),
                        "value": value,
                        "data": data.lower().replace("0x", ""),
                    },
                },
                "encrypted": False,
            }
            
            path = '/rofl/v1/tx/sign-submit'
            
            try:
                response = self._appd_post(path, payload)
                logger.info(f"Transaction submitted successfully via ROFL daemon: {response}")
                return {"txhash": response}
            except Exception as e:
                logger.error(f"Error submitting transaction via ROFL daemon: {e}")
                return {"error": str(e)}
        else:
            # In local mode, this would require a web3 instance
            raise NotImplementedError("Transaction submission in local mode requires additional setup")
    
    def call_view(self, to_address: str, data: str) -> Dict[str, Any]:
        """
        Call a view function using the ROFL daemon
        
        Args:
            to_address: Contract address
            data: Function call data
            
        Returns:
            Function call result
        """
        if self.is_tee_mode:
            # Use ROFL daemon to make authenticated call in TEE
            payload = {
                "tx": {
                    "kind": "eth",
                    "data": {
                        "to": to_address.lower().replace("0x", ""),
                        "data": data.lower().replace("0x", ""),
                    },
                },
            }
            
            path = '/rofl/v1/state/call'
            
            try:
                response = self._appd_post(path, payload)
                return {"data": response}
            except Exception as e:
                logger.error(f"Error calling view function via ROFL daemon: {e}")
                return {"error": str(e)}
        else:
            # In local mode, this would require a web3 instance
            raise NotImplementedError("View function calls in local mode requires additional setup")
