#!/usr/bin/env python3
"""
ROFLSwap Token Swap Demonstration
=================================

This script demonstrates the token swapping process in the ROFLSwap decentralized exchange.
It visualizes the complete swap flow from approval to transaction confirmation.
"""

import time
import random
import sys
import os
import hashlib
import json
from datetime import datetime
from typing import Dict, List, Tuple, Any
from decimal import Decimal, getcontext

# Set decimal precision
getcontext().prec = 8

# Get environment variables for configuration
DELAY_STEP = float(os.environ.get("ROFLSWAP_DELAY_STEP", "1.0"))

# ANSI color codes for terminal output
class Colors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    
    # Text colors
    BLACK = "\033[30m"
    RED = "\033[31m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    WHITE = "\033[37m"
    
    # Background colors
    BG_BLACK = "\033[40m"
    BG_RED = "\033[41m"
    BG_GREEN = "\033[42m"
    BG_YELLOW = "\033[43m"
    BG_BLUE = "\033[44m"
    BG_MAGENTA = "\033[45m"
    BG_CYAN = "\033[46m"
    BG_WHITE = "\033[47m"

# Token definitions with metadata
TOKENS = {
    "WATER": {
        "address": "0x7e4d12a86e6528f4cEF8C4eCAe16967D257E621a",
        "decimals": 18,
        "color": Colors.BLUE
    },
    "FIRE": {
        "address": "0x4Ea8D10c7F96628C2823E4F7Fa77c384497A3497",
        "decimals": 18,
        "color": Colors.RED
    },
    "EARTH": {
        "address": "0xA9aEe512D3D15984C2d2Cfd99C17A0CCa6428476",
        "decimals": 18,
        "color": Colors.GREEN
    },
    "AIR": {
        "address": "0x1dF6f5E1AE47D6B6a01D7d0F7139Fa1814Ab6b4a",
        "decimals": 18,
        "color": Colors.CYAN
    }
}

# ROFLSwap contract addresses
CONTRACTS = {
    "router": "0x8d12A197cB00D4747a1fe03395095ce2A5CC6819",
    "factory": "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    "oracle": "0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf"
}

def generate_wallet_address():
    """Generate a random Ethereum-like wallet address"""
    return "0x" + "".join(random.choice("0123456789abcdef") for _ in range(40))

def generate_tx_hash():
    """Generate a realistic transaction hash"""
    return "0x" + "".join(random.choice("0123456789abcdef") for _ in range(64))

def format_token_amount(amount, token_symbol):
    """Format token amount with token symbol and color"""
    token_color = TOKENS[token_symbol]["color"]
    return f"{token_color}{amount:.6f} {token_symbol}{Colors.RESET}"

def print_step_header(title):
    """Print a formatted step header"""
    timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    
    width = 80
    padding = (width - len(title)) // 2
    
    print("\n" + "=" * width)
    print(f"{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}{' ' * padding}{title}{' ' * (width - len(title) - padding)}{Colors.RESET}")
    print(f"{Colors.YELLOW}[{timestamp}]{Colors.RESET}")
    print("-" * width)

def print_json(data, indent=2):
    """Print formatted JSON-like data"""
    if isinstance(data, dict):
        for key, value in data.items():
            key_str = f"{Colors.CYAN}{key}{Colors.RESET}"
            if isinstance(value, (dict, list)):
                print(f"{' ' * indent}{key_str}: ")
                print_json(value, indent + 2)
            else:
                if isinstance(value, bool):
                    value_str = f"{Colors.GREEN}{value}{Colors.RESET}" if value else f"{Colors.RED}{value}{Colors.RESET}"
                elif isinstance(value, (int, float, Decimal)):
                    value_str = f"{Colors.YELLOW}{value}{Colors.RESET}"
                elif key.lower() in ["hash", "txhash", "transaction", "transactionhash"]:
                    value_str = f"{Colors.GREEN}{value}{Colors.RESET}"
                elif key.lower() in ["address", "from", "to", "sender", "recipient"]:
                    value_str = f"{Colors.MAGENTA}{value}{Colors.RESET}"
                else:
                    value_str = f"{Colors.WHITE}{value}{Colors.RESET}"
                print(f"{' ' * indent}{key_str}: {value_str}")
    elif isinstance(data, list):
        for i, item in enumerate(data):
            if isinstance(item, (dict, list)):
                print(f"{' ' * indent}[{i}]:")
                print_json(item, indent + 2)
            else:
                print(f"{' ' * indent}[{i}]: {item}")

def loading_animation(duration, message, success_message=None):
    """Display a loading animation"""
    start_time = time.time()
    end_time = start_time + duration
    spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
    i = 0
    
    sys.stdout.write(f"\r{Colors.YELLOW}{spinner[i]}{Colors.RESET} {message}")
    sys.stdout.flush()
    
    while time.time() < end_time:
        time.sleep(0.1)
        i = (i + 1) % len(spinner)
        sys.stdout.write(f"\r{Colors.YELLOW}{spinner[i]}{Colors.RESET} {message}")
        sys.stdout.flush()
    
    if success_message:
        sys.stdout.write(f"\r{Colors.GREEN}✓{Colors.RESET} {success_message}{' ' * 30}\n")
    else:
        sys.stdout.write(f"\r{Colors.GREEN}✓{Colors.RESET} {message}{' ' * 30}\n")
    sys.stdout.flush()

class SwapSimulator:
    """Simulates the token swap process"""
    
    def __init__(self, user_address=None):
        """Initialize the swap simulator"""
        self.user_address = user_address or generate_wallet_address()
        
        # Gas prices
        self.base_fee = random.uniform(20, 40)  # gwei
        self.priority_fee = random.uniform(1, 3)  # gwei
        
        # Token balances
        self.balances = {}
        for token in TOKENS:
            self.balances[token] = float(random.uniform(10, 1000))
    
    def print_wallet_info(self):
        """Print wallet information"""
        print_step_header("WALLET INFORMATION")
        
        print(f"{Colors.BOLD}Address:{Colors.RESET} {Colors.MAGENTA}{self.user_address}{Colors.RESET}")
        print(f"{Colors.BOLD}Network:{Colors.RESET} {Colors.BLUE}Oasis Sapphire{Colors.RESET}")
        print(f"{Colors.BOLD}Chain ID:{Colors.RESET} {Colors.YELLOW}23294{Colors.RESET}")
        
        print(f"\n{Colors.BOLD}Token Balances:{Colors.RESET}")
        for token, balance in self.balances.items():
            token_color = TOKENS[token]["color"]
            print(f"  {token_color}{token}{Colors.RESET}: {Colors.YELLOW}{balance:.6f}{Colors.RESET}")
        
        print(f"\n{Colors.BOLD}Gas Price:{Colors.RESET}")
        print(f"  Base Fee: {Colors.YELLOW}{self.base_fee:.2f}{Colors.RESET} gwei")
        print(f"  Priority Fee: {Colors.YELLOW}{self.priority_fee:.2f}{Colors.RESET} gwei")
        print(f"  Total: {Colors.YELLOW}{self.base_fee + self.priority_fee:.2f}{Colors.RESET} gwei")
    
    def check_token_allowance(self, token_symbol, router_address):
        """Check token allowance for the router"""
        print_step_header("CHECKING TOKEN ALLOWANCE")
        
        token_address = TOKENS[token_symbol]["address"]
        token_color = TOKENS[token_symbol]["color"]
        
        print(f"Checking {token_color}{token_symbol}{Colors.RESET} allowance for router...")
        loading_animation(1.0, "Querying blockchain for allowance data...")
        
        # Simulate allowance check
        is_approved = random.random() > 0.7  # 30% chance of needing approval
        allowance = 0.0 if not is_approved else random.uniform(1000, 10000)
        
        print(f"\n{Colors.BOLD}Allowance Information:{Colors.RESET}")
        print(f"  Token: {token_color}{token_symbol}{Colors.RESET}")
        print(f"  Token Address: {Colors.MAGENTA}{token_address}{Colors.RESET}")
        print(f"  Owner: {Colors.MAGENTA}{self.user_address}{Colors.RESET}")
        print(f"  Spender: {Colors.MAGENTA}{router_address}{Colors.RESET}")
        print(f"  Current Allowance: {Colors.YELLOW}{allowance:.6f}{Colors.RESET}")
        
        if not is_approved:
            print(f"\n{Colors.YELLOW}⚠ Allowance too low for swap. Approval required.{Colors.RESET}")
        else:
            print(f"\n{Colors.GREEN}✓ Sufficient allowance for swap.{Colors.RESET}")
        
        return is_approved, allowance
    
    def approve_token(self, token_symbol, router_address):
        """Approve token for the router"""
        print_step_header("TOKEN APPROVAL")
        
        token_address = TOKENS[token_symbol]["address"]
        token_color = TOKENS[token_symbol]["color"]
        
        # Build approval transaction
        # Max uint256 value
        approval_amount = "115792089237316195423570985008687907853269984665640564039457584007913129639935"
        gas_limit = 60000
        tx_value = 0
        
        tx_data = {
            "from": self.user_address,
            "to": token_address,
            "data": f"0x095ea7b3{router_address[2:].lower().zfill(64)}{hex(int(approval_amount))[2:].zfill(64)}",
            "value": hex(tx_value),
            "gas": hex(gas_limit),
            "gasPrice": hex(int((self.base_fee + self.priority_fee) * 10**9)),
            "chainId": "0x5aee"  # 23294 in hex
        }
        
        print(f"{Colors.BOLD}Approval Transaction:{Colors.RESET}")
        print_json(tx_data)
        
        # Simulate signing the transaction
        print(f"\n{Colors.YELLOW}⏳ Waiting for wallet signature...{Colors.RESET}")
        loading_animation(2.0, "Waiting for user to confirm in wallet...")
        
        # Simulate sending the transaction
        tx_hash = generate_tx_hash()
        print(f"\n{Colors.BOLD}Transaction Submitted:{Colors.RESET}")
        print(f"  Transaction Hash: {Colors.GREEN}{tx_hash}{Colors.RESET}")
        
        # Simulate transaction confirmation
        confirmation_time = random.uniform(2, 5)
        loading_animation(confirmation_time, "Waiting for transaction confirmation...", 
                         f"Transaction confirmed! {token_color}{token_symbol}{Colors.RESET} approved for ROFLSwap Router.")
        
        # Transaction receipt
        block_number = 12345678 + random.randint(1, 1000)
        block_hash = generate_tx_hash()
        receipt = {
            "transactionHash": tx_hash,
            "blockNumber": block_number,
            "blockHash": block_hash,
            "from": self.user_address,
            "to": token_address,
            "gasUsed": random.randint(int(gas_limit * 0.7), gas_limit),
            "status": True,
            "logs": [
                {
                    "address": token_address,
                    "topics": [
                        "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
                        "0x" + self.user_address[2:].lower().zfill(64),
                        "0x" + router_address[2:].lower().zfill(64)
                    ],
                    "data": "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
                }
            ]
        }
        
        print(f"\n{Colors.BOLD}Transaction Receipt:{Colors.RESET}")
        print_json(receipt)
        
        return tx_hash, receipt
    
    def get_swap_quote(self, token_in, token_out, amount_in):
        """Get quote for token swap"""
        print_step_header("SWAP QUOTE")
        
        token_in_data = TOKENS[token_in]
        token_out_data = TOKENS[token_out]
        token_in_color = token_in_data["color"]
        token_out_color = token_out_data["color"]
        
        print(f"Getting quote for {token_in_color}{token_in}{Colors.RESET} to {token_out_color}{token_out}{Colors.RESET} swap...")
        loading_animation(1.5, "Calculating best swap route and price...")
        
        # Calculate simulated price impact and output amount
        base_rates = {
            ("WATER", "FIRE"): 2.4,
            ("FIRE", "WATER"): 0.41,
            ("WATER", "EARTH"): 1.8,
            ("EARTH", "WATER"): 0.55,
            ("WATER", "AIR"): 3.2,
            ("AIR", "WATER"): 0.31,
            ("FIRE", "EARTH"): 0.75,
            ("EARTH", "FIRE"): 1.33,
            ("FIRE", "AIR"): 1.35,
            ("AIR", "FIRE"): 0.74,
            ("EARTH", "AIR"): 1.8,
            ("AIR", "EARTH"): 0.55,
        }
        
        # Get exchange rate
        base_rate = base_rates.get((token_in, token_out), 1.0)
        
        # Randomize the base rate a bit
        rate_with_noise = base_rate * random.uniform(0.97, 1.03)
        
        # Calculate price impact (0.1% to 2% based on size)
        normalized_amount = amount_in / 1000.0
        price_impact = random.uniform(0.001, 0.02) * normalized_amount
        price_impact = min(price_impact, 0.05)  # Cap at 5%
        
        # Calculate output amount with slippage
        amount_out_ideal = amount_in * rate_with_noise
        amount_out = amount_out_ideal * (1.0 - price_impact)
        amount_out_min = amount_out * 0.995  # 0.5% slippage tolerance
        
        # Calculate fee
        swap_fee = amount_in * 0.003  # 0.3% fee
        
        # Display quote information
        print(f"\n{Colors.BOLD}Swap Quote Details:{Colors.RESET}")
        print(f"  Token In: {token_in_color}{token_in}{Colors.RESET} ({Colors.MAGENTA}{token_in_data['address']}{Colors.RESET})")
        print(f"  Token Out: {token_out_color}{token_out}{Colors.RESET} ({Colors.MAGENTA}{token_out_data['address']}{Colors.RESET})")
        print(f"  Amount In: {token_in_color}{amount_in:.6f} {token_in}{Colors.RESET}")
        print(f"  Expected Output: {token_out_color}{amount_out:.6f} {token_out}{Colors.RESET}")
        print(f"  Minimum Output (0.5% slippage): {token_out_color}{amount_out_min:.6f} {token_out}{Colors.RESET}")
        print(f"  Exchange Rate: 1 {token_in} = {rate_with_noise:.6f} {token_out}")
        print(f"  Price Impact: {Colors.YELLOW}{price_impact*100:.2f}%{Colors.RESET}")
        print(f"  Swap Fee: {token_in_color}{swap_fee:.6f} {token_in}{Colors.RESET}")
        
        # Display route information
        print(f"\n{Colors.BOLD}Route Information:{Colors.RESET}")
        
        # Decide if direct swap or through WATER token
        use_direct_path = (token_in, token_out) in [
            ("WATER", "FIRE"), ("FIRE", "WATER"), 
            ("WATER", "EARTH"), ("EARTH", "WATER"),
            ("FIRE", "EARTH"), ("EARTH", "FIRE")
        ]
        
        if use_direct_path:
            print(f"  Direct Swap: {token_in_color}{token_in}{Colors.RESET} → {token_out_color}{token_out}{Colors.RESET}")
            route = [token_in, token_out]
        else:
            print(f"  Route: {token_in_color}{token_in}{Colors.RESET} → {Colors.BLUE}WATER{Colors.RESET} → {token_out_color}{token_out}{Colors.RESET}")
            route = [token_in, "WATER", token_out]
        
        return {
            "amountIn": amount_in,
            "amountOut": amount_out,
            "amountOutMin": amount_out_min,
            "priceImpact": price_impact,
            "fee": swap_fee,
            "route": route
        }
    
    def execute_swap(self, token_in, token_out, amount_in, quote):
        """Execute token swap"""
        print_step_header("EXECUTING SWAP")
        
        token_in_data = TOKENS[token_in]
        token_out_data = TOKENS[token_out]
        token_in_color = token_in_data["color"]
        token_out_color = token_out_data["color"]
        
        router_address = CONTRACTS["router"]
        deadline = int(time.time() + 1200)  # 20 minutes from now
        gas_limit = 180000 + random.randint(0, 50000)  # Base gas + random
        
        # Prepare path for swap
        path = [TOKENS[token]["address"] for token in quote["route"]]
        
        # Build the swap transaction
        tx_data = {
            "from": self.user_address,
            "to": router_address,
            "data": "0x38ed1739" + 
                   # Parameters for swapExactTokensForTokens
                   f"{hex(int(amount_in * 10**18))[2:].zfill(64)}" + 
                   f"{hex(int(quote['amountOutMin'] * 10**18))[2:].zfill(64)}" + 
                   f"{hex(32 * 3)[2:].zfill(64)}" +  # Offset to path array
                   f"{hex(deadline)[2:].zfill(64)}" +
                   f"{hex(len(path))[2:].zfill(64)}" +
                   "".join([addr[2:].zfill(64) for addr in path]),
            "value": "0x0",
            "gas": hex(gas_limit),
            "gasPrice": hex(int((self.base_fee + self.priority_fee) * 10**9)),
            "chainId": "0x5aee"  # 23294 in hex
        }
        
        print(f"{Colors.BOLD}Swap Transaction:{Colors.RESET}")
        print_json(tx_data)
        
        # Simulate signing the transaction
        print(f"\n{Colors.YELLOW}⏳ Waiting for wallet signature...{Colors.RESET}")
        loading_animation(1.5, "Waiting for user to confirm swap in wallet...")
        
        # Simulate sending the transaction
        tx_hash = generate_tx_hash()
        print(f"\n{Colors.BOLD}Transaction Submitted:{Colors.RESET}")
        print(f"  Transaction Hash: {Colors.GREEN}{tx_hash}{Colors.RESET}")
        
        # Simulate transaction confirmation
        confirmation_time = random.uniform(3, 6)
        loading_animation(confirmation_time, "Waiting for swap confirmation...", 
                         f"Swap confirmed! Received {token_out_color}{quote['amountOut']:.6f} {token_out}{Colors.RESET}")
        
        # Update balances
        self.balances[token_in] -= amount_in
        self.balances[token_out] += quote["amountOut"]
        
        # Transaction receipt
        block_number = 12345678 + random.randint(1, 1000)
        block_hash = generate_tx_hash()
        
        # Create receipt with logs
        receipt = {
            "transactionHash": tx_hash,
            "blockNumber": block_number,
            "blockHash": block_hash,
            "from": self.user_address,
            "to": router_address,
            "gasUsed": random.randint(int(gas_limit * 0.7), gas_limit),
            "status": True,
            "logs": []
        }
        
        # Add transfer logs for each hop in the route
        last_address = self.user_address
        for i in range(len(quote["route"])-1):
            token_from = quote["route"][i]
            token_to = quote["route"][i+1]
            token_from_addr = TOKENS[token_from]["address"]
            
            # Add transfer log
            receipt["logs"].append({
                "address": token_from_addr,
                "topics": [
                    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  # Transfer event
                    "0x" + last_address[2:].lower().zfill(64),
                    "0x" + router_address[2:].lower().zfill(64)
                ],
                "data": hex(int(amount_in * 10**18))
            })
            
            last_address = router_address
        
        # Add final transfer from router to user
        receipt["logs"].append({
            "address": token_out_data["address"],
            "topics": [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",  # Transfer event
                "0x" + router_address[2:].lower().zfill(64),
                "0x" + self.user_address[2:].lower().zfill(64)
            ],
            "data": hex(int(quote["amountOut"] * 10**18))
        })
        
        # Add swap event
        receipt["logs"].append({
            "address": router_address,
            "topics": [
                "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822",  # Swap event
                "0x" + self.user_address[2:].lower().zfill(64)
            ],
            "data": hex(int(amount_in * 10**18)) + hex(int(quote["amountOut"] * 10**18))[2:]
        })
        
        print(f"\n{Colors.BOLD}Transaction Receipt:{Colors.RESET}")
        print_json(receipt)
        
        # Display updated balances
        print(f"\n{Colors.BOLD}Updated Token Balances:{Colors.RESET}")
        for token, balance in self.balances.items():
            token_color = TOKENS[token]["color"]
            print(f"  {token_color}{token}{Colors.RESET}: {Colors.YELLOW}{balance:.6f}{Colors.RESET}")
        
        return tx_hash, receipt
    
    def display_summary(self, token_in, token_out, amount_in, amount_out, tx_hash):
        """Display a summary of the swap"""
        print_step_header("SWAP SUMMARY")
        
        token_in_color = TOKENS[token_in]["color"]
        token_out_color = TOKENS[token_out]["color"]
        
        print(f"{Colors.BOLD}Swap Complete!{Colors.RESET}")
        print(f"  Swapped: {token_in_color}{amount_in:.6f} {token_in}{Colors.RESET}")
        print(f"  Received: {token_out_color}{amount_out:.6f} {token_out}{Colors.RESET}")
        print(f"  Rate: 1 {token_in} = {amount_out/amount_in:.6f} {token_out}")
        print(f"  Transaction: {Colors.GREEN}{tx_hash}{Colors.RESET}")
        
        explorer_url = f"https://explorer.sapphire.oasis.io/tx/{tx_hash}"
        print(f"\n{Colors.BOLD}View on Explorer:{Colors.RESET}")
        print(f"  {Colors.UNDERLINE}{explorer_url}{Colors.RESET}")
        
        # Display token prices (simulated market data)
        print(f"\n{Colors.BOLD}Current Market Prices:{Colors.RESET}")
        for token in TOKENS:
            token_color = TOKENS[token]["color"]
            price_usd = random.uniform(0.5, 100)
            price_change = random.uniform(-5, 8)
            change_color = Colors.GREEN if price_change >= 0 else Colors.RED
            print(f"  {token_color}{token}{Colors.RESET}: ${price_usd:.2f} ({change_color}{price_change:+.2f}%{Colors.RESET})")
        
        print(f"\n{Colors.GREEN}Thank you for using ROFLSwap!{Colors.RESET}")

def main():
    """Main entry point for the swap demonstration"""
    try:
        print(f"\n{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD} ROFLSwap Token Swap Demonstration {Colors.RESET}\n")
        
        # Initialize the simulator
        user_address = generate_wallet_address()
        swap_sim = SwapSimulator(user_address)
        
        # Display wallet information
        swap_sim.print_wallet_info()
        
        # Select tokens for swap
        token_in = random.choice(list(TOKENS.keys()))
        
        # Choose a different token for output
        available_out_tokens = [t for t in TOKENS if t != token_in]
        token_out = random.choice(available_out_tokens)
        
        # Determine swap amount (60-90% of balance)
        swap_percentage = random.uniform(0.6, 0.9)
        amount_in = swap_sim.balances[token_in] * swap_percentage
        
        print_step_header("SWAP CONFIGURATION")
        token_in_color = TOKENS[token_in]["color"] 
        token_out_color = TOKENS[token_out]["color"]
        print(f"Swapping {token_in_color}{amount_in:.6f} {token_in}{Colors.RESET} to {token_out_color}{token_out}{Colors.RESET}")
        
        # Check if token is approved
        router_address = CONTRACTS["router"]
        is_approved, allowance = swap_sim.check_token_allowance(token_in, router_address)
        
        # Approve token if needed
        if not is_approved:
            tx_hash, receipt = swap_sim.approve_token(token_in, router_address)
            time.sleep(1)  # Pause for readability
        
        # Get swap quote
        quote = swap_sim.get_swap_quote(token_in, token_out, amount_in)
        time.sleep(1)  # Pause for readability
        
        # Execute the swap
        tx_hash, receipt = swap_sim.execute_swap(token_in, token_out, amount_in, quote)
        time.sleep(1)  # Pause for readability
        
        # Display summary
        swap_sim.display_summary(token_in, token_out, amount_in, quote["amountOut"], tx_hash)
        
    except KeyboardInterrupt:
        print(f"\n\n{Colors.BG_RED}{Colors.WHITE}Swap demonstration stopped.{Colors.RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main() 