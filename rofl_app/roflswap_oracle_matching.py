#!/usr/bin/env python3
"""
ROFLSwap Oracle Matching Service

This script handles order matching for the ROFLSwapOracle contract deployed
on Oasis Sapphire. It retrieves orders from the contract, processes them for matching,
and executes matches using the ROFLSwapOracle contract's executeMatch method.

This is specifically designed for the ROFLSwapOracle contract (not ROFLSwapV5).
"""

import os
import sys
import json
import asyncio
import logging
import argparse
import time
import random
import traceback
from typing import List, Dict, Any, Tuple, Optional

# Web3 and Ethereum-related imports
from web3 import Web3
from eth_account import Account
from eth_abi import decode, encode
from web3.middleware import construct_sign_and_send_raw_middleware
from eth_account.signers.local import LocalAccount

# Import ROFL utility
from rofl_app.rofl_auth import RoflUtility

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

# Token addresses
WATER_TOKEN_ADDRESS = "0x991a85943D05Abcc4599Fc8746188CCcE4019F04"
FIRE_TOKEN_ADDRESS = "0x8AE7cCe3D249F31b2D2db54aD2eBf1Ba2E30a977"

class ROFLSwapMatcher:
    """
    ROFLSwap Matcher for matching orders on ROFLSwapOracle
    """
    
    def __init__(self, contract_address: str, web3_provider: str, mode: str = "tee"):
        """
        Initialize ROFLSwap Matcher
        
        Args:
            contract_address: ROFLSwapOracle contract address
            web3_provider: Web3 provider URL
            mode: Mode to run in (tee, local_test)
        """
        # Set contract address
        self.contract_address = Web3.to_checksum_address(contract_address)
        
        # Initialize Web3
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        if not self.web3.is_connected():
            logger.warning(f"Could not connect to Web3 provider at {web3_provider}")
        
        # Set mode flag for local testing
        self.is_local_mode = mode.lower() == "local_test"
        
        # Initialize ROFL utility
        is_tee_mode = mode.lower() == "tee"
        self.rofl_utility = RoflUtility(contract_address, is_tee_mode)
        
        # Load contract ABI
        try:
            with open(os.path.join(os.path.dirname(__file__), 'abi', 'ROFLSwapOracle.json'), 'r') as f:
                contract_data = json.load(f)
                self.contract_abi = contract_data["abi"] if "abi" in contract_data else contract_data
            
            # Load token ABIs for decoding events
            with open(os.path.join(os.path.dirname(__file__), 'abi', 'WaterToken.json'), 'r') as f:
                water_data = json.load(f)
                water_token_abi = water_data["abi"] if "abi" in water_data else water_data
            with open(os.path.join(os.path.dirname(__file__), 'abi', 'FireToken.json'), 'r') as f:
                fire_data = json.load(f)
                fire_token_abi = fire_data["abi"] if "abi" in fire_data else fire_data
        except Exception as e:
            logger.warning(f"Could not load token ABIs: {e}")
            water_token_abi = []
            fire_token_abi = []
        
        # Create token contract instances using checksum addresses
        water_address = Web3.to_checksum_address(WATER_TOKEN_ADDRESS)
        fire_address = Web3.to_checksum_address(FIRE_TOKEN_ADDRESS)
        self.water_token = self.web3.eth.contract(address=water_address, abi=water_token_abi)
        self.fire_token = self.web3.eth.contract(address=fire_address, abi=fire_token_abi)
        
        # Create contract instance
        self.contract = self.web3.eth.contract(address=self.contract_address, abi=self.contract_abi)
        
        # Initialize last processed block
        self.last_processed_block = 0
        
        logger.info(f"Initialized ROFLSwap Matcher for contract {contract_address}")
        logger.info(f"Mode: {'TEE' if is_tee_mode else 'Local test'}")
        logger.info(f"Web3 connected: {self.web3.is_connected()}")
    
    def get_function_data(self, func_name: str, *args) -> str:
        """
        Get function data for calling a contract function
        
        Args:
            func_name: Function name
            *args: Function arguments
            
        Returns:
            str: Function data
        """
        return self.contract.encodeABI(fn_name=func_name, args=args)
    
    def authenticated_call(self, func_name: str, *args) -> Any:
        """Make authenticated call through ROFL daemon socket"""
        function_data = self.get_function_data(func_name, *args)
        result = self.rofl_utility.call_view_function(self.contract_address, function_data)
        
        # Decode result based on function output type
        function_abi = next(func for func in self.contract_abi if func.get('name') == func_name)
        output_types = [output['type'] for output in function_abi['outputs']]
        
        if not result.get('data'):
            return None
        
        # Decode response data using eth_abi.decode
        try:
            # If we're in local mode and there's no real data, return mock data
            if self.is_local_mode and not result.get('data'):
                if func_name == "getOrderOwner":
                    # Create a deterministic owner based on order ID
                    order_id = args[1]  # second argument is order_id
                    private_key = f"0x{'0' * 63}{order_id % 10}"
                    account = Account.from_key(private_key)
                    return account.address
                return None
                
            # Convert hex string to bytes
            data_bytes = bytes.fromhex(result['data'].replace('0x', ''))
            
            # Use eth_abi.decode to decode the data
            from eth_abi import decode as abi_decode
            decoded = abi_decode(output_types, data_bytes)
            return decoded[0] if len(decoded) == 1 else decoded
        except Exception as e:
            logger.error(f"Error decoding result for {func_name}: {e}")
            return None
    
    def _decode_order(self, encrypted_data: bytes, order_id: int, owner: str) -> Dict[str, Any]:
        """
        Decode order data
        
        Args:
            encrypted_data: Encrypted order data
            order_id: Order ID
            owner: Owner address
            
        Returns:
            Dict with order data
        """
        try:
            # In TEE environment, this would decrypt the data
            # For testing, assuming it's ABI-encoded
            try:
                # Import decode function from eth_abi
                from eth_abi import decode as abi_decode
                
                # Try to decode with different output types if the first attempt fails
                order_types = [
                    ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
                    ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool']
                ]
                
                decoded = None
                for types in order_types:
                    try:
                        # Make sure encrypted_data is bytes
                        if isinstance(encrypted_data, str) and encrypted_data.startswith('0x'):
                            data_bytes = bytes.fromhex(encrypted_data[2:])
                        elif isinstance(encrypted_data, str):
                            data_bytes = bytes.fromhex(encrypted_data)
                        else:
                            data_bytes = encrypted_data
                            
                        decoded = abi_decode(types, data_bytes)
                        break
                    except Exception as inner_e:
                        logger.debug(f"Failed decoding with types {types}: {inner_e}")
                        continue
                
                if decoded:
                    return {
                        "orderId": decoded[0],
                        "owner": decoded[1],
                        "token": decoded[2],
                        "amount": decoded[3],
                        "price": decoded[4],
                        "isBuyOrder": decoded[5]
                    }
                else:
                    raise ValueError("Failed to decode with any known order types")
                    
            except Exception as e:
                # For local testing, generate mock data
                if self.is_local_mode:
                    return self._generate_mock_order(order_id, owner)
                else:
                    logger.error(f"Error decoding order data: {e}")
                    raise
        except Exception as e:
            logger.error(f"Error decoding order {order_id}: {e}")
            # Return mock data in case of error
            if self.is_local_mode:
                return self._generate_mock_order(order_id, owner)
            return None
    
    def _generate_mock_order(self, order_id: int, owner: str) -> Dict[str, Any]:
        """
        Generate mock order data for testing
        
        Args:
            order_id: Order ID
            owner: Owner address
            
        Returns:
            Dict with mock order data
        """
        # Seed random based on order ID for deterministic results
        random.seed(order_id)
        
        # Alternate between buy and sell orders
        is_buy_order = order_id % 2 == 0
        
        # Alternate between WATER and FIRE tokens
        token = WATER_TOKEN_ADDRESS if order_id % 2 == 0 else FIRE_TOKEN_ADDRESS
        
        # Random amount between 100 and 10000
        amount = random.randint(100, 10000)
        
        # Random price between 50 and 200
        price = random.randint(50, 200)
        
        return {
            "orderId": order_id,
            "owner": owner,
            "token": token,
            "amount": amount,
            "price": price,
            "isBuyOrder": is_buy_order
        }
    
    def retrieve_order(self, order_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve order data from the contract
        
        Args:
            order_id: Order ID to retrieve
            
        Returns:
            Order data or None if the order doesn't exist
        """
        try:
            # Get order owner - this will throw if the order doesn't exist
            owner = None
            try:
                # Use the correct method for calling contract functions
                owner = self.authenticated_call("getOrderOwner", self.contract_address, order_id)
                if not owner or owner == "0x0000000000000000000000000000000000000000":
                    logger.debug(f"Order {order_id} doesn't exist (no owner)")
                    # If in local testing mode, generate mock data
                    if self.is_local_mode:
                        return self._generate_mock_order(order_id, owner or "0x0000000000000000000000000000000000000000")
                    return None
            except Exception as e:
                logger.warning(f"Error retrieving order owner for {order_id}: {e}")
                if self.is_local_mode:
                    # Generate deterministic owner for testing
                    private_key = f"0x{'0' * 63}{order_id % 10}"
                    account = Account.from_key(private_key)
                    owner = account.address
                else:
                    return None
            
            # If in local testing mode, use a mock owner
            if self.is_local_mode:
                # Generate a deterministic owner based on order ID
                private_key = f"0x{'0' * 63}{order_id % 10}"
                account = Account.from_key(private_key)
                owner = account.address
                
            # Get order data
            try:
                # Use the correct method for calling contract functions
                order_data = self.authenticated_call("getOrderData", self.contract_address, order_id)
                
                if not order_data:
                    logger.debug(f"Order {order_id} exists but has no data")
                    # Fall back to mock data in local mode
                    if self.is_local_mode:
                        return self._generate_mock_order(order_id, owner)
                    return None
                
                # Log encoded data for debugging
                logger.debug(f"Encoded order data: {order_data}")
                
                # Process the order data
                try:
                    # If this is a bytes result, decode it
                    if isinstance(order_data, str) and order_data.startswith("0x"):
                        # Decode order data tuple: (bool active, address tokenA, address tokenB, uint256 amountA, uint256 amountB)
                        decoded = decode(
                            ["bool", "address", "address", "uint256", "uint256"],
                            bytes.fromhex(order_data[2:])  # Remove 0x prefix
                        )
                        
                        # Create the order object
                        order = {
                            "order_id": order_id,
                            "owner": owner,
                            "active": decoded[0],
                            "token_a": decoded[1],
                            "token_b": decoded[2],
                            "amount_a": decoded[3],
                            "amount_b": decoded[4]
                        }
                        
                        # Log the decoded order
                        logger.debug(f"Retrieved order {order_id}: {order}")
                        
                        return order
                    else:
                        logger.warning(f"Unexpected order data format: {order_data}")
                        # Fall back to mock data in local mode
                        if self.is_local_mode:
                            return self._generate_mock_order(order_id, owner)
                        return None
                except Exception as e:
                    logger.warning(f"Error decoding order data for {order_id}: {e}")
                    # Fall back to mock data in case of error
                    if self.is_local_mode:
                        return self._generate_mock_order(order_id, owner or "0x0000000000000000000000000000000000000000")
                    return None
            except Exception as e:
                logger.warning(f"Error retrieving order data for {order_id}: {e}")
                # Fall back to mock data in case of error
                if self.is_local_mode:
                    return self._generate_mock_order(order_id, owner or "0x0000000000000000000000000000000000000000")
                return None
        except Exception as e:
            logger.error(f"Error retrieving order {order_id}: {e}")
            # Generate mock data in local mode
            if self.is_local_mode:
                return self._generate_mock_order(order_id, "0x0000000000000000000000000000000000000000")
            return None
    
    def process_orders(self) -> int:
        """
        Process all orders and try to match them
        
        Returns:
            int: Number of matches made
        """
        try:
            # Get total order count
            total_orders = self.contract.functions.getTotalOrderCount().call()
            logger.info(f"Processing {total_orders} orders")
            
            # Store all active orders
            active_orders = []
            
            # Retrieve all active orders
            for order_id in range(1, total_orders + 1):
                order = self.retrieve_order(order_id)
                if order:
                    active_orders.append(order)
            
            logger.info(f"Found {len(active_orders)} active orders")
            
            # Find matches
            matches = self.find_matches(active_orders)
            logger.info(f"Found {len(matches)} potential matches")
            
            # Execute matches
            match_count = 0
            for buy_order, sell_order, quantity in matches:
                if self.execute_match(buy_order, sell_order, quantity):
                    match_count += 1
            
            logger.info(f"Executed {match_count} matches")
            return match_count
        
        except Exception as e:
            logger.error(f"Error processing orders: {e}")
            return 0
    
    def find_matches(self, orders: List[Dict[str, Any]]) -> List[Tuple[Dict[str, Any], Dict[str, Any], int]]:
        """
        Find matching orders
        
        Args:
            orders: List of orders
            
        Returns:
            List of tuples (buy_order, sell_order, quantity)
        """
        # Separate buy and sell orders
        buy_orders = [order for order in orders if order["isBuyOrder"]]
        sell_orders = [order for order in orders if not order["isBuyOrder"]]
        
        logger.info(f"Found {len(buy_orders)} buy orders and {len(sell_orders)} sell orders")
        
        matches = []
        
        # Sort buy orders by highest price first
        buy_orders.sort(key=lambda x: x["price"], reverse=True)
        
        # Sort sell orders by lowest price first
        sell_orders.sort(key=lambda x: x["price"])
        
        # Match orders
        for buy_order in buy_orders:
            for sell_order in sell_orders:
                # Check if orders are for the same token
                if buy_order["token"] != sell_order["token"]:
                    continue
                
                # Check if buy price >= sell price
                if buy_order["price"] < sell_order["price"]:
                    continue
                
                # Check if orders are from different owners
                if buy_order["owner"] == sell_order["owner"]:
                    continue
                
                # Calculate quantity
                quantity = min(buy_order["amount"], sell_order["amount"])
                
                if quantity > 0:
                    matches.append((buy_order, sell_order, quantity))
                    
                    # Update remaining quantities
                    buy_order["amount"] -= quantity
                    sell_order["amount"] -= quantity
                    
                    # If buy order is filled, break
                    if buy_order["amount"] == 0:
                        break
        
        return matches
    
    def execute_match(self, buy_order: Dict[str, Any], sell_order: Dict[str, Any], quantity: int) -> bool:
        """
        Execute a match between two orders
        
        Args:
            buy_order: Buy order
            sell_order: Sell order
            quantity: Quantity to match
            
        Returns:
            bool: True if match was successful, False otherwise
        """
        try:
            buy_order_id = buy_order["orderId"]
            sell_order_id = sell_order["orderId"]
            
            logger.info(f"Executing match between buy order {buy_order_id} and sell order {sell_order_id}")
            logger.info(f"Token: {buy_order['token']}")
            logger.info(f"Quantity: {quantity}")
            logger.info(f"Price: {sell_order['price']}")
            
            # Prepare function data
            function_name = "executeMatch"
            function_data = self.get_function_data(
                function_name,
                buy_order_id,
                sell_order_id,
                buy_order["owner"],
                sell_order["owner"],
                buy_order["token"],
                quantity,
                sell_order["price"]
            )
            
            # Submit transaction
            result = self.rofl_utility.submit_transaction(self.contract_address, function_data)
            
            if not result:
                logger.error("Transaction submission failed with no result")
                return False
            
            # Check result
            if result.get('status') == 'ok':
                logger.info(f"Match execution transaction submitted: {result.get('txhash', 'unknown')}")
                
                # If we have a receipt, check its status
                receipt = result.get('receipt')
                if receipt:
                    if receipt.get('status') == 1:
                        logger.info(f"Match execution successful")
                        return True
                    else:
                        logger.error(f"Match execution failed: {receipt}")
                        return False
                else:
                    # In TEE environment, we don't get receipt immediately
                    logger.info("No receipt available, assuming transaction pending")
                    return True
            else:
                logger.error(f"Transaction submission failed: {result.get('message', 'unknown error')}")
                return False
        except Exception as e:
            logger.error(f"Error executing match: {e}")
            return False
    
    async def process_orders_loop(self, poll_interval: int):
        """
        Main order processing loop
        
        Args:
            poll_interval: Polling interval in seconds
        """
        logger.info(f"Starting order processing loop with interval {poll_interval} seconds")
        
        # Get the latest block number for filtering events
        self.last_processed_block = self.web3.eth.block_number
        logger.info(f"Starting from block {self.last_processed_block}")
        
        while True:
            try:
                # Get all unfilled orders
                orders = await self.get_all_orders()
                
                if orders:
                    logger.info(f"Retrieved {len(orders)} orders")
                    
                    # Find potential matches
                    matches = self.find_matches(orders)
                    
                    if matches:
                        logger.info(f"Found {len(matches)} potential matches")
                        
                        # Execute matches
                        for buy_order, sell_order, quantity in matches:
                            success = self.execute_match(buy_order, sell_order, quantity)
                            if success:
                                logger.info(f"Successfully executed match between buy order {buy_order['orderId']} and sell order {sell_order['orderId']}")
                            else:
                                logger.warning(f"Failed to execute match between buy order {buy_order['orderId']} and sell order {sell_order['orderId']}")
                    else:
                        logger.info("No matches found")
                else:
                    logger.info("No orders found")
                
                # Sleep before next iteration
                logger.debug(f"Sleeping for {poll_interval} seconds")
                await asyncio.sleep(poll_interval)
            except Exception as e:
                logger.error(f"Error in order processing loop: {e}")
                logger.info(f"Retrying in {poll_interval} seconds")
                await asyncio.sleep(poll_interval)
    
    async def get_all_orders(self) -> List[Dict[str, Any]]:
        """
        Get all active orders from the contract
        
        Returns:
            List of active orders
        """
        try:
            # Get total order count
            total_orders = self.contract.functions.getTotalOrderCount().call()
            logger.debug(f"Getting orders from total of {total_orders}")
            
            # Store all active orders
            active_orders = []
            
            # Retrieve all active orders
            for order_id in range(1, total_orders + 1):
                order = self.retrieve_order(order_id)
                if order:
                    active_orders.append(order)
                # Small pause to avoid overwhelming the node
                if order_id % 10 == 0:
                    await asyncio.sleep(0.1)
            
            logger.debug(f"Found {len(active_orders)} active orders")
            return active_orders
        
        except Exception as e:
            logger.error(f"Error getting orders: {e}")
            return []
    
    @staticmethod
    def run():
        """
        Run the matcher
        """
        parser = argparse.ArgumentParser(description='ROFLSwap Matcher')
        parser.add_argument('--contract', type=str, default=os.environ.get("ROFLSWAP_ADDRESS", "0x1bc94B51C5040E7A64FE5F42F51C328d7398969e"),
                            help='ROFLSwapOracle contract address')
        parser.add_argument('--interval', type=int, default=int(os.environ.get("POLLING_INTERVAL", "30")),
                            help='Polling interval in seconds')
        parser.add_argument('--mode', type=str, choices=['tee', 'local_test'], default='tee',
                            help='Mode to run in (tee, local_test)')
        parser.add_argument('--debug', action='store_true',
                            help='Enable debug logging')
        args = parser.parse_args()
        
        # Set up logging level based on debug flag
        if args.debug:
            logging.getLogger().setLevel(logging.DEBUG)
            logger.setLevel(logging.DEBUG)
        else:
            log_level = os.environ.get("LOG_LEVEL", "INFO")
            logging.getLogger().setLevel(getattr(logging, log_level))
            logger.setLevel(getattr(logging, log_level))
        
        logger.info(f"Starting ROFLSwap Matcher for contract {args.contract}")
        logger.info(f"Polling interval: {args.interval} seconds")
        logger.info(f"Mode: {args.mode}")
        
        # Initialize matcher
        matcher = ROFLSwapMatcher(args.contract, os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io"), args.mode)
        
        # Run the main loop
        loop = asyncio.get_event_loop()
        try:
            loop.run_until_complete(matcher.process_orders_loop(args.interval))
        except KeyboardInterrupt:
            logger.info("Matcher stopped by user")
        except Exception as e:
            logger.error(f"Matcher stopped due to error: {e}")
            traceback.print_exc()
        finally:
            loop.close()

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="ROFLSwap Matcher Service")
    parser.add_argument("--contract", type=str, help="ROFLSwapOracle contract address", 
                        default=os.environ.get("ROFLSWAP_ADDRESS"))
    parser.add_argument("--interval", type=int, help="Polling interval in seconds", default=30)
    parser.add_argument("--provider", type=str, help="Web3 provider URL", 
                        default=os.environ.get("WEB3_PROVIDER", "https://testnet.sapphire.oasis.io"))
    parser.add_argument("--mode", type=str, help="Mode to run in (tee, local_test)", 
                        default="tee")
    parser.add_argument("--debug", action="store_true", help="Enable debug logging")
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.setLevel(logging.DEBUG)
        logger.debug("Debug logging enabled")
    
    # Log environment variables for debugging
    if args.debug:
        logger.debug("Environment variables:")
        logger.debug(f"ROFLSWAP_ADDRESS: {os.environ.get('ROFLSWAP_ADDRESS', 'Not set')}")
        logger.debug(f"WEB3_PROVIDER: {os.environ.get('WEB3_PROVIDER', 'Not set')}")
        logger.debug(f"MATCHER_PRIVATE_KEY: {'Set' if os.environ.get('MATCHER_PRIVATE_KEY') else 'Not set'}")
        logger.debug(f"ROFL_APP_ID: {os.environ.get('ROFL_APP_ID', 'Not set')}")
        
        # Check if socket file exists
        socket_path = "/run/rofl-appd.sock"
        logger.debug(f"Checking if socket path exists: {socket_path}")
        logger.debug(f"Socket exists: {os.path.exists(socket_path)}")
    
    # Validate contract address
    if not args.contract:
        logger.error("Contract address not provided")
        sys.exit(1)
    
    # Create matcher instance and run
    matcher = ROFLSwapMatcher(args.contract, args.provider, args.mode)
    
    try:
        asyncio.run(matcher.process_orders_loop(args.interval))
    except KeyboardInterrupt:
        logger.info("Matcher service stopped by user")
    except Exception as e:
        logger.error(f"Error running matcher service: {e}")
        logger.error(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    sys.exit(main()) 