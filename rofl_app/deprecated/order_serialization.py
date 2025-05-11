#!/usr/bin/env python3
"""
Order serialization/deserialization utilities for ROFLSwap
"""

import json
import eth_abi
import eth_utils
from web3 import Web3
from typing import Dict, Any, Union, Optional, List

class OrderSerialization:
    """Utilities for handling order serialization and deserialization"""
    
    # Order struct from solidity:
    # struct Order {
    #    uint256 orderId;
    #    address owner;
    #    address token;
    #    uint256 price;
    #    uint256 size;
    #    bool isBuy;
    # }

    @staticmethod
    def encode_order(order: Dict[str, Any]) -> bytes:
        """
        Encode an order dictionary to the binary format expected by the contract
        
        Args:
            order: Dictionary with order data (keys: orderId, owner, token, price, size, isBuy)
            
        Returns:
            Encoded order as bytes
        """
        if not isinstance(order, dict):
            raise ValueError(f"Order must be a dictionary, got {type(order)}")
            
        # Convert string addresses to checksum addresses
        if isinstance(order.get('owner'), str):
            order['owner'] = Web3.to_checksum_address(order['owner'])
            
        if isinstance(order.get('token'), str):
            order['token'] = Web3.to_checksum_address(order['token'])
            
        # Ensure required fields are present
        required_fields = ['orderId', 'owner', 'token', 'price', 'size', 'isBuy']
        for field in required_fields:
            if field not in order:
                raise ValueError(f"Order missing required field: {field}")
        
        # Convert to appropriate types
        order_id = int(order['orderId'])
        owner = order['owner']
        token = order['token']
        price = int(order['price'])
        size = int(order['size']) 
        is_buy = bool(order['isBuy'])
        
        # Encode using eth_abi
        encoded = eth_abi.encode(
            ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
            [order_id, owner, token, price, size, is_buy]
        )
        
        return encoded
    
    @staticmethod
    def decode_order(encoded_data: bytes) -> Dict[str, Any]:
        """
        Decode binary order data to a dictionary
        
        Args:
            encoded_data: Encoded order bytes
            
        Returns:
            Dictionary with decoded order data
        """
        try:
            # Try to decode as ABI-encoded struct
            decoded = eth_abi.decode(
                ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
                encoded_data
            )
            
            # Convert to dictionary
            order = {
                'orderId': decoded[0],
                'owner': decoded[1],
                'token': decoded[2],
                'price': decoded[3],
                'size': decoded[4],
                'isBuy': decoded[5]
            }
            
            return order
            
        except Exception as e:
            # If ABI decoding fails, try to interpret as JSON
            try:
                order_text = encoded_data.decode('utf-8')
                if order_text.startswith('{') and order_text.endswith('}'):
                    return json.loads(order_text)
            except Exception:
                pass
                
            # Re-raise the original error
            raise ValueError(f"Failed to decode order data: {str(e)}")
    
    @staticmethod
    def serialize_for_client(order: Dict[str, Any]) -> str:
        """
        Serialize an order to JSON format for client consumption
        
        Args:
            order: Dictionary with order data
            
        Returns:
            JSON string representation of the order
        """
        # Convert any non-serializable types
        serializable_order = order.copy()
        
        # Convert addresses to strings
        for key in ['owner', 'token']:
            if key in serializable_order and isinstance(serializable_order[key], bytes):
                serializable_order[key] = Web3.to_checksum_address(serializable_order[key])
        
        # Convert integers to strings to avoid precision loss
        for key in ['orderId', 'price', 'size']:
            if key in serializable_order and isinstance(serializable_order[key], int):
                serializable_order[key] = str(serializable_order[key])
                
        return json.dumps(serializable_order)
    
    @staticmethod
    def deserialize_from_client(order_json: str) -> Dict[str, Any]:
        """
        Deserialize an order from JSON format
        
        Args:
            order_json: JSON string representation of an order
            
        Returns:
            Dictionary with deserialized order data
        """
        try:
            order = json.loads(order_json)
            
            # Convert string IDs and values to appropriate types
            if 'orderId' in order and isinstance(order['orderId'], str):
                order['orderId'] = int(order['orderId'])
                
            if 'price' in order and isinstance(order['price'], str):
                order['price'] = int(order['price'])
                
            if 'size' in order and isinstance(order['size'], str):
                order['size'] = int(order['size'])
                
            # Ensure isBuy is boolean
            if 'isBuy' in order and not isinstance(order['isBuy'], bool):
                if isinstance(order['isBuy'], str):
                    order['isBuy'] = order['isBuy'].lower() in ('true', 'yes', '1')
                else:
                    order['isBuy'] = bool(order['isBuy'])
                    
            return order
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid order JSON: {str(e)}")

# Example usage
if __name__ == "__main__":
    # Example order
    example_order = {
        "orderId": 1,
        "owner": "0xF449C755DEc0FA9c655869A3D8D89fb2cCC399e6",
        "token": "0x96c5F50000dE0B12CBa648eAfAab818aBCadAaA4",
        "price": 100000000000000000000,  # 100 tokens (with 18 decimals)
        "size": 10000000000000000000,    # 10 tokens (with 18 decimals)
        "isBuy": True
    }
    
    # Test encoding
    encoded = OrderSerialization.encode_order(example_order)
    print(f"Encoded order: {encoded.hex()}")
    
    # Test decoding
    decoded = OrderSerialization.decode_order(encoded)
    print(f"Decoded order: {decoded}")
    
    # Test client serialization
    json_str = OrderSerialization.serialize_for_client(example_order)
    print(f"JSON: {json_str}")
    
    # Test client deserialization
    from_json = OrderSerialization.deserialize_from_client(json_str)
    print(f"From JSON: {from_json}")
