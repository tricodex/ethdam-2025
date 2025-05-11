#!/usr/bin/env python3
"""
ROFLSwap Oracle Matching Service

This script handles order matching for the ROFLSwapOracle contract deployed
on Oasis Sapphire. It retrieves orders from the contract, processes them for matching,
and executes matches using the ROFLSwapOracle contract's executeMatch method.

This version uses the ROFL Protocol and SIWE authentication to properly
authenticate with the contract as an oracle.
"""

import os
import sys
import json
import asyncio
import logging
import argparse
import time
from typing import List, Dict, Any, Tuple, Optional

# Web3 and Ethereum-related imports
from web3 import Web3
from eth_abi import decode, encode

# Import our modules
from rofl_auth_protocol import RoflProtocol
from rofl_web3 import RoflWeb3
from rofl_siwe import RoflSiwe

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('roflswap_matcher.log')
    ]
)
logger = logging.getLogger("roflswap_matcher")

class ROFLSwapMatcher:
    """
    ROFLSwap Matcher for matching orders on ROFLSwapOracle
    """
    
    def __init__(self, 
                 contract_address: str, 
                 web3_provider: str, 
                 is_tee_mode: bool = True,
                 key_id: str = "roflswap-oracle-key"):
        """
        Initialize ROFLSwap Matcher
        
        Args:
            contract_address: ROFLSwapOracle contract address
            web3_provider: Web3 provider URL
            is_tee_mode: Whether running in TEE mode
            key_id: Key ID for ROFL daemon
        """
        # Set contract address
        self.contract_address = contract_address
        self.web3_provider = web3_provider
        self.is_tee_mode = is_tee_mode
        self.key_id = key_id
        
        # Initialize ROFL protocol stack
        self.rofl_auth_protocol = RoflProtocol(is_tee_mode=is_tee_mode, key_id=key_id)
        self.rofl_web3 = RoflWeb3(web3_provider, is_tee_mode=is_tee_mode, key_id=key_id, 
                                 rofl_auth_protocol=self.rofl_auth_protocol)
        self.rofl_siwe = RoflSiwe(self.rofl_auth_protocol)
        
        # Load contract ABI
        try:
            with open(os.path.join(os.path.dirname(__file__), 'abi', 'ROFLSwapOracle.json'), 'r') as f:
                contract_data = json.load(f)
                contract_abi = contract_data["abi"] if "abi" in contract_data else contract_data
                
            # Create contract instance
            self.contract = self.rofl_web3.get_contract(contract_address, contract_abi)
            self.contract_abi = contract_abi
        except Exception as e:
            logger.error(f"Error loading contract ABI: {e}")
            raise
            
        # Get water and fire token addresses from contract
        self.water_token_address = self.rofl_web3.call_function(self.contract, "waterToken")
        self.fire_token_address = self.rofl_web3.call_function(self.contract, "fireToken")
        
        logger.info(f"Initialized ROFLSwap Matcher for contract {contract_address}")
        logger.info(f"Mode: {'TEE' if self.is_tee_mode else 'Local test'}")
        logger.info(f"Oracle address: {self.rofl_auth_protocol.get_public_address()}")
        logger.info(f"Water token: {self.water_token_address}")
        logger.info(f"Fire token: {self.fire_token_address}")
        
        # Set oracle address in contract
        self.rofl_web3.set_oracle_address(self.contract)
        
    def retrieve_order(self, order_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve an order from the contract
        
        Args:
            order_id: Order ID to retrieve
            
        Returns:
            Dict with order data if found, None otherwise
        """
        try:
            # Check if order exists and is not filled
            exists = self.rofl_web3.call_function(self.contract, "orderExists", order_id)
            if not exists:
                logger.debug(f"Order #{order_id} does not exist")
                return None
                
            is_filled = self.rofl_web3.call_function(self.contract, "filledOrders", order_id)
            if is_filled:
                logger.debug(f"Order #{order_id} is already filled")
                return None
                
            # Get an empty auth token since we're the oracle
            empty_token = self.rofl_siwe.get_empty_auth_token()
            
            # Get owner
            owner = self.rofl_web3.call_function(self.contract, "getOrderOwner", empty_token, order_id)
            if not owner:
                logger.warning(f"Failed to get owner for order #{order_id}")
                return None
                
            # Get encrypted order data
            encrypted_data = self.rofl_web3.call_function(self.contract, "getEncryptedOrder", empty_token, order_id)
            if not encrypted_data:
                logger.warning(f"Failed to get encrypted data for order #{order_id}")
                return None
                
            # Decode encrypted data
            try:
                # Expected order format: [orderId, owner, token, price, size, isBuy]
                from eth_abi import decode as abi_decode
                order_types = ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool']
                decoded = abi_decode(order_types, encrypted_data)
                
                # Create order data dictionary
                order_data = {
                    'orderId': decoded[0],
                    'owner': decoded[1],
                    'token': decoded[2],
                    'price': decoded[3],
                    'size': decoded[4],
                    'isBuy': decoded[5],
                }
                
                logger.debug(f"Retrieved order #{order_id}: {order_data}")
                return order_data
            except Exception as e:
                logger.error(f"Error decoding order data for #{order_id}: {e}")
                return None
                
        except Exception as e:
            logger.error(f"Error retrieving order #{order_id}: {e}")
            return None
    
    def find_matches(self, orders: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any], int]]:
        """
        Find matching order pairs
        
        Args:
            orders: List of orders
            
        Returns:
            List of tuples (buy_order, sell_order, quantity)
        """
        buy_orders = [order for order in orders if order['isBuy']]
        sell_orders = [order for order in orders if not order['isBuy']]
        
        logger.info(f"Finding matches among {len(buy_orders)} buy orders and {len(sell_orders)} sell orders")
        
        matches = []
        
        for buy_order in buy_orders:
            for sell_order in sell_orders:
                # Check if orders match on token
                if buy_order['token'] != sell_order['token']:
                    continue
                
                # Check if price is acceptable (buy price >= sell price)
                if buy_order['price'] < sell_order['price']:
                    continue
                
                # Calculate matched quantity
                matched_quantity = min(buy_order['size'], sell_order['size'])
                
                # Only match if both orders are not already matched
                already_matched = False
                for match in matches:
                    if match[0]['orderId'] == buy_order['orderId'] or match[1]['orderId'] == sell_order['orderId']:
                        already_matched = True
                        break
                
                if not already_matched:
                    matches.append((buy_order, sell_order, matched_quantity))
        
        logger.info(f"Found {len(matches)} matching pairs")
        return matches
    
    def execute_match(self, buy_order: Dict[str, Any], sell_order: Dict[str, Any], quantity: int) -> bool:
        """
        Execute a match between a buy and sell order
        
        Args:
            buy_order: Buy order data
            sell_order: Sell order data
            quantity: Quantity to match
            
        Returns:
            bool: True if match was successful
        """
        try:
            logger.info(f"Executing match between buy order #{buy_order['orderId']} and sell order #{sell_order['orderId']}")
            
            # Execute match
            receipt = self.rofl_web3.transact_function(
                self.contract,
                "executeMatch",
                buy_order['orderId'],
                sell_order['orderId'],
                buy_order['owner'],
                sell_order['owner'],
                buy_order['token'],
                quantity,
                buy_order['price']
            )
            
            if receipt.status == 1:
                logger.info(f"Match executed successfully. Transaction hash: {receipt.transactionHash.hex()}")
                return True
            else:
                logger.error(f"Match execution failed. Transaction hash: {receipt.transactionHash.hex()}")
                return False
            
        except Exception as e:
            logger.error(f"Error executing match: {e}")
            return False
    
    async def process_orders_loop(self, poll_interval: int):
        """
        Process orders in a loop
        
        Args:
            poll_interval: Interval between polls in seconds
        """
        while True:
            try:
                await self.process_orders()
                await asyncio.sleep(poll_interval)
            except Exception as e:
                logger.error(f"Error in process_orders_loop: {e}")
                await asyncio.sleep(poll_interval)
    
    async def process_orders(self):
        """Process all orders and execute matches"""
        try:
            logger.info("Processing orders...")
            
            # Get total orders count
            total_orders = self.rofl_web3.call_function(self.contract, "getTotalOrderCount")
            if total_orders is None:
                logger.error("Failed to get total orders count")
                return
                
            logger.info(f"Total orders: {total_orders}")
            
            # Retrieve active orders
            orders = []
            for order_id in range(1, total_orders + 1):
                order = self.retrieve_order(order_id)
                if order:
                    orders.append(order)
            
            logger.info(f"Retrieved {len(orders)} active orders")
            
            # Find matches
            matches = self.find_matches(orders)
            
            # Execute matches
            for buy_order, sell_order, quantity in matches:
                success = self.execute_match(buy_order, sell_order, quantity)
                if success:
                    logger.info(f"Successfully matched buy order #{buy_order['orderId']} with sell order #{sell_order['orderId']}")
                else:
                    logger.warning(f"Failed to match buy order #{buy_order['orderId']} with sell order #{sell_order['orderId']}")
        
        except Exception as e:
            logger.error(f"Error processing orders: {e}")

    def startup(self):
        """
        Start the order matcher
        
        This method is called during startup to initialize the order matcher
        """
        logger.info("Starting ROFLSwap Order Matcher")
        
        # Set the oracle address in the contract
        try:
            self.set_oracle_address()
        except Exception as e:
            logger.error(f"Failed to set oracle address: {e}")
        
        # Start the order processing loop
        self.start_processing_loop()
    
    def set_oracle_address(self):
        """
        Set the oracle address in the contract
        
        This method checks if the current oracle address in the contract matches
        our address and updates it if needed.
        """
        try:
            current_oracle = self.contract.functions.oracle().call()
            our_address = self.rofl_web3.w3.eth.default_account
            
            logger.info(f"Current oracle address: {current_oracle}")
            logger.info(f"Our address: {our_address}")
            
            if current_oracle.lower() != our_address.lower():
                logger.info(f"Setting oracle address to {our_address}")
                
                # Build the transaction to set the oracle
                tx_params = self.contract.functions.setOracle(our_address).build_transaction({
                    'gasPrice': self.rofl_web3.w3.eth.gas_price,
                    'gas': 3000000,
                    'value': 0
                })
                
                # Submit the transaction
                tx_hash = self.rofl_auth_protocol.submit_transaction(
                    to_address=self.contract_address,
                    data=tx_params['data'].lower(),
                    value=0
                )
                
                if 'error' in tx_hash:
                    raise Exception(f"Failed to submit transaction: {tx_hash['error']}")
                
                logger.info(f"Transaction submitted: {tx_hash}")
                
                # Wait for the transaction to be confirmed
                tx_receipt = self.rofl_web3.w3.eth.wait_for_transaction_receipt(tx_hash['txhash'], timeout=60)
                logger.info(f"Transaction confirmed: {tx_receipt.status}")
                
                # Verify the oracle address was updated
                updated_oracle = self.contract.functions.oracle().call()
                logger.info(f"Updated oracle address: {updated_oracle}")
                
                if updated_oracle.lower() != our_address.lower():
                    logger.error(f"Failed to update oracle address, got: {updated_oracle}")
                else:
                    logger.info("Oracle address updated successfully")
            else:
                logger.info("Oracle address already set correctly")
        except Exception as e:
            logger.error(f"Error in set_oracle_address: {e}")
            raise
