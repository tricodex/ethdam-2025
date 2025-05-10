// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@oasisprotocol/sapphire-contracts/contracts/Subcall.sol";
import "./confidentialERC20/PrivateERC20.sol";

/**
 * @title ROFLSwapV5
 * @dev A confidential DEX using Oasis Sapphire's confidential EVM, ROFL framework, and PrivateERC20 tokens
 * 
 * Key improvements over the V4 implementation:
 * - Integrated with PrivateERC20 tokens for fully private token transfers
 * - Uses cross-contract privacy policy access for token balance visibility
 * - Complete dark pool with no visible on-chain token transfers
 */
contract ROFLSwapV5 is Ownable {
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
    bytes public roflAppId;  // ROFL app ID in bytes format (no truncation)
    uint256 public orderCounter;
    
    // Token addresses
    PrivateERC20 public waterToken;  // Private WATER token
    PrivateERC20 public fireToken;   // Private FIRE token
    
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
        bytes memory _roflAppId
    ) Ownable(msg.sender) {
        waterToken = PrivateERC20(_waterToken);
        fireToken = PrivateERC20(_fireToken);
        roflAppId = _roflAppId;
        
        // Request privacy policy access for both tokens
        // This will need to be called separately after deployment
        // waterToken.grant(LuminexPrivacyPolicy.PrivacyPolicy.Reveal);
        // fireToken.grant(LuminexPrivacyPolicy.PrivacyPolicy.Reveal);
    }
    
    /**
     * @dev Updates the ROFL app ID that's authorized to interact with encrypted orders
     * @param _roflAppId The new ROFL application ID in bytes format
     */
    function setRoflAppId(bytes memory _roflAppId) external onlyOwner {
        roflAppId = _roflAppId;
    }
    
    /**
     * @dev Request privacy policy access grants from token contracts
     * This function must be called after deployment to enable the contract to see token balances
     */
    function requestPrivacyAccess() external onlyOwner {
        waterToken.grant(LuminexPrivacyPolicy.PrivacyPolicy.Reveal);
        fireToken.grant(LuminexPrivacyPolicy.PrivacyPolicy.Reveal);
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
     * @dev Helper function to get the bytes21 form of the ROFL app ID for authentication
     * @return App ID as bytes21 (truncated if necessary)
     */
    function getRoflAppIdForAuth() internal view returns (bytes21) {
        // Extract the first 21 bytes from the full app ID
        bytes memory fullAppId = roflAppId;
        bytes21 truncatedAppId;
        
        assembly {
            // Load the first 21 bytes (168 bits) from the full app ID
            truncatedAppId := mload(add(fullAppId, 32))
        }
        
        return truncatedAppId;
    }
    
    /**
     * @dev Get an encrypted order - only callable by the authorized ROFL app
     * @param orderId The ID of the order to retrieve
     * @return The encrypted order data
     */
    function getEncryptedOrder(uint256 orderId) external view returns (bytes memory) {
        // Use the truncated app ID for authentication
        Subcall.roflEnsureAuthorizedOrigin(getRoflAppIdForAuth());
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
        Subcall.roflEnsureAuthorizedOrigin(getRoflAppIdForAuth());
        return userOrders[user];
    }
    
    /**
     * @dev Get owner of an order - only callable by the authorized ROFL app
     * @param orderId The ID of the order to check
     * @return The owner address
     */
    function getOrderOwner(uint256 orderId) external view returns (address) {
        Subcall.roflEnsureAuthorizedOrigin(getRoflAppIdForAuth());
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
     * @dev Helper function to decode order data - only runs in confidential environment
     * @param encryptedOrder Encrypted order data
     * @return Decoded order structure
     */
    function _decodeOrder(bytes memory encryptedOrder) internal pure returns (Order memory) {
        // This will be executed inside the TEE, so we can decode the order
        return abi.decode(encryptedOrder, (Order));
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
        Subcall.roflEnsureAuthorizedOrigin(getRoflAppIdForAuth());
        
        // Verify orders haven't been filled already
        require(!filledOrders[buyOrderId], "Buy order already filled");
        require(!filledOrders[sellOrderId], "Sell order already filled");
        
        // Verify order owners
        require(orderOwners[buyOrderId] == buyerAddress, "Invalid buyer address");
        require(orderOwners[sellOrderId] == sellerAddress, "Invalid seller address");
        
        // Get order details
        Order memory buyOrder = _decodeOrder(encryptedOrders[buyOrderId]);
        Order memory sellOrder = _decodeOrder(encryptedOrders[sellOrderId]);
        
        // Use the Private ERC20 token indicated in the buy order
        PrivateERC20 token;
        if (buyOrder.token == address(waterToken)) {
            token = waterToken;
        } else if (buyOrder.token == address(fireToken)) {
            token = fireToken;
        } else {
            revert("Unsupported token");
        }
        
        // Execute the private token transfer - buyer pays seller directly
        // The transferFrom will be called by the ROFL app, acting on behalf of the buyer
        bool success = token.transferFrom(buyerAddress, sellerAddress, amount);
        require(success, "Token transfer failed");
        
        // Mark orders as filled
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
        return (address(waterToken), address(fireToken));
    }
    
    /**
     * @dev For debugging: get total number of orders in the system
     * @return Total order count
     */
    function getTotalOrderCount() external view returns (uint256) {
        return orderCounter;
    }
}