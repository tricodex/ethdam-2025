// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title PrivateERC20
 * @notice Interface for private ERC20 tokens on Oasis Sapphire
 * @dev Extends ERC20 with confidential transfer capabilities
 */
interface PrivateERC20 {
    /**
     * @notice Returns the name of the token
     */
    function name() external view returns (string memory);
    
    /**
     * @notice Returns the symbol of the token
     */
    function symbol() external view returns (string memory);
    
    /**
     * @notice Returns the number of decimals the token uses
     */
    function decimals() external view returns (uint8);
    
    /**
     * @notice Returns the total supply of the token
     */
    function totalSupply() external view returns (uint256);
    
    /**
     * @notice Returns the balance of an account
     * @param account The address to query the balance of
     */
    function balanceOf(address account) external view returns (uint256);
    
    /**
     * @notice Returns the remaining allowance of spender to transfer tokens from owner
     * @param owner The address that owns the tokens
     * @param spender The address authorized to spend the tokens
     */
    function allowance(address owner, address spender) external view returns (uint256);
    
    /**
     * @notice Transfer tokens to a recipient
     * @param recipient The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return True if the transfer succeeded
     */
    function transfer(address recipient, uint256 amount) external returns (bool);
    
    /**
     * @notice Transfer tokens from one address to another
     * @param sender The address to transfer tokens from
     * @param recipient The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return True if the transfer succeeded
     */
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    /**
     * @notice Approve a spender to transfer tokens
     * @param spender The address to authorize
     * @param amount The amount to authorize
     * @return True if the approval succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool);
    
    /**
     * @notice Request privacy access to allow contract to manipulate private balances
     */
    function requestPrivacyAccess() external;
    
    /**
     * @notice Transfer tokens from one address to another using encrypted methods
     * @param sender The address to transfer tokens from
     * @param recipient The address to transfer tokens to
     * @param amount The amount of tokens to transfer
     * @return True if the transfer succeeded
     */
    function transferFromEncrypted(address sender, address recipient, uint256 amount) external returns (bool);
    
    /**
     * @notice Mint tokens to an address
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external;
    
    /**
     * @notice Burn tokens from an address
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external;
} 