#!/usr/bin/env python3
# Local testing script for the ROFLSwap application

import os
import json
from web3 import Web3
from matching_engine import MatchingEngine
from settlement import SettlementEngine
from storage import OrderStorage
import rofl

# Override for local testing
rofl.set_mock_inside_rofl(True)

# Configuration - using test values
ROFLSWAP_ADDRESS = "0x552F5B746097219537F1041aA406c02F3474417A"
WEB3_PROVIDER = "https://testnet.sapphire.oasis.io"
PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001"  # Dummy key for testing

# Set environment variables
os.environ["ROFLSWAP_ADDRESS"] = ROFLSWAP_ADDRESS
os.environ["WEB3_PROVIDER"] = WEB3_PROVIDER
os.environ["PRIVATE_KEY"] = PRIVATE_KEY

print("Initializing local test for ROFLSwap app...")
print(f"ROFLSwap contract address: {ROFLSWAP_ADDRESS}")
print(f"Web3 provider: {WEB3_PROVIDER}")

# Create mock orders
def create_mock_orders():
    print("\nCreating mock orders...")
    
    # Sample tokens
    WATER_TOKEN = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D"
    FIRE_TOKEN = "0xE987534F8E431c2D0F6DDa8D832d8ae622c77814"
    BUYER_ADDRESS = "0x1111111111111111111111111111111111111111"
    SELLER_ADDRESS = "0x2222222222222222222222222222222222222222"
    
    # Create a buy order with proper structure
    buy_order = {
        "token": WATER_TOKEN,
        "price": "20000000000000000",  # 0.02 FIRE per WATER
        "size": "100000000000000000000",  # 100 tokens
        "isBuy": True,
        "owner": BUYER_ADDRESS,
        "orderId": 1
    }
    
    # Create a sell order with proper structure
    sell_order = {
        "token": WATER_TOKEN,
        "price": "20000000000000000",  # 0.02 FIRE per WATER
        "size": "50000000000000000000",  # 50 tokens
        "isBuy": False,
        "owner": SELLER_ADDRESS,
        "orderId": 2
    }
    
    # Create hex-encoded versions for testing the decoder
    buy_order_hex = "0x" + json.dumps(buy_order).encode().hex()
    sell_order_hex = "0x" + json.dumps(sell_order).encode().hex()
    
    print(f"Buy order (JSON): {json.dumps(buy_order)}")
    print(f"Sell order (JSON): {json.dumps(sell_order)}")
    print(f"Buy order (hex): {buy_order_hex[:50]}...")
    print(f"Sell order (hex): {sell_order_hex[:50]}...")
    
    return buy_order_hex, sell_order_hex

# Test the decryption function
def test_decryption(buy_order_hex, sell_order_hex):
    print("\nTesting decryption...")
    
    buy_order = rofl.decrypt(buy_order_hex)
    sell_order = rofl.decrypt(sell_order_hex)
    
    print(f"Decrypted buy order: {buy_order}")
    print(f"Decrypted sell order: {sell_order}")
    
    # Check that all required fields are present
    required_fields = ['token', 'price', 'size', 'isBuy', 'owner']
    
    for field in required_fields:
        if field not in buy_order:
            print(f"ERROR: Buy order missing required field: {field}")
        if field not in sell_order:
            print(f"ERROR: Sell order missing required field: {field}")
    
    return buy_order, sell_order

# Mock contract response for orderCounter
class MockRoflSwap:
    def __init__(self):
        self.functions = self.Functions()
    
    class Functions:
        def orderCounter(self):
            return self.OrderCounter()
        
        class OrderCounter:
            def call(self):
                return 2
        
        def filledOrders(self, order_id):
            return self.FilledOrders()
        
        class FilledOrders:
            def call(self):
                return False
        
        def getEncryptedOrder(self, order_id):
            return self.GetEncryptedOrder(order_id)
        
        class GetEncryptedOrder:
            def __init__(self, order_id):
                self.order_id = order_id
            
            def call(self):
                # Return mock encrypted orders
                if self.order_id == 1:
                    return "0x" + json.dumps({
                        "token": "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D",
                        "price": "20000000000000000",
                        "size": "100000000000000000000",
                        "isBuy": True,
                        "owner": "0x1111111111111111111111111111111111111111"
                    }).encode().hex()
                else:
                    return "0x" + json.dumps({
                        "token": "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D",
                        "price": "20000000000000000",
                        "size": "50000000000000000000",
                        "isBuy": False,
                        "owner": "0x2222222222222222222222222222222222222222"
                    }).encode().hex()

# Test the matching engine
def test_matching_engine():
    print("\nTesting matching engine...")
    
    # Create a matching engine with mock contract
    engine = MatchingEngine(ROFLSWAP_ADDRESS, WEB3_PROVIDER)
    engine.roflswap = MockRoflSwap()
    
    # Load orders
    engine.load_orders()
    
    # Find matches
    matches = engine.find_matches()
    
    print(f"Found {len(matches)} matches")
    for match in matches:
        print(f"Match: Buy #{match['buyOrderId']} with Sell #{match['sellOrderId']}")
        print(f"  Amount: {match['amount']}, Price: {match['price']}")
        print(f"  Buyer: {match['buyerAddress']}, Seller: {match['sellerAddress']}")
    
    return matches

# Main function
def main():
    # Create mock orders
    buy_order_hex, sell_order_hex = create_mock_orders()
    
    # Test decryption
    buy_order, sell_order = test_decryption(buy_order_hex, sell_order_hex)
    
    # Test matching engine
    matches = test_matching_engine()
    
    print("\nLocal testing completed successfully!")

if __name__ == "__main__":
    main() 