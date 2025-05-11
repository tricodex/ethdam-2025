// Script to check the ROFL app status and monitor for issues
const { execSync } = require('child_process');
const hre = require("hardhat");
const fs = require("fs");

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

// Check ROFL app configuration
function checkRoflAppConfig() {
  colorLog("\n=== CHECKING ROFL APP CONFIGURATION ===\n", COLORS.BLUE);
  
  // Get current directory
  const currentDir = process.cwd();
  const rootDir = currentDir.includes('/contracts') ? currentDir.replace('/contracts', '') : currentDir;
  const roflAppDir = `${rootDir}/rofl_app`;
  
  // Check if rofl.yaml exists
  try {
    if (fs.existsSync(`${roflAppDir}/rofl.yaml`)) {
      colorLog("✅ rofl.yaml found in rofl_app directory", COLORS.GREEN);
      
      const roflYaml = fs.readFileSync(`${roflAppDir}/rofl.yaml`, 'utf8');
      
      // Check for app ID in the YAML
      const appIdMatch = roflYaml.match(/app_id:\s*([^\s]+)/);
      if (appIdMatch && appIdMatch[1]) {
        colorLog(`App ID in rofl.yaml: ${appIdMatch[1]}`, COLORS.CYAN);
      } else {
        colorLog("⚠️ Could not find app ID in rofl.yaml", COLORS.YELLOW);
      }
    } else {
      colorLog("❌ rofl.yaml not found in rofl_app directory", COLORS.RED);
    }
  } catch (error) {
    colorLog(`❌ Error checking rofl.yaml: ${error.message}`, COLORS.RED);
  }
  
  // Check ROFL deployment file
  try {
    const network = hre.network.name;
    const deploymentData = JSON.parse(
      fs.readFileSync(`./roflswap-v5-deployment-${network}.json`, "utf8")
    );
    
    colorLog(`\nROFLSwapV5 Contract: ${deploymentData.roflSwapV5}`, COLORS.CYAN);
    colorLog(`ROFL App ID in deployment file: ${deploymentData.roflAppId}`, COLORS.CYAN);
    
  } catch (error) {
    colorLog(`❌ Error checking deployment file: ${error.message}`, COLORS.RED);
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

// Provide troubleshooting advice
function provideTroubleshootingAdvice() {
  colorLog("\n=== TROUBLESHOOTING ADVICE ===\n", COLORS.BLUE);
  
  colorLog("Common issues and solutions:", COLORS.CYAN);
  
  colorLog("\n1. ROFL App ID Mismatch:", COLORS.MAGENTA);
  colorLog("   If the contract was deployed with a different ROFL app ID than what's registered,", COLORS.YELLOW);
  colorLog("   the 'roflEnsureAuthorizedOrigin' check will fail and no matches will occur.", COLORS.YELLOW);
  colorLog("   Solution: Redeploy the ROFLSwapV5 contract with the correct app ID using:", COLORS.GREEN);
  colorLog("   bun hardhat run scripts/deploy-roflswap-v5-with-new-appid.js --network sapphire-testnet", COLORS.GREEN);
  
  colorLog("\n2. ROFL Machine Not Running:", COLORS.MAGENTA);
  colorLog("   If the ROFL machine is stopped, it won't process any orders.", COLORS.YELLOW);
  colorLog("   Solution: Restart the machine with:", COLORS.GREEN);
  colorLog("   oasis rofl machine restart", COLORS.GREEN);
  
  colorLog("\n3. Missing or Incorrect Secrets:", COLORS.MAGENTA);
  colorLog("   The ROFL app needs correct secrets to function.", COLORS.YELLOW);
  colorLog("   Solution: Update the secrets and refresh the app:", COLORS.GREEN);
  colorLog("   echo -n \"0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB\" | oasis rofl secret set ROFLSWAP_ADDRESS -", COLORS.GREEN);
  colorLog("   oasis rofl update --account myaccount", COLORS.GREEN);
  
  colorLog("\n4. Privacy Access Not Requested:", COLORS.MAGENTA);
  colorLog("   The ROFLSwapV5 contract needs privacy access to operate with private tokens.", COLORS.YELLOW);
  colorLog("   Solution: Request privacy access with:", COLORS.GREEN);
  colorLog("   bun hardhat request-privacy:v5 --contract 0x5374c5161a408C77A1Fcd934B55adae7e1bd42AB --network sapphire-testnet", COLORS.GREEN);
  
  colorLog("\n5. Insufficient Token Approvals:", COLORS.MAGENTA);
  colorLog("   Users must approve ROFLSwapV5 to spend their private tokens.", COLORS.YELLOW);
  colorLog("   Solution: Check and set approvals with:", COLORS.GREEN);
  colorLog("   bun hardhat approve:v5 --token water --network sapphire-testnet", COLORS.GREEN);
  colorLog("   bun hardhat approve:v5 --token fire --network sapphire-testnet", COLORS.GREEN);
}

// Main function
async function main() {
  try {
    colorLog("\n🔍 ROFL APP STATUS CHECKER 🔍\n", COLORS.MAGENTA);
    
    // Check configuration
    checkRoflAppConfig();
    
    // Check ROFL app status
    checkRoflAppStatus();
    
    // Check ROFL secrets
    checkRoflSecrets();
    
    // Provide troubleshooting advice
    provideTroubleshootingAdvice();
    
    colorLog("\n✅ Status check complete!", COLORS.GREEN);
    colorLog("If you're experiencing issues with order matching, use the advice above to troubleshoot.", COLORS.GREEN);
    colorLog("For more detailed testing, run the following scripts:", COLORS.GREEN);
    colorLog("1. prepare-accounts-for-testing.js - Ensure accounts have tokens", COLORS.YELLOW);
    colorLog("2. test-tee-order-matching.js - Test the order matching functionality", COLORS.YELLOW);
    
  } catch (error) {
    colorLog(`\n❌ Error during status check: ${error.message}`, COLORS.RED);
    console.error(error);
  }
}

// Execute the main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 