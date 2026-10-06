// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";
import "./AaveV4Adapter.t.sol"; // MockAaveHub, MockAaveSpoke
import "../src/yield/SecureFlowYield.sol";
import "../src/yield/AaveV4Adapter.sol";

/**
 * THE WHOLE PATH REAL MONEY WILL TAKE ON ARC.
 *
 * Every other yield test drives a mock adapter that was written to be driven.
 * This one puts the contract that will actually be deployed in the middle —
 * escrow, to vault, to {AaveV4Adapter}, to an Aave Hub — and then does the
 * thing the venue cannot survive: lends the reserve out to 100% while a
 * freelancer is waiting to be paid.
 *
 * That is not a hypothetical. On 6 October 2026 Morpho's cirBTC/USDC market on
 * Arc held $193,147,665 supplied against $193,147,660 borrowed: four dollars of
 * liquidity, pinned there for a week. A venue reaching that state is the normal
 * case to design for, not the disaster.
 *
 * The promise under test is the one the product is sold on: the freelancer is
 * paid on approval, whatever the venue is doing.
 */
contract AaveV4VaultIntegrationTest is JobManagerBase {
    SecureFlowYield internal yield_;
    MockAaveHub internal hub;
    MockAaveSpoke internal spoke;
    AaveV4Adapter internal adapter;

    uint256 internal constant RESERVE_ID = 7;

    /// BUDGET 900, milestones 300 and 600, 10% buffer.
    /// Ceiling = 900 - (600 largest unpaid + 90 buffer) = 210.
    uint256 internal constant EXPECTED_DEPLOYED = 210e6;

    function setUp() public override {
        super.setUp();

        yield_ = new SecureFlowYield(address(sf));

        hub = new MockAaveHub(usdc);
        spoke = new MockAaveSpoke(usdc, hub);
        hub.setSpoke(address(spoke));

        adapter = new AaveV4Adapter(
            address(yield_), address(usdc), address(spoke), address(hub), RESERVE_ID
        );

        sf.setYieldController(address(yield_));
        yield_.setYieldAdapter(address(usdc), address(adapter));
    }

    /// A funded job, worker hired and started, opted in, capital deployed.
    function _earningJob() internal returns (uint256 id) {
        id = _createOpenJob();

        vm.prank(client);
        yield_.setYieldOptIn(id, true);

        _apply(id, worker);

        vm.prank(client);
        sf.acceptFreelancer(id, worker);

        vm.prank(worker);
        sf.startWork(id);

        yield_.investIdle(id);
    }

    /// Borrowers take every last cent of the reserve. 100% utilisation.
    function _fullyUtilise() internal {
        hub.lendOut(usdc.balanceOf(address(hub)));
    }

    /* ─────────── the happy path, through the real adapter ─────────── */

    function test_idleEscrowReachesTheHubThroughTheAdapter() public {
        uint256 id = _earningJob();

        assertEq(usdc.balanceOf(address(hub)), EXPECTED_DEPLOYED, "it should be in the hub");
        assertEq(usdc.balanceOf(address(spoke)), 0, "never the spoke");
        assertEq(adapter.totalAssets(), EXPECTED_DEPLOYED);
        assertEq(yield_.deployedAssets(address(usdc)), EXPECTED_DEPLOYED);
    }

    function test_theLargestUnpaidMilestoneIsNeverLent() public {
        _earningJob();

        // The escrow holds the budget plus the 2.5% platform fee, less what
        // went out to the venue. What matters is the comparison on the second
        // line: whatever stayed behind must cover the largest claim that could
        // land next, with nothing borrowed from the venue to do it.
        uint256 fee = (BUDGET * 250) / 10000;
        assertEq(usdc.balanceOf(address(sf)), BUDGET + fee - EXPECTED_DEPLOYED);
        assertGt(usdc.balanceOf(address(sf)), M2, "could not cover the largest claim");
    }

    /* ─────────── the venue goes to 100% while someone is owed ─────────── */

    function test_theFreelancerIsPaidEvenWhenTheReserveIsFullyUtilised() public {
        uint256 id = _earningJob();
        _fullyUtilise();

        assertEq(adapter.maxWithdrawable(), 0, "precondition: nothing can come out");

        uint256 before = usdc.balanceOf(worker);
        _submit(id, 0);
        vm.prank(client);
        sf.approveMilestone(id, 0);

        assertGt(usdc.balanceOf(worker), before, "the freelancer must still be paid");
    }

    function test_anIlliquidVenueCostsTheYieldAndNotThePayment() public {
        uint256 id = _earningJob();
        _fullyUtilise();

        _submit(id, 0);

        // The breaker is expected to trip. What matters is that it trips
        // instead of reverting the approval and stranding the freelancer.
        vm.recordLogs();
        vm.prank(client);
        sf.approveMilestone(id, 0);

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bool tripped;
        for (uint256 i; i < logs.length; ++i) {
            if (logs[i].topics[0] == keccak256("YieldCircuitBreakerTripped(address,uint256)")) {
                tripped = true;
            }
        }
        assertTrue(tripped, "an illiquid venue should trip the breaker, not pass silently");

        // And the position is still ours — unreachable, not lost.
        assertEq(adapter.totalAssets(), EXPECTED_DEPLOYED, "principal written off");
    }

    function test_thePositionComesBackOnceBorrowersRepay() public {
        uint256 id = _earningJob();
        _fullyUtilise();

        _submit(id, 0);
        vm.prank(client);
        sf.approveMilestone(id, 0);

        // Borrowers repay. The reserve is liquid again.
        usdc.mint(address(hub), EXPECTED_DEPLOYED);
        assertEq(adapter.maxWithdrawable(), EXPECTED_DEPLOYED, "should be reachable again");

        uint256 workerBefore = usdc.balanceOf(worker);
        _submit(id, 1);
        vm.prank(client);
        sf.approveMilestone(id, 1);

        // Paying the second milestone needs more cash than the escrow held, so
        // the vault reached into the venue for the difference and got it.
        assertEq(usdc.balanceOf(worker) - workerBefore, M2, "second milestone underpaid");
        assertLt(adapter.totalAssets(), EXPECTED_DEPLOYED, "nothing was recovered from the venue");
    }

    /**
     * A REMAINDER IS LEFT IN THE VENUE AFTER THE JOB ENDS.
     *
     * {SecureFlowYield-ensureLiquid} unwinds against the pool and has no
     * escrowId to debit, so `escrowDeployed` for this job stays at its old
     * figure while the real position shrinks underneath it. The closing
     * `onObligationChanged` then asks the venue for that stale figure.
     *
     * Aave treats a request above the position as a full withdrawal, so it
     * returns the smaller real balance; {AaveV4Adapter} sees less than it asked
     * for, raises ShortWithdrawal exactly as {IYieldAdapter} requires, and the
     * vault swallows the revert because this runs after someone has been paid.
     * The remainder stays deployed.
     *
     * Nobody is short-changed: the money is still tracked in `deployedAssets`
     * and the next escrow's unwind can reach it. But this job's position does
     * not close, and its yield is never attributed. The same staleness is
     * already documented two lines below where `claim` is built, where it is
     * capped for ATTRIBUTION but not for the withdrawal request itself.
     */
    function test_aPartialUnwindLeavesARemainderStrandedInTheVenue() public {
        uint256 id = _earningJob();
        _fullyUtilise();

        _submit(id, 0);
        vm.prank(client);
        sf.approveMilestone(id, 0);

        usdc.mint(address(hub), EXPECTED_DEPLOYED);

        _submit(id, 1);
        vm.prank(client);
        sf.approveMilestone(id, 1);

        uint256 stranded = adapter.totalAssets();
        assertGt(stranded, 0, "if this is zero the staleness has been fixed - rewrite this test");
        assertEq(
            yield_.deployedAssets(address(usdc)),
            stranded,
            "the remainder is still accounted for, just not recovered"
        );
    }

    /* ─────────── what the vault does NOT currently check ─────────── */

    /**
     * DOCUMENTS A GAP RATHER THAN A GUARANTEE.
     *
     * {IYieldAdapter-maxWithdrawable} says "the escrow reads this before it
     * promises anything". It does not. Nothing in {SecureFlowYield} calls it,
     * so a reserve that is visibly at 100% utilisation — unable to return a
     * cent — is still a reserve this vault will deposit fresh escrow into.
     *
     * Nobody is short-changed when that happens: the cash buffer still covers
     * every claim, which the tests above prove. The cost is that capital goes
     * somewhere it cannot come back from, in exchange for a yield that only
     * exists because the reserve is drained. For escrow whose principal is
     * someone else's wages, that is a trade worth refusing.
     *
     * If `investableAmount` is ever made to consult the venue's liquidity,
     * this test should start failing and be rewritten as the guarantee.
     */
    function test_todayTheVaultWillDeployIntoAReserveItCannotWithdrawFrom() public {
        uint256 id = _createOpenJob();

        vm.prank(client);
        yield_.setYieldOptIn(id, true);

        _apply(id, worker);
        vm.prank(client);
        sf.acceptFreelancer(id, worker);
        vm.prank(worker);
        sf.startWork(id);

        // The venue is dead before a cent is sent to it.
        usdc.mint(address(hub), 1_000e6);
        _fullyUtilise();
        assertEq(adapter.maxWithdrawable(), 0, "precondition: venue cannot pay out");

        yield_.investIdle(id);

        assertEq(
            yield_.deployedAssets(address(usdc)),
            EXPECTED_DEPLOYED,
            "current behaviour: it deploys anyway, because nothing asks the venue"
        );
        assertEq(adapter.maxWithdrawable(), EXPECTED_DEPLOYED, "only our own fresh deposit is there");
    }

    /**
     * DOES THE NEXT ESCROW PICK THE REMAINDER UP?
     *
     * The stranded remainder is still counted in `deployedAssets`, which is a
     * pool-wide figure, so the question is whether a later escrow's unwind can
     * reach it — and if it can, whose money it is when it comes back.
     *
     * This test answers that empirically rather than by reading the code.
     */
    function test_whatTheNextEscrowDoesWithAStrandedRemainder() public {
        /* ── escrow A strands a remainder ── */
        uint256 a = _earningJob();
        _fullyUtilise();

        _submit(a, 0);
        vm.prank(client);
        sf.approveMilestone(a, 0);

        usdc.mint(address(hub), EXPECTED_DEPLOYED);

        _submit(a, 1);
        vm.prank(client);
        sf.approveMilestone(a, 1);

        uint256 stranded = adapter.totalAssets();
        assertGt(stranded, 0, "precondition: escrow A left something behind");
        emit log_named_decimal_uint("stranded by A", stranded, 6);

        /* ── escrow B runs normally afterwards ── */
        uint256 b = _earningJob();

        uint256 pooledAfterB = yield_.deployedAssets(address(usdc));
        uint256 heldAfterB = adapter.totalAssets();
        emit log_named_decimal_uint("pool after B deploys", pooledAfterB, 6);
        emit log_named_decimal_uint("venue holds after B", heldAfterB, 6);

        _submit(b, 0);
        vm.prank(client);
        sf.approveMilestone(b, 0);

        _submit(b, 1);
        vm.prank(client);
        sf.approveMilestone(b, 1);

        uint256 leftInVenue = adapter.totalAssets();
        uint256 leftInBooks = yield_.deployedAssets(address(usdc));
        emit log_named_decimal_uint("venue holds at the end", leftInVenue, 6);
        emit log_named_decimal_uint("books say deployed", leftInBooks, 6);

        /*
         * THE ANSWER IS NO. It is not swept, and it accumulates.
         *
         * B deployed 210 and recovered exactly 210, leaving A's 22.5 untouched.
         * `onObligationChanged` unwinds against the escrow being closed, so a
         * remainder belonging to an escrow that has already finished is never
         * what any later unwind asks for. Each stranding adds to the last.
         *
         * The books are not wrong, which is the saving grace: `deployedAssets`
         * and the venue agree exactly, so nothing is lost or double counted.
         * The capital is simply parked in the venue with no caller that will
         * ever ask for it, and the yield on it is never attributed to anyone.
         *
         * Fixing the stale claim at SecureFlowYield.sol:459 stops it happening
         * in the first place. A sweep for remainders already stranded would be
         * a separate, second thing.
         */
        assertEq(leftInVenue, stranded, "a later escrow should not have touched it");
        assertEq(leftInBooks, stranded, "but the books still account for it exactly");
    }
}
