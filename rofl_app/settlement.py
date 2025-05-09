#!/usr/bin/env python3
# Settlement engine for the ROFLSwap ROFL application

import json
import time
from web3 import Web3
from rofl import ensure_inside_rofl, get_contract, sign_with_tee_key

# Ensure this code runs in a TEE
ensure_inside_rofl()

class SettlementEngine:
    def __init__(self, roflswap_address, web3_provider, private_key):
        """Initialize the settlement engine with the ROFLSwap contract address"""
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        
        # Load contract ABI
        with open('abi/ROFLSwap.json', 'r') as f:
            roflswap_abi = json.load(f)
        
        # Convert contract address to checksum address
        self.roflswap_address = Web3.to_checksum_address(roflswap_address)
        
        self.roflswap = self.web3.eth.contract(
            address=self.roflswap_address,
            abi=roflswap_abi
        )
        
        # The private key used for signing transactions
        # In a real ROFL app, this would be managed by the TEE
        self.private_key = private_key
        
        # Get the account address from the private key
        self.account = self.web3.eth.account.from_key(private_key).address
        print(f"Settlement engine initialized with account: {self.account}")
    
    def execute_matches(self, matches):
        """Execute the matched orders by calling the contract"""
        results = []
        
        for match in matches:
            try:
                print(f"\nExecuting match: Buy order {match['buyOrderId']} with Sell order {match['sellOrderId']}")
                
                # Convert address and numeric types properly
                buyer_address = Web3.to_checksum_address(match['buyerAddress'])
                seller_address = Web3.to_checksum_address(match['sellerAddress'])
                buy_token = Web3.to_checksum_address(match['buyToken'])
                sell_token = Web3.to_checksum_address(match['sellToken'])
                amount = int(match['amount'])
                price = int(match['price'])
                
                print(f"Match details:")
                print(f"- Buy order ID: {match['buyOrderId']}")
                print(f"- Sell order ID: {match['sellOrderId']}")
                print(f"- Buyer address: {buyer_address}")
                print(f"- Seller address: {seller_address}")
                print(f"- Amount: {amount}")
                print(f"- Price: {price}")
                print(f"- Buy token: {buy_token}")
                print(f"- Sell token: {sell_token}")
                
                # Get current gas price with a small increase
                gas_price = int(self.web3.eth.gas_price * 1.1)
                
                # Prepare the transaction
                tx = self.roflswap.functions.executeMatch(
                    int(match['buyOrderId']),
                    int(match['sellOrderId']),
                    buyer_address,
                    seller_address,
                    amount,
                    price,
                    buy_token,
                    sell_token
                ).build_transaction({
                    'from': self.account,
                    'nonce': self.web3.eth.get_transaction_count(self.account),
                    'gas': 700000,
                    'gasPrice': gas_price
                })
                
                print(f"Transaction prepared: {tx}")
                
                # Sign the transaction
                signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
                
                # Send the transaction
                tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
                tx_hash_hex = tx_hash.hex()
                print(f"Transaction sent: {tx_hash_hex}")
                
                # Wait for the transaction to be mined
                print(f"Waiting for transaction confirmation...")
                receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                
                if receipt.status == 1:
                    print(f"Transaction successful! Block: {receipt.blockNumber}, Gas used: {receipt.gasUsed}")
                else:
                    print(f"Transaction failed! Block: {receipt.blockNumber}, Gas used: {receipt.gasUsed}")
                
                results.append({
                    'success': receipt.status == 1,
                    'txHash': tx_hash_hex,
                    'match': match,
                    'receipt': {
                        'blockNumber': receipt.blockNumber,
                        'gasUsed': receipt.gasUsed,
                        'status': receipt.status
                    }
                })
                
            except Exception as e:
                print(f"Error executing match: {str(e)}")
                import traceback
                traceback.print_exc()
                results.append({
                    'success': False,
                    'error': str(e),
                    'match': match
                })
        
        return results