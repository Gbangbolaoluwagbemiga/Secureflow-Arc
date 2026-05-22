// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Test USDC token for Arc Testnet. 6 decimals to match mainnet USDC.
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _DECIMALS = 6;

    constructor(address initialOwner) ERC20("USD Coin", "USDC") Ownable(initialOwner) {
        // Mint 10,000,000 USDC to the deployer for testing
        _mint(initialOwner, 10_000_000 * 10 ** _DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /// @notice Faucet — anyone can mint up to 10,000 USDC for testing
    function faucet(address to, uint256 amount) external {
        require(amount <= 10_000 * 10 ** _DECIMALS, "Max 10,000 USDC per faucet call");
        _mint(to, amount);
    }

    /// @notice Owner can mint any amount
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
