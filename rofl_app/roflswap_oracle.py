#!/usr/bin/env python3
"""
ROFLSwap Oracle for processing orders through authenticated TEE transactions
"""

import os
import sys
import json
import asyncio
import logging
import traceback
from typing import List, Dict, Any, Tuple, Optional
from web3 import Web3
from web3.contract import Contract

from rofl_auth import RoflUtility

logger = logging.getLogger("roflswap_oracle")

class ROFLSwapOracle:
    """
    Oracle for processing ROFLSwapV5 orders through authenticated ROFL app transactions
    
    This class follows the oracle pattern used for ROFL apps on Oasis Sapphire, where:
    1. The contract enforces authentication using roflEnsureAuthorizedOrigin
    2. The oracle runs in a TEE and accesses the contract through the ROFL daemon
    3. Authentication is handled via the ROFL daemon socket interface, not HTTP headers
    """
    
    def __init__(self,
                 contract_address: str,
                 network_name: str,
                 rofl_utility: RoflUtility,
                 private_key: str):
        """
        Initialize the ROFLSwap Oracle
        
        Args:
            contract_address: Address of the ROFLSwapV5 contract
            network_name: Name of the network (e.g., 'sapphire-testnet')
            rofl_utility: RoflUtility instance for ROFL app authentication
            private_key: Private key for signing transactions (only used for non-ROFL calls)
        """
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.network_name = network_name
        self.rofl_utility = rofl_utility
        self.private_key = private_key
        
        # Initialize Web3 for regular (non-authenticated) calls
        rpc_urls = {
            'sapphire-testnet': 'https://testnet.sapphire.oasis.io',
            'sapphire-mainnet': 'https://sapphire.oasis.io',
            'sapphire-localnet': 'http://localhost:8545'
        }
        
        self.rpc_url = rpc_urls.get(network_name, 'https://testnet.sapphire.oasis.io')
        self.web3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Load contract ABI
        try:
            abi_path = os.path.join(os.path.dirname(__file__), "abi/ROFLSwapV5.json")
            with open(abi_path, 'r') as f:
                contract_data = json.load(f)
            self.contract_abi = contract_data["abi"]
        except Exception as e:
            # Define a minimal ABI for testing if the file isn't found
            logger.warning(f"Could not load contract ABI from file: {e}")
            self.contract_abi = [
                {
                    "inputs": [],
                    "name": "getTotalOrderCount",
                    "outputs": [{"type": "uint256", "name": ""}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"type": "uint256", "name": "orderId"}],
                    "name": "getEncryptedOrder",
                    "outputs": [{"type": "bytes", "name": ""}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"type": "uint256", "name": "orderId"}],
                    "name": "getOrderOwner",
                    "outputs": [{"type": "address", "name": ""}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"type": "address", "name": "user"}],
                    "name": "getUserOrders",
                    "outputs": [{"type": "uint256[]", "name": ""}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"type": "uint256", "name": "orderId"}],
                    "name": "orderExists",
                    "outputs": [{"type": "bool", "name": ""}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"type": "uint256", "name": ""}],
                    "name": "filledOrders",
                    "outputs": [{"type": "bool", "name": ""}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"type": "uint256", "name": "buyOrderId"},
                        {"type": "uint256", "name": "sellOrderId"},
                        {"type": "address", "name": "buyerAddress"},
                        {"type": "address", "name": "sellerAddress"},
                        {"type": "address", "name": "token"},
                        {"type": "uint256", "name": "amount"},
                        {"type": "uint256", "name": "price"}
                    ],
                    "name": "executeMatch",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]
        
        # Create contract instance for regular (non-authenticated) calls
        self.contract = self.web3.eth.contract(address=self.contract_address, abi=self.contract_abi)
        
        # Configure account
        if self.private_key:
            self.account = self.web3.eth.account.from_key(self.private_key)
            self.web3.eth.default_account = self.account.address
            logger.info(f"Using account: {self.web3.eth.default_account}")
    
    def set_oracle_address(self):
        """Verify and update the oracle address in the contract if needed"""
        logger.info("Checking oracle address in contract...")
        
        try:
            # Try to get the oracle address from the contract
            # Note: This assumes the contract has an 'oracle' function
            contract_oracle = self.contract.functions.oracle().call()
            if contract_oracle != self.web3.eth.default_account:
                logger.info(f"Contract oracle {contract_oracle} does not match our address {self.web3.eth.default_account}, updating...")
                
                # Build transaction to update oracle address
                tx_params = self.contract.functions.setOracle(self.web3.eth.default_account).build_transaction({
                    'gasPrice': self.web3.eth.gas_price,
                    'gas': 3000000
                })
                
                # Submit the transaction through ROFL app daemon
                tx_hash = self.rofl_utility.submit_tx(tx_params)
                logger.info(f"Submitted oracle update transaction: {tx_hash}")
                
                # Wait for the transaction to be mined
                tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                logger.info(f"Oracle address updated. Transaction hash: {tx_receipt.transactionHash.hex()}")
            else:
                logger.info(f"Contract oracle {contract_oracle} matches our address {self.web3.eth.default_account}")
        except Exception as e:
            logger.error(f"Error checking/updating oracle address: {str(e)}")
    
    def get_contract_function_data(self, func_name: str, *args) -> str:
        """Get encoded function call data for a contract function"""
        return self.contract.encodeABI(fn_name=func_name, args=args)
    
    def authenticated_call(self, func_name: str, *args) -> Any:
        """Make an authenticated call to the contract through the ROFL app daemon"""
        function_data = self.get_contract_function_data(func_name, *args)
        result = self.rofl_utility.call_view_function(self.contract_address, function_data)
        
        # Decode the result
        function_abi = next(func for func in self.contract_abi if func.get('name') == func_name)
        output_types = [output['type'] for output in function_abi['outputs']]
        
        if not result.get('data'):
            return None
        
        return self.web3.codec.decode_abi(output_types, bytes.fromhex(result['data']))
    
    def authenticated_transaction(self, func_name: str, *args, gas: int = 3000000) -> str:
        """Submit an authenticated transaction through the ROFL app daemon"""
        function_data = self.get_contract_function_data(func_name, *args)
        tx_params = {
            'to': self.contract_address,
            'data': function_data,
            'gas': gas,
            'value': 0
        }
        return self.rofl_utility.submit_tx(tx_params)
    
    def retrieve_order(self, order_id: int) -> Dict[str, Any]:
        """
        Retrieve and decrypt an order from the contract
        
        Args:
            order_id: ID of the order to retrieve
            
        Returns:
            Dict containing the decoded order data
        """
        try:
            # First check if the order exists and isn't filled
            if not self.contract.functions.orderExists(order_id).call():
                logger.debug(f"Order {order_id} does not exist")
                return None
                
            if self.contract.functions.filledOrders(order_id).call():
                logger.debug(f"Order {order_id} is already filled")
                return None
            
            # Use authenticated call to get the encrypted order data
            # This must go through the ROFL app daemon to pass the roflEnsureAuthorizedOrigin check
            encrypted_order = self.authenticated_call("getEncryptedOrder", order_id)
            if not encrypted_order or not encrypted_order[0]:
                logger.warning(f"Could not retrieve encrypted data for order {order_id}")
                return None
            
            # Get the order owner through authenticated call
            owner = self.authenticated_call("getOrderOwner", order_id)
            if not owner:
                logger.warning(f"Could not retrieve owner for order {order_id}")
                return None
            
            # Decrypt and parse the order
            return self._decode_order(encrypted_order[0], order_id, owner[0])
        except Exception as e:
            logger.error(f"Error retrieving order {order_id}: {str(e)}")
            traceback.print_exc()
            return None
    
    def _decode_order(self, encrypted_data: bytes, order_id: int, owner: str) -> Dict[str, Any]:
        """
        Decode an encrypted order
        
        Args:
            encrypted_data: Encrypted order data
            order_id: ID of the order
            owner: Address of the order owner
            
        Returns:
            Dict with the decoded order data
        """
        try:
            # In a real TEE environment, this would decrypt the data
            # For testing, we'll assume it's not actually encrypted but just ABI-encoded
            decoded = self.web3.codec.decode_abi(
                ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
                encrypted_data
            )
            
            return {
                "orderId": decoded[0],
                "owner": decoded[1],
                "token": decoded[2],
                "price": decoded[3], 
                "size": decoded[4],
                "isBuy": decoded[5],
            }
        except Exception as e:
            logger.error(f"Error decoding order {order_id}: {str(e)}")
            traceback.print_exc()
            
            # Return None on error
            return None
    
    def find_matches(self, orders: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any], int]]:
        """
        Find matching orders
        
        Args:
            orders: List of all orders
            
        Returns:
            List of matching (buy_order, sell_order, quantity) tuples
        """
        buy_orders = [order for order in orders if order and order.get("isBuy")]
        sell_orders = [order for order in orders if order and not order.get("isBuy")]
        
        logger.info(f"Finding matches among {len(buy_orders)} buy orders and {len(sell_orders)} sell orders")
        
        matches = []
        for buy in buy_orders:
            for sell in sell_orders:
                # Check if orders match
                if (buy["token"] == sell["token"] and
                    buy["price"] >= sell["price"]):
                    
                    # Determine the match quantity
                    match_quantity = min(buy["size"], sell["size"])
                    
                    if match_quantity > 0:
                        logger.info(f"Found match: Buy #{buy['orderId']} and Sell #{sell['orderId']}")
                        logger.info(f"  Token: {buy['token']}")
                        logger.info(f"  Price: {buy['price']}")
                        logger.info(f"  Quantity: {match_quantity}")
                        matches.append((buy, sell, match_quantity))
        
        return matches
    
    def execute_match(self, buy_order: Dict[str, Any], sell_order: Dict[str, Any], quantity: int) -> bool:
        """
        Execute a match between a buy and sell order
        
        Args:
            buy_order: Buy order data
            sell_order: Sell order data
            quantity: Quantity to trade
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            logger.info(f"Executing match: Buy #{buy_order['orderId']} and Sell #{sell_order['orderId']}")
            logger.info(f"  Quantity: {quantity}")
            logger.info(f"  Price: {buy_order['price']}")
            
            # Submit the match through an authenticated transaction
            # Using ROFL daemon socket for authentication (not HTTP headers)
            tx_hash = self.authenticated_transaction(
                "executeMatch",
                buy_order["orderId"],
                sell_order["orderId"],
                buy_order["owner"],
                sell_order["owner"],
                buy_order["token"],
                quantity,
                buy_order["price"],
                gas=500000  # Higher gas limit for match execution
            )
            
            logger.info(f"Match submitted. Transaction hash: {tx_hash}")
            
            # Wait for the transaction to be mined
            tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            logger.info(f"Match executed successfully. Gas used: {tx_receipt.gasUsed}")
            
            return True
        except Exception as e:
            logger.error(f"Error executing match: {str(e)}")
            traceback.print_exc()
            return False
    
    async def log_loop(self, poll_interval: int = 30):
        """
        Main processing loop that polls for new orders and executes matches
        
        Args:
            poll_interval: Time in seconds between polls
        """
        logger.info(f"Starting order processing loop with {poll_interval}s interval")
        
        while True:
            try:
                # Get total order count
                order_count = self.contract.functions.getTotalOrderCount().call()
                logger.info(f"Total orders: {order_count}")
                
                # Retrieve all orders
                orders = []
                for order_id in range(1, order_count + 1):
                    order = self.retrieve_order(order_id)
                    if order:
                        orders.append(order)
                
                logger.info(f"Retrieved {len(orders)} active orders")
                
                # Find matching orders
                matches = self.find_matches(orders)
                logger.info(f"Found {len(matches)} potential matches")
                
                # Execute matches
                successful_matches = 0
                for buy_order, sell_order, quantity in matches:
                    if self.execute_match(buy_order, sell_order, quantity):
                        successful_matches += 1
                
                logger.info(f"Successfully executed {successful_matches} of {len(matches)} matches")
                
            except Exception as e:
                logger.error(f"Error in processing loop: {str(e)}")
                traceback.print_exc()
            
            # Sleep before the next poll
            logger.info(f"Sleeping for {poll_interval} seconds...")
            await asyncio.sleep(poll_interval)
    
    def run(self, poll_interval: int = 30, once: bool = False):
        """
        Start the oracle
        
        Args:
            poll_interval: Time in seconds between polls
            once: If True, process orders once and exit
        """
        # Check and update oracle address if needed
        try:
            self.set_oracle_address()
        except Exception as e:
            logger.error(f"Error setting oracle address: {str(e)}")
            
        if once:
            logger.info("Processing orders once...")
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                # Get total order count
                order_count = self.contract.functions.getTotalOrderCount().call()
                logger.info(f"Total orders: {order_count}")
                
                # Retrieve all orders
                orders = []
                for order_id in range(1, order_count + 1):
                    order = self.retrieve_order(order_id)
                    if order:
                        orders.append(order)
                
                logger.info(f"Retrieved {len(orders)} active orders")
                
                # Find matching orders
                matches = self.find_matches(orders)
                logger.info(f"Found {len(matches)} potential matches")
                
                # Execute matches
                successful_matches = 0
                for buy_order, sell_order, quantity in matches:
                    if self.execute_match(buy_order, sell_order, quantity):
                        successful_matches += 1
                
                logger.info(f"Successfully executed {successful_matches} of {len(matches)} matches")
            finally:
                loop.close()
        else:
            logger.info(f"Starting continuous order processing every {poll_interval} seconds")
            # Start the event loop
            loop = asyncio.get_event_loop()
            try:
                loop.run_until_complete(
                    asyncio.gather(self.log_loop(poll_interval))
                )
            except KeyboardInterrupt:
                logger.info("Shutting down due to keyboard interrupt")
            finally:
                loop.close() 