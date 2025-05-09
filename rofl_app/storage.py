#!/usr/bin/env python3
# Storage utilities for the ROFLSwap ROFL application

import json
import os
from rofl import ensure_inside_rofl, get_secure_storage

# Ensure this code runs in a TEE
ensure_inside_rofl()

class OrderStorage:
    def __init__(self):
        """Initialize the storage system"""
        self.storage = get_secure_storage()
    
    def save_order(self, order_id, order_data):
        """Save an order to secure storage"""
        key = f"order:{order_id}"
        self.storage.set(key, json.dumps(order_data))
        print(f"Saved order {order_id} to secure storage")
    
    def get_order(self, order_id):
        """Retrieve an order from secure storage"""
        key = f"order:{order_id}"
        order_json = self.storage.get(key)
        if order_json:
            return json.loads(order_json)
        return None
    
    def list_orders(self):
        """List all saved orders"""
        orders = []
        # This is simplified - real ROFL storage would have proper listing capabilities
        keys = self.storage.list_keys()
        for key in keys:
            if key.startswith("order:"):
                order_id = key.split(":", 1)[1]
                orders.append(order_id)
        return orders
    
    def save_match(self, match_data):
        """Save a match to secure storage"""
        match_id = f"{match_data['buyOrderId']}_{match_data['sellOrderId']}"
        key = f"match:{match_id}"
        self.storage.set(key, json.dumps(match_data))
        print(f"Saved match {match_id} to secure storage")
    
    def save_matches(self, matches):
        """Save multiple matches to secure storage"""
        for match in matches:
            self.save_match(match)
    
    def get_matches(self):
        """Get all matches from secure storage"""
        matches = []
        # This is simplified - real ROFL storage would have proper listing capabilities
        keys = self.storage.list_keys()
        for key in keys:
            if key.startswith("match:"):
                match_json = self.storage.get(key)
                if match_json:
                    matches.append(json.loads(match_json))
        return matches