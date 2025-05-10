// Script to get the correct checksummed addresses
const { ethers } = require("ethers");

async function main() {
  const waterTokenAddressRaw = "0xe09Ee7Afb0Af1e2E5aA30B8D14CA32b89559530";
  const fireTokenAddressRaw = "0x8B52CeCE15e6f5f3509879624BD9010ec1f1c4ff";
  
  // Get checksummed addresses
  const waterTokenAddress = ethers.getAddress(waterTokenAddressRaw);
  const fireTokenAddress = ethers.getAddress(fireTokenAddressRaw);
  
  console.log("Water token address (checksummed):", waterTokenAddress);
  console.log("Fire token address (checksummed):", fireTokenAddress);
}

main().catch(error => {
  console.error("Script failed:", error);
  process.exit(1);
}); 