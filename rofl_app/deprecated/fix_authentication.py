#!/usr/bin/env python3
"""
Fix the ROFL app authentication issue with ROFLSwapV5 contract.

This script explores different formats and approaches for the ROFL app ID 
authentication to find the right method that resolves the 0x6890282f error.
"""

import os
import sys
import json
import base64
import binascii
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from eth_account.messages import encode_defunct

# Define constants
RPC_URL = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
CONTRACT_ADDRESS = os.environ.get('ROFLSWAP_ADDRESS', '0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB')
APP_ID = os.environ.get('ROFL_APP_ID', 'rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972')
PRIVATE_KEY = os.environ.get('PRIVATE_KEY') or os.environ.get('MATCHER_PRIVATE_KEY')

# Minimal ABI for testing
ROFLSWAP_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
        "name": "getEncryptedOrder",
        "outputs": [{"internalType": "bytes", "name": "", "type": "bytes"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
        "name": "orderExists",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def create_web3_with_auth(auth_method, private_key, app_id):
    """Create a web3 instance with the specified authentication method."""
    web3 = Web3(Web3.HTTPProvider(RPC_URL))
    web3.middleware_onion.inject(geth_poa_middleware, layer=0)
    
    # Configure account
    account = Account.from_key(private_key)
    web3.eth.default_account = account.address
    
    # Different authentication methods
    headers = {}
    
    if auth_method == "standard":
        headers = {
            'X-ROFL-App-Id': app_id
        }
    elif auth_method == "bytes21":
        # Convert to bytes21 format - first 21 bytes of the app_id
        app_id_bytes = app_id.encode('utf-8')
        bytes21 = app_id_bytes[:21]
        headers = {
            'X-ROFL-App-Id': base64.b64encode(bytes21).decode('utf-8')
        }
    elif auth_method == "hex":
        headers = {
            'X-ROFL-App-Id': app_id.encode('utf-8').hex()
        }
    elif auth_method == "signed":
        # Sign the app_id with the private key
        message = encode_defunct(text=app_id)
        signed = Account.sign_message(message, private_key)
        headers = {
            'X-ROFL-App-Id': app_id,
            'X-ROFL-Signature': signed.signature.hex()
        }
    elif auth_method == "debug":
        # Create a debug version with multiple formats of the app ID
        app_id_bytes = app_id.encode('utf-8')
        headers = {
            'X-ROFL-App-Id': app_id,
            'X-ROFL-App-Id-Hex': app_id_bytes.hex(),
            'X-ROFL-App-Id-B64': base64.b64encode(app_id_bytes).decode('utf-8'),
            'X-ROFL-App-Id-Bytes21': base64.b64encode(app_id_bytes[:21]).decode('utf-8'),
            'X-ROFL-Account': account.address,
        }
    
    # Add custom headers
    if hasattr(web3.provider, "session"):
        web3.provider.session.headers.update(headers)
    
    return web3, headers, account.address

def test_authentication(auth_method):
    """Test a specific authentication method against the contract."""
    if not PRIVATE_KEY:
        print("ERROR: PRIVATE_KEY or MATCHER_PRIVATE_KEY environment variable must be set")
        return False
    
    print(f"\n=== Testing Authentication Method: {auth_method} ===")
    web3, headers, account = create_web3_with_auth(auth_method, PRIVATE_KEY, APP_ID)
    
    print(f"Connected to Sapphire network: {web3.is_connected()}")
    print(f"Account: {account}")
    print(f"Authentication Headers: {json.dumps(headers, indent=2)}")
    
    # Connect to contract
    contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=ROFLSWAP_ABI)
    
    # Test function that doesn't require authentication
    try:
        exists = contract.functions.orderExists(1).call()
        print(f"orderExists(1) = {exists} - ✅ Success")
    except Exception as e:
        print(f"orderExists(1) - ❌ Error: {str(e)}")
        return False
    
    # Test function that requires authentication
    try:
        encrypted_order = contract.functions.getEncryptedOrder(1).call()
        print(f"getEncryptedOrder(1) = {encrypted_order[:10].hex()}... - ✅ Success")
        print("\n✅ AUTHENTICATION SUCCESSFUL! This method works.")
        
        # Save the working method to a configuration file
        with open('auth_config.json', 'w') as f:
            json.dump({
                'auth_method': auth_method,
                'headers': headers,
                'account': account
            }, f, indent=2)
        print(f"Saved successful configuration to auth_config.json")
        
        return True
    except Exception as e:
        error_str = str(e)
        if "0x6890282f" in error_str:
            print(f"getEncryptedOrder(1) - ❌ Authentication Error: 0x6890282f")
        else:
            print(f"getEncryptedOrder(1) - ❌ Error: {error_str}")
    
    return False

def fix_sapphire_wrapper():
    """Create an improved sapphire_wrapper.py file if successful authentication is found."""
    print("\n=== Updating sapphire_wrapper.py ===")
    
    if not os.path.exists('auth_config.json'):
        print("No successful authentication method found. Cannot update sapphire_wrapper.py.")
        return False
    
    try:
        with open('auth_config.json', 'r') as f:
            config = json.load(f)
        
        # Back up the original file
        if os.path.exists('sapphire_wrapper.py'):
            with open('sapphire_wrapper.py', 'r') as f:
                original = f.read()
            with open('sapphire_wrapper.py.bak', 'w') as f:
                f.write(original)
            print("Backed up original sapphire_wrapper.py to sapphire_wrapper.py.bak")
        
        # Create the improved wrapper
        improved_wrapper = f"""#!/usr/bin/env python3
\"\"\"
Improved wrapper for Sapphire network integration with Web3
\"\"\"

import os
import base64
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
    \"\"\"
    Create a web3 instance configured for Sapphire network
    
    Args:
        rpc_url: URL of the Sapphire RPC endpoint
        private_key: Private key for signing transactions
        app_id: ROFL app ID for authentication (optional)
        
    Returns:
        Web3 instance configured for Sapphire
    \"\"\"
    # Create Web3 provider
    web3 = Web3(Web3.HTTPProvider(rpc_url))
    
    # Add PoA middleware for Sapphire consensus
    web3.middleware_onion.inject(geth_poa_middleware, layer=0)
    
    # Configure account from private key
    account = Account.from_key(private_key)
    web3.eth.default_account = account.address
    
    # Add authentication headers for Sapphire confidentiality
    if app_id:
        # Use the authentication method that works with ROFLSwapV5
        # (Found through testing with fix_authentication.py)
        auth_method = "{config['auth_method']}"
        headers = {{}}
        
        if auth_method == "standard":
            headers = {{
                'X-ROFL-App-Id': app_id
            }}
        elif auth_method == "bytes21":
            # Convert to bytes21 format
            app_id_bytes = app_id.encode('utf-8')
            bytes21 = app_id_bytes[:21]
            headers = {{
                'X-ROFL-App-Id': base64.b64encode(bytes21).decode('utf-8')
            }}
        elif auth_method == "hex":
            headers = {{
                'X-ROFL-App-Id': app_id.encode('utf-8').hex()
            }}
        elif auth_method == "signed":
            # Sign the app_id with the private key
            from eth_account.messages import encode_defunct
            message = encode_defunct(text=app_id)
            signed = Account.sign_message(message, private_key)
            headers = {{
                'X-ROFL-App-Id': app_id,
                'X-ROFL-Signature': signed.signature.hex()
            }}
        elif auth_method == "debug":
            # Multiple formats for debugging
            app_id_bytes = app_id.encode('utf-8')
            headers = {{
                'X-ROFL-App-Id': app_id,
                'X-ROFL-App-Id-Hex': app_id_bytes.hex(),
                'X-ROFL-App-Id-B64': base64.b64encode(app_id_bytes).decode('utf-8'),
                'X-ROFL-App-Id-Bytes21': base64.b64encode(app_id_bytes[:21]).decode('utf-8'),
                'X-ROFL-Account': account.address,
            }}
        
        # Add custom header to the provider
        if hasattr(web3.provider, "session"):
            web3.provider.session.headers.update(headers)
    
    # Print connection status
    print(f"Connected to Sapphire network: {{web3.is_connected()}}")
    print(f"Using account: {{web3.eth.default_account}}")
    if app_id:
        print(f"Authenticated with ROFL App ID: {{app_id}}")
    
    return web3

# Example usage
if __name__ == "__main__":
    # Get configuration from environment variables
    rpc_url = os.environ.get('WEB3_PROVIDER', 'https://testnet.sapphire.oasis.io')
    private_key = os.environ.get('PRIVATE_KEY') or os.environ.get('MATCHER_PRIVATE_KEY')
    app_id = os.environ.get('ROFL_APP_ID', 'rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972')
    
    if not private_key:
        print("PRIVATE_KEY or MATCHER_PRIVATE_KEY environment variable must be set")
    else:
        # Create web3 instance
        web3 = create_sapphire_web3(rpc_url, private_key, app_id)
        
        # Test connection
        print(f"Connected to chain ID: {{web3.eth.chain_id}}")
        print(f"Current block number: {{web3.eth.block_number}}")
"""
        
        # Write the improved wrapper
        with open('sapphire_wrapper.py', 'w') as f:
            f.write(improved_wrapper)
        
        print("✅ Successfully updated sapphire_wrapper.py with the working authentication method")
        return True
        
    except Exception as e:
        print(f"Error updating sapphire_wrapper.py: {str(e)}")
        return False

def main():
    if not PRIVATE_KEY:
        print("ERROR: PRIVATE_KEY or MATCHER_PRIVATE_KEY environment variable must be set")
        sys.exit(1)
    
    print("Trying to solve the ROFL authentication issue with ROFLSwapV5...")
    print(f"Contract Address: {CONTRACT_ADDRESS}")
    print(f"ROFL App ID: {APP_ID}")
    
    # Try different authentication methods until one works
    methods = ["standard", "bytes21", "hex", "signed", "debug"]
    success = False
    
    for method in methods:
        if test_authentication(method):
            success = True
            break
    
    if success:
        print("\n✅ Authentication fixed successfully!")
        
        # Update the sapphire_wrapper.py file
        fix_sapphire_wrapper()
        
        print("\nTo test the matcher with the fixed authentication:")
        print("1. Run the matcher: python main.py --once")
    else:
        print("\n❌ All authentication methods failed.")
        print("This could be due to:")
        print("1. The private key account doesn't have proper permissions in the ROFL app")
        print("2. The contract's authentication mechanism is using a different format entirely")
        print("3. The contract may need to be redeployed with the correct app ID")

if __name__ == "__main__":
    main() 