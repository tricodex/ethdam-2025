#!/bin/bash
# Script to patch the ROFLSwap Matcher to work with the contract's truncated App ID

set -e

echo "=== ROFLSWAP MATCHER PATCH ==="
echo ""

# Check if we're in the right directory
if [ ! -f "rofl.yaml" ]; then
  echo "ERROR: rofl.yaml not found. Please run this script from the rofl_app directory."
  exit 1
fi

# 1. Create the patch script to be run inside the container
echo "Creating patch script for the container..."
cat > patch_rofl_auth.sh << 'EOF'
#!/bin/bash
# Script to patch the code at runtime inside the container

# Find the rofl_auth.py file
ROFL_AUTH_FILE=$(find / -name "rofl_auth.py" 2>/dev/null | grep -v "__pycache__" | head -n 1)

if [ -z "$ROFL_AUTH_FILE" ]; then
    echo "ERROR: Could not find rofl_auth.py"
    exit 1
fi

echo "Found rofl_auth.py at $ROFL_AUTH_FILE"

# Create a backup
cp "$ROFL_AUTH_FILE" "${ROFL_AUTH_FILE}.bak"

# Add the truncate_app_id method before setup_local_account
SETUP_LOCAL_LINE=$(grep -n "def setup_local_account" "$ROFL_AUTH_FILE" | cut -d':' -f1)

if [ -z "$SETUP_LOCAL_LINE" ]; then
    echo "ERROR: Could not find setup_local_account method"
    exit 1
fi

# Create the method as a file
cat > truncate_method.txt << 'EOT'
    def _truncate_app_id(self, app_id):
        """Truncate ROFL App ID to match contract bytes21 format"""
        # Check if this is a ROFL App ID that needs truncation
        if isinstance(app_id, str) and app_id.startswith("rofl1") and len(app_id) > 26:
            # Keep only first 26 chars (rofl1 + 21 bytes)
            return app_id[:26]
        return app_id

EOT

# Insert the method
sed -i "${SETUP_LOCAL_LINE}r truncate_method.txt" "$ROFL_AUTH_FILE"
rm truncate_method.txt

# Replace ROFL_APP_ID with truncated version
sed -i 's/ROFL_APP_ID = os.environ.get("ROFL_APP_ID", "")/ROFL_APP_ID = self._truncate_app_id(os.environ.get("ROFL_APP_ID", ""))/g' "$ROFL_AUTH_FILE"

echo "✅ Added _truncate_app_id method to rofl_auth.py"
echo "The ROFL app will now use the truncated App ID when interacting with the contract"
EOF

# Make executable
chmod +x patch_rofl_auth.sh
echo "✅ Created script to patch code inside container: patch_rofl_auth.sh"

# 2. Update rofl.yaml to use the original App ID for CLI compatibility
if [ -f "rofl.yaml.original" ]; then
  echo "Restoring original rofl.yaml..."
  cp rofl.yaml.original rofl.yaml
  echo "✅ Restored original rofl.yaml with full App ID for ROFL CLI compatibility"
fi

echo ""
echo "=== PATCH READY ====="
echo ""
echo "Now you need to:"
echo "1. Run: oasis rofl update"
echo "2. Run: oasis rofl ssh"
echo "3. Inside the container, run: ./patch_rofl_auth.sh"
echo "4. Exit the container and run: oasis rofl machine restart"
echo "5. Wait for the changes to take effect"
echo "6. Place test orders using hardhat scripts" 