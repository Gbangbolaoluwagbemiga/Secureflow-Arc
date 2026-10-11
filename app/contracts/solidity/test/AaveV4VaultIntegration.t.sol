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

    /// Other suppliers' money already in the reserve. A real one is never empty,
    /// and an empty one is now correctly refused, so the fixture seeds it.
    uint256 internal constant SEED = 50_000_000e6;

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

        usdc.mint(address(hub), SEED);
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

        assertEq(usdc.balanceOf(address(hub)), SEED + EXPECTED_DEPLOYED, "it should be in the hub");
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
     * A PARTIAL UNWIND NO LONGER STRANDS A REMAINDER.
     *
     * {SecureFlowYield-ensureLiquid} unwinds against the pool and has no
     * escrowId to debit, so `escrowDeployed` goes stale while the real position
     * shrinks under it. The closing claim used to ask the venue for that stale
     * figure; Aave treats an over-ask as a full withdrawal and returns the
     * smaller real balance, {AaveV4Adapter} correctly refuses a short
     * withdrawal, and the vault swallowed the revert because a freelancer had
     * already been paid. The leftover then sat in the venue forever, since no
     * later escrow's unwind ever asked for it either.
     *
     * The claim is now capped at the live pool, so the position closes.
     */
    function test_aPartialUnwindClosesThePositionInsteadOfStrandingIt() public {
        uint256 id = _earningJob();
        _fullyUtilise();

        _submit(id, 0);
        vm.prank(client);
        sf.approveMilestone(id, 0);

        usdc.mint(address(hub), SEED); // borrowers repay

        _submit(id, 1);
        vm.prank(client);
        sf.approveMilestone(id, 1);

        assertEq(adapter.totalAssets(), 0, "a remainder was left behind in the venue");
        assertEq(yield_.deployedAssets(address(usdc)), 0, "the books still think we are deployed");
    }

    /**
     * The same thing from the pool's side: a second escrow runs after the first
     * has finished, and neither leaves anything behind.
     */
    function test_twoEscrowsInSequenceBothCloseCleanly() public {
        uint256 a = _earningJob();
        _fullyUtilise();

        _submit(a, 0);
        vm.prank(client);
        sf.approveMilestone(a, 0);

        usdc.mint(address(hub), SEED);

        _submit(a, 1);
        vm.prank(client);
        sf.approveMilestone(a, 1);

        assertEq(adapter.totalAssets(), 0, "escrow A left something behind");

        uint256 b = _earningJob();
        assertEq(yield_.deployedAssets(address(usdc)), EXPECTED_DEPLOYED, "B did not deploy");

        _submit(b, 0);
        vm.prank(client);
        sf.approveMilestone(b, 0);
        _submit(b, 1);
        vm.prank(client);
        sf.approveMilestone(b, 1);

        assertEq(adapter.totalAssets(), 0, "escrow B left something behind");
        assertEq(yield_.deployedAssets(address(usdc)), 0, "books and venue disagree at rest");
    }

    /**
     * THE GUARANTEE THAT REPLACED A GAP.
     *
     * {SecureFlowYield-investableAmount} now asks the venue how much free
     * liquidity it has before sending it anything, so a reserve lent out to its
     * last cent gets nothing — however good the rate looks while it is there.
     *
     * This test was written the other way round first, asserting that the vault
     * deployed anyway, because that was the behaviour. It is the same scenario
     * with the expectation inverted.
     */
    function test_theVaultRefusesToDeployIntoAReserveItCannotWithdrawFrom() public {
        uint256 id = _createOpenJob();

        vm.prank(client);
        yield_.setYieldOptIn(id, true);

        _apply(id, worker);
        vm.prank(client);
        sf.acceptFreelancer(id, worker);
        vm.prank(worker);
        sf.startWork(id);

        // Borrowers take the reserve to zero before a cent is sent to it.
        _fullyUtilise();
        assertEq(adapter.availableLiquidity(), 0, "precondition: venue has no free liquidity");
        assertGt(yield_.investableCeiling(id), 0, "precondition: the escrow itself is willing");

        yield_.investIdle(id);

        assertEq(yield_.investableAmount(id), 0, "a dry venue must be offered nothing");
        assertEq(yield_.deployedAssets(address(usdc)), 0, "escrow principal went into a dead reserve");
        assertEq(usdc.balanceOf(address(sf)), BUDGET + (BUDGET * 250) / 10000, "cash should be untouched");
    }

    function test_deploymentResumesOnceTheReserveHasDepthAgain() public {
        uint256 id = _createOpenJob();
        vm.prank(client);
        yield_.setYieldOptIn(id, true);
        _apply(id, worker);
        vm.prank(client);
        sf.acceptFreelancer(id, worker);
        vm.prank(worker);
        sf.startWork(id);

        _fullyUtilise();
        yield_.investIdle(id);
        assertEq(yield_.deployedAssets(address(usdc)), 0);

        usdc.mint(address(hub), SEED); // borrowers repay
        yield_.investIdle(id);

        assertEq(
            yield_.deployedAssets(address(usdc)),
            EXPECTED_DEPLOYED,
            "illiquidity should pause deployment, not end it"
        );
    }

    function test_aShallowReserveIsDeployedIntoOnlyAsDeepAsItGoes() public {
        uint256 id = _createOpenJob();
        vm.prank(client);
        yield_.setYieldOptIn(id, true);
        _apply(id, worker);
        vm.prank(client);
        sf.acceptFreelancer(id, worker);
        vm.prank(worker);
        sf.startWork(id);

        // Drain to a sliver: less than the ceiling, more than nothing.
        _fullyUtilise();
        usdc.mint(address(hub), 25e6);

        yield_.investIdle(id);

        assertEq(
            yield_.deployedAssets(address(usdc)),
            25e6,
            "should take the venue's depth as the cap, not the escrow's ceiling"
        );
    }
}
