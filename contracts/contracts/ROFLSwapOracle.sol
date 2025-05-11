// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Subcall} from "@oasisprotocol/sapphire-contracts/contracts/Subcall.sol";
import {SiweAuth} from "@oasisprotocol/sapphire-contracts/contracts/auth/SiweAuth.sol";
import "./PrivateERC20.sol";

/**
 * @title ROFLSwapOracle
 * @notice Oracle-based dark pool DEX for exchanging private tokens on Sapphire
 * @dev Uses the ROFL authentication model with Trusted Execution Environment (TEE)
 */
struct Order {
    uint256 orderId;
    address owner;
    address token;
    uint256 price;
    uint256 size;
    bool isBuy;
}

contract ROFLSwapOracle is SiweAuth {
    // State variables
    mapping(uint256 => bytes) private _encryptedOrders;
    mapping(uint256 => address) private _orderOwners;
    mapping(address => uint256[]) private _userOrders;
    mapping(uint256 => bool) public filledOrders;
    uint256 private _orderCounter;
    
    address public oracle;    // Oracle address running inside TEE
    bytes21 public roflAppID; // Allowed app ID within TEE for managing oracle access
    address public waterToken;
    address public fireToken;

    // Events
    event OrderPlaced(uint256 indexed orderId, address indexed owner);
    event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 amount, uint256 price);
    event TokensExchanged(address indexed buyer, address indexed seller, uint256 amount, uint256 price);
    
    // Errors
    error InvalidOrder();
    error OrderAlreadyFilled();
    error OrderDoesNotExist();
    error UnauthorizedUserOrOracle();
    error UnauthorizedOracle();
    error InsufficientBalance();
    error InvalidToken();

    /**
     * @notice Constructor sets up the oracle contract with token addresses and ROFL authentication
     * @param domain Domain for SIWE authentication
     * @param inRoflAppID ROFL app ID authorized to call privileged functions
     * @param inOracle Initial oracle address
     * @param inWaterToken Address of the Water token contract
     * @param inFireToken Address of the Fire token contract
     */
    constructor(
        string memory domain, 
        bytes21 inRoflAppID, 
        address inOracle,
        address inWaterToken,
        address inFireToken
    ) SiweAuth(domain) {
        roflAppID = inRoflAppID;
        oracle = inOracle;
        waterToken = inWaterToken;
        fireToken = inFireToken;
        _orderCounter = 0;
    }

    // Modifiers

    /**
     * @notice Authenticates that the caller is either the specified user or the oracle
     * @param authToken SIWE auth token for user authentication
     * @param addr Address to check authorization for
     */
    modifier onlyUserOrOracle(bytes memory authToken, address addr) {
        if (msg.sender != addr && msg.sender != oracle) {
            address msgSender = authMsgSender(authToken);
            if (msgSender != addr) {
                revert UnauthorizedUserOrOracle();
            }
        }
        _;
    }

    /**
     * @notice Ensures the caller is the authorized oracle
     */
    modifier onlyOracle() {
        if (msg.sender != oracle) {
            revert UnauthorizedOracle();
        }
        _;
    }

    /**
     * @notice Ensures the call originates from the authorized ROFL app in TEE
     * @param appId ROFL app ID to verify
     */
    modifier onlyTEE(bytes21 appId) {
        Subcall.roflEnsureAuthorizedOrigin(appId);
        _;
    }

    /**
     * @notice Sets the oracle address
     * @dev Only callable by the authorized ROFL app
     * @param addr New oracle address
     */
    function setOracle(address addr) external onlyTEE(roflAppID) {
        oracle = addr;
    }

    /**
     * @notice Places a new order in the system
     * @param encryptedOrder Encrypted order data
     * @return orderId Order ID of the placed order
     */
    function placeOrder(bytes memory encryptedOrder) external returns (uint256) {
        _orderCounter++;
        uint256 orderId = _orderCounter;
        
        _encryptedOrders[orderId] = encryptedOrder;
        _orderOwners[orderId] = msg.sender;
        _userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, msg.sender);
        
        return orderId;
    }

    /**
     * @notice Gets the total number of orders in the system
     * @return Total order count
     */
    function getTotalOrderCount() external view returns (uint256) {
        return _orderCounter;
    }

    /**
     * @notice Checks if an order exists
     * @param orderId Order ID to check
     * @return True if the order exists
     */
    function orderExists(uint256 orderId) external view returns (bool) {
        return orderId <= _orderCounter && orderId > 0;
    }

    /**
     * @notice Gets the encrypted data for an order
     * @dev Only accessible by the order owner or the oracle
     * @param authToken SIWE auth token
     * @param orderId Order ID to retrieve
     * @return Encrypted order data
     */
    function getEncryptedOrder(bytes memory authToken, uint256 orderId) 
        external view 
        onlyUserOrOracle(authToken, _orderOwners[orderId]) 
        returns (bytes memory) 
    {
        if (orderId > _orderCounter || orderId == 0) {
            revert OrderDoesNotExist();
        }
        return _encryptedOrders[orderId];
    }
    
    /**
     * @notice Gets the owner of an order
     * @dev Only accessible by the order owner or the oracle
     * @param authToken SIWE auth token
     * @param orderId Order ID to check
     * @return Address of the order owner
     */
    function getOrderOwner(bytes memory authToken, uint256 orderId) 
        external view 
        onlyUserOrOracle(authToken, _orderOwners[orderId]) 
        returns (address) 
    {
        if (orderId > _orderCounter || orderId == 0) {
            revert OrderDoesNotExist();
        }
        return _orderOwners[orderId];
    }

    /**
     * @notice Gets all orders for a user
     * @dev Only accessible by the user or the oracle
     * @param authToken SIWE auth token
     * @param user Address to get orders for
     * @return Array of order IDs
     */
    function getUserOrders(bytes memory authToken, address user) 
        external view 
        onlyUserOrOracle(authToken, user) 
        returns (uint256[] memory) 
    {
        return _userOrders[user];
    }

    /**
     * @notice Executes a matching order pair by the oracle
     * @dev Only callable by the oracle running in TEE
     * @param buyOrderId Buy order ID
     * @param sellOrderId Sell order ID
     * @param buyerAddress Buyer address
     * @param sellerAddress Seller address
     * @param token Token address
     * @param amount Amount to trade
     * @param price Price to trade at
     */
    function executeMatch(
        uint256 buyOrderId,
        uint256 sellOrderId,
        address buyerAddress,
        address sellerAddress,
        address token,
        uint256 amount,
        uint256 price
    ) external onlyOracle {
        // Validate orders
        if (buyOrderId > _orderCounter || buyOrderId == 0 || sellOrderId > _orderCounter || sellOrderId == 0) {
            revert OrderDoesNotExist();
        }
        
        if (filledOrders[buyOrderId] || filledOrders[sellOrderId]) {
            revert OrderAlreadyFilled();
        }
        
        if (token != waterToken && token != fireToken) {
            revert InvalidToken();
        }
        
        // Execute the trade
        address counterToken = token == waterToken ? fireToken : waterToken;
        
        // Transfer tokens between parties
        PrivateERC20(counterToken).transferFromEncrypted(buyerAddress, sellerAddress, price * amount);
        PrivateERC20(token).transferFromEncrypted(sellerAddress, buyerAddress, amount);
        
        // Mark orders as filled
        filledOrders[buyOrderId] = true;
        filledOrders[sellOrderId] = true;
        
        // Emit events
        emit OrderMatched(buyOrderId, sellOrderId, amount, price);
        emit TokensExchanged(buyerAddress, sellerAddress, amount, price);
    }

    /**
     * @notice Request privacy access for the contract to handle private token transfers
     * @dev Must be called to allow contract to manipulate private token balances
     */
    function requestPrivacyAccess() external {
        PrivateERC20(waterToken).requestPrivacyAccess();
        PrivateERC20(fireToken).requestPrivacyAccess();
    }
} 