import { expect } from "chai";
import hre from "hardhat";
import { getAddress, encodeAbiParameters, parseAbiParameters } from "viem";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

describe("ROFLSwap", function () {
  // Helper function to normalize addresses for comparison
  function normalizeAddress(address: string): string {
    return address.toLowerCase();
  }
  
  async function deployROFLSwap() {
    const [owner, user1, user2, roflApp] = await hre.viem.getWalletClients();
    
    // Deploy WaterToken
    const waterTokenFactory = await hre.viem.deployContract("WaterToken");
    const waterTokenAddress = await waterTokenFactory.address;
    
    // Deploy FireToken
    const fireTokenFactory = await hre.viem.deployContract("FireToken");
    const fireTokenAddress = await fireTokenFactory.address;
    
    // Get References
    const waterToken = await hre.viem.getContractAt("WaterToken", waterTokenAddress);
    const fireToken = await hre.viem.getContractAt("FireToken", fireTokenAddress);
    
    // Deploy ROFLSwap with a multicall address (using owner address for testing)
    const ROFLSwapFactory = await hre.viem.deployContract("ROFLSwap", [
      waterTokenAddress,
      fireTokenAddress,
      owner.account.address // Using owner as multicall for testing
    ]);
    const ROFLSwapAddress = await ROFLSwapFactory.address;
    const ROFLSwap = await hre.viem.getContractAt("ROFLSwap", ROFLSwapAddress);
    
    // Get private token addresses
    const privateTokens = await ROFLSwap.read.getPrivateTokens();
    const pWaterTokenAddress = privateTokens[0];
    const pFireTokenAddress = privateTokens[1];
    
    // Get references to private tokens
    const pWaterToken = await hre.viem.getContractAt("PrivateERC20", pWaterTokenAddress);
    const pFireToken = await hre.viem.getContractAt("PrivateERC20", pFireTokenAddress);
    
    // Set ROFL app address
    await ROFLSwap.write.setRoflApp([roflApp.account.address], { account: owner.account });
    
    // Transfer some tokens to users for testing
    await waterToken.write.transfer([user1.account.address, 10000n * 10n ** 18n], { account: owner.account });
    await fireToken.write.transfer([user2.account.address, 10000n * 10n ** 18n], { account: owner.account });
    
    return { 
      ROFLSwap, 
      waterToken, 
      fireToken, 
      pWaterToken, 
      pFireToken,
      owner, 
      user1, 
      user2, 
      roflApp,
      ROFLSwapAddress,
      waterTokenAddress,
      fireTokenAddress,
      pWaterTokenAddress,
      pFireTokenAddress
    };
  }

  describe("Deployment", function () {
    it("Should set correct token addresses", async function () {
      const { ROFLSwap, waterTokenAddress, fireTokenAddress } = await loadFixture(deployROFLSwap);
      
      expect(normalizeAddress(await ROFLSwap.read.waterToken())).to.equal(normalizeAddress(waterTokenAddress));
      expect(normalizeAddress(await ROFLSwap.read.fireToken())).to.equal(normalizeAddress(fireTokenAddress));
    });

    it("Should create private token wrappers", async function () {
      const { ROFLSwap, pWaterToken, pFireToken } = await loadFixture(deployROFLSwap);
      
      const privateTokens = await ROFLSwap.read.getPrivateTokens();
      expect(normalizeAddress(privateTokens[0])).to.equal(normalizeAddress(await pWaterToken.address));
      expect(normalizeAddress(privateTokens[1])).to.equal(normalizeAddress(await pFireToken.address));
    });
    
    it("Should set ROFL app address", async function () {
      const { ROFLSwap, roflApp } = await loadFixture(deployROFLSwap);
      
      expect(normalizeAddress(await ROFLSwap.read.roflApp())).to.equal(normalizeAddress(roflApp.account.address));
    });
  });

  describe("Token Wrapping", function () {
    it("Should allow users to wrap Water tokens", async function () {
      const { ROFLSwap, waterToken, pWaterToken, user1, ROFLSwapAddress, waterTokenAddress } = await loadFixture(deployROFLSwap);
      const user1Address = getAddress(user1.account.address);
      const wrapAmount = 1000n * 10n ** 18n;
      
      // Approve ROFLSwap to spend user's tokens
      await waterToken.write.approve([ROFLSwapAddress, wrapAmount], { account: user1.account });
      
      // Wrap tokens
      await ROFLSwap.write.wrapTokens([waterTokenAddress, wrapAmount], { account: user1.account });
      
      // Check private token balance
      const privateBalance = await pWaterToken.read.balanceOf([user1Address]);
      expect(privateBalance).to.equal(wrapAmount);
    });
    
    it("Should allow users to wrap Fire tokens", async function () {
      const { ROFLSwap, fireToken, pFireToken, user2, ROFLSwapAddress, fireTokenAddress } = await loadFixture(deployROFLSwap);
      const user2Address = getAddress(user2.account.address);
      const wrapAmount = 1000n * 10n ** 18n;
      
      // Approve ROFLSwap to spend user's tokens
      await fireToken.write.approve([ROFLSwapAddress, wrapAmount], { account: user2.account });
      
      // Wrap tokens
      await ROFLSwap.write.wrapTokens([fireTokenAddress, wrapAmount], { account: user2.account });
      
      // Check private token balance
      const privateBalance = await pFireToken.read.balanceOf([user2Address]);
      expect(privateBalance).to.equal(wrapAmount);
    });
  });

  describe("Order Placement", function () {
    it("Should allow users to submit encrypted orders", async function () {
      const { ROFLSwap, user1 } = await loadFixture(deployROFLSwap);
      
      // Create a sample encrypted order
      const encryptedOrderBytes = "0x0102030405";
      
      // Place order
      const tx = await ROFLSwap.write.placeOrder([encryptedOrderBytes], { account: user1.account });
      
      // Check that order was placed
      const userOrders = await ROFLSwap.read.getMyOrders({ account: user1.account });
      expect(userOrders.length).to.equal(1);
      expect(userOrders[0]).to.equal(1n); // First order should have ID 1
    });
  });

  // Note: We can't fully test order matching in a unit test since it requires the ROFL app
  // But we can test the basic contract functionality
  describe("Access Control", function () {
    it("Should only allow ROFL app to access encrypted orders", async function () {
      const { ROFLSwap, user1, roflApp } = await loadFixture(deployROFLSwap);
      
      // Place an order
      const encryptedOrderBytes = "0x0102030405";
      await ROFLSwap.write.placeOrder([encryptedOrderBytes], { account: user1.account });
      
      // Try to access order as ROFL app (should work)
      const orderData = await ROFLSwap.read.getEncryptedOrder([1n], { account: roflApp.account });
      expect(orderData).to.not.be.empty;
      
      // Try to access order as user (should fail)
      await expect(
        ROFLSwap.read.getEncryptedOrder([1n], { account: user1.account })
      ).to.be.rejectedWith("Only ROFL app can access encrypted orders");
    });
  });
});
