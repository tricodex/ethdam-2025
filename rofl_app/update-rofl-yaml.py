#!/usr/bin/env python3
"""
Script to update the ROFL App ID in rofl.yaml to match the ROFLSwapOracle contract's truncated ID
"""

import os
import sys
import re
import yaml

def main():
    """Main function to update rofl.yaml"""
    print("=== UPDATING ROFL.YAML FOR ROFLSWAPORACLE COMPATIBILITY ===")
    
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
    
    # Load the YAML file
    try:
        with open(rofl_yaml_path, 'r') as file:
            config = yaml.safe_load(file)
    except Exception as e:
        print(f"ERROR: Failed to parse {rofl_yaml_path}: {e}")
        return 1
    
    # Get current App ID
    try:
        current_app_id = config['deployments']['default']['app_id']
        print(f"Current App ID: {current_app_id}")
    except KeyError:
        print("ERROR: Could not find app_id in YAML structure")
        return 1
    
    # Truncate App ID for ROFLSwapOracle contract compatibility
    if current_app_id.startswith("rofl1"):
        # Ensure we have the exact required truncation (keep "rofl1" prefix plus 21 bytes)
        truncated_app_id = current_app_id[:26]  # "rofl1" + 21 bytes
        print(f"Truncated App ID: {truncated_app_id}")
        
        # Update the YAML
        config['deployments']['default']['app_id'] = truncated_app_id
        
        # Save the updated YAML
        try:
            with open(rofl_yaml_path, 'w') as file:
                yaml.dump(config, file, default_flow_style=False)
            print(f"✅ Updated {rofl_yaml_path} with truncated App ID for ROFLSwapOracle compatibility")
        except Exception as e:
            print(f"ERROR: Failed to write to {rofl_yaml_path}: {e}")
            return 1
    else:
        print(f"WARNING: App ID does not start with 'rofl1', not modifying: {current_app_id}")
    
    print("\nROFL.YAML update complete. To apply changes:")
    print("1. Run 'oasis rofl update'")
    print("2. Run 'oasis rofl machine restart'")
    print("3. Wait for changes to take effect")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 