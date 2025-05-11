#!/usr/bin/env python3
"""
ROFLSwap Order Matching System
==============================

This script demonstrates the order matching process in the ROFLSwap decentralized exchange.
It shows how buy and sell orders are matched based on price and quantity in real-time.
"""

import time
import random
import sys
import os
from datetime import datetime
from typing import Dict, List, Tuple, Any
from decimal import Decimal, getcontext

# Set decimal precision
getcontext().prec = 8

# Get environment variables for configuration
DELAY_BASE = Decimal(os.environ.get("ROFLSWAP_DELAY_BASE", "0.8"))
DELAY_ROUND = Decimal(os.environ.get("ROFLSWAP_DELAY_ROUND", "3"))
INITIAL_PAIRS = int(os.environ.get("ROFLSWAP_INITIAL_PAIRS", "5"))
MATCH_RATE = int(os.environ.get("ROFLSWAP_MATCH_RATE", "30"))
MAX_ROUNDS = int(os.environ.get("ROFLSWAP_MAX_ROUNDS", "0"))  # 0 means infinite

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

# Token definitions
WATER_TOKEN = "WATER"
FIRE_TOKEN = "FIRE"

# Order structure
class Order:
    def __init__(self, order_id: int, owner: str, token: str, price: Decimal, 
                 size: Decimal, is_buy: bool, timestamp: int = None):
        self.order_id = order_id
        self.owner = owner
        self.token = token
        self.price = price
        self.size = size
        self.is_buy = is_buy
        self.timestamp = timestamp or int(time.time())
        self.remaining_size = size
        self.filled = False
    
    def __repr__(self):
        order_type = "BUY" if self.is_buy else "SELL"
        color = Colors.GREEN if self.is_buy else Colors.RED
        return (
            f"{color}{order_type}{Colors.RESET} #{self.order_id} | "
            f"Token: {Colors.CYAN}{self.token}{Colors.RESET} | "
            f"Price: {Colors.YELLOW}{self.price:.4f}{Colors.RESET} | "
            f"Size: {Colors.MAGENTA}{self.size:.2f}{Colors.RESET} | "
            f"Owner: {self.owner[:6]}...{self.owner[-4:]}"
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert order to dictionary format"""
        return {
            'orderId': self.order_id,
            'owner': self.owner,
            'token': self.token,
            'price': self.price,
            'size': self.size,
            'isBuy': self.is_buy,
            'timestamp': self.timestamp,
            'remainingSize': self.remaining_size,
            'filled': self.filled
        }

class OrderBook:
    def __init__(self):
        self.orders = []
        self.next_order_id = 1
        self.executed_matches = []
    
    def add_order(self, owner: str, token: str, price: Decimal, 
                  size: Decimal, is_buy: bool) -> Order:
        """Add a new order to the order book"""
        order = Order(
            order_id=self.next_order_id,
            owner=owner,
            token=token,
            price=price,
            size=size,
            is_buy=is_buy
        )
        self.orders.append(order)
        self.next_order_id += 1
        
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"{Colors.BOLD}[{timestamp}] New order added:{Colors.RESET} {order}")
        
        return order
    
    def get_active_orders(self) -> List[Order]:
        """Get all active (unfilled) orders"""
        return [order for order in self.orders if not order.filled]
    
    def find_matches(self) -> List[Tuple[Order, Order, Decimal]]:
        """Find matching orders in the order book"""
        active_orders = self.get_active_orders()
        buy_orders = [order for order in active_orders if order.is_buy]
        sell_orders = [order for order in active_orders if not order.is_buy]
        
        # Sort orders by price-time priority
        buy_orders.sort(key=lambda x: (-x.price, x.timestamp))  # Highest price first
        sell_orders.sort(key=lambda x: (x.price, x.timestamp))  # Lowest price first
        
        matches = []
        matched_order_ids = set()
        
        for buy_order in buy_orders:
            if buy_order.order_id in matched_order_ids:
                continue
                
            for sell_order in sell_orders:
                if sell_order.order_id in matched_order_ids:
                    continue
                
                # Check if orders match on token
                if buy_order.token != sell_order.token:
                    continue
                
                # Check if price is acceptable (buy price >= sell price)
                if buy_order.price < sell_order.price:
                    continue
                
                # Calculate matched quantity
                matched_quantity = min(buy_order.remaining_size, sell_order.remaining_size)
                
                # Add to matches
                matches.append((buy_order, sell_order, matched_quantity))
                matched_order_ids.add(buy_order.order_id)
                matched_order_ids.add(sell_order.order_id)
                break  # Move to next buy order
        
        return matches
    
    def execute_match(self, buy_order: Order, sell_order: Order, quantity: Decimal) -> bool:
        """Execute a match between orders"""
        execution_price = sell_order.price  # Usually executed at the earlier order's price
        
        # Print match details
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        print(f"\n{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}[{timestamp}] EXECUTING MATCH{Colors.RESET}")
        print(f"  {Colors.BG_GREEN}{Colors.WHITE}BUY{Colors.RESET}  #{buy_order.order_id} | " 
              f"Owner: {buy_order.owner[:6]}...{buy_order.owner[-4:]} | "
              f"Price: {Colors.YELLOW}{buy_order.price:.4f}{Colors.RESET} | "
              f"Size: {Colors.MAGENTA}{buy_order.remaining_size:.2f}{Colors.RESET}")
        
        print(f"  {Colors.BG_RED}{Colors.WHITE}SELL{Colors.RESET} #{sell_order.order_id} | "
              f"Owner: {sell_order.owner[:6]}...{sell_order.owner[-4:]} | "
              f"Price: {Colors.YELLOW}{sell_order.price:.4f}{Colors.RESET} | "
              f"Size: {Colors.MAGENTA}{sell_order.remaining_size:.2f}{Colors.RESET}")
        
        print(f"  {Colors.BG_YELLOW}{Colors.BLACK}{Colors.BOLD} Match Details: {Colors.RESET} "
              f"Token: {Colors.CYAN}{buy_order.token}{Colors.RESET} | "
              f"Quantity: {Colors.MAGENTA}{quantity:.2f}{Colors.RESET} | "
              f"Price: {Colors.YELLOW}{execution_price:.4f}{Colors.RESET} | "
              f"Total: {Colors.WHITE}{quantity * execution_price:.4f}{Colors.RESET}")
        
        # Update order sizes
        buy_order.remaining_size -= quantity
        sell_order.remaining_size -= quantity
        
        # Mark orders as filled if no size remains
        if buy_order.remaining_size <= 0:
            buy_order.filled = True
            print(f"  {Colors.BG_GREEN}{Colors.BLACK}Buy order #{buy_order.order_id} completely filled{Colors.RESET}")
        else:
            print(f"  {Colors.GREEN}Buy order #{buy_order.order_id} partially filled. Remaining: {buy_order.remaining_size:.2f}{Colors.RESET}")
            
        if sell_order.remaining_size <= 0:
            sell_order.filled = True
            print(f"  {Colors.BG_RED}{Colors.BLACK}Sell order #{sell_order.order_id} completely filled{Colors.RESET}")
        else:
            print(f"  {Colors.RED}Sell order #{sell_order.order_id} partially filled. Remaining: {sell_order.remaining_size:.2f}{Colors.RESET}")
        
        # Record the executed match
        self.executed_matches.append({
            'buyOrderId': buy_order.order_id,
            'sellOrderId': sell_order.order_id,
            'token': buy_order.token,
            'quantity': quantity,
            'price': execution_price,
            'total': quantity * execution_price,
            'timestamp': int(time.time())
        })
        
        return True
    
    def process_matches(self) -> int:
        """Process all matching orders in the order book"""
        matches = self.find_matches()
        matches_executed = 0
        
        for buy_order, sell_order, quantity in matches:
            success = self.execute_match(buy_order, sell_order, quantity)
            if success:
                matches_executed += 1
        
        return matches_executed

    def print_order_book(self, token: str = None):
        """Print the current state of the order book"""
        active_orders = self.get_active_orders()
        
        if token:
            active_orders = [order for order in active_orders if order.token == token]
        
        buy_orders = [order for order in active_orders if order.is_buy]
        sell_orders = [order for order in active_orders if not order.is_buy]
        
        # Sort orders by price
        buy_orders.sort(key=lambda x: -x.price)  # Highest buy price first
        sell_orders.sort(key=lambda x: x.price)  # Lowest sell price first
        
        # Print header
        token_str = f" for {Colors.CYAN}{token}{Colors.RESET}" if token else ""
        print(f"\n{Colors.BOLD}{Colors.UNDERLINE}Order Book{token_str}{Colors.RESET}")
        
        # Print sell orders (in reverse to show highest price at top)
        for order in reversed(sell_orders):
            print(f"  {order}")
        
        # Print separator
        if buy_orders and sell_orders:
            spread = min([o.price for o in sell_orders]) - max([o.price for o in buy_orders])
            spread_str = f"Spread: {Colors.YELLOW}{abs(spread):.4f}{Colors.RESET}"
            print(f"  {Colors.BG_BLACK}{Colors.WHITE}{'-' * 40}{Colors.RESET} {spread_str}")
        else:
            print(f"  {Colors.BG_BLACK}{Colors.WHITE}{'-' * 40}{Colors.RESET}")
        
        # Print buy orders
        for order in buy_orders:
            print(f"  {order}")
        
        print()

def generate_random_address() -> str:
    """Generate a random Ethereum-like address"""
    return "0x" + "".join(random.choice("0123456789abcdef") for _ in range(40))

def generate_random_orders(order_book: OrderBook, count: int = 5):
    """Generate random orders for demonstration"""
    tokens = [WATER_TOKEN, FIRE_TOKEN]
    owners = [generate_random_address() for _ in range(10)]
    
    # Ensure at least one matching pair for each token type
    # WATER token matching pair (buy price > sell price to ensure matching)
    water_buy_price = Decimal('0.053')
    water_sell_price = Decimal('0.051')
    
    order_book.add_order(
        owner=generate_random_address(),
        token=WATER_TOKEN,
        price=water_buy_price,
        size=Decimal(random.uniform(2, 6)).quantize(Decimal('0.01')),
        is_buy=True
    )
    time.sleep(float(DELAY_BASE))
    
    order_book.add_order(
        owner=generate_random_address(),
        token=WATER_TOKEN,
        price=water_sell_price,
        size=Decimal(random.uniform(2, 6)).quantize(Decimal('0.01')),
        is_buy=False
    )
    time.sleep(float(DELAY_BASE))
    
    # FIRE token matching pair (buy price > sell price to ensure matching)
    fire_buy_price = Decimal('0.123')
    fire_sell_price = Decimal('0.121')
    
    order_book.add_order(
        owner=generate_random_address(),
        token=FIRE_TOKEN,
        price=fire_buy_price,
        size=Decimal(random.uniform(2, 6)).quantize(Decimal('0.01')),
        is_buy=True
    )
    time.sleep(float(DELAY_BASE))
    
    order_book.add_order(
        owner=generate_random_address(),
        token=FIRE_TOKEN,
        price=fire_sell_price,
        size=Decimal(random.uniform(2, 6)).quantize(Decimal('0.01')),
        is_buy=False
    )
    time.sleep(float(DELAY_BASE))
    
    # Generate additional random orders
    remaining_count = max(0, count - 4)
    for _ in range(remaining_count):
        token = random.choice(tokens)
        is_buy = random.choice([True, False])
        
        # Generate price ranges based on token and order type (with configurable chance of creating a matching order)
        if random.random() < (MATCH_RATE / 100):
            # Create prices that will match existing orders
            if token == WATER_TOKEN:
                if is_buy:
                    # Buy order with price higher than lowest sell
                    price = water_sell_price + Decimal(random.uniform(0.001, 0.006)).quantize(Decimal('0.0001'))
                else:
                    # Sell order with price lower than highest buy
                    price = water_buy_price - Decimal(random.uniform(0.001, 0.006)).quantize(Decimal('0.0001'))
            else:  # FIRE_TOKEN
                if is_buy:
                    # Buy order with price higher than lowest sell
                    price = fire_sell_price + Decimal(random.uniform(0.001, 0.006)).quantize(Decimal('0.0001'))
                else:
                    # Sell order with price lower than highest buy
                    price = fire_buy_price - Decimal(random.uniform(0.001, 0.006)).quantize(Decimal('0.0001'))
        else:
            # Create regular non-matching orders
            if token == WATER_TOKEN:
                if is_buy:
                    base_price = Decimal('0.047')
                    variation = Decimal(random.uniform(0, 0.003))
                else:
                    base_price = Decimal('0.054')
                    variation = Decimal(random.uniform(0, 0.003))
            else:  # FIRE_TOKEN
                if is_buy:
                    base_price = Decimal('0.118')
                    variation = Decimal(random.uniform(0, 0.003))
                else:
                    base_price = Decimal('0.124')
                    variation = Decimal(random.uniform(0, 0.003))
            
            price = (base_price + variation).quantize(Decimal('0.0001'))
            
        size = Decimal(random.uniform(1, 10)).quantize(Decimal('0.01'))
        
        order_book.add_order(
            owner=random.choice(owners),
            token=token,
            price=price,
            size=size,
            is_buy=is_buy
        )
        
        # Add a delay for visualization based on configured speed
        time.sleep(float(DELAY_BASE))

def main():
    """Main entry point for the order matching demonstration"""
    try:
        print(f"{Colors.BG_BLUE}{Colors.WHITE}{Colors.BOLD}ROFLSwap Order Matching System{Colors.RESET}\n")
        
        # Initialize order book
        order_book = OrderBook()
        
        # Generate initial random orders
        print(f"{Colors.BOLD}Generating initial orders...{Colors.RESET}")
        generate_random_orders(order_book, count=INITIAL_PAIRS)
        
        # Print initial order book for each token
        print(f"\n{Colors.BOLD}Initial order books:{Colors.RESET}")
        order_book.print_order_book(WATER_TOKEN)
        order_book.print_order_book(FIRE_TOKEN)
        
        # Process initial matches
        print(f"\n{Colors.BG_MAGENTA}{Colors.WHITE}{Colors.BOLD} INITIAL ORDER MATCHING {Colors.RESET}")
        time.sleep(1)
        matches_executed = order_book.process_matches()
        if matches_executed > 0:
            print(f"\n{Colors.BG_GREEN}{Colors.BLACK}Successfully executed {matches_executed} matches!{Colors.RESET}")
        else:
            print(f"\n{Colors.YELLOW}No matches found in the initial orders.{Colors.RESET}")
        
        # Print updated order book for each token
        print(f"\n{Colors.BOLD}Updated order books after matching:{Colors.RESET}")
        order_book.print_order_book(WATER_TOKEN)
        order_book.print_order_book(FIRE_TOKEN)
        
        # Main processing loop
        print(f"{Colors.BOLD}Entering continuous matching mode (Press Ctrl+C to exit)...{Colors.RESET}")
        iteration = 1
        
        while True:
            # Check if we've reached the max number of rounds
            if MAX_ROUNDS > 0 and iteration > MAX_ROUNDS:
                print(f"\n{Colors.BG_YELLOW}{Colors.BLACK}Reached maximum number of rounds ({MAX_ROUNDS}). Stopping.{Colors.RESET}")
                break
                
            print(f"\n{Colors.BG_BLACK}{Colors.WHITE} Round {iteration} {Colors.RESET}")
            
            # Generate new random orders
            print(f"{Colors.BOLD}Generating new orders...{Colors.RESET}")
            generate_random_orders(order_book, count=random.randint(3, 7))
            
            # Print updated order book for each token
            print(f"\n{Colors.BOLD}Current order books before matching:{Colors.RESET}")
            order_book.print_order_book(WATER_TOKEN)
            order_book.print_order_book(FIRE_TOKEN)
            
            # Process matches
            print(f"\n{Colors.BG_MAGENTA}{Colors.WHITE}{Colors.BOLD} ORDER MATCHING - ROUND {iteration} {Colors.RESET}")
            # Add delay before processing
            time.sleep(1.5)
            matches_executed = order_book.process_matches()
            
            if matches_executed > 0:
                print(f"\n{Colors.BG_GREEN}{Colors.BLACK}Successfully executed {matches_executed} matches in round {iteration}!{Colors.RESET}")
            else:
                print(f"\n{Colors.YELLOW}No new matches found in round {iteration}.{Colors.RESET}")
            
            # Print updated order book for each token
            print(f"\n{Colors.BOLD}Updated order books after matching:{Colors.RESET}")
            order_book.print_order_book(WATER_TOKEN)
            order_book.print_order_book(FIRE_TOKEN)
            
            # Increment iteration counter
            iteration += 1
            
            # Wait before next round
            print(f"\n{Colors.CYAN}Waiting for next round...{Colors.RESET}")
            time.sleep(float(DELAY_ROUND))
    
    except KeyboardInterrupt:
        print(f"\n\n{Colors.BG_RED}{Colors.WHITE}Order matching system stopped.{Colors.RESET}")
        print(f"\n{Colors.BOLD}Summary:{Colors.RESET}")
        print(f"  {Colors.GREEN}Total orders: {len(order_book.orders)}{Colors.RESET}")
        print(f"  {Colors.BLUE}Total matches executed: {len(order_book.executed_matches)}{Colors.RESET}")
        print(f"  {Colors.MAGENTA}Active orders remaining: {len(order_book.get_active_orders())}{Colors.RESET}")
        print(f"\n{Colors.BOLD}Thank you for using the ROFLSwap Order Matching System.{Colors.RESET}")
        sys.exit(0)

if __name__ == "__main__":
    main() 