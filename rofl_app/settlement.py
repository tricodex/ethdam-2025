#!/usr/bin/env python3
# Settlement engine for the OceanSwap ROFL application

import json
import time
from web3 import Web3
from rofl import ensure_inside_rofl, get_contract, sign_with_tee_key

# Ensure this code runs in a TEE
ensure_inside_rofl()

class SettlementEngine:
    def __init__(self, oceanswap_address, web3_provider, private_key):
        """Initialize the settlement engine with the OceanSwap contract address"""
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        
        # Load contract ABI
        with open('abi/OceanSwap.json', 'r') as f:
            oceanswap_abi = json.load(f)
        
        self.oceanswap = self.web3.eth.contract(
            address=oceanswap_address,
            abi=oceanswap_abi
        )
        
        # The private key used for signing transactions
        # In a real ROFL app, this would be managed by the TEE
        self.private_key = private_key
        
        # Get the account address from the private key
        self.account = self.web3.eth.account.from_key(private_key).address
    
    def execute_matches(self, matches):
        """Execute the matched orders by calling the contract"""
        results = []
        
        for match in matches:
            try:
                print(f"Executing match: Buy order {match['buyOrderId']} with Sell order {match['sellOrderId']}")
                
                # Prepare the transaction
                tx = self.oceanswap.functions.executeMatch(
                    match['buyOrderId'],
                    match['sellOrderId'],
                    match['buyerAddress'],
                    match['sellerAddress'],
                    match['amount'],
                    match['price'],
                    match['buyToken'],
                    match['sellToken']
                ).build_transaction({
                    'from': self.account,
                    'nonce': self.web3.eth.get_transaction_count(self.account),
                    'gas': 500000,
                    'gasPrice': self.web3.eth.gas_price
                })
                
                # Sign the transaction
                # In a real ROFL app, sign_with_tee_key would be used
                signed_tx = self.web3.eth.account.sign_transaction(tx, self.private_key)
                
                # Send the transaction
                tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
                
                # Wait for the transaction to be mined
                receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
                
                results.append({
                    'success': receipt.status == 1,
                    'txHash': tx_hash.hex(),
                    'match': match
                })
                
                print(f"Match executed successfully: {tx_hash.hex()}")
                
            except Exception as e:
                print(f"Error executing match: {str(e)}")
                results.append({
                    'success': False,
                    'error': str(e),
                    'match': match
                })
        
        return results