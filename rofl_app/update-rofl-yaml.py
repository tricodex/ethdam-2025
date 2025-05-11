#!/usr/bin/env python3
"""
Script to update the ROFL App ID in rofl.yaml to match the contract's truncated ID
"""

import os
import sys
import re
import yaml

def main():
    """Main function to update rofl.yaml"""
    print("=== UPDATING ROFL.YAML ===")
    
    # Paths
    rofl_yaml_path = "rofl.yaml"
    backup_path = "rofl.yaml.original"
    
    # Check if rofl.yaml exists
    if not os.path.exists(rofl_yaml_path):
        print(f"ERROR: {rofl_yaml_path} not found in the current directory.")
        return 1
    
    # Create backup
    if not os.path.exists(backup_path):
        print(f"Creating backup at {backup_path}")
        with open(rofl_yaml_path, 'r') as src, open(backup_path, 'w') as dst:
            dst.write(src.read())
    
    # Original and truncated App IDs
    # The contract uses bytes21, which only stores the unique identifier part without the prefix
    original_app_id = "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972"
    
    # Extract just the part that should match what's in the contract (without the "rofl1" prefix)
    truncated_id_no_prefix = original_app_id[5:26]  # 21 bytes after "rofl1"
    
    # For ROFL config, we still need to keep the "rofl1" prefix
    truncated_app_id = f"rofl1{truncated_id_no_prefix}"
    
    print(f"Original App ID: {original_app_id}")
    print(f"Truncated ID (for contract comparison): {truncated_id_no_prefix}")
    print(f"New App ID for rofl.yaml: {truncated_app_id}")
    
    # Load YAML file
    try:
        with open(rofl_yaml_path, 'r') as file:
            config = yaml.safe_load(file)
    except Exception as e:
        print(f"Error reading {rofl_yaml_path}: {e}")
        return 1
    
    # Check if the app_id is set
    if not config or 'deployments' not in config or 'default' not in config['deployments'] or 'app_id' not in config['deployments']['default']:
        print("ERROR: Could not find app_id in rofl.yaml")
        return 1
    
    # Get current app_id
    current_app_id = config['deployments']['default']['app_id']
    print(f"Current App ID in rofl.yaml: {current_app_id}")
    
    # Update app_id
    config['deployments']['default']['app_id'] = truncated_app_id
    
    # Save changes
    try:
        with open(rofl_yaml_path, 'w') as file:
            yaml.dump(config, file, default_flow_style=False)
        print(f"Updated rofl.yaml with new App ID: {truncated_app_id}")
        print("\nNow you need to:")
        print("1. Run: oasis rofl update")
        print("2. Run: oasis rofl machine restart")
        print("3. Wait for a few minutes for the changes to take effect")
        print("4. Place new test orders using hardhat scripts")
    except Exception as e:
        print(f"Error writing to {rofl_yaml_path}: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 