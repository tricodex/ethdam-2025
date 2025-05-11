#!/usr/bin/env python3
"""
ROFL Web3 Integration

This module extends the core ROFL protocol with Web3 integration for
blockchain interactions.
"""

import os
import logging
from typing import Optional
from web3 import Web3
# Import the right middleware
from web3.middleware import construct_sign_and_send_raw_middleware
from eth_account.signers.local import LocalAccount
from eth_account import Account

# Try to import sapphire wrapper
try:
    from sapphirepy import sapphire
except ImportError:
    # Mock for local testing
    class sapphire:
        @staticmethod
        def wrap(w3, account):
            return w3


logger = logging.getLogger("rofl_web3")

class RoflWeb3:
    """
    Web3 integration for ROFL protocol
    """
    
    def __init__(self, 
                 web3_provider: str, 
                 is_tee_mode: bool = True, 
                 key_id: str = "rofl-app-key",
                 rofl_auth_protocol = None):
        """
        Initialize ROFL Web3 integration
        
        Args:
            web3_provider: Web3 provider URL
            is_tee_mode: Whether running in TEE mode
            key_id: Key ID to use for retrieving the key from ROFL daemon
            rofl_auth_protocol: RoflProtocol instance for authentication
        """
        self.network = web3_provider
        self.is_tee_mode = is_tee_mode
        self.key_id = key_id
        self.rofl_auth_protocol = rofl_auth_protocol
        
        # Get the private key from ROFL daemon if in TEE mode
        if is_tee_mode:
            if rofl_auth_protocol:
                self.secret = rofl_auth_protocol.secret
            else:
                # This shouldn't happen in normal operation
                logger.error("No ROFL protocol instance provided in TEE mode")
                self.secret = None
        else:
            # In local test mode, use environment variable
            self.secret = os.environ.get("ROFL_PRIVATE_KEY")
            
        # Setup Web3 with the appropriate middleware
        self.w3 = self.setup_web3_middleware(self.secret)
    
    def setup_web3_middleware(self, secret: str) -> Web3:
        """
        Set up Web3 with the appropriate middleware for Sapphire
        
        Args:
            secret: Private key to use for signing transactions
            
        Returns:
            Web3 instance
        """
        if not secret:
            raise ValueError("Missing required private key for Web3 setup")

        account: LocalAccount = Account.from_key(secret)
        provider = Web3.WebsocketProvider(self.network) if self.network.startswith("ws:") else Web3.HTTPProvider(self.network)
        w3 = Web3(provider)
        
        # Add middleware for signing transactions
        w3.middleware_onion.add(construct_sign_and_send_raw_middleware(account))
        
        # Wrap with sapphire for encrypted transactions
        w3 = sapphire.wrap(w3, account)
        
        # Set default account
        w3.eth.default_account = account.address
        
        logger.info(f"Web3 initialized with account: {account.address}")
        return w3
    
    def get_contract(self, address: str, abi) -> Web3.eth.contract:
        """
        Get a contract instance
        
        Args:
            address: Contract address
            abi: Contract ABI
            
        Returns:
            Contract instance
        """
        return self.w3.eth.contract(address=address, abi=abi)
    
    def call_function(self, contract, function_name: str, *args):
        """
        Call a contract function
        
        Args:
            contract: Contract instance
            function_name: Function name
            args: Function arguments
            
        Returns:
            Function result
        """
        try:
            function = getattr(contract.functions, function_name)
            return function(*args).call()
        except Exception as e:
            logger.error(f"Error calling {function_name}: {e}")
            return None
    
    def transact_function(self, contract, function_name: str, *args):
        """
        Transact a contract function
        
        Args:
            contract: Contract instance
            function_name: Function name
            args: Function arguments
            
        Returns:
            Transaction receipt
        """
        try:
            # Get the function from the contract
            function = getattr(contract.functions, function_name)
            
            if self.is_tee_mode and self.rofl_auth_protocol:
                # In TEE mode, use ROFL daemon to submit transaction
                # Build the transaction first
                tx_params = function(*args).build_transaction({
                    'gasPrice': self.w3.eth.gas_price,
                    'gas': 3000000,  # Adjust as needed
                })
                
                # Submit via ROFL daemon
                tx_hash = self.rofl_auth_protocol.submit_transaction(
                    to_address=tx_params['to'],
                    data=tx_params['data'].lower(),
                    value=tx_params.get('value', 0)
                )
                
                if 'error' in tx_hash:
                    raise Exception(f"Failed to submit transaction: {tx_hash['error']}")
                
                # Wait for receipt
                tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash['txhash'], timeout=60)
                return tx_receipt
            else:
                # In local test mode, use Web3 to submit transaction
                tx_hash = function(*args).transact({
                    'gasPrice': self.w3.eth.gas_price,
                    'gas': 3000000,  # Adjust as needed
                })
                
                # Wait for receipt
                tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
                return tx_receipt
        except Exception as e:
            logger.error(f"Error transacting {function_name}: {e}")
            raise

    def set_oracle_address(self, contract, oracle_address: Optional[str] = None):
        """
        Set the oracle address in the contract
        
        Args:
            contract: Contract instance
            oracle_address: Oracle address to set (defaults to this instance's address)
        """
        if oracle_address is None:
            oracle_address = self.rofl_auth_protocol.get_public_address()
            
        # Get current oracle address from contract
        current_oracle = contract.functions.oracle().call()
        logger.info(f"Current oracle address in contract: {current_oracle}")
        logger.info(f"Our oracle address: {oracle_address}")
        
        # Check if they match
        if current_oracle.lower() != oracle_address.lower():
            logger.info(f"Setting oracle address to: {oracle_address}")
            
            if self.is_tee_mode:
                # Use ROFL daemon to submit the transaction
                try:
                    # Build transaction data
                    tx_data = contract.functions.setOracle(oracle_address).build_transaction({
                        'nonce': self.w3.eth.get_transaction_count(self.w3.eth.default_account),
                        'gas': 3000000,
                        'value': 0
                    })
                    
                    logger.info(f"Built transaction data: to={tx_data['to']}, data={tx_data['data'][:20]}...")
                    
                    # Submit through ROFL daemon
                    result = self.rofl_auth_protocol.submit_transaction(
                        tx_data['to'], 
                        tx_data['data'].lower(),
                        tx_data.get('value', 0)
                    )
                    
                    if "txhash" in result:
                        tx_hash = result["txhash"]
                        logger.info(f"Transaction submitted via ROFL daemon: {tx_hash}")
                        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                        logger.info(f"Transaction confirmed: status={receipt.status}")
                    else:
                        logger.error(f"Failed to submit transaction: {result.get('error', 'Unknown error')}")
                except Exception as e:
                    logger.error(f"Error setting oracle address via ROFL daemon: {str(e)}")
            else:
                # Use web3 for local mode
                try:
                    tx_hash = contract.functions.setOracle(oracle_address).transact()
                    receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
                    logger.info(f"Transaction hash: {receipt.transactionHash.hex()}")
                except Exception as e:
                    logger.error(f"Error setting oracle address via web3: {str(e)}")
            
            # Verify the change
            try:
                updated_oracle = contract.functions.oracle().call()
                logger.info(f"Updated oracle address in contract: {updated_oracle}")
                if updated_oracle.lower() == oracle_address.lower():
                    logger.info("Oracle address updated successfully!")
                else:
                    logger.error(f"Oracle address update failed. Expected {oracle_address}, got {updated_oracle}")
            except Exception as e:
                logger.error(f"Error verifying oracle address update: {str(e)}")
        else:
            logger.info("Oracle address already set correctly")
