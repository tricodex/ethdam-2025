
#!/usr/bin/env python3
import os
import sys
import json
from rofl_auth_protocol import RoflProtocol
from rofl_siwe import RoflSiwe
from eth_account import Account

# Set up protocol with MARLIN key
private_key = os.environ.get("MARLIN")
account = Account.from_key(private_key)
protocol = RoflProtocol(is_tee_mode=False, key_id="test-key")
protocol.secret = private_key
protocol.account = account

# Create SIWE token
siwe = RoflSiwe(protocol, "roflswap.oasis.io")
address = "0x9Ac44C807FfcAf3e150e184a06a660EaE5b848C8"
token = siwe.create_auth_token(address)
token_data = json.loads(token.decode('utf-8'))

# Print as JSON
print(json.dumps(token_data))
