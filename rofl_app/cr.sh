#!/bin/bash

# Create a script to safely move deprecated files
cat > move_deprecated.sh << 'EOF'
#!/bin/bash

# Set the base directory
BASE_DIR="/Users/pc/apps/MPC/hackathons/ethdam/ethdam-git/rofl_app"
# Create the deprecated directory if it doesn't exist
mkdir -p "${BASE_DIR}/deprecated"
mkdir -p "${BASE_DIR}/deprecated/abi"

# Log file to record all actions
LOG_FILE="${BASE_DIR}/deprecated/migration_log.txt"
echo "Migration started at $(date)" > "${LOG_FILE}"
echo "Files moved to deprecated folder:" >> "${LOG_FILE}"

# Function to safely move a file if it exists
move_file() {
    local file="$1"
    local target_dir="$2"
    
    if [[ -f "${BASE_DIR}/${file}" ]]; then
        echo "Moving ${file} to ${target_dir}"
        mv "${BASE_DIR}/${file}" "${BASE_DIR}/${target_dir}/"
        echo "✓ ${file}" >> "${LOG_FILE}"
    else
        echo "Warning: ${file} not found, skipping"
        echo "✗ ${file} (not found)" >> "${LOG_FILE}"
    fi
}

# Files that are safe to move (old implementation)
echo "Moving deprecated files to the deprecated folder..."

# Old core implementation files
move_file "matching_engine.py" "deprecated"
move_file "settlement.py" "deprecated"
move_file "order_serialization.py" "deprecated"
move_file "storage.py" "deprecated"
move_file "sapphire_wrapper.py" "deprecated"

# Old contract ABIs
move_file "abi/ROFLSwapV3.json" "deprecated/abi"
move_file "abi/ROFLSwapV4.json" "deprecated/abi"
move_file "abi/ROFLSwapV5.json" "deprecated/abi"

# Old utility and debug scripts
move_file "debug_contract_access.py" "deprecated"
move_file "check_rofl_app_id.py" "deprecated"
move_file "fix_authentication.py" "deprecated"
move_file "test_contract_authentication.py" "deprecated"
move_file "set_matcher_key.sh" "deprecated"

# Old documentation
move_file "fix_roflswap_matcher.md" "deprecated"
move_file "CORRECT_SETUP.md" "deprecated"

# Temporarily skip files that might be used
echo "" >> "${LOG_FILE}"
echo "Files NOT moved (may still be needed or already migrated):" >> "${LOG_FILE}"
echo "- roflswap_oracle.py - Core of new implementation" >> "${LOG_FILE}"
echo "- rofl_auth.py - New ROFL authentication" >> "${LOG_FILE}"
echo "- main.py - Entry point using new oracle pattern" >> "${LOG_FILE}"
echo "- compose.yaml - Container configuration" >> "${LOG_FILE}"
echo "- Dockerfile - Container definition" >> "${LOG_FILE}"
echo "- rofl.yaml - ROFL app manifest" >> "${LOG_FILE}"
echo "- requirements.txt - Dependencies" >> "${LOG_FILE}"
echo "- abi/ROFLSwapOracle.json - New contract ABI" >> "${LOG_FILE}"
echo "- abi/PrivateERC20.json - Token implementation" >> "${LOG_FILE}"
echo "- abi/FireToken.json - Token ABI" >> "${LOG_FILE}"
echo "- abi/WaterToken.json - Token ABI" >> "${LOG_FILE}"
echo "- roflswap_oracle_matching.py - (Retain, likely part of new implementation)" >> "${LOG_FILE}"
echo "- roflswap_processor.py - (Retain, check if still used)" >> "${LOG_FILE}"

echo "" >> "${LOG_FILE}"
echo "Migration completed at $(date)" >> "${LOG_FILE}"
echo "Done! Deprecated files have been moved to ${BASE_DIR}/deprecated"
echo "A log of all actions has been saved to ${LOG_FILE}"
EOF

# Make the script executable
chmod +x move_deprecated.sh

# Run the script
./move_deprecated.sh