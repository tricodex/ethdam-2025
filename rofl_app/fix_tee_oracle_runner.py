#!/usr/bin/env python3
"""
Wrapper script to run fix_tee_oracle.py with corrected imports
"""

import os
import sys

# Add current directory to path to find modules
sys.path.insert(0, os.getcwd())

# Modify the import in fix_tee_oracle.py
with open('fix_tee_oracle.py', 'r') as f:
    content = f.read()

modified_content = content.replace(
    'from rofl_app.rofl_auth import RoflUtility',
    'from rofl_auth import RoflUtility'
)

# Write to a temporary file
with open('fix_tee_oracle_temp.py', 'w') as f:
    f.write(modified_content)

# Execute the modified script
try:
    # Import and run the main function
    import fix_tee_oracle_temp
    sys.exit(fix_tee_oracle_temp.main())
finally:
    # Clean up temporary file
    if os.path.exists('fix_tee_oracle_temp.py'):
        os.remove('fix_tee_oracle_temp.py') 