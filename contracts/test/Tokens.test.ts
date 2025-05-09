import { expect } from "chai";
import hre from "hardhat";
import { getAddress } from "viem";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

describe("Token Tests", function () {
  async function deployTokens() {
    const [owner, user1, user2] = await hre.viem.getWalletClients();
    
    // Deploy WaterToken
    const waterTokenFactory = await hre.viem.deployContract("WaterToken");
    const waterTokenAddress = await waterTokenFactory.address;
    
    // Deploy FireToken
    const fireTokenFactory = await hre.viem.deployContract("FireToken");
    const fireTokenAddress = await fireTokenFactory.address;
    
    const waterToken = await hre.viem.getContractAt("WaterToken", waterTokenAddress);
    const fireToken = await hre.viem.getContractAt("FireToken", fireTokenAddress);
    
    return { 
      waterToken, 
      fireToken, 
      owner, 
      user1, 
      user2, 
      waterTokenAddress, 
      fireTokenAddress 
    };
  }

  describe("WaterToken", function () {
    it("Should have correct name and symbol", async function () {
      const { waterToken } = await loadFixture(deployTokens);
      
      expect(await waterToken.read.name()).to.equal("Water Token");
      expect(await waterToken.read.symbol()).to.equal("WATER");
    });

    it("Should assign initial supply to deployer", async function () {
      const { waterToken, owner } = await loadFixture(deployTokens);
      const ownerAddress = getAddress(owner.account.address);
      
      const totalSupply = await waterToken.read.totalSupply();
      const ownerBalance = await waterToken.read.balanceOf([ownerAddress]);
      
      expect(ownerBalance).to.equal(totalSupply);
    });

    it("Should allow owner to mint new tokens", async function () {
      const { waterToken, owner, user1 } = await loadFixture(deployTokens);
      const user1Address = getAddress(user1.account.address);
      
      const initialBalance = await waterToken.read.balanceOf([user1Address]);
      const mintAmount = 1000n * 10n ** 18n;
      
      await waterToken.write.mint([user1Address, mintAmount], { account: owner.account });
      
      const newBalance = await waterToken.read.balanceOf([user1Address]);
      expect(newBalance).to.equal(initialBalance + mintAmount);
    });
  });

  describe("FireToken", function () {
    it("Should have correct name and symbol", async function () {
      const { fireToken } = await loadFixture(deployTokens);
      
      expect(await fireToken.read.name()).to.equal("Fire Token");
      expect(await fireToken.read.symbol()).to.equal("FIRE");
    });

    it("Should assign initial supply to deployer", async function () {
      const { fireToken, owner } = await loadFixture(deployTokens);
      const ownerAddress = getAddress(owner.account.address);
      
      const totalSupply = await fireToken.read.totalSupply();
      const ownerBalance = await fireToken.read.balanceOf([ownerAddress]);
      
      expect(ownerBalance).to.equal(totalSupply);
    });

    it("Should allow owner to mint new tokens", async function () {
      const { fireToken, owner, user1 } = await loadFixture(deployTokens);
      const user1Address = getAddress(user1.account.address);
      
      const initialBalance = await fireToken.read.balanceOf([user1Address]);
      const mintAmount = 1000n * 10n ** 18n;
      
      await fireToken.write.mint([user1Address, mintAmount], { account: owner.account });
      
      const newBalance = await fireToken.read.balanceOf([user1Address]);
      expect(newBalance).to.equal(initialBalance + mintAmount);
    });
  });
});
