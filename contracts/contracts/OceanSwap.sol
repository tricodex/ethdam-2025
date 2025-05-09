// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./confidentialERC20/PrivateWrapper.sol";
import "./confidentialERC20/PrivateERC20.sol";
import "./confidentialERC20/BalanceRegistry.sol";

/**
 * @title OceanSwap
 * @dev A private trading pool implementation that uses Oasis Sapphire's confidentiality features
 * combined with wrapped private tokens to ensure complete privacy in the trading lifecycle.
 */
contract OceanSwap is Ownable {
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
    address public pWaterToken;       // Private wrapped WATER token
    address public pFireToken;        // Private wrapped FIRE token
    
    // Maps to store encrypted orders
    mapping(uint256 => bytes) private encryptedOrders;
    mapping(address => uint256[]) private userOrders;
    
    // Registered order matches
    mapping(uint256 => bool) public filledOrders;
    
    // Balance registry for private tokens
    ConfidentialBalanceRegistry public balanceRegistry;
    
    // Events
    event OrderPlaced(uint256 indexed orderId, address indexed owner);
    event OrderMatched(
        uint256 indexed buyOrderId, 
        uint256 indexed sellOrderId, 
        uint256 amount, 
        uint256 price
    );
    event TokensWrapped(address indexed user, address indexed token, uint256 amount);
    event TokensUnwrapped(address indexed user, address indexed token, uint256 amount);
    
    constructor(
        address _waterToken,
        address _fireToken,
        address _multicall
    ) {
        waterToken = _waterToken;
        fireToken = _fireToken;
        
        // Create the balance registry
        balanceRegistry = new ConfidentialBalanceRegistry(
            address(this),  // This contract can commit tokens
            address(this),  // This contract is the owner
            _multicall      // Multicall for batching transactions
        );
        
        // Create private wrapped versions of the tokens
        PrivateWrapper pWater = new PrivateWrapper(
            ERC20(_waterToken),
            _multicall,
            balanceRegistry
        );
        
        PrivateWrapper pFire = new PrivateWrapper(
            ERC20(_fireToken),
            _multicall,
            balanceRegistry
        );
        
        pWaterToken = address(pWater);
        pFireToken = address(pFire);
        
        // Register the private tokens with the balance registry
        balanceRegistry.commitToken(pWaterToken);
        balanceRegistry.commitToken(pFireToken);
    }
    
    /**
     * @dev Sets the ROFL app address that's authorized to interact with encrypted orders
     * @param _roflApp The address of the ROFL application
     */
    function setRoflApp(address _roflApp) external onlyOwner {
        roflApp = _roflApp;
    }
    
    /**
     * @dev Wrap standard ERC20 tokens to their private versions
     * @param token The address of the token to wrap (must be WATER or FIRE)
     * @param amount The amount to wrap
     */
    function wrapTokens(address token, uint256 amount) external {
        address privateToken;
        
        if (token == waterToken) {
            privateToken = pWaterToken;
        } else if (token == fireToken) {
            privateToken = pFireToken;
        } else {
            revert("Unsupported token");
        }
        
        // Transfer the tokens to this contract first
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Approve the private wrapper to take the tokens
        IERC20(token).approve(privateToken, amount);
        
        // Wrap the tokens
        PrivateWrapper(privateToken).wrap(amount, msg.sender);
        
        emit TokensWrapped(msg.sender, token, amount);
    }
    
    /**
     * @dev Unwrap private tokens back to standard ERC20 tokens
     * @param privateToken The address of the private token to unwrap
     * @param amount The amount to unwrap
     */
    function unwrapTokens(address privateToken, uint256 amount) external {
        if (privateToken != pWaterToken && privateToken != pFireToken) {
            revert("Unsupported token");
        }
        
        // Call unwrap on the private wrapper
        PrivateWrapper(privateToken).unwrap(amount, msg.sender);
        
        emit TokensUnwrapped(msg.sender, privateToken, amount);
    }
    
    /**
     * @dev Submit an encrypted order to the dark pool
     * @param encryptedOrder The encrypted order details
     * @return orderId The ID of the placed order
     */
    function placeOrder(bytes calldata encryptedOrder) external returns (uint256) {
        uint256 orderId = ++orderCounter;
        encryptedOrders[orderId] = encryptedOrder;
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
     * @dev Execute a match between a buy and sell order - only callable by the ROFL app
     * @param buyOrderId The ID of the buy order
     * @param sellOrderId The ID of the sell order
     * @param buyerAddress The address of the buyer
     * @param sellerAddress The address of the seller
     * @param amount The amount to be traded
     * @param price The execution price
     * @param buyToken The private token the buyer is using (usually pFireToken)
     * @param sellToken The private token the seller is using (usually pWaterToken)
     */
    function executeMatch(
        uint256 buyOrderId,
        uint256 sellOrderId,
        address buyerAddress,
        address sellerAddress,
        uint256 amount,
        uint256 price,
        address buyToken,
        address sellToken
    ) external {
        // Verify caller is the ROFL app
        require(msg.sender == roflApp, "Only ROFL app can execute matches");
        
        // Verify orders haven't been filled already
        require(!filledOrders[buyOrderId], "Buy order already filled");
        require(!filledOrders[sellOrderId], "Sell order already filled");
        
        // Verify valid token addresses
        require(
            (buyToken == pFireToken && sellToken == pWaterToken) || 
            (buyToken == pWaterToken && sellToken == pFireToken),
            "Invalid token pair"
        );
        
        // Calculate the payment amount based on price and amount
        uint256 paymentAmount = (amount * price) / 1e18;
        
        // Execute the transfers using private tokens
        // Seller sends base tokens to buyer
        bool success1 = PrivateERC20(sellToken).transferFrom(
            sellerAddress,
            buyerAddress,
            amount
        );
        
        // Buyer sends quote tokens to seller
        bool success2 = PrivateERC20(buyToken).transferFrom(
            buyerAddress,
            sellerAddress,
            paymentAmount
        );
        
        require(success1 && success2, "Transfer failed");
        
        // Mark orders as filled
        filledOrders[buyOrderId] = true;
        filledOrders[sellOrderId] = true;
        
        // Emit match event
        emit OrderMatched(buyOrderId, sellOrderId, amount, price);
    }
    
    /**
     * @dev Get addresses of the private wrapped tokens
     * @return The addresses of pWaterToken and pFireToken
     */
    function getPrivateTokens() external view returns (address, address) {
        return (pWaterToken, pFireToken);
    }
}
