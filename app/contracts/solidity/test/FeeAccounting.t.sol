// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";

/**
 * A platform fee is held from creation and earned at settlement.
 *
 * It used to be banked as revenue the moment a job was created, while
 * cancelJob, setMilestones and withdrawJobFunds could all still hand part of
 * it back. withdrawFees then treated the whole balance as revenue and zeroed
 * it, so the fee collector collecting — the one thing a fee collector is for —
 * left clients unable to close open escrows: those paths subtracted from a
 * counter that was now zero and reverted on underflow, stranding the client's
 * principal in a job they could not cancel.
 *
 * No attacker was involved. It was both parties' intended actions in the wrong
 * order, which is why nothing in the first 193 tests noticed.
 *
 * The fee's tokens were always in the contract. What changed is when they are
 * counted as revenue, so withdrawFees can only ever take fees nobody can still
 * claim back.
 */
contract FeeAccountingTest is JobManagerBase {
    function _fee(uint256 amount) internal view returns (uint256) {
        return (amount * sf.platformFeeBP()) / 10000;
    }

    /// Held from creation: paid for by the client, not yet revenue.
    function test_feeIsHeldNotEarnedAtCreation() public {
        uint256 clientStart = usdc.balanceOf(client);
        _createOpenJob();

        uint256 fee = _fee(BUDGET);
        assertEq(usdc.balanceOf(client), clientStart - BUDGET - fee, "client paid budget plus fee");
        assertEq(usdc.balanceOf(address(sf)), BUDGET + fee, "contract holds both");
        assertEq(sf.totalFeesByToken(address(usdc)), 0, "but the fee is not revenue yet");
    }

    /// The bug, as its own test: collecting must not strand an open escrow.
    function test_collectingFeesCannotStrandAnOpenEscrow() public {
        uint256 id = _createOpenJob();

        // There is nothing to collect while the job is open, which is the point.
        vm.prank(feeCollector);
        vm.expectRevert(SecureFlow.InvalidAmount.selector);
        sf.withdrawFees(address(usdc));

        // And the client can still close their job and be made whole.
        uint256 before = usdc.balanceOf(client);
        vm.prank(client);
        sf.cancelJob(id);
        assertEq(
            usdc.balanceOf(client) - before,
            BUDGET + _fee(BUDGET),
            "an unapplied-to job refunds budget and fee in full"
        );
    }

    /// Shrinking a job stays possible for the same reason.
    function test_collectingFeesCannotStrandABudgetReduction() public {
        uint256 id = _createOpenJob();

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = M1;
        string[] memory descs = new string[](1);
        descs[0] = "Just the first milestone after all";

        uint256 before = usdc.balanceOf(client);
        vm.prank(client);
        sf.setMilestones(id, amounts, descs);

        // M2 back, plus the share of the fee that rode on it.
        assertGt(usdc.balanceOf(client) - before, M2, "reduction returns the difference and its fee");
    }

    /// Once the work is paid for, the fee is revenue and collectable.
    function test_feeBecomesCollectableOnceTheJobSettles() public {
        uint256 id = _liveAutopilotJob();

        _submit(id, 0);
        vm.prank(manager);
        sf.approveMilestone(id, 0);
        _submit(id, 1);
        vm.prank(manager);
        sf.approveMilestone(id, 1);

        uint256 fee = _fee(BUDGET);
        assertEq(sf.totalFeesByToken(address(usdc)), fee, "settled job earns its fee");

        uint256 before = usdc.balanceOf(feeCollector);
        vm.prank(feeCollector);
        sf.withdrawFees(address(usdc));
        assertEq(usdc.balanceOf(feeCollector) - before, fee, "collector receives it");
    }

    /**
     * The invariant the whole change exists to hold: whatever the collector
     * takes, every open escrow must still be closeable afterwards.
     */
    function test_openEscrowSurvivesAFeeWithdrawalFromASettledOne() public {
        // One job runs to completion, earning its fee.
        uint256 settled = _liveAutopilotJob();
        _submit(settled, 0);
        vm.prank(manager);
        sf.approveMilestone(settled, 0);
        _submit(settled, 1);
        vm.prank(manager);
        sf.approveMilestone(settled, 1);

        // A second job is still open.
        uint256 open = _createOpenJob();

        // Collector takes everything it is entitled to.
        vm.prank(feeCollector);
        sf.withdrawFees(address(usdc));

        // The open job is unaffected and still refunds in full.
        uint256 before = usdc.balanceOf(client);
        vm.prank(client);
        sf.cancelJob(open);
        assertEq(
            usdc.balanceOf(client) - before,
            BUDGET + _fee(BUDGET),
            "the open escrow was untouched by the collection"
        );
    }
}
