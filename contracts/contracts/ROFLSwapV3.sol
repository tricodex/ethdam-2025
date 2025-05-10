// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@oasisprotocol/sapphire-contracts/contracts/Subcall.sol";

/**
 * @title ROFLSwapV3
 * @dev A privacy-preserving DEX using Oasis Sapphire's confidential EVM and ROFL framework
 * 
 * Key improvements over the original implementation:
 * - Uses proper ROFL authentication with Subcall.roflEnsureAuthorizedOrigin
 * - No longer needs to store a ROFL app's Ethereum address (which was incorrect)
 * - Properly secures privileged functions using ROFL app authentication
 */
contract ROFLSwapV3 is Ownable {
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
    bytes21 public roflAppId;  // ROFL app ID in bytes21 format
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
        address _fireToken,
        bytes21 _roflAppId
    ) Ownable(msg.sender) {
        waterToken = _waterToken;
        fireToken = _fireToken;
        roflAppId = _roflAppId;
    }
    
    /**
     * @dev Updates the ROFL app ID that's authorized to interact with encrypted orders
     * @param _roflAppId The new ROFL application ID in bytes21 format
     */
    function setRoflAppId(bytes21 _roflAppId) external onlyOwner {
        roflAppId = _roflAppId;
    }
    
    /**
     * @dev Submit an encrypted order to the dark pool
     * @param encryptedOrder The encrypted order details
     * @return orderId The ID of the placed order
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
     * @dev Get an encrypted order - only callable by the authorized ROFL app
     * @param orderId The ID of the order to retrieve
     * @return The encrypted order data
     */
    function getEncryptedOrder(uint256 orderId) external view returns (bytes memory) {
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
        return encryptedOrders[orderId];
    }
    
    /**
     * @dev Get all order IDs for the caller
     * @return An array of order IDs
     */
    function getMyOrders() external view returns (uint256[] memory) {
        return userOrders[msg.sender];
    }
    
    /**
     * @dev Check if the caller has any orders
     * @return True if the caller has at least one order
     */
    function hasOrders() external view returns (bool) {
        return userOrders[msg.sender].length > 0;
    }
    
    /**
     * @dev Get the number of orders for the caller
     * @return The number of orders
     */
    function getMyOrderCount() external view returns (uint256) {
        return userOrders[msg.sender].length;
    }
    
    /**
     * @dev Get orders for a specific user - only callable by the authorized ROFL app
     * @param user The address of the user to get orders for
     * @return An array of order IDs
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
        return userOrders[user];
    }
    
    /**
     * @dev Get owner of an order - only callable by the authorized ROFL app
     * @param orderId The ID of the order to check
     * @return The owner address
     */
    function getOrderOwner(uint256 orderId) external view returns (address) {
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
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
     * @dev Execute a match between a buy and sell order - only callable by the authorized ROFL app
     */
    function executeMatch(
        uint256 buyOrderId,
        uint256 sellOrderId,
        address buyerAddress,
        address sellerAddress,
        uint256 amount,
        uint256 price
    ) external {
        // Verify caller is the authorized ROFL app
        Subcall.roflEnsureAuthorizedOrigin(roflAppId);
        
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
