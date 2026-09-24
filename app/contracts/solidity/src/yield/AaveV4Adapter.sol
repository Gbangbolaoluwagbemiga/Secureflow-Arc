// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IYieldAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @dev The slice of Aave V4's Spoke this adapter needs. Signatures taken from
///      aave/aave-v4 src/spoke/interfaces/ISpoke.sol, not from a guess.
interface IAaveSpoke {
    function supply(uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256 shares, uint256 assets);

    function withdraw(uint256 reserveId, uint256 amount, address onBehalfOf)
        external
        returns (uint256 shares, uint256 assets);

    function getUserSuppliedAssets(uint256 reserveId, address user) external view returns (uint256);
}

/**
 * @title AaveV4Adapter
 * @notice Lends idle escrow into an Aave V4 reserve and pulls it back on payout.
 *
 * WHY LENDING RATHER THAN LIQUIDITY
 *
 * The other adapter here provides Uniswap liquidity, and it cannot run on Arc:
 * a stable/stable pair needs two USD-pegged assets and Arc has one. USDC is
 * native, EURC is euro, and a single-sided USDC position against EURC carries
 * FX exposure. That is a real risk of coming back with less than was put in,
 * and the principal is a freelancer's wages.
 *
 * Lending has no such exposure. Supply USDC, withdraw USDC, the only movement
 * is interest upward. No pair, no range, no tick, no conversion.
 *
 * WHAT THE SHAPE OF V4 CHANGES
 *
 * There is no aToken. A position is shares against a `reserveId` on a Spoke,
 * and `getUserSuppliedAssets` converts back to assets with interest included,
 * which is exactly what {IYieldAdapter-totalAssets} means. The Spoke PULLS the
 * asset from the caller, so this approves before supplying rather than sending.
 *
 * WHAT MAKES IT SAFE TO POINT LIVE ESCROW AT
 *
 *   1. Only the vault may move money. `deposit` and `withdraw` are onlyVault,
 *      so nobody else can push funds in or pull them out.
 *   2. No owner, no sweep, no rescue. Every rescue function is also a rug, and
 *      this holds money that belongs to somebody who has not been paid yet.
 *   3. `withdraw` delivers exactly what was asked or reverts, per
 *      {IYieldAdapter}. The circuit breaker upstream is built on telling those
 *      two cases apart, so returning less and reporting success would defeat it.
 *   4. `reserveId` and `spoke` are immutable. A reserve cannot be repointed at
 *      a different asset later while keeping an address people already trust.
 *
 * WHAT THIS DOES NOT PROTECT AGAINST
 *
 * Aave itself. Supplied capital is exposed to the protocol's own solvency and
 * to a reserve being drained by borrowers, which is what `maxWithdrawable`
 * reports and the vault's ceiling is sized against. That is a smaller risk
 * than an unaudited venue, not an absent one.
 */
contract AaveV4Adapter is IYieldAdapter {
    using SafeERC20 for IERC20;

    /// @notice The escrow vault. The only address that may move money here.
    address public immutable vault;

    /// @notice The supplied asset. On Arc this is USDC's ERC-20 interface.
    address public immutable token;

    /// @notice The Aave V4 Spoke this adapter supplies through.
    IAaveSpoke public immutable spoke;

    /// @notice Which reserve on that Spoke. Immutable so it cannot be repointed.
    uint256 public immutable reserveId;

    error NotVault();
    error NotConfigured();
    error WrongAsset();
    error ShortWithdrawal();

    event Deployed(uint256 assets);
    event Returned(uint256 assets);

    modifier onlyVault() {
        if (msg.sender != vault) revert NotVault();
        _;
    }

    constructor(address _vault, address _token, address _spoke, uint256 _reserveId) {
        if (_vault == address(0) || _token == address(0) || _spoke == address(0)) {
            revert NotConfigured();
        }
        vault = _vault;
        token = _token;
        spoke = IAaveSpoke(_spoke);
        reserveId = _reserveId;
    }

    function asset() external view returns (address) {
        return token;
    }

    /**
     * @notice Supply `assets` into the reserve.
     * @dev Payable because on Arc the asset is also the native unit, so the
     *      vault may deliver it either way. Both land in this contract's
     *      balance, and the Spoke is paid through the ERC-20 interface
     *      regardless, because that is the only thing it knows how to pull.
     */
    function deposit(uint256 assets) external payable onlyVault {
        if (msg.value != 0 && msg.value != assets) revert WrongAsset();
        if (msg.value == 0) {
            IERC20(token).safeTransferFrom(msg.sender, address(this), assets);
        }

        /* forceApprove rather than approve: some tokens refuse a non-zero to
           non-zero change, and a leftover allowance from a reverted supply
           would make the next one fail for a reason nobody would guess. */
        IERC20(token).forceApprove(address(spoke), assets);
        spoke.supply(reserveId, assets, address(this));
        IERC20(token).forceApprove(address(spoke), 0);

        emit Deployed(assets);
    }

    /**
     * @notice Return exactly `assets` to the vault, or revert.
     * @dev Aave treats an amount above the position as a full withdrawal, so
     *      what comes back is checked rather than assumed. Paying the escrow
     *      directly would leave the vault forwarding money it never received;
     *      the two existing adapters disagreed about this once, which is why
     *      {IYieldAdapter} spells it out.
     */
    function withdraw(uint256 assets) external onlyVault returns (uint256) {
        (, uint256 received) = spoke.withdraw(reserveId, assets, address(this));
        if (received < assets) revert ShortWithdrawal();

        IERC20(token).safeTransfer(vault, assets);

        emit Returned(assets);
        return assets;
    }

    /// @notice The position's worth right now, interest included.
    function totalAssets() external view returns (uint256) {
        return spoke.getUserSuppliedAssets(reserveId, address(this));
    }

    /**
     * @notice What could actually be withdrawn this block.
     * @dev The position is worthless as a promise if the reserve has lent it
     *      out. Bounded by the liquidity sitting in the Spoke, so the vault
     *      sizes deployments against what it can really get back rather than
     *      against a number that is only true when nobody is borrowing.
     */
    function maxWithdrawable() external view returns (uint256) {
        uint256 position = spoke.getUserSuppliedAssets(reserveId, address(this));
        uint256 liquid = IERC20(token).balanceOf(address(spoke));
        return position < liquid ? position : liquid;
    }
}
