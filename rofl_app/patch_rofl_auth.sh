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
