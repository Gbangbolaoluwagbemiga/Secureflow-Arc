// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";

/**
 * Regression tests for four ways money could have left the contract wrongly.
 *
 * Each test here fails against the version of SecureFlow deployed before them.
 * They are written as the attack, not as the feature, because a test that only
 * walks the happy path is how all four survived the first 186.
 *
 *   1. A globally authorised arbiter who was not on the escrow's own panel
 *      could resolve that escrow's disputes. The panel was stored and never
 *      read.
 *   2. Dispute quorum was counted per escrow and never cleared, so the second
 *      dispute on a job executed on one arbiter's word regardless of how many
 *      confirmations the client had asked for.
 *   3. Quorum counted participation rather than agreement. Two arbiters
 *      proposing opposite splits reached quorum, and the money moved on
 *      whichever one called last.
 *   4. The thirty-day emergency refund ignored open disputes and submitted
 *      work, so a client could outlast arbitration and reclaim the budget for
 *      work that had already been delivered.
 */
contract DisputeIntegrityTest is JobManagerBase {
    address internal arbiterB = address(0xA4B17E4B);
    address internal strangerArbiter = address(0x57A46E4);

    function setUp() public override {
        super.setUp();
        // Both are arbiters as far as the protocol is concerned. Only the ones
        // an escrow names should be able to rule on that escrow.
        sf.authorizeArbiter(arbiterB);
        sf.authorizeArbiter(strangerArbiter);
    }

    /// Two-milestone job, panel of {arbiter, arbiterB}, `confirmations` needed.
    function _jobWithPanel(uint256 confirmations) internal returns (uint256 escrowId) {
        address[] memory panel = new address[](2);
        panel[0] = arbiter;
        panel[1] = arbiterB;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = M1;
        amounts[1] = M2;

        string[] memory descs = new string[](2);
        descs[0] = "First milestone";
        descs[1] = "Second milestone";

        vm.prank(client);
        escrowId = sf.createEscrow(
            address(0), address(usdc), BUDGET, 30, panel, confirmations, amounts, descs, "Logo", "A logo"
        );

        _apply(escrowId, worker);
        vm.prank(client);
        sf.acceptFreelancer(escrowId, worker);
        vm.prank(worker);
        sf.startWork(escrowId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. The panel a client chose is the panel that rules
    // ─────────────────────────────────────────────────────────────────────────

    function test_arbiterOutsideThePanelCannotResolve() public {
        uint256 id = _jobWithPanel(1);
        _submit(id, 0);
        vm.prank(worker);
        sf.disputeMilestone(id, 0, "client went quiet");

        // Authorised protocol-wide, but not named on this escrow.
        vm.prank(strangerArbiter);
        vm.expectRevert(SecureFlow.Unauthorized.selector);
        sf.resolveDispute(id, 0, M1, 0, "I say the worker wins");
    }

    function test_namedArbiterStillResolves() public {
        uint256 id = _jobWithPanel(1);
        _submit(id, 0);
        vm.prank(worker);
        sf.disputeMilestone(id, 0, "client went quiet");

        uint256 before = usdc.balanceOf(worker);
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, M1, 0, "work was delivered");
        assertEq(usdc.balanceOf(worker) - before, M1, "named arbiter must still be able to rule");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Quorum does not leak from one milestone to the next
    // ─────────────────────────────────────────────────────────────────────────

    function test_quorumDoesNotCarryOverToTheNextDispute() public {
        uint256 id = _jobWithPanel(2); // client asked for two confirmations

        // First dispute, resolved properly by both arbiters.
        _submit(id, 0);
        vm.prank(worker);
        sf.disputeMilestone(id, 0, "first disagreement");
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, M1, 0, "worker wins");
        vm.prank(arbiterB);
        sf.resolveDispute(id, 0, M1, 0, "worker wins");
        assertEq(usdc.balanceOf(worker), M1, "first dispute should have paid out");

        // Second dispute on the same escrow. One arbiter alone must not settle
        // it just because a previous dispute reached quorum.
        _submit(id, 1);
        vm.prank(worker);
        sf.disputeMilestone(id, 1, "second disagreement");

        uint256 workerBefore = usdc.balanceOf(worker);
        vm.prank(arbiter);
        sf.resolveDispute(id, 1, M2, 0, "worker wins again");
        assertEq(
            usdc.balanceOf(worker),
            workerBefore,
            "one arbiter settled the second dispute alone; quorum leaked across milestones"
        );

        // The second confirmation is what releases it.
        vm.prank(arbiterB);
        sf.resolveDispute(id, 1, M2, 0, "worker wins again");
        assertEq(usdc.balanceOf(worker) - workerBefore, M2, "quorum reached, payout expected");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Quorum means agreement on an outcome, not merely turning up
    // ─────────────────────────────────────────────────────────────────────────

    function test_disagreeingArbitersDoNotReachQuorum() public {
        uint256 id = _jobWithPanel(2);
        _submit(id, 0);
        vm.prank(worker);
        sf.disputeMilestone(id, 0, "disagreement");

        uint256 workerBefore = usdc.balanceOf(worker);
        uint256 clientBefore = usdc.balanceOf(client);

        // A says pay the worker in full.
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, M1, 0, "worker wins");

        // B says refund the client in full. That is not agreement, and it must
        // not execute on B's numbers using A's vote as the second confirmation.
        vm.prank(arbiterB);
        sf.resolveDispute(id, 0, 0, M1, "client wins");

        assertEq(usdc.balanceOf(worker), workerBefore, "no payout should occur without agreement");
        assertEq(usdc.balanceOf(client), clientBefore, "no refund should occur without agreement");

        // Once B comes round to A's split, it settles on those terms.
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, 0, M1, "conceding to the client");
        assertEq(usdc.balanceOf(client) - clientBefore, M1, "agreed split should settle");
        assertEq(usdc.balanceOf(worker), workerBefore, "worker gets nothing under the agreed split");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. The thirty-day hatch is for stalled jobs, not for winning arguments
    // ─────────────────────────────────────────────────────────────────────────

    function test_emergencyRefundBlockedWhileDisputeIsOpen() public {
        uint256 id = _jobWithPanel(1);
        _submit(id, 0);
        vm.prank(worker);
        sf.disputeMilestone(id, 0, "client will not approve");

        // Deadline plus the full emergency delay.
        vm.warp(block.timestamp + 30 days + 30 days + 1);

        vm.prank(client);
        vm.expectRevert(SecureFlow.CannotRefund.selector);
        sf.emergencyRefundAfterDeadline(id);
    }

    function test_emergencyRefundBlockedWhileWorkAwaitsReview() public {
        uint256 id = _jobWithPanel(1);
        _submit(id, 0); // delivered, sitting unapproved

        vm.warp(block.timestamp + 30 days + 30 days + 1);

        vm.prank(client);
        vm.expectRevert(SecureFlow.CannotRefund.selector);
        sf.emergencyRefundAfterDeadline(id);
    }

    function test_emergencyRefundStillWorksOnAGenuinelyStalledJob() public {
        uint256 id = _jobWithPanel(1);
        // Hired, started, and then the freelancer vanished. Nothing submitted,
        // nothing disputed — the case the hatch exists for.

        vm.warp(block.timestamp + 30 days + 30 days + 1);

        uint256 before = usdc.balanceOf(client);
        vm.prank(client);
        sf.emergencyRefundAfterDeadline(id);
        assertEq(usdc.balanceOf(client) - before, BUDGET, "stalled job must still be refundable");
    }
}
