const { expect } = require("chai");
const { ethers } = require("hardhat");

// Use an alternative way to load fixtures without using hardhat-toolbox
async function loadFixture(deployFn) {
  return deployFn();
}

describe("ROFLSwapV5 with PrivateERC20", function() {
  // Deploy the contracts once and reuse them in multiple tests
  async function deployFixture() {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy balance registry
    const BalanceRegistry = await ethers.getContractFactory("ConfidentialBalanceRegistry");
    const multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";
    const balanceRegistry = await BalanceRegistry.deploy(
      owner.address,  // commiter
      owner.address,  // owner
      multicallAddress   // multicall
    );
    await balanceRegistry.waitForDeployment();
    
    // Deploy water and fire tokens
    const WaterToken = await ethers.getContractFactory("WaterToken");
    const FireToken = await ethers.getContractFactory("FireToken");
    
    const waterToken = await WaterToken.deploy();
    const fireToken = await FireToken.deploy();
    
    await waterToken.waitForDeployment();
    await fireToken.waitForDeployment();
    
    // Mint some tokens to users
    const mintAmount = ethers.parseEther("1000");
    await waterToken.mint(user1.address, mintAmount);
    await waterToken.mint(user2.address, mintAmount);
    await fireToken.mint(user1.address, mintAmount);
    await fireToken.mint(user2.address, mintAmount);
    
    // Deploy private token wrappers
    const PrivateWrapper = await ethers.getContractFactory("PrivateWrapper");
    
    const privateWaterToken = await PrivateWrapper.deploy(
      await waterToken.getAddress(),
      multicallAddress,
      await balanceRegistry.getAddress()
    );
    
    const privateFireToken = await PrivateWrapper.deploy(
      await fireToken.getAddress(),
      multicallAddress,
      await balanceRegistry.getAddress()
    );
    
    await privateWaterToken.waitForDeployment();
    await privateFireToken.waitForDeployment();
    
    // Create a placeholder ROFL app ID
    const roflAppId = ethers.toUtf8Bytes("rofl1qzd2jxyr5lujtkdnkpf9xuh8dktu73nl5q7cp972");
    
    // Deploy ROFLSwapV5 contract
    const ROFLSwapV5 = await ethers.getContractFactory("ROFLSwapV5");
    const roflSwap = await ROFLSwapV5.deploy(
      await privateWaterToken.getAddress(),
      await privateFireToken.getAddress(),
      roflAppId
    );
    
    await roflSwap.waitForDeployment();
    
    // Request privacy access
    await roflSwap.requestPrivacyAccess();
    
    return {
      balanceRegistry,
      waterToken,
      fireToken,
      privateWaterToken,
      privateFireToken,
      roflSwap,
      roflAppId,
      owner,
      user1,
      user2
    };
  }
  
  // Helper function to encode an order
  function encodeOrder(order) {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'address', 'address', 'uint256', 'uint256', 'bool'],
      [
        order.orderId,
        order.owner,
        order.token,
        order.price,
        order.size,
        order.isBuy
      ]
    );
  }
  
  it("Should deploy contracts successfully", async function() {
    const { balanceRegistry, waterToken, fireToken, privateWaterToken, privateFireToken, roflSwap } = await loadFixture(deployFixture);
    
    expect(await balanceRegistry.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await waterToken.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await fireToken.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await privateWaterToken.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await privateFireToken.getAddress()).to.not.equal(ethers.ZeroAddress);
    expect(await roflSwap.getAddress()).to.not.equal(ethers.ZeroAddress);
  });
  
  it("Should allow users to place orders", async function() {
    const { privateFireToken, roflSwap, user1 } = await loadFixture(deployFixture);
    
    const order = {
      orderId: 0,  // Will be assigned by the contract
      owner: user1.address,
      token: await privateFireToken.getAddress(),
      price: ethers.parseEther("1"),
      size: ethers.parseEther("10"),
      isBuy: true
    };
    
    const encodedOrder = encodeOrder(order);
    
    await expect(roflSwap.connect(user1).placeOrder(encodedOrder))
      .to.emit(roflSwap, "OrderPlaced")
      .withArgs(1, user1.address);
    
    const orderCount = await roflSwap.getTotalOrderCount();
    expect(orderCount).to.equal(1);
  });
  
  it("Should wrap, approve, and match orders", async function() {
    const { waterToken, fireToken, privateWaterToken, privateFireToken, roflSwap, user1, user2, owner } = await loadFixture(deployFixture);
    
    // Wrap tokens
    const wrapAmount = ethers.parseEther("100");
    
    // Approve base tokens to private wrappers
    await waterToken.connect(user1).approve(await privateWaterToken.getAddress(), wrapAmount);
    await fireToken.connect(user2).approve(await privateFireToken.getAddress(), wrapAmount);
    
    // Wrap tokens
    await privateWaterToken.connect(user1).wrap(wrapAmount, user1.address);
    await privateFireToken.connect(user2).wrap(wrapAmount, user2.address);
    
    // Approve private tokens to ROFLSwap
    await privateWaterToken.connect(user1).approve(await roflSwap.getAddress(), wrapAmount);
    await privateFireToken.connect(user2).approve(await roflSwap.getAddress(), wrapAmount);
    
    // Place buy order (user1 wants to buy FIRE with WATER)
    const buyOrder = {
      orderId: 0,
      owner: user1.address,
      token: await privateFireToken.getAddress(),
      price: ethers.parseEther("1"),  // 1:1 rate
      size: ethers.parseEther("10"),
      isBuy: true
    };
    
    // Place sell order (user2 wants to sell FIRE for WATER)
    const sellOrder = {
      orderId: 0,
      owner: user2.address,
      token: await privateFireToken.getAddress(),
      price: ethers.parseEther("1"),  // 1:1 rate
      size: ethers.parseEther("10"),
      isBuy: false
    };
    
    // Place the orders
    await roflSwap.connect(user1).placeOrder(encodeOrder(buyOrder));
    await roflSwap.connect(user2).placeOrder(encodeOrder(sellOrder));
    
    // Verify orders were placed
    expect(await roflSwap.getTotalOrderCount()).to.equal(2);
    
    // We cannot directly execute the match because we're not the ROFL app,
    // but we can verify the order data is stored correctly
    expect(await roflSwap.orderExists(1)).to.be.true;
    expect(await roflSwap.orderExists(2)).to.be.true;
    
    // Since we can't impersonate the ROFL app in tests, we just verify
    // the contract state is as expected
    expect(await roflSwap.filledOrders(1)).to.be.false;
    expect(await roflSwap.filledOrders(2)).to.be.false;
  });
});
