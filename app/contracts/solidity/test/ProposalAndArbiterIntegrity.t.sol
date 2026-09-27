// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";

/**
 * Three ways money could have gone wrong, none of which the first 204 tests
 * touched. Each of these fails against the implementation live on mainnet.
 *
 *   1. A milestone proposal could change the AMOUNT. approveMilestoneProposal
 *      wrote it onto the milestone without moving a token or adjusting
 *      esc.totalAmount, so the milestones stopped summing to the money. After
 *      that paidAmount can never equal totalAmount, the escrow can never reach
 *      Released, and the balance is stuck until the emergency window. Both
 *      parties get there by using the UI as intended.
 *
 *   2. resolveDispute checked that the ESCROW was disputed and never that the
 *      MILESTONE was. While a job was disputed over one milestone, an arbiter
 *      could pass the index of a different milestone that was already approved
 *      and already paid, and pay it a second time out of the rest of the job.
 *
 *   3. Nothing stopped a party to the escrow from arbitrating it. Authorise a
 *      freelancer as an arbiter, which is a reasonable thing to want to do,
 *      and they could award themselves the whole milestone.
 */
contract ProposalAndArbiterIntegrityTest is JobManagerBase {
    /// Two-milestone job, panel of {arbiter, worker}, one confirmation.
    /// The worker is on the panel on purpose: test 3 is about that being safe.
    function _job() internal returns (uint256 escrowId) {
        address[] memory panel = new address[](2);
        panel[0] = arbiter;
        panel[1] = worker;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = M1;
        amounts[1] = M2;

        string[] memory descs = new string[](2);
        descs[0] = "First milestone";
        descs[1] = "Second milestone";

        vm.prank(client);
        escrowId = sf.createEscrow(
            address(0), address(usdc), BUDGET, 30, panel, 1, amounts, descs, "Logo", "A logo"
        );

        _apply(escrowId, worker);
        vm.prank(client);
        sf.acceptFreelancer(escrowId, worker);
        vm.prank(worker);
        sf.startWork(escrowId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. A proposal renegotiates scope, never price
    // ─────────────────────────────────────────────────────────────────────────

    function test_proposalCannotChangeTheAmount() public {
        uint256 id = _job();

        vm.prank(worker);
        vm.expectRevert(SecureFlow.InvalidAmount.selector);
        sf.proposeMilestoneChange(id, 1, M2 + 1, "this one is bigger than we said");
    }

    function test_proposalStillRenegotiatesScope() public {
        uint256 id = _job();

        vm.prank(worker);
        sf.proposeMilestoneChange(id, 1, M2, "same money, tighter brief");
        vm.prank(client);
        sf.approveMilestoneProposal(id, 1);

        assertEq(sf.getEscrow(id).totalAmount, BUDGET, "renegotiating scope must not move the budget");
    }

    /// The invariant the old code broke: the milestones always sum to the money.
    function test_approvedProposalLeavesTheJobFinishable() public {
        uint256 id = _job();

        vm.prank(worker);
        sf.proposeMilestoneChange(id, 1, M2, "clarified");
        vm.prank(client);
        sf.approveMilestoneProposal(id, 1);

        _submit(id, 0);
        vm.prank(client);
        sf.approveMilestone(id, 0);
        _submit(id, 1);
        vm.prank(client);
        sf.approveMilestone(id, 1);

        assertEq(
            uint8(sf.getEscrow(id).status),
            uint8(SecureFlow.EscrowStatus.Released),
            "a job whose proposal was approved must still be able to finish"
        );
    }

    function test_proposalCannotBeApprovedOnAFinishedJob() public {
        uint256 id = _job();

        vm.prank(worker);
        sf.proposeMilestoneChange(id, 1, M2, "clarified");

        // Push the ESCROW into Disputed via the other milestone, leaving the
        // proposal on milestone 1 pending.
        _submit(id, 0);
        vm.prank(client);
        sf.disputeMilestone(id, 0, "not what I asked for");

        vm.prank(client);
        vm.expectRevert(SecureFlow.InvalidEscrowStatus.selector);
        sf.approveMilestoneProposal(id, 1);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. A disputed escrow does not make every milestone resolvable
    // ─────────────────────────────────────────────────────────────────────────

    function test_arbiterCannotResolveAnAlreadyPaidMilestone() public {
        uint256 id = _job();

        // Milestone 0 is delivered, approved and paid.
        _submit(id, 0);
        vm.prank(client);
        sf.approveMilestone(id, 0);

        // Milestone 1 goes to dispute, so the ESCROW is now Disputed.
        _submit(id, 1);
        vm.prank(client);
        sf.disputeMilestone(id, 1, "not what I asked for");

        uint256 workerBefore = usdc.balanceOf(worker);

        // Index 0, not 1. Already approved, already paid.
        vm.prank(arbiter);
        vm.expectRevert(SecureFlow.InvalidMilestone.selector);
        sf.resolveDispute(id, 0, M1, 0, "paying this one again");

        assertEq(usdc.balanceOf(worker), workerBefore, "no milestone may be paid twice");
    }

    function test_theActuallyDisputedMilestoneStillResolves() public {
        uint256 id = _job();

        _submit(id, 1);
        vm.prank(client);
        sf.disputeMilestone(id, 1, "not what I asked for");

        uint256 before = usdc.balanceOf(worker);
        vm.prank(arbiter);
        sf.resolveDispute(id, 1, M2, 0, "work was delivered");
        assertEq(usdc.balanceOf(worker) - before, M2, "the disputed milestone must still resolve");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Nobody rules on their own job
    // ─────────────────────────────────────────────────────────────────────────

    function test_theFreelancerCannotArbitrateTheirOwnJob() public {
        // Exactly the configuration somebody reaches for when they want more
        // arbiters and pick people who already use the platform.
        sf.authorizeArbiter(worker);

        uint256 id = _job();
        _submit(id, 1);
        vm.prank(client);
        sf.disputeMilestone(id, 1, "not what I asked for");

        uint256 before = usdc.balanceOf(worker);

        vm.prank(worker);
        vm.expectRevert(SecureFlow.SelfDealing.selector);
        sf.resolveDispute(id, 1, M2, 0, "I find in my own favour");

        assertEq(usdc.balanceOf(worker), before, "a party must not pay themselves by arbitrating");
    }

    function test_theClientCannotArbitrateTheirOwnJob() public {
        sf.authorizeArbiter(client);

        uint256 id = _job();
        _submit(id, 1);
        vm.prank(worker);
        sf.disputeMilestone(id, 1, "client went quiet");

        vm.prank(client);
        vm.expectRevert(SecureFlow.SelfDealing.selector);
        sf.resolveDispute(id, 1, 0, M2, "I refund myself");
    }
}
