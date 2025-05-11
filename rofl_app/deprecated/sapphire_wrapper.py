#!/usr/bin/env python3
"""
Wrapper for Sapphire network integration with Web3
"""

import os
from web3 import Web3
# For newer web3.py versions, the middleware is in a different location
# We'll use a try/except approach to handle different web3.py versions
try:
    # Try the standard import path for older versions
    from web3.middleware import geth_poa_middleware
except ImportError:
    try:
        # Try the specific module for newer versions
        from web3.middleware.geth_poa import geth_poa_middleware
    except ImportError:
        # Last resort: Define a simple middleware function
        print("Warning: Could not import geth_poa_middleware, using a placeholder instead.")
        def geth_poa_middleware(make_request, w3):
            def middleware(method, params):
                return make_request(method, params)
            return middleware
from eth_account import Account

def create_sapphire_web3(rpc_url, private_key, app_id=None):
    """
    Create a web3 instance configured for Sapphire network
    
    Args:
        rpc_url: URL of the Sapphire RPC endpoint
        private_key: Private key for signing transactions
        app_id: ROFL app ID for authentication (optional)
        
    Returns:
        Web3 instance configured for Sapphire
    """
    # Create Web3 provider
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    
    # Add PoA middleware for Sapphire consensus
    web3.middleware_onion.inject(geth_poa_middleware, layer=0)
    
    # Configure account from private key
    account = Account.from_key(private_key)
    web3.eth.default_account = account.address
    
    # Add authentication headers for Sapphire confidentiality
    if app_id:
        # For Sapphire ROFL apps, the app_id is used for authentication
        # This header informs the Sapphire RPC that requests should be authenticated
        # with the ROFL app that has the specified ID for roflEnsureAuthorizedOrigin calls
        header = {
            'X-ROFL-App-Id': app_id
        }
        
        # Add custom header to the provider
        if hasattr(web3.provider, "session"):
            web3.provider.session.headers.update(header)
    
    # Print connection status
    print(f"Connected to Sapphire network: {web3.is_connected()}")
    print(f"Using account: {web3.eth.default_account}")
    if app_id:
        print(f"Authenticated with ROFL App ID: {app_id}")
    
    return web3

# Example usage
if __name__ == "__main__":
    # Get configuration from environment variables
    rpc_url = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
    private_key = os.environ.get('PRIVATE_KEY')
    app_id = os.environ.get('ROFL_APP_ID', 'rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972')
    
    if not private_key:
        print("PRIVATE_KEY environment variable must be set")
    else:
        # Create web3 instance
        web3 = create_sapphire_web3(rpc_url, private_key, app_id)
        
        # Test connection
        print(f"Connected to chain ID: {web3.eth.chain_id}")
        print(f"Current block number: {web3.eth.block_number}")
