#!/usr/bin/env python3
"""
Oasis ROFL Integration Module - Proper Implementation

This module provides the actual integration with the Oasis ROFL framework
for production use inside a TEE environment.
"""

import os
import json
import time
import requests
import urllib.parse

# ROFL daemon endpoint (inside the container)
ROFL_APPD_ENDPOINT = "http://unix:/run/rofl-appd.sock:"

def get_app_id():
    """Get the ROFL app ID"""
    try:
        response = requests.get(f"{ROFL_APPD_ENDPOINT}/rofl/v1/app/id")
        return response.text.strip()
    except Exception as e:
        print(f"Error getting app ID: {str(e)}")
        return None

def generate_key(key_id, kind="secp256k1"):
    """Generate a key using the ROFL key management system"""
    try:
        payload = {
            "key_id": key_id,
            "kind": kind
        }
        response = requests.post(
            f"{ROFL_APPD_ENDPOINT}/rofl/v1/keys/generate",
            json=payload
        )
        if response.status_code == 200:
            return response.json().get("key")
        else:
            print(f"Failed to generate key: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error generating key: {str(e)}")
        return None

def sign_submit_transaction(tx_data, to_address, gas_limit=200000, value=0, encrypted=True):
    """Sign and submit a transaction using the ROFL app's authenticated identity"""
    try:
        payload = {
            "tx": {
                "kind": "eth",
                "data": {
                    "gas_limit": gas_limit,
                    "to": to_address.replace("0x", ""),  # Remove 0x prefix if present
                    "value": value,
                    "data": tx_data.replace("0x", "")  # Remove 0x prefix if present
                }
            },
            "encrypted": encrypted
        }
        
        response = requests.post(
            f"{ROFL_APPD_ENDPOINT}/rofl/v1/tx/sign-submit",
            json=payload
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to sign and submit transaction: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Error signing and submitting transaction: {str(e)}")
        return None

def ensure_inside_rofl():
    """Verify that we're running inside a ROFL environment"""
    app_id = get_app_id()
    if not app_id:
        raise EnvironmentError("Not running inside a ROFL environment - app ID not available")
    print(f"Running inside ROFL app: {app_id}")
    return True

def register_periodic_task(func, interval_seconds):
    """
    Register a periodic task to run at specified intervals
    
    Note: In a production ROFL environment, you'd use a proper scheduler or
    implement a loop in your main application.
    """
    import threading
    
    def task_runner():
        while True:
            try:
                func()
            except Exception as e:
                print(f"Error in periodic task: {str(e)}")
            
            time.sleep(interval_seconds)
    
    thread = threading.Thread(target=task_runner, daemon=True)
    thread.start()
    return thread
