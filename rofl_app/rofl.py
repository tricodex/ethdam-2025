#!/usr/bin/env python3
# Mock implementation of the ROFL framework functions for testing purposes
# In a real environment, these would be provided by the Oasis ROFL package

import os
import json
import time
import threading
from typing import Callable, Dict, Any

# Global state for testing
_PERIODIC_TASKS = {}
_INSIDE_ROFL = os.environ.get('MOCK_INSIDE_ROFL', 'true').lower() == 'true'
_SECURE_STORAGE = {}
_TEE_MODE = True

class SecureStorage:
    """Mock implementation of secure storage for the ROFL environment"""
    def __init__(self):
        self.storage = {}

    def set(self, key: str, value: str) -> None:
        """Store a key-value pair in the secure storage"""
        self.storage[key] = value

    def get(self, key: str) -> str:
        """Retrieve a value from secure storage by key"""
        return self.storage.get(key)

    def list_keys(self) -> list:
        """List all keys in the secure storage"""
        return list(self.storage.keys())

    def delete(self, key: str) -> None:
        """Delete a key-value pair from the secure storage"""
        if key in self.storage:
            del self.storage[key]

def ensure_inside_rofl() -> None:
    """Ensure that the code is running inside a ROFL environment"""
    if not _INSIDE_ROFL:
        raise EnvironmentError("This code must run inside a ROFL environment")
    return True

def get_secure_storage() -> SecureStorage:
    """Get access to the secure storage provided by the ROFL environment"""
    return SecureStorage()

def decrypt(encrypted_data: str) -> Dict[str, Any]:
    """Mock decryption function that would normally be provided by ROFL"""
    # In a real TEE, this would decrypt using TEE-managed keys
    # For testing and development, we handle different formats
    try:
        print(f"Decrypting data: {encrypted_data[:100]}...")
        
        # Handle hex-encoded data (starting with 0x)
        if isinstance(encrypted_data, str) and encrypted_data.startswith('0x'):
            # Remove 0x prefix and convert hex to string
            hex_data = encrypted_data[2:]
            try:
                # Convert hex to bytes and then to string
                json_str = bytes.fromhex(hex_data).decode('utf-8')
                print(f"Decoded from hex: {json_str}")
                return json.loads(json_str)
            except Exception as e:
                print(f"Error decoding hex data: {str(e)}")
        
        # Handle direct JSON string
        if isinstance(encrypted_data, str):
            return json.loads(encrypted_data)
        
        # Handle direct dictionary
        if isinstance(encrypted_data, dict):
            return encrypted_data
            
        # Fallback: return the data as is
        return encrypted_data
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        # For testing, if not JSON, treat it as a simple encoded object
        return {
            "orderId": 0,
            "owner": "0x0000000000000000000000000000000000000000",
            "isBuy": True,
            "price": 100,
            "size": 1,
            "token": "0x0000000000000000000000000000000000000000"
        }
    except Exception as e:
        print(f"Unexpected error in decrypt: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return a fallback object
        return {
            "orderId": 0,
            "owner": "0x0000000000000000000000000000000000000000",
            "isBuy": True,
            "price": 100,
            "size": 1,
            "token": "0x0000000000000000000000000000000000000000"
        }

def sign_with_tee_key(message: str) -> str:
    """Mock signing function that would normally be provided by ROFL"""
    # In a real TEE, this would sign with the TEE's private key
    # For testing, we just return a dummy signature
    return f"tee_signature_{hash(message)}"

def register_periodic_task(func: Callable, interval_seconds: int) -> None:
    """Register a function to be called periodically"""
    if not callable(func):
        raise TypeError("Task must be callable")
    
    if interval_seconds <= 0:
        raise ValueError("Interval must be positive")
    
    task_id = id(func)
    _PERIODIC_TASKS[task_id] = {
        "func": func,
        "interval": interval_seconds,
        "last_run": time.time(),
        "active": True
    }
    
    def task_runner():
        while _PERIODIC_TASKS.get(task_id, {}).get("active", False):
            now = time.time()
            last_run = _PERIODIC_TASKS[task_id]["last_run"]
            interval = _PERIODIC_TASKS[task_id]["interval"]
            
            if now - last_run >= interval:
                try:
                    func()
                    _PERIODIC_TASKS[task_id]["last_run"] = time.time()
                except Exception as e:
                    print(f"Error in periodic task: {str(e)}")
            
            # Sleep a bit to avoid busy waiting
            time.sleep(min(1, interval / 10))
    
    thread = threading.Thread(target=task_runner, daemon=True)
    thread.start()
    _PERIODIC_TASKS[task_id]["thread"] = thread
    
    return task_id

def get_contract(contract_address: str, contract_abi: list, web3_provider) -> Any:
    """Get a contract instance for interacting with smart contracts"""
    # In a real ROFL app, this would create a Web3 contract instance
    # For testing, return a mock object
    class MockContract:
        def __init__(self, address, abi):
            self.address = address
            self.abi = abi
            self.functions = MockFunctions()
            
    class MockFunctions:
        def __getattr__(self, name):
            return lambda *args, **kwargs: MockContractFunction()
            
    class MockContractFunction:
        def call(self, *args, **kwargs):
            return ["mock_data"]
            
        def build_transaction(self, *args, **kwargs):
            return {"mock": "transaction"}
    
    return MockContract(contract_address, contract_abi)

def stop_periodic_task(task_id):
    """Stop a registered periodic task"""
    if task_id in _PERIODIC_TASKS:
        _PERIODIC_TASKS[task_id]["active"] = False
        return True
    return False

def set_mock_inside_rofl(value: bool) -> None:
    """For testing: set whether we're considered inside a ROFL environment"""
    global _INSIDE_ROFL
    _INSIDE_ROFL = value
