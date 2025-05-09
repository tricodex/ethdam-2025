// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "./ROFLSwapV2.sol";

/**
 * @title ROFLSwapTester
 * @dev A simple contract to test the ROFLSwapV2 contract's behavior with orders
 */
contract ROFLSwapTester {
    ROFLSwapV2 public roflSwap;
    
    constructor(address _roflSwapV2) {
        roflSwap = ROFLSwapV2(_roflSwapV2);
    }
    
    /**
     * @dev Call the placeOrder function on the ROFLSwapV2 contract
     */
    function placeTestOrder(bytes calldata encryptedOrder) external returns (uint256) {
        return roflSwap.placeOrder(encryptedOrder);
    }
    
    /**
     * @dev Get all orders for a given user
     * This will fail unless this contract is set as the ROFL app
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return roflSwap.getUserOrders(user);
    }
    
    /**
     * @dev Get the owner of an order
     * This will fail unless this contract is set as the ROFL app
     */
    function getOrderOwner(uint256 orderId) external view returns (address) {
        return roflSwap.getOrderOwner(orderId);
    }
    
    /**
     * @dev Get encrypted order data
     * This will fail unless this contract is set as the ROFL app
     */
    function getEncryptedOrder(uint256 orderId) external view returns (bytes memory) {
        return roflSwap.getEncryptedOrder(orderId);
    }
    
    /**
     * @dev Check if the provided address has orders
     */
    function checkUserHasOrders() external view returns (bool) {
        return roflSwap.hasOrders();
    }
    
    /**
     * @dev Get orders for the caller of this contract
     */
    function getMyOrdersFromRoflSwap() external view returns (uint256[] memory) {
        return roflSwap.getMyOrders();
    }
} 