#!/usr/bin/env python3
"""
ROFLSwap Order Matching System Launcher
======================================

This script launches the ROFLSwap order matching demonstration with various options.
"""

import os
import sys
import argparse
import subprocess

def display_banner():
    """Display a colorful banner for the launcher"""
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    BLUE = "\033[34m"
    CYAN = "\033[36m"
    YELLOW = "\033[33m"
    MAGENTA = "\033[35m"
    
    print(f"\n{BOLD}{BLUE}╔══════════════════════════════════════════════════╗{RESET}")
    print(f"{BOLD}{BLUE}║ {YELLOW}ROFLSwap Order Matching System Launcher{BLUE}          ║{RESET}")
    print(f"{BOLD}{BLUE}╠══════════════════════════════════════════════════╣{RESET}")
    print(f"{BOLD}{BLUE}║ {GREEN}Options:{BLUE}                                         ║{RESET}")
    print(f"{BOLD}{BLUE}║  {CYAN}--speed [fast|medium|slow]{BLUE}                      ║{RESET}")
    print(f"{BOLD}{BLUE}║  {CYAN}--pairs [number]{BLUE}                                ║{RESET}")
    print(f"{BOLD}{BLUE}║  {CYAN}--rounds [number]{BLUE}                               ║{RESET}")
    print(f"{BOLD}{BLUE}║  {CYAN}--match-rate [percentage]{BLUE}                       ║{RESET}")
    print(f"{BOLD}{BLUE}╚══════════════════════════════════════════════════╝{RESET}\n")

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="ROFLSwap Order Matching System Launcher")
    
    parser.add_argument("--speed", choices=["fast", "medium", "slow"], default="medium",
                        help="Speed of the demo execution (default: medium)")
    
    parser.add_argument("--pairs", type=int, default=5,
                        help="Number of initial order pairs to generate (default: 5)")
    
    parser.add_argument("--rounds", type=int, default=0,
                        help="Number of rounds to run (default: 0 for infinite)")
    
    parser.add_argument("--match-rate", type=int, choices=range(1, 101), default=30,
                        help="Percentage chance of creating matching orders (default: 30)")
    
    parser.add_argument("--no-banner", action="store_true", 
                        help="Suppress the banner display")
    
    return parser.parse_args()

def setup_environment_variables(args):
    """Set environment variables based on the arguments"""
    # Set speed-related environment variables
    if args.speed == "fast":
        os.environ["ROFLSWAP_DELAY_BASE"] = "0.4"
        os.environ["ROFLSWAP_DELAY_ROUND"] = "1.5"
    elif args.speed == "medium":
        os.environ["ROFLSWAP_DELAY_BASE"] = "0.8"
        os.environ["ROFLSWAP_DELAY_ROUND"] = "3"
    else:  # slow
        os.environ["ROFLSWAP_DELAY_BASE"] = "1.2"
        os.environ["ROFLSWAP_DELAY_ROUND"] = "4"
    
    # Set other environment variables
    os.environ["ROFLSWAP_INITIAL_PAIRS"] = str(args.pairs)
    os.environ["ROFLSWAP_MATCH_RATE"] = str(args.match_rate)
    os.environ["ROFLSWAP_MAX_ROUNDS"] = str(args.rounds)

def main():
    """Main entry point for the launcher"""
    # Parse command line arguments
    args = parse_arguments()
    
    # Display banner unless suppressed
    if not args.no_banner:
        display_banner()
    
    # Set up environment variables
    setup_environment_variables(args)
    
    # Print settings
    RESET = "\033[0m"
    BOLD = "\033[1m"
    CYAN = "\033[36m"
    
    print(f"{BOLD}Running with settings:{RESET}")
    print(f"  {BOLD}Speed:{RESET} {CYAN}{args.speed}{RESET}")
    print(f"  {BOLD}Initial pairs:{RESET} {CYAN}{args.pairs}{RESET}")
    print(f"  {BOLD}Matching rate:{RESET} {CYAN}{args.match_rate}%{RESET}")
    if args.rounds > 0:
        print(f"  {BOLD}Rounds:{RESET} {CYAN}{args.rounds}{RESET}")
    else:
        print(f"  {BOLD}Rounds:{RESET} {CYAN}infinite (press Ctrl+C to stop){RESET}")
    print()
    
    # Run the order matching script
    try:
        subprocess.run([sys.executable, "ordering.py"], check=True)
    except KeyboardInterrupt:
        print("\nLauncher terminated by user.")
    except subprocess.CalledProcessError as e:
        print(f"\nError running the order matching script: {e}")
    except FileNotFoundError:
        print("\nError: ordering.py not found. Make sure it exists in the current directory.")

if __name__ == "__main__":
    main() 