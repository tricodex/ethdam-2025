#!/usr/bin/env python3
# Tests for the OrderStorage class in storage.py

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl
import storage

class TestOrderStorage(unittest.TestCase):
    def setUp(self):
        """Set up test environment before each test"""
        # Ensure we're in ROFL mode for testing
        rofl.set_mock_inside_rofl(True)
        
        # Create a fresh storage instance for each test
        self.storage = storage.OrderStorage()
        
        # Sample order data
        self.sample_order = {
            "orderId": 1,
            "owner": "0xuser1",
            "isBuy": True,
            "price": 100,
            "size": 10,
            "token": "0xtoken1"
        }
        
        # Sample match data
        self.sample_match = {
            "buyOrderId": 1,
            "sellOrderId": 2,
            "buyerAddress": "0xuser1",
            "sellerAddress": "0xuser2",
            "amount": 5,
            "price": 100,
            "buyToken": "0xtoken1",
            "sellToken": "0xtoken2",
            "success": True,
            "txHash": "0xhash1"
        }

    def test_save_and_get_order(self):
        """Test saving and retrieving an order"""
        self.storage.save_order(1, self.sample_order)
        retrieved_order = self.storage.get_order(1)
        self.assertEqual(retrieved_order, self.sample_order)
        
        # Test getting non-existent order
        self.assertIsNone(self.storage.get_order(999))

    def test_list_orders(self):
        """Test listing all saved orders"""
        # Save a few orders
        self.storage.save_order(1, self.sample_order)
        
        sample_order2 = self.sample_order.copy()
        sample_order2["orderId"] = 2
        self.storage.save_order(2, sample_order2)
        
        # List orders
        orders = self.storage.list_orders()
        self.assertEqual(len(orders), 2)
        self.assertIn("1", orders)
        self.assertIn("2", orders)

    def test_save_and_get_match(self):
        """Test saving and retrieving matches"""
        # Save a match
        self.storage.save_match(self.sample_match)
        
        # Get all matches
        matches = self.storage.get_matches()
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0]["buyOrderId"], 1)
        self.assertEqual(matches[0]["sellOrderId"], 2)

    def test_save_multiple_matches(self):
        """Test saving multiple matches at once"""
        sample_match2 = self.sample_match.copy()
        sample_match2["buyOrderId"] = 3
        sample_match2["sellOrderId"] = 4
        
        # Save multiple matches
        self.storage.save_matches([self.sample_match, sample_match2])
        
        # Check they were all saved
        matches = self.storage.get_matches()
        self.assertEqual(len(matches), 2)
        
        # Check match IDs
        match_ids = [(m["buyOrderId"], m["sellOrderId"]) for m in matches]
        self.assertIn((1, 2), match_ids)
        self.assertIn((3, 4), match_ids)

if __name__ == "__main__":
    unittest.main() 