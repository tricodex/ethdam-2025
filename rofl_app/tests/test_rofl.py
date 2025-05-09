#!/usr/bin/env python3
# Tests for the ROFL framework mock implementation

import os
import sys
import time
import json
import unittest
from unittest.mock import patch, MagicMock

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import rofl

class TestRoflFramework(unittest.TestCase):
    def test_ensure_inside_rofl_success(self):
        """Test ensure_inside_rofl when inside ROFL"""
        # Force inside ROFL to be true
        rofl._INSIDE_ROFL = True
        self.assertTrue(rofl.ensure_inside_rofl())

    def test_ensure_inside_rofl_failure(self):
        """Test ensure_inside_rofl when not inside ROFL"""
        # Force inside ROFL to be false
        rofl._INSIDE_ROFL = False
        with self.assertRaises(EnvironmentError):
            rofl.ensure_inside_rofl()
        
        # Reset to default for other tests
        rofl._INSIDE_ROFL = True

    def test_secure_storage(self):
        """Test secure storage operations"""
        storage = rofl.get_secure_storage()
        
        # Test set and get
        storage.set("test_key", "test_value")
        self.assertEqual(storage.get("test_key"), "test_value")
        
        # Test listing keys
        self.assertIn("test_key", storage.list_keys())
        
        # Test delete
        storage.delete("test_key")
        self.assertIsNone(storage.get("test_key"))
        self.assertNotIn("test_key", storage.list_keys())

    def test_decrypt(self):
        """Test the decrypt function"""
        # Test with a valid JSON string
        encrypted_data = json.dumps({"test": "data"})
        decrypted = rofl.decrypt(encrypted_data)
        self.assertEqual(decrypted, {"test": "data"})
        
        # Test with non-JSON string
        decrypted = rofl.decrypt("not_json")
        self.assertTrue(isinstance(decrypted, dict))
        self.assertIn("orderId", decrypted)

    def test_sign_with_tee_key(self):
        """Test the TEE signing function"""
        signature = rofl.sign_with_tee_key("test_message")
        self.assertTrue(signature.startswith("tee_signature_"))
        
        # Same message should produce same signature
        signature2 = rofl.sign_with_tee_key("test_message")
        self.assertEqual(signature, signature2)
        
        # Different message should produce different signature
        signature3 = rofl.sign_with_tee_key("different_message")
        self.assertNotEqual(signature, signature3)

    def test_register_periodic_task(self):
        """Test registering a periodic task"""
        test_counter = {"count": 0}
        
        def test_task():
            test_counter["count"] += 1
        
        # Test with invalid inputs
        with self.assertRaises(TypeError):
            rofl.register_periodic_task("not_callable", 1)
            
        with self.assertRaises(ValueError):
            rofl.register_periodic_task(test_task, 0)
            
        with self.assertRaises(ValueError):
            rofl.register_periodic_task(test_task, -1)
        
        # Test with valid input
        task_id = rofl.register_periodic_task(test_task, 0.1)
        self.assertIn(task_id, rofl._PERIODIC_TASKS)
        
        # Wait for it to execute at least once
        time.sleep(0.2)
        self.assertGreater(test_counter["count"], 0)
        
        # Stop the task
        self.assertTrue(rofl.stop_periodic_task(task_id))
        initial_count = test_counter["count"]
        
        # Wait and verify it doesn't execute again
        time.sleep(0.2)
        self.assertEqual(test_counter["count"], initial_count)

    def test_get_contract(self):
        """Test get_contract function"""
        contract = rofl.get_contract("0x123", [], "provider")
        self.assertEqual(contract.address, "0x123")
        
        # Test function call mocking
        result = contract.functions.someFunction().call()
        self.assertEqual(result, ["mock_data"])
        
        # Test transaction building
        tx = contract.functions.someFunction().build_transaction({})
        self.assertEqual(tx, {"mock": "transaction"})

    def test_environmental_control(self):
        """Test the environmental control functions"""
        original_value = rofl._INSIDE_ROFL
        
        # Test setting it to False
        rofl.set_mock_inside_rofl(False)
        self.assertFalse(rofl._INSIDE_ROFL)
        
        # Test setting it back to True
        rofl.set_mock_inside_rofl(True)
        self.assertTrue(rofl._INSIDE_ROFL)
        
        # Restore original value
        rofl._INSIDE_ROFL = original_value

if __name__ == "__main__":
    unittest.main() 