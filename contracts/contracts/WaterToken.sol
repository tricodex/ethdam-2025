// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WaterToken
 * @dev A standard ERC20 token implementation for the WATER token
 */
contract WaterToken is ERC20, Ownable {
    constructor() ERC20("Water Token", "WATER") Ownable(msg.sender) {
        // Initial supply: 1,000,000 WATER tokens (with 18 decimals)
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }
    
    /**
     * @dev Function to mint tokens (only owner)
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
