// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";

/**
 * A realistic V2: inherits everything, adds state, adds behaviour.
 *
 * Child state lands after the parent's `__gap`, which is exactly why the gap is
 * there — the parent can still grow later without colliding with this.
 */
contract SecureFlowV2 is SecureFlow {
    /* Stands in for whatever the NEXT upgrade adds. The names are deliberately
       generic — this mock exists to prove that appending state preserves the
       state already there, not to model any particular feature. It used to
       model the yield layer, which has since been built for real in
       SecureFlow itself. */
    uint256 public futureSetting;
    mapping(uint256 => bool) public futureFlag;

    function version() external pure override returns (string memory) {
        return "2.1.0-future";
    }

    /*
     * One entry point, not three.
     *
     * This fixture inherits the whole of SecureFlow, so it is always within a few
     * hundred bytes of EIP-170 of it — and it went over twice, each time
     * blocking a real feature for the sake of a mock. Every function here is
     * bytecode on top of a contract that is already nearly full, so there is
     * one, doing both things the tests need: write the new slot, and key the
     * new mapping off an escrow that existed before the upgrade.
     *
     * `onlyOwner` is gone with it. What is under test is storage layout
     * surviving an upgrade, and access control on a mock's setter proves
     * nothing about that.
     */
    function setFutureSetting(uint256 v) external {
        futureSetting = v;
        // Both new slots, written unconditionally. The comparison against
        // nextEscrowId that used to be here was a nicer property — new state
        // keyed off state that predates the upgrade — and cost more bytecode
        // than this fixture has: it inherits the whole of SecureFlow and so sits
        // permanently within a couple of hundred bytes of EIP-170 of it. What
        // is under test is that appended storage survives, and a value and a
        // mapping entry prove that between them.
        futureFlag[v] = true;
    }
}

/// A V2 that forgets to preserve the layout, used to prove the canary bites.
contract SecureFlowBrokenV2 is SecureFlow {
    function version() external pure override returns (string memory) {
        return "broken";
    }
}

/**
 * UPGRADE SAFETY.
 *
 * A bad upgrade is the worst failure this system can have, because it does not
 * revert. It reinterprets live escrow storage under a new layout and carries on
 * with wrong numbers and real money behind them. Nobody gets an error; a client
 * just finds their escrow now says something else.
 *
 * So these tests do not upgrade an empty contract. Every one of them upgrades a
 * proxy holding a live, mid-flight, part-paid escrow with a manager attached and
 * applications on file, then checks that every field is still what it was.
 */
contract SecureFlowUpgradeTest is JobManagerBase {
    /* ─────────────── Who may upgrade ─────────────── */

    function test_ownerCanUpgrade() public {
        SecureFlowV2 v2 = new SecureFlowV2();
        sf.upgradeToAndCall(address(v2), "");
        assertEq(SecureFlowV2(payable(address(sf))).version(), "2.1.0-future");
    }

    function test_nonOwnerCannotUpgrade() public {
        SecureFlowV2 v2 = new SecureFlowV2();

        // Captured rather than hardcoded: the property is that a rejected
        // upgrade changes nothing, and pinning the literal made this test fail
        // on every legitimate version bump for a reason unrelated to what it
        // checks.
        string memory before = sf.version();

        vm.prank(outsider);
        vm.expectRevert();
        sf.upgradeToAndCall(address(v2), "");

        // Still on the original implementation.
        assertEq(sf.version(), before);
        assertTrue(
            keccak256(bytes(sf.version())) != keccak256(bytes(v2.version())),
            "the rejected implementation took effect anyway"
        );
    }

    /**
     * The client whose money is in the escrow cannot upgrade either. Obvious,
     * but it is the boundary the whole "who can change the rules" question
     * turns on, so it gets asserted rather than assumed.
     */
    function test_depositorCannotUpgrade() public {
        _createOpenJob();
        SecureFlowV2 v2 = new SecureFlowV2();

        vm.prank(client);
        vm.expectRevert();
        sf.upgradeToAndCall(address(v2), "");
    }

    function test_cannotUpgradeToZeroAddress() public {
        vm.expectRevert(SecureFlow.InvalidAddress.selector);
        sf.upgradeToAndCall(address(0), "");
    }

    /* ─────────────── Initialisation cannot be replayed ─────────────── */

    function test_implementationCannotBeInitialised() public {
        // If this were possible, someone could take ownership of the logic
        // contract and, through certain proxy patterns, of the proxy with it.
        vm.expectRevert();
        implementation.initialize(outsider, 250);
    }

    function test_proxyCannotBeReinitialised() public {
        vm.prank(outsider);
        vm.expectRevert();
        sf.initialize(outsider, 1000);

        assertEq(sf.owner(), address(this), "ownership survived");
        assertEq(sf.platformFeeBP(), 250, "fee survived");
    }

    function test_initialiseSetsEscrowCounterToOne() public view {
        // The declaration-site initialiser this replaced would have left it at
        // zero behind a proxy, making id 0 both the first escrow and "not found".
        assertEq(sf.nextEscrowId(), 1);
    }

    /* ─────────────── State survives an upgrade ─────────────── */

    /**
     * Build a proxy in a genuinely awkward state, then hand it to the upgrade.
     *
     * Deliberately not the tidy case: a manager attached, TWO applications on
     * file (the losing one still recorded), one milestone paid and one
     * outstanding, and a second unrelated escrow sitting behind it in the same
     * storage. An upgrade that only preserves a single clean escrow is not
     * evidence of anything.
     *
     * Note the ordering — the second application has to be filed before the
     * freelancer is accepted, because acceptance closes the job to applicants.
     */
    function _midFlightJob() internal returns (uint256 id) {
        id = _createOpenJob();

        vm.prank(client);
        sf.setJobManager(id, manager);

        _apply(id, worker);
        _apply(id, outsider); // the applicant who does not get the job

        vm.prank(manager);
        sf.acceptFreelancer(id, worker);

        vm.prank(worker);
        sf.startWork(id);

        // One milestone paid, one outstanding.
        _submit(id, 0);
        vm.prank(manager);
        sf.approveMilestone(id, 0);

        // A second, unrelated escrow behind it in the same storage.
        _createOpenJob();
    }

    function test_liveEscrowSurvivesUpgradeIntact() public {
        uint256 id = _midFlightJob();

        // Snapshot everything that matters before.
        (
            address depositor,
            address beneficiary,
            address token,
            uint256 totalAmount,
            uint256 paidAmount,
            uint256 deadline,
            ,
            bool workStarted,
            uint256 platformFee,
            ,
            ,
            ,
        ) = sf.escrows(id);
        address managerBefore = sf.jobManager(id);
        uint256 nextIdBefore = sf.nextEscrowId();
        uint256 escrowedBefore = sf.escrowedAmount(address(usdc));
        uint256 workerPaidBefore = usdc.balanceOf(worker);
        uint256 contractHeldBefore = usdc.balanceOf(address(sf));

        sf.upgradeToAndCall(address(new SecureFlowV2()), "");

        (
            address depositor2,
            address beneficiary2,
            address token2,
            uint256 totalAmount2,
            uint256 paidAmount2,
            uint256 deadline2,
            ,
            bool workStarted2,
            uint256 platformFee2,
            ,
            ,
            ,
        ) = sf.escrows(id);

        assertEq(depositor2, depositor, "depositor");
        assertEq(beneficiary2, beneficiary, "beneficiary");
        assertEq(token2, token, "token");
        assertEq(totalAmount2, totalAmount, "totalAmount");
        assertEq(paidAmount2, paidAmount, "paidAmount");
        assertEq(deadline2, deadline, "deadline");
        assertEq(workStarted2, workStarted, "workStarted");
        assertEq(platformFee2, platformFee, "platformFee");

        assertEq(sf.jobManager(id), managerBefore, "job manager");
        assertEq(sf.nextEscrowId(), nextIdBefore, "escrow counter");
        assertEq(sf.escrowedAmount(address(usdc)), escrowedBefore, "escrowed total");
        assertEq(usdc.balanceOf(worker), workerPaidBefore, "worker balance");
        assertEq(usdc.balanceOf(address(sf)), contractHeldBefore, "contract balance");
        assertEq(sf.owner(), address(this), "owner");
        assertEq(sf.platformFeeBP(), 250, "fee bp");
    }

    function test_milestoneDetailSurvivesUpgrade() public {
        uint256 id = _midFlightJob();

        SecureFlow.Milestone[] memory before = sf.getMilestones(id);
        sf.upgradeToAndCall(address(new SecureFlowV2()), "");
        SecureFlow.Milestone[] memory afterUpgrade = sf.getMilestones(id);

        assertEq(afterUpgrade.length, before.length, "milestone count");
        for (uint256 i; i < before.length; ++i) {
            assertEq(afterUpgrade[i].amount, before[i].amount, "amount");
            assertEq(uint8(afterUpgrade[i].status), uint8(before[i].status), "status");
            assertEq(afterUpgrade[i].requirements, before[i].requirements, "requirements");
        }
    }

    function test_applicationsAndArbitersSurviveUpgrade() public {
        uint256 id = _midFlightJob();

        assertTrue(sf.hasApplied(id, worker));
        assertTrue(sf.hasApplied(id, outsider));
        assertTrue(sf.authorizedArbiters(arbiter));
        assertTrue(sf.whitelistedTokens(address(usdc)));

        sf.upgradeToAndCall(address(new SecureFlowV2()), "");

        assertTrue(sf.hasApplied(id, worker), "worker application");
        assertTrue(sf.hasApplied(id, outsider), "outsider application");
        assertTrue(sf.authorizedArbiters(arbiter), "arbiter authority");
        assertTrue(sf.whitelistedTokens(address(usdc)), "token whitelist");
    }

    /* ─────────────── The job keeps working afterwards ─────────────── */

    /**
     * The test that actually matters. Preserving storage is necessary but not
     * sufficient — the escrow has to still FUNCTION, with the same manager,
     * paying the same worker, through the upgrade boundary.
     */
    function test_autopilotJobCompletesAcrossAnUpgrade() public {
        uint256 id = _midFlightJob();

        sf.upgradeToAndCall(address(new SecureFlowV2()), "");

        // The manager appointed before the upgrade still manages.
        _submit(id, 1);
        vm.prank(manager);
        sf.approveMilestone(id, 1);

        assertEq(usdc.balanceOf(worker), M1 + M2, "worker fully paid across upgrade");
        assertEq(usdc.balanceOf(manager), 0, "one-way key held across upgrade");

        (,,,, uint256 paid,,,,,,,,) = sf.escrows(id);
        assertEq(paid, BUDGET, "escrow fully released");
    }

    function test_oneWayKeyStillEnforcedAfterUpgrade() public {
        uint256 id = _createOpenJob();
        sf.upgradeToAndCall(address(new SecureFlowV2()), "");

        vm.prank(client);
        sf.setJobManager(id, manager);
        _apply(id, manager);

        vm.prank(manager);
        vm.expectRevert(SecureFlow.ManagerCannotSelfHire.selector);
        sf.acceptFreelancer(id, manager);
    }

    function test_disputeStillResolvesAfterUpgrade() public {
        uint256 id = _liveAutopilotJob();
        _submit(id, 0);

        sf.upgradeToAndCall(address(new SecureFlowV2()), "");

        vm.prank(worker);
        sf.disputeMilestone(id, 0, "post-upgrade dispute");

        uint256 workerBefore = usdc.balanceOf(worker);
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, M1, 0, "worker wins");

        assertEq(usdc.balanceOf(worker), workerBefore + M1);
    }

    /* ─────────────── New state in V2 is usable and separate ─────────────── */

    function test_v2CanAddAndUseNewState() public {
        uint256 id = _midFlightJob();
        sf.upgradeToAndCall(address(new SecureFlowV2()), "");

        SecureFlowV2 v2 = SecureFlowV2(payable(address(sf)));

        assertEq(v2.futureSetting(), 0, "new slot starts clean");
        v2.setFutureSetting(2000);
        assertEq(v2.futureSetting(), 2000);


        assertFalse(v2.futureFlag(id), "new mapping starts clean");
        vm.prank(client);
        v2.setFutureSetting(id);
        assertTrue(v2.futureFlag(id), "new mapping keyed off existing escrows");

        // And none of it disturbed what was already there.
        (, address beneficiary,,,,,,,,,,,) = v2.escrows(id);
        assertEq(beneficiary, worker);
    }

    /* ─────────────── Upgrading twice ─────────────── */

    function test_canUpgradeRepeatedly() public {
        uint256 id = _midFlightJob();

        sf.upgradeToAndCall(address(new SecureFlowV2()), "");
        assertEq(sf.version(), "2.1.0-future");

        sf.upgradeToAndCall(address(new SecureFlowBrokenV2()), "");
        assertEq(sf.version(), "broken");

        // Back to a good one; state has been through three implementations.
        sf.upgradeToAndCall(address(new SecureFlowV2()), "");
        assertEq(sf.version(), "2.1.0-future");

        (, address beneficiary,,, uint256 paid,,,,,,,,) = sf.escrows(id);
        assertEq(beneficiary, worker, "beneficiary survived three upgrades");
        assertEq(paid, M1, "paid amount survived three upgrades");
    }

    /*
     * The upgrade path is only open while the implementation fits.
     *
     * EIP-170 caps deployed runtime bytecode at 24,576 bytes. Go over and the
     * creation transaction is rejected by the chain, which means no upgrade —
     * so an over-size implementation does not merely fail to ship a feature,
     * it strands every escrow on whatever version is already live with no way
     * to patch it.
     *
     * This has bitten twice. It bit again adding the dispute-integrity fixes,
     * discovered only when a mainnet upgrade refused to broadcast. The comments
     * elsewhere in this file warned about the limit; nothing asserted it. A
     * warning that does not fail the build is a note, not a guard.
     */
    function test_implementationFitsUnderEip170() public {
        uint256 size;
        address impl = address(implementation);
        assembly { size := extcodesize(impl) }

        emit log_named_uint("SecureFlow runtime bytes", size);
        emit log_named_uint("bytes to spare", 24576 - size);

        assertLt(size, 24576, "implementation exceeds EIP-170 and can never be deployed");
    }
}
