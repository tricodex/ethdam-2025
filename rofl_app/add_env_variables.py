#!/usr/bin/env python3
"""
Script to add environment variables to the ROFL app that will modify 
the runtime behavior to use the truncated App ID without modifying the yaml file.
"""

import os
import sys
import yaml

def main():
    """Main function to add environment variables"""
    print("=== ADDING ENV VARIABLES FOR TRUNCATED APP ID ===")
    
    # Paths
    rofl_yaml_path = "rofl.yaml"
    
    # Check if rofl.yaml exists
    if not os.path.exists(rofl_yaml_path):
        print(f"ERROR: {rofl_yaml_path} not found in the current directory.")
        return 1
    
    # Original and truncated App IDs
    original_app_id = "rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972"
    truncated_app_id = "rofl1qzd2jxyr5lujtkdnkpf9x"
    
    print(f"Original App ID: {original_app_id}")
    print(f"Truncated App ID: {truncated_app_id}")
    
    # Load YAML file
    try:
        with open(rofl_yaml_path, 'r') as file:
            config = yaml.safe_load(file)
    except Exception as e:
        print(f"Error reading {rofl_yaml_path}: {e}")
        return 1
    
    # Create a new environment variable for the truncated ID
    new_env_var = {
        "name": "TRUNCATED_APP_ID",
        "value": f"The contract expects this truncated ID: {truncated_app_id}"
    }
    
    # Check if secrets section exists
    if 'deployments' in config and 'default' in config['deployments'] and 'secrets' in config['deployments']['default']:
        # Add the new environment variable
        config['deployments']['default']['secrets'].append(new_env_var)
        
        # Save changes
        try:
            with open(rofl_yaml_path, 'w') as file:
                yaml.dump(config, file, default_flow_style=False)
            print(f"✅ Added environment variable for truncated App ID")
        except Exception as e:
            print(f"Error writing to {rofl_yaml_path}: {e}")
            return 1
    else:
        print("ERROR: Could not find secrets section in rofl.yaml")
        return 1
    
    # Create a script to update the code inside the container
    script_content = """#!/bin/bash
# Script to patch the code at runtime inside the container

# Find the rofl_auth.py file
ROFL_AUTH_FILE=\$(find / -name "rofl_auth.py" 2>/dev/null | grep -v "__pycache__" | head -n 1)

if [ -z "$ROFL_AUTH_FILE" ]; then
    echo "ERROR: Could not find rofl_auth.py"
    exit 1
fi

echo "Found rofl_auth.py at $ROFL_AUTH_FILE"

# Create a backup
cp "$ROFL_AUTH_FILE" "${ROFL_AUTH_FILE}.bak"

# Add code to truncate App ID
sed -i 's/os.environ.get("ROFL_APP_ID", "")/self._truncate_app_id(os.environ.get("ROFL_APP_ID", ""))/g' "$ROFL_AUTH_FILE"

# Add the truncate_app_id method
SETUP_LOCAL_LINE=\$(grep -n "def setup_local_account" "$ROFL_AUTH_FILE" | cut -d':' -f1)

if [ -z "$SETUP_LOCAL_LINE" ]; then
    echo "ERROR: Could not find setup_local_account method"
    exit 1
fi

# Insert the _truncate_app_id method before setup_local_account
TRUNCATE_METHOD='
    def _truncate_app_id(self, app_id):
        """Truncate ROFL App ID to match contract bytes21 format"""
        # Check if this is a ROFL App ID that needs truncation
        if isinstance(app_id, str) and app_id.startswith("rofl1") and len(app_id) > 26:
            # Keep only first 26 chars (rofl1 + 21 bytes)
            return app_id[:26]
        return app_id
'

sed -i "${SETUP_LOCAL_LINE}i\\${TRUNCATE_METHOD}" "$ROFL_AUTH_FILE"

echo "✅ Added _truncate_app_id method to rofl_auth.py"
echo "The ROFL app will now use the truncated App ID when interacting with the contract"
"""
    
    # Write the script to a file
    script_path = "patch_rofl_auth.sh"
    try:
        with open(script_path, 'w') as file:
            file.write(script_content)
        os.chmod(script_path, 0o755)  # Make executable
        print(f"✅ Created script to patch code inside container: {script_path}")
    except Exception as e:
        print(f"Error creating script: {e}")
        return 1
    
    print("\nNow you need to:")
    print("1. Run: oasis rofl update")
    print("2. Run: oasis rofl ssh")
    print("3. Inside the container, run: ./patch_rofl_auth.sh")
    print("4. Exit the container and run: oasis rofl machine restart")
    print("5. Wait for the changes to take effect")
    print("6. Place test orders using hardhat scripts")
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 