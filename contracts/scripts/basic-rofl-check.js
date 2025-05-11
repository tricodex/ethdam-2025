// Simple script to check ROFL app status without using hardhat
const { execSync } = require('child_process');

// Colors for console output
const COLORS = {
  RESET: "\x1b[0m",
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  MAGENTA: "\x1b[35m",
  CYAN: "\x1b[36m"
};

// Helper for colored console logs
function colorLog(message, color) {
  console.log(`${color}${message}${COLORS.RESET}`);
}

// Execute command and return output
function executeCommand(command) {
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return { success: true, output };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

// Check if ROFL app is running using oasis CLI
function checkRoflAppStatus() {
  colorLog("\n=== CHECKING ROFL APP STATUS ===\n", COLORS.BLUE);
  
  // Show ROFL app details
  const showResult = executeCommand('cd .. && oasis rofl show');
  if (showResult.success) {
    colorLog("ROFL App Information:", COLORS.CYAN);
    console.log(showResult.output);
    
    // Extract App ID
    const appIdMatch = showResult.output.match(/App ID:\s*([^\s]+)/);
    if (appIdMatch && appIdMatch[1]) {
      const appId = appIdMatch[1];
      colorLog(`Detected App ID: ${appId}`, COLORS.GREEN);
      
      // Check if the machine is running
      colorLog("\nChecking machine status...", COLORS.YELLOW);
      const machineResult = executeCommand('cd .. && oasis rofl machine show');
      
      if (machineResult.success) {
        console.log(machineResult.output);
        
        // Check for status indicators
        if (machineResult.output.includes("Status: running")) {
          colorLog("✅ Machine is RUNNING", COLORS.GREEN);
        } else if (machineResult.output.includes("Status: stopped")) {
          colorLog("❌ Machine is STOPPED. Try restarting with:", COLORS.RED);
          colorLog("  oasis rofl machine restart", COLORS.YELLOW);
        } else {
          colorLog("⚠️ Unexpected machine status", COLORS.YELLOW);
        }
      } else {
        colorLog("❌ Failed to check machine status:", COLORS.RED);
        if (machineResult.stdout) console.log(machineResult.stdout);
        if (machineResult.stderr) console.log(machineResult.stderr);
      }
    } else {
      colorLog("⚠️ Could not detect App ID from output", COLORS.YELLOW);
    }
  } else {
    colorLog("❌ Failed to get ROFL app information:", COLORS.RED);
    if (showResult.stdout) console.log(showResult.stdout);
    if (showResult.stderr) console.log(showResult.stderr);
    
    colorLog("\nPossible reasons:", COLORS.YELLOW);
    colorLog("1. No ROFL app manifest found (missing rofl.yaml)", COLORS.YELLOW);
    colorLog("2. ROFL CLI not installed or not in PATH", COLORS.YELLOW);
    colorLog("3. Not in the correct directory", COLORS.YELLOW);
  }
}

// Check ROFL app secrets
function checkRoflSecrets() {
  colorLog("\n=== CHECKING ROFL SECRETS ===\n", COLORS.BLUE);
  
  const secretsResult = executeCommand('cd .. && oasis rofl secret list');
  if (secretsResult.success) {
    colorLog("ROFL Secrets:", COLORS.CYAN);
    console.log(secretsResult.output);
    
    // Check for important secrets
    const importantSecrets = [
      "ROFLSWAP_ADDRESS",
      "ROFL_APP_ID",
      "WEB3_PROVIDER",
      "PRIVATE_KEY"
    ];
    
    for (const secret of importantSecrets) {
      if (secretsResult.output.includes(secret)) {
        colorLog(`✅ ${secret} is set`, COLORS.GREEN);
      } else {
        colorLog(`❌ ${secret} is NOT set. This may cause issues!`, COLORS.RED);
      }
    }
  } else {
    colorLog("❌ Failed to list ROFL secrets:", COLORS.RED);
    if (secretsResult.stdout) console.log(secretsResult.stdout);
    if (secretsResult.stderr) console.log(secretsResult.stderr);
  }
}

// Main function
function main() {
  try {
    colorLog("\n🔍 BASIC ROFL APP STATUS CHECKER 🔍\n", COLORS.MAGENTA);
    
    // Check ROFL app status
    checkRoflAppStatus();
    
    // Check ROFL secrets
    checkRoflSecrets();
    
    colorLog("\n✅ Basic status check complete!", COLORS.GREEN);
    colorLog("To run the full tests, fix the private key format in hardhat.config.ts", COLORS.YELLOW);
    
  } catch (error) {
    colorLog(`\n❌ Error during status check: ${error.message}`, COLORS.RED);
    console.error(error);
  }
}

// Execute the main function
main(); 