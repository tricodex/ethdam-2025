#!/usr/bin/env python3
# Settlement processor for executing matches on the ROFLSwapV5 contract with PrivateERC20 support

import os
import json
from web3 import Web3
from web3.exceptions import ContractLogicError
from eth_account import Account
from sapphire_wrapper import create_sapphire_web3

class SettlementProcessorV5:
    def __init__(self, roflswap_address, web3_provider):
        # Get private key from environment
        self.private_key = os.environ.get('MATCHER_PRIVATE_KEY') or os.environ.get('PRIVATE_KEY')
        if not self.private_key:
            raise ValueError("MATCHER_PRIVATE_KEY or PRIVATE_KEY environment variable must be set")
            
        # Get ROFL app ID
        self.rofl_app_id = os.environ.get('ROFL_APP_ID', 'rofl1qqxpkwggyjaw6du7c2vzgdggwhjvjqp9tvqzkag3')
        print(f"Using ROFL App ID: {self.rofl_app_id}")
        
        # Create authenticated web3 provider
        self.web3 = create_sapphire_web3(
            rpc_url=web3_provider,
            private_key=self.private_key,
            app_id=self.rofl_app_id
        )
        
        # Create account
        self.account = Account.from_key(self.private_key)
        print(f"Settlement processor initialized with account {self.account.address}")
        
        # Load contract ABI
        try:
            with open('abi/ROFLSwapV5.json', 'r') as f:
                contract_json = json.load(f)
                roflswap_abi = contract_json['abi']
        except FileNotFoundError:
            try:
                # Fall back to V4 ABI
                with open('abi/ROFLSwapV4.json', 'r') as f:
                    contract_json = json.load(f)
                    roflswap_abi = contract_json['abi']
                    print("Warning: Using V4 ABI as fallback. Some features may be limited.")
            except FileNotFoundError:
                raise FileNotFoundError("Could not find ROFLSwap ABI file (V4 or V5)")
        
        # Load PrivateERC20 ABI for token interaction
        try:
            with open('abi/PrivateERC20.json', 'r') as f:
                token_json = json.load(f)
                self.token_abi = token_json['abi']
        except Exception as e:
            print(f"Warning: Could not load PrivateERC20 ABI: {e}")
            self.token_abi = None
        
        # Setup contract
        self.roflswap_address = roflswap_address
        self.roflswap = self.web3.eth.contract(address=roflswap_address, abi=roflswap_abi)
        
    def check_token_approval(self, token_address, buyer_address, amount):
        """
        Check if the buyer has given the ROFLSwap contract approval to spend tokens
        
        Args:
            token_address: Address of the token contract
            buyer_address: Address of the buyer
            amount: Amount to be transferred
            
        Returns:
            (bool, int): Tuple of (has_sufficient_approval, current_allowance)
        """
        if not self.token_abi:
            print("PrivateERC20 ABI not loaded, skipping approval check")
            return (False, 0)
            
        token = self.web3.eth.contract(address=token_address, abi=self.token_abi)
        
        try:
            allowance = token.functions.allowance(
                buyer_address, 
                self.roflswap_address
            ).call()
            
            return (allowance >= amount, allowance)
        except Exception as e:
            print(f"Error checking token approval: {str(e)}")
            return (False, 0)
            
    def execute_match(self, match):
        """Execute a single match on the contract"""
        print(f"Executing match: Buy #{match['buy_order_id']} with Sell #{match['sell_order_id']}")
        
        # First check if the buyer has approved enough tokens
        has_approval, allowance = self.check_token_approval(
            match['token'],
            match['buy_owner'],
            match['size']
        )
        
        if not has_approval:
            print(f"WARNING: Buyer {match['buy_owner']} has not approved enough tokens!")
            print(f"Current allowance: {allowance}, required: {match['size']}")
            print("The transaction will likely fail - check token approvals first")
        
        try:
            # Get latest nonce
            nonce = self.web3.eth.get_transaction_count(self.account.address)
            
            # Estimate gas for the transaction
            gas_estimate = self.roflswap.functions.executeMatch(
                int(match['buy_order_id']),
                int(match['sell_order_id']),
                match['buy_owner'],
                match['sell_owner'],
                int(match['size']),
                int(match['price'])
            ).estimate_gas({'from': self.account.address})
            
            # Add 50% buffer to gas estimate
            gas_limit = int(gas_estimate * 1.5)
            print(f"Gas estimate: {gas_estimate}, using gas limit: {gas_limit}")
            
            # Send the transaction
            tx = self.roflswap.functions.executeMatch(
                int(match['buy_order_id']),
                int(match['sell_order_id']),
                match['buy_owner'],
                match['sell_owner'],
                int(match['size']),
                int(match['price'])
            ).build_transaction({
                'from': self.account.address,
                'gas': gas_limit,
                'nonce': nonce,
                'chainId': self.web3.eth.chain_id,
                'gasPrice': self.web3.eth.gas_price
            })
            
            # Sign and send the transaction
            signed_tx = self.web3.eth.account.sign_transaction(tx, private_key=self.private_key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.rawTransaction)
            
            # Wait for transaction receipt
            tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
            
            # Check for successful execution
            success = tx_receipt.status == 1
            
            result = {
                'buy_order_id': match['buy_order_id'],
                'sell_order_id': match['sell_order_id'],
                'size': match['size'],
                'txHash': tx_hash.hex(),
                'success': success,
                'gasUsed': tx_receipt.gasUsed,
                'error': None
            }
            
            if success:
                print(f"Match executed successfully. Tx hash: {tx_hash.hex()}")
            else:
                print(f"Match execution failed. Tx hash: {tx_hash.hex()}")
                result['error'] = "Transaction reverted"
            
            return result
            
        except ContractLogicError as e:
            print(f"Contract error executing match: {str(e)}")
            return {
                'buy_order_id': match['buy_order_id'],
                'sell_order_id': match['sell_order_id'],
                'size': match['size'],
                'txHash': None,
                'success': False,
                'gasUsed': 0,
                'error': str(e)
            }
        except Exception as e:
            print(f"Error executing match: {str(e)}")
            return {
                'buy_order_id': match['buy_order_id'],
                'sell_order_id': match['sell_order_id'],
                'size': match['size'],
                'txHash': None,
                'success': False,
                'gasUsed': 0,
                'error': str(e)
            }

# Module-level function to execute multiple matches
def execute_matches(matches, roflswap_address, web3_provider):
    """Execute a list of matches on the ROFLSwapV5 contract"""
    processor = SettlementProcessorV5(roflswap_address, web3_provider)
    results = []
    
    for match in matches:
        try:
            result = processor.execute_match(match)
            results.append(result)
        except Exception as e:
            print(f"Error processing match {match['buy_order_id']}-{match['sell_order_id']}: {str(e)}")
            results.append({
                'buy_order_id': match['buy_order_id'],
                'sell_order_id': match['sell_order_id'],
                'size': match['size'],
                'txHash': None,
                'success': False,
                'gasUsed': 0,
                'error': str(e)
            })
    
    return results