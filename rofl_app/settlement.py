#!/usr/bin/env python3
# Settlement engine for the ROFLSwap ROFL application

import json
import time
from web3 import Web3
from rofl_integration import ensure_inside_rofl, sign_submit_transaction

# Ensure this code runs in a TEE
ensure_inside_rofl()

class SettlementEngine:
    def __init__(self, roflswap_address, web3_provider, private_key=None):
        """Initialize the settlement engine with the ROFLSwap contract address"""
        self.web3 = Web3(Web3.HTTPProvider(web3_provider))
        
        # Load contract ABI
        with open('abi/ROFLSwapV3.json', 'r') as f:
            roflswap_abi = json.load(f)
        
        # Convert contract address to checksum address
        self.roflswap_address = Web3.to_checksum_address(roflswap_address)
        
        self.roflswap = self.web3.eth.contract(
            address=self.roflswap_address,
            abi=roflswap_abi
        )
        
        # Private key is no longer needed as we'll use ROFL's transaction signing
        self.private_key = private_key
        
        print(f"Settlement engine initialized with ROFLSwap at: {self.roflswap_address}")
    
    def execute_matches(self, matches):
        """
        Execute the matched orders by calling the contract
        
        Using the ROFL app's authenticated identity instead of a private key.
        """
        results = []
        
        for match in matches:
            try:
                print(f"\nExecuting match: Buy order {match['buyOrderId']} with Sell order {match['sellOrderId']}")
                
                # Convert address and numeric types properly
                buyer_address = Web3.to_checksum_address(match['buyerAddress'])
                seller_address = Web3.to_checksum_address(match['sellerAddress'])
                amount = int(match['amount'])
                price = int(match['price'])
                
                print(f"Match details:")
                print(f"- Buy order ID: {match['buyOrderId']}")
                print(f"- Sell order ID: {match['sellOrderId']}")
                print(f"- Buyer address: {buyer_address}")
                print(f"- Seller address: {seller_address}")
                print(f"- Amount: {amount}")
                print(f"- Price: {price}")
                
                # Create the transaction data using the contract's function encoding
                tx_data = self.roflswap.functions.executeMatch(
                    int(match['buyOrderId']),
                    int(match['sellOrderId']),
                    buyer_address,
                    seller_address,
                    amount,
                    price
                ).build_transaction({'gas': 0, 'gasPrice': 0, 'nonce': 0})['data']
                
                print(f"Transaction data prepared: {tx_data}")
                
                # Use ROFL's authenticated transaction signing and submission
                response = sign_submit_transaction(
                    tx_data=tx_data,
                    to_address=self.roflswap_address,
                    gas_limit=700000,
                    value=0,
                    encrypted=True  # Use end-to-end encryption for the transaction
                )
                
                if response:
                    tx_hash_hex = response.get('hash', 'Unknown')
                    print(f"Transaction successfully submitted: {tx_hash_hex}")
                    
                    # Wait for transaction to be included in a block
                    print(f"Waiting for transaction confirmation...")
                    receipt = None
                    for _ in range(30):  # Try for about 5 minutes (30 x 10 seconds)
                        try:
                            receipt = self.web3.eth.get_transaction_receipt(tx_hash_hex)
                            if receipt:
                                break
                        except Exception as e:
                            print(f"Waiting for receipt: {str(e)}")
                        time.sleep(10)
                    
                    if receipt:
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
                    else:
                        print("Could not get transaction receipt after waiting")
                        results.append({
                            'success': False,
                            'txHash': tx_hash_hex,
                            'match': match,
                            'error': "Transaction not confirmed after waiting"
                        })
                else:
                    print("Failed to submit transaction")
                    results.append({
                        'success': False,
                        'match': match,
                        'error': "Failed to submit transaction"
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
