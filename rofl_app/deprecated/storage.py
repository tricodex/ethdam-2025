#!/usr/bin/env python3
# Storage utilities for the ROFLSwap ROFL application

import json
import os

class OrderStorage:
    def __init__(self, storage_dir="./storage"):
        """Initialize the storage system with a directory"""
        self.storage_dir = storage_dir
        # Create storage directory if it doesn't exist
        os.makedirs(self.storage_dir, exist_ok=True)
    
    def save_order(self, order_id, order_data):
        """Save an order to secure storage"""
        key = f"order:{order_id}"
        self._set(key, json.dumps(order_data))
        print(f"Saved order {order_id} to storage")
    
    def get_order(self, order_id):
        """Retrieve an order from storage"""
        key = f"order:{order_id}"
        order_json = self._get(key)
        if order_json:
            return json.loads(order_json)
        return None
    
    def list_orders(self):
        """List all saved orders"""
        orders = []
        keys = self._list_keys()
        for key in keys:
            if key.startswith("order:"):
                order_id = key.split(":", 1)[1]
                orders.append(order_id)
        return orders
    
    def save_match(self, match_data):
        """Save a match to storage"""
        match_id = f"{match_data['buyOrderId']}_{match_data['sellOrderId']}"
        key = f"match:{match_id}"
        self._set(key, json.dumps(match_data))
        print(f"Saved match {match_id} to storage")
    
    def save_matches(self, matches):
        """Save multiple matches to storage"""
        for match in matches:
            self.save_match(match)
    
    def get_matches(self):
        """Get all matches from storage"""
        matches = []
        keys = self._list_keys()
        for key in keys:
            if key.startswith("match:"):
                match_json = self._get(key)
                if match_json:
                    matches.append(json.loads(match_json))
        return matches
    
    # Private storage methods
    def _get(self, key):
        """Get a value from storage"""
        file_path = os.path.join(self.storage_dir, f"{key}.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r') as f:
                    return f.read()
            except Exception as e:
                print(f"Error reading from storage: {str(e)}")
        return None
    
    def _set(self, key, value):
        """Set a value in storage"""
        file_path = os.path.join(self.storage_dir, f"{key}.json")
        try:
            with open(file_path, 'w') as f:
                f.write(value)
            return True
        except Exception as e:
            print(f"Error writing to storage: {str(e)}")
            return False
    
    def _list_keys(self):
        """List all keys in storage"""
        keys = []
        for file_name in os.listdir(self.storage_dir):
            if file_name.endswith('.json'):
                keys.append(file_name[:-5])  # Remove .json extension
        return keys