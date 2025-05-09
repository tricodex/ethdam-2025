// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ROFLSwapV2
 * @dev An improved version of ROFLSwap with better order tracking
 * and additional helper functions for the ROFL app.
 * 
 * IMPORTANT: Due to Sapphire's confidential compute features, certain state is private:
 * - Orders are correctly tracked by owner in the contract's state
 * - Orders are correctly added to the user's array of orders
 * - HOWEVER, when users call getMyOrders(), they may get an empty array 
 *   due to Sapphire's confidentiality
 * - Only the ROFL app (running in a TEE) can access the full order data
 *   using the privileged functions (getUserOrders, getOrderOwner, getEncryptedOrder)
 */
contract ROFLSwapV2 is Ownable {
    // Types
    struct Order {
        uint256 orderId;
        address owner;
        address token;
        uint256 price;  // Fixed point representation (10^18)
        uint256 size;
        bool isBuy;
    }
    
    // State variables
    address public roflApp;
    uint256 public orderCounter;
    
    // Token addresses
    address public waterToken;        // Original WATER token
    address public fireToken;         // Original FIRE token
    
    // Maps to store encrypted orders
    mapping(uint256 => bytes) private encryptedOrders;
    mapping(uint256 => address) private orderOwners; // Track order owner explicitly
    mapping(address => uint256[]) private userOrders;
    
    // Registered order matches
    mapping(uint256 => bool) public filledOrders;
    
    // Events
    event OrderPlaced(uint256 indexed orderId, address indexed owner);
    event OrderMatched(
        uint256 indexed buyOrderId, 
        uint256 indexed sellOrderId, 
        uint256 amount, 
        uint256 price
    );
    event TokensExchanged(address indexed buyer, address indexed seller, uint256 amount, uint256 price);
    
    constructor(
        address _waterToken,
        address _fireToken
    ) Ownable(msg.sender) {
        waterToken = _waterToken;
        fireToken = _fireToken;
    }
    
    /**
     * @dev Sets the ROFL app address that's authorized to interact with encrypted orders
     * @param _roflApp The address of the ROFL application
     */
    function setRoflApp(address _roflApp) external onlyOwner {
        roflApp = _roflApp;
    }
    
    /**
     * @dev Submit an encrypted order to the dark pool
     * @param encryptedOrder The encrypted order details
     * @return orderId The ID of the placed order
     * 
     * Note: Due to Sapphire's confidentiality, the order is correctly stored
     * but may not be visible through getMyOrders() - only the ROFL app can 
     * see all orders through privileged functions.
     */
    function placeOrder(bytes calldata encryptedOrder) external returns (uint256) {
        orderCounter++;
        uint256 orderId = orderCounter;
        
        encryptedOrders[orderId] = encryptedOrder;
        orderOwners[orderId] = msg.sender; // Explicitly track the order owner
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, msg.sender);
        return orderId;
    }
    
    /**
     * @dev Get an encrypted order - only callable by the ROFL app
     * @param orderId The ID of the order to retrieve
     * @return The encrypted order data
     */
    function getEncryptedOrder(uint256 orderId) external view returns (bytes memory) {
        require(msg.sender == roflApp, "Only ROFL app can access encrypted orders");
        return encryptedOrders[orderId];
    }
    
    /**
     * @dev Get all order IDs for the caller
     * @return An array of order IDs
     * 
     * Note: Due to Sapphire's confidentiality, this function may return an empty array
     * even if the user has placed orders. The ROFL app can access the actual orders
     * through getUserOrders(address).
     */
    function getMyOrders() external view returns (uint256[] memory) {
        return userOrders[msg.sender];
    }
    
    /**
     * @dev Check if the caller has any orders
     * @return True if the caller has at least one order
     * 
     * Note: Due to Sapphire's confidentiality, this function may return false
     * even if the user has placed orders.
     */
    function hasOrders() external view returns (bool) {
        return userOrders[msg.sender].length > 0;
    }
    
    /**
     * @dev Get the number of orders for the caller
     * @return The number of orders
     * 
     * Note: Due to Sapphire's confidentiality, this function may return 0
     * even if the user has placed orders.
     */
    function getMyOrderCount() external view returns (uint256) {
        return userOrders[msg.sender].length;
    }
    
    /**
     * @dev Get orders for a specific user - only callable by the ROFL app
     * @param user The address of the user to get orders for
     * @return An array of order IDs
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        require(msg.sender == roflApp, "Only ROFL app can access user orders");
        return userOrders[user];
    }
    
    /**
     * @dev Get owner of an order - only callable by the ROFL app
     * @param orderId The ID of the order to check
     * @return The owner address
     */
    function getOrderOwner(uint256 orderId) external view returns (address) {
        require(msg.sender == roflApp, "Only ROFL app can access order owner");
        return orderOwners[orderId];
    }
    
    /**
     * @dev Check if an order exists
     * @param orderId The ID of the order to check
     * @return True if the order exists
     */
    function orderExists(uint256 orderId) external view returns (bool) {
        return orderId > 0 && orderId <= orderCounter && orderOwners[orderId] != address(0);
    }
    
    /**
     * @dev Execute a match between a buy and sell order - only callable by the ROFL app
     */
    function executeMatch(
        uint256 buyOrderId,
        uint256 sellOrderId,
        address buyerAddress,
        address sellerAddress,
        uint256 amount,
        uint256 price
    ) external {
        // Verify caller is the ROFL app
        require(msg.sender == roflApp, "Only ROFL app can execute matches");
        
        // Verify orders haven't been filled already
        require(!filledOrders[buyOrderId], "Buy order already filled");
        require(!filledOrders[sellOrderId], "Sell order already filled");
        
        // Verify order owners
        require(orderOwners[buyOrderId] == buyerAddress, "Invalid buyer address");
        require(orderOwners[sellOrderId] == sellerAddress, "Invalid seller address");
        
        // For demonstration, we just mark the orders as filled
        filledOrders[buyOrderId] = true;
        filledOrders[sellOrderId] = true;
        
        // Emit match events
        emit OrderMatched(buyOrderId, sellOrderId, amount, price);
        emit TokensExchanged(buyerAddress, sellerAddress, amount, price);
    }
    
    /**
     * @dev Get token addresses
     * @return The addresses of waterToken and fireToken
     */
    function getTokens() external view returns (address, address) {
        return (waterToken, fireToken);
    }
    
    /**
     * @dev For debugging: get total number of orders in the system
     * @return Total order count
     */
    function getTotalOrderCount() external view returns (uint256) {
        return orderCounter;
    }
} 