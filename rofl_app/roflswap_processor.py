#!/usr/bin/env python3
"""
ROFLSwap Processor that uses ROFL app authentication
"""

import os
import json
import time
import traceback
import logging
from typing import List, Dict, Any, Tuple, Optional
from web3 import Web3
from web3.contract import Contract
from eth_account import Account
from eth_abi import decode

from rofl_auth import RoflUtility

class ROFLSwapProcessor:
    """
    Processor for ROFLSwapV5 contract using ROFL app authentication
    """
    
    def __init__(self, 
                 contract_address: str, 
                 rpc_url: str,
                 app_id: str,
                 private_key: str,
                 rofl_socket_path: str = "",
                 poll_interval: int = 60,
                 storage_dir: str = "./storage"):
        """
        Initialize the ROFLSwap processor
        
        Args:
            contract_address: Address of the ROFLSwapV5 contract
            rpc_url: URL of the Sapphire RPC endpoint
            app_id: ROFL app ID for authentication
            private_key: Private key for signing transactions
            rofl_socket_path: Path to the ROFL app daemon socket or URL
            poll_interval: Interval between polling for new orders
            storage_dir: Directory to store processing state
        """
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.rpc_url = rpc_url
        self.app_id = app_id
        self.private_key = private_key
        self.poll_interval = poll_interval
        self.storage_dir = storage_dir
        
        # Initialize web3 connection (standard, for non-authenticated calls)
        self.web3 = Web3(Web3.HTTPProvider(rpc_url))
        
        # Initialize ROFL utility for authenticated calls
        self.rofl_utility = RoflUtility(rofl_socket_path)
        
        # Load contract ABI
        abi_path = os.path.join(os.path.dirname(__file__), "contracts/ROFLSwapV5.json")
        with open(abi_path, 'r') as f:
            contract_data = json.load(f)
        self.contract_abi = contract_data["abi"]
        
        # Create contract instance for non-authenticated calls
        self.contract = self.web3.eth.contract(address=self.contract_address, abi=self.contract_abi)
        
        # Create storage directory if it doesn't exist
        if not os.path.exists(storage_dir):
            os.makedirs(storage_dir)
            
        print(f"ROFLSwap processor initialized for contract: {contract_address}")
        print(f"ROFL App ID: {app_id}")
            
    def get_contract_function_data(self, func_name: str, *args) -> str:
        """
        Get the encoded function call data for a contract function
        
        Args:
            func_name: Name of the contract function
            *args: Arguments to pass to the function
            
        Returns:
            str: Encoded function call data
        """
        return self.contract.encodeABI(fn_name=func_name, args=args)
    
    def authenticated_call(self, function_abi: Dict, contract_address: str, *args) -> Any:
        """Make authenticated call through private contract method"""
        function_data = self.get_contract_function_data(function_abi['name'], *args)
        result = self.rofl_utility.call_view_function(contract_address, function_data)
        
        if not result.get('data'):
            return None
        
        # Decode response data using eth_abi.decode
        try:
            return decode([output['type'] for output in function_abi['outputs']], bytes.fromhex(result['data']))
        except Exception as e:
            logging.error(f"Error decoding response: {str(e)}")
            return None
    
    def authenticated_transaction(self, func_name: str, *args, gas: int = 3000000) -> str:
        """
        Submit an authenticated transaction to a contract function
        
        Args:
            func_name: Name of the contract function
            *args: Arguments to pass to the function
            gas: Gas limit for the transaction
            
        Returns:
            str: Transaction hash
        """
        function_data = self.get_contract_function_data(func_name, *args)
        tx_params = {
            'to': self.contract_address,
            'data': function_data,
            'gas': gas,
            'value': 0
        }
        return self.rofl_utility.submit_tx(tx_params)
    
    def get_order_count(self) -> int:
        """
        Get the total number of orders in the contract
        
        Returns:
            int: Total number of orders
        """
        try:
            # This is a non-authenticated call
            return self.contract.functions.getTotalOrderCount().call()
        except Exception as e:
            print(f"Error getting order count: {str(e)}")
            return 0
    
    def get_encrypted_order(self, order_id: int) -> bytes:
        """
        Get an encrypted order from the contract
        
        Args:
            order_id: ID of the order
            
        Returns:
            bytes: Encrypted order data
        """
        try:
            # This is an authenticated call
            result = self.authenticated_call(next(func for func in self.contract_abi if func.get('name') == "getEncryptedOrder"), self.contract_address, order_id)
            return result[0]  # Return the first element of the tuple
        except Exception as e:
            print(f"Error getting encrypted order {order_id}: {str(e)}")
            traceback.print_exc()
            return b''
    
    def get_order_owner(self, order_id: int) -> str:
        """
        Get the owner of an order
        
        Args:
            order_id: ID of the order
            
        Returns:
            str: Address of the order owner
        """
        try:
            # This is an authenticated call
            result = self.authenticated_call(next(func for func in self.contract_abi if func.get('name') == "getOrderOwner"), self.contract_address, order_id)
            return result[0]  # Return the first element of the tuple
        except Exception as e:
            print(f"Error getting order owner {order_id}: {str(e)}")
            return "0x0000000000000000000000000000000000000000"
    
    def process_orders(self) -> None:
        """
        Process all orders in the contract to find matches
        """
        try:
            # Get total order count
            order_count = self.get_order_count()
            print(f"Total orders: {order_count}")
            
            # Iterate through all orders and collect them
            buy_orders = []
            sell_orders = []
            
            for order_id in range(1, order_count + 1):
                # Check if order exists and isn't filled
                if not self.contract.functions.orderExists(order_id).call():
                    continue
                
                if self.contract.functions.filledOrders(order_id).call():
                    continue
                
                # Get the encrypted order
                encrypted_order = self.get_encrypted_order(order_id)
                if not encrypted_order:
                    print(f"Could not get encrypted data for order {order_id}")
                    continue
                
                # Decrypt and parse the order
                try:
                    order = self._decode_order(encrypted_order, order_id, self.get_order_owner(order_id))
                    if order["isBuy"]:
                        buy_orders.append(order)
                    else:
                        sell_orders.append(order)
                except Exception as e:
                    print(f"Error decoding order {order_id}: {str(e)}")
                    continue
            
            # Find matches
            matches = self._find_matches(buy_orders, sell_orders)
            
            # Execute matches
            for match in matches:
                self._execute_match(match)
                
        except Exception as e:
            print(f"Error processing orders: {str(e)}")
            traceback.print_exc()
    
    def _decode_order(self, encrypted_data: bytes, order_id: int, owner: str) -> Dict[str, Any]:
        """Decode order data"""
        try:
            # In TEE environment, this would decrypt the data
            # For testing, assuming it's ABI-encoded
            decoded = decode(
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
            logging.error(f"Error decoding order {order_id}: {str(e)}")
            return None
    
    def _find_matches(self, buy_orders: List[Dict], sell_orders: List[Dict]) -> List[Tuple[Dict, Dict]]:
        """
        Find matching orders
        
        Args:
            buy_orders: List of buy orders
            sell_orders: List of sell orders
            
        Returns:
            List: List of matching (buy, sell) order pairs
        """
        matches = []
        
        for buy in buy_orders:
            for sell in sell_orders:
                # Check if orders match
                if (buy["token"] == sell["token"] and
                    buy["price"] >= sell["price"]):
                    
                    # Determine the match quantity (minimum of buy and sell sizes)
                    match_quantity = min(buy["size"], sell["size"])
                    
                    if match_quantity > 0:
                        matches.append((buy, sell, match_quantity))
        
        return matches
    
    def _execute_match(self, match: Tuple[Dict, Dict, int]) -> None:
        """
        Execute a match between two orders
        
        Args:
            match: Tuple of (buy_order, sell_order, match_quantity)
        """
        buy_order, sell_order, match_quantity = match
        
        print(f"Executing match: Buy #{buy_order['orderId']} and Sell #{sell_order['orderId']}")
        print(f"  Quantity: {match_quantity}")
        print(f"  Price: {buy_order['price']}")
        
        try:
            # This is an authenticated transaction
            tx_hash = self.authenticated_transaction(
                "executeMatch",
                buy_order["orderId"],
                sell_order["orderId"],
                buy_order["owner"],
                sell_order["owner"],
                buy_order["token"],
                match_quantity,
                buy_order["price"]
            )
            
            print(f"Match executed! Transaction hash: {tx_hash}")
        except Exception as e:
            print(f"Error executing match: {str(e)}")
            traceback.print_exc()
    
    def start(self, once: bool = False) -> None:
        """
        Start the matcher
        
        Args:
            once: If True, process orders once and exit
        """
        print(f"Starting ROFLSwap processor")
        
        if once:
            print("Processing orders once...")
            self.process_orders()
        else:
            print(f"Processing orders every {self.poll_interval} seconds...")
            while True:
                self.process_orders()
                print(f"Sleeping for {self.poll_interval} seconds...")
                time.sleep(self.poll_interval)

# Example usage
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="ROFLSwap processor")
    parser.add_argument("--once", action="store_true", help="Process orders once and exit")
    parser.add_argument("--interval", type=int, default=60, help="Polling interval in seconds")
    parser.add_argument("--socket", type=str, default="", help="ROFL app daemon socket path")
    args = parser.parse_args()
    
    # Get configuration from environment variables
    contract_address = os.environ.get("ROFLSWAP_ADDRESS")
    rpc_url = os.environ.get("WEB3_PROVIDER")
    app_id = os.environ.get("ROFL_APP_ID")
    private_key = os.environ.get("PRIVATE_KEY") or os.environ.get("MATCHER_PRIVATE_KEY")
    
    if not contract_address:
        print("ROFLSWAP_ADDRESS environment variable must be set")
        exit(1)
    
    if not rpc_url:
        print("WEB3_PROVIDER environment variable must be set")
        exit(1)
    
    if not app_id:
        print("ROFL_APP_ID environment variable must be set")
        exit(1)
    
    if not private_key:
        print("PRIVATE_KEY or MATCHER_PRIVATE_KEY environment variable must be set")
        exit(1)
    
    processor = ROFLSwapProcessor(
        contract_address=contract_address,
        rpc_url=rpc_url,
        app_id=app_id,
        private_key=private_key,
        rofl_socket_path=args.socket,
        poll_interval=args.interval
    )
    
    processor.start(once=args.once) 