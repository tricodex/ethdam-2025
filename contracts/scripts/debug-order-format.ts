import { parseEther } from "viem";

// Demo of the encoding formats to illustrate the issue
const WATER_TOKEN_ADDRESS = "0xa24286675FCa7a93af65B25dD3895Fb0f273Ed6D";
const DEMO_ADDRESS = "0x1234567890123456789012345678901234567890";

// The way we're creating orders in our test script
function createSampleOrderJS(isBuy: boolean, token: string, price: bigint, size: bigint): `0x${string}` {
  // Create a structured order (missing 'owner' field)
  const order = {
    token,
    price: price.toString(),
    size: size.toString(),
    isBuy
  };
  
  // Convert to JSON and then to hex
  const orderJson = JSON.stringify(order);
  console.log("JS Order (JSON):", orderJson);
  const hexEncoded = `0x${Buffer.from(orderJson).toString("hex")}` as `0x${string}`;
  console.log("JS Order (Hex):", hexEncoded);
  return hexEncoded;
}

// What the ROFL app expects (with 'owner' field)
function createROFLCompatibleOrder(isBuy: boolean, token: string, price: bigint, size: bigint, owner: string): string {
  // Create a structured order with owner field
  const order = {
    token,
    price: price.toString(),
    size: size.toString(),
    isBuy,
    owner
  };
  
  // Just convert to JSON - ROFL would get this format after decoding
  return JSON.stringify(order);
}

// Test Python ROFL decoding process
function simulateROFLDecoding(hexEncodedData: string): object | null {
  try {
    // Remove '0x' prefix
    const hexString = hexEncodedData.startsWith('0x') ? hexEncodedData.substring(2) : hexEncodedData;
    
    // Convert hex to string
    const jsonString = Buffer.from(hexString, 'hex').toString();
    console.log("Decoded from Hex:", jsonString);
    
    // Parse JSON
    const orderData = JSON.parse(jsonString);
    console.log("Parsed JSON:", orderData);
    
    // Check if owner field exists
    if (!orderData.owner) {
      console.error("ERROR: Missing 'owner' field that ROFL app requires");
      console.error("The Python matching_engine.py has: 'buyerAddress': buy_order['owner']");
      console.error("This would cause a KeyError in Python");
    }
    
    return orderData;
  } catch (error) {
    console.error("Error decoding:", error);
    return null;
  }
}

async function main() {
  console.log("=== ORDER FORMAT DEBUGGING ===\n");
  
  // Create sample order like in our test script
  console.log("1. Creating order with our current approach:");
  const price = parseEther("0.02");
  const size = parseEther("10");
  const hexEncodedOrder = createSampleOrderJS(true, WATER_TOKEN_ADDRESS, price, size);
  
  // What the ROFL app expects
  console.log("\n2. Format that the ROFL app expects:");
  const roflCompatibleOrder = createROFLCompatibleOrder(
    true, 
    WATER_TOKEN_ADDRESS, 
    price, 
    size, 
    DEMO_ADDRESS
  );
  console.log("ROFL-compatible JSON:", roflCompatibleOrder);
  
  // Simulate what happens in the ROFL app when trying to decode our order
  console.log("\n3. Simulating ROFL app decoding our order:");
  const decodedOrder = simulateROFLDecoding(hexEncodedOrder);
  
  // Suggest fix
  console.log("\n=== SUGGESTED FIX ===");
  console.log("Update createSampleOrder() to include the 'owner' field:");
  console.log(`
function createSampleOrder(isBuy: boolean, token: string, price: bigint, size: bigint, owner: string): \`0x\${string}\` {
  // Create a structured order
  const order = {
    token,
    price: price.toString(),
    size: size.toString(),
    isBuy,
    owner  // Add the required owner field
  };
  
  // Convert to JSON and then to hex
  const orderJson = JSON.stringify(order);
  return \`0x\${Buffer.from(orderJson).toString("hex")}\` as \`0x\${string}\`;
}

// Usage:
const buyOrderData = createSampleOrder(true, WATER_TOKEN_ADDRESS, buyPrice, buySize, deployer.account.address);
`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 