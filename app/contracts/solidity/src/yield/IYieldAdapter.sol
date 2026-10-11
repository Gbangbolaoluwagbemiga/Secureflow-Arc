// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IYieldAdapter
 * @notice The escrow's entire view of a yield venue.
 *
 * WHY THIS INTERFACE IS SO SMALL
 *
 * SecureFlow holds other people's money. The yield layer is the only part of
 * this system that can lose some, so the escrow is allowed to know as little
 * about it as possible: put money in, take money out, ask how much is there.
 * No pool ids, no ticks, no swap paths, no callbacks. A venue that needs the
 * escrow to understand it is a venue the escrow should not be using.
 *
 * THE RULE EVERY IMPLEMENTATION MUST HOLD
 *
 *   withdraw(assets) either transfers exactly `assets` back, or reverts.
 *
 * It must never transfer less and report success. The escrow's circuit breaker
 * is built on being able to tell those apart: a revert is survivable and is
 * caught, a silent shortfall is a hole in an escrow nobody notices until a
 * freelancer is not paid.
 *
 * Implementations are expected to be STABLE-STABLE ONLY (USDC/USDT and the
 * like). Impermanent loss on a volatile pair is a loss of principal, and
 * principal is not ours to gamble.
 */
interface IYieldAdapter {
    /// @notice The asset this adapter accepts. address(0) means native.
    function asset() external view returns (address);

    /**
     * @notice Deploy `assets` into the venue.
     * @dev Called with the tokens already transferred in, or with msg.value for
     *      native. Reverting is always acceptable — the escrow treats a failed
     *      deposit as "stay in cash", which is never wrong, only unprofitable.
     */
    function deposit(uint256 assets) external payable;

    /**
     * @notice Return exactly `assets` to the caller, or revert.
     * @return withdrawn Always equal to `assets` on success. Returned rather
     *         than assumed so a caller can assert it and catch an implementation
     *         that lies.
     */
    /**
     * @dev Withdrawn assets MUST be sent to msg.sender — the vault that called,
     *      not the escrow behind it. SecureFlowYield forwards them on itself, so an
     *      adapter that pays the escrow directly leaves the vault trying to
     *      forward money it never received. The two implementations disagreed
     *      about this once; saying it here is what stops them disagreeing again.
     */
    function withdraw(uint256 assets) external returns (uint256 withdrawn);

    /**
     * @notice Everything this adapter currently holds for the caller, priced in
     *         `asset`, including yield earned.
     */
    function totalAssets() external view returns (uint256);

    /**
     * @notice What could be withdrawn RIGHT NOW without slipping past tolerance.
     * @dev The escrow reads this before it promises anything. It is allowed to
     *      be lower than totalAssets — an illiquid moment is a real state and
     *      the honest answer is a smaller number, not an optimistic one.
     *
     *      Bounded by what we hold: with no position this is zero. That makes
     *      it the wrong question to ask before a FIRST deposit, which is what
     *      {availableLiquidity} is for.
     */
    function maxWithdrawable() external view returns (uint256);

    /**
     * @notice The venue's own free liquidity, independent of what we hold.
     *
     * WHY THIS IS SEPARATE FROM {maxWithdrawable}
     *
     * {maxWithdrawable} answers "how much of MY position can I get back", so it
     * is zero before the first deposit and would make the escrow refuse to ever
     * start. This answers "could this venue give money back to anyone", which
     * is the question worth asking BEFORE handing it any.
     *
     * A lending reserve borrowed to its last cent still accepts deposits and
     * pays its best rate while doing so, because the rate rises with
     * utilisation. That is the trap this exists to see: capital put somewhere
     * it cannot come back from, earning well precisely because it is stuck.
     *
     * A venue with no such constraint — plain custody, say — may return
     * `type(uint256).max`, meaning "I am never the limiting factor".
     */
    function availableLiquidity() external view returns (uint256);
}
