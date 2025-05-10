// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ROFLSwap
 * @dev A simplified version of ROFLSwap that maintains the ROFL app integration
 * without the complex private token wrapping functionality.
 */
contract ROFLSwap is Ownable {
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
    mapping(uint256 => address) private orderOwner; // Track order owner explicitly
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
     */
    function placeOrder(bytes calldata encryptedOrder) external returns (uint256) {
        orderCounter++;
        uint256 orderId = orderCounter;
        
        encryptedOrders[orderId] = encryptedOrder;
        orderOwner[orderId] = msg.sender; // Explicitly track the order owner
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
     */
    function getMyOrders() external view returns (uint256[] memory) {
        return userOrders[msg.sender];
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
        return orderOwner[orderId];
    }
    
    /**
     * @dev Execute a match between a buy and sell order - only callable by the ROFL app
     * This is a simplified version that doesn't handle private tokens but demonstrates
     * the ROFL app integration
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
        require(orderOwner[buyOrderId] == buyerAddress, "Invalid buyer address");
        require(orderOwner[sellOrderId] == sellerAddress, "Invalid seller address");
        
        // Calculate the payment amount based on price and amount
        uint256 paymentAmount = (amount * price) / 1e18;
        
        // In a full implementation, this would handle actual token transfers
        // For demonstration, we just mark the orders as filled
        filledOrders[buyOrderId] = true;
        filledOrders[sellOrderId] = true;
        
        // Emit match event
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
} 