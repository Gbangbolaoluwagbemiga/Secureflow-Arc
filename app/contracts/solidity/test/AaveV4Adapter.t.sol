// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "./JobManagerBase.t.sol"; // for MockUSDC
import "../src/yield/AaveV4Adapter.sol";

/**
 * A stand-in for Aave V4 that keeps the one structural detail that matters.
 *
 * A Spoke is an entry point, not a treasury. Supplied assets settle into the
 * Hub behind it and the Spoke's own balance stays at zero. A mock that let the
 * Spoke hold the money would be easier to write and would have agreed with the
 * bug this file exists to catch, so the Spoke here never holds a cent.
 */
contract MockAaveHub {
    MockUSDC public immutable token;
    address public spoke;

    constructor(MockUSDC _token) {
        token = _token;
    }

    function setSpoke(address s) external {
        spoke = s;
    }

    /// Only the Spoke can move money out, as in the real thing.
    function pay(address to, uint256 amount) external {
        require(msg.sender == spoke, "MockAaveHub: not spoke");
        token.transfer(to, amount);
    }

    /// Borrowers taking liquidity out of the reserve.
    function lendOut(uint256 amount) external {
        token.transfer(address(0xB0110E4), amount);
    }
}

contract MockAaveSpoke is IAaveSpoke {
    MockUSDC public immutable token;
    MockAaveHub public immutable hub;

    mapping(address => uint256) public supplied;

    /// Basis points of a withdrawal actually paid out. 10000 = honest.
    uint256 public payoutBP = 10000;
    /// When true, report the full amount while paying less. A venue that lies.
    bool public overreport;

    constructor(MockUSDC _token, MockAaveHub _hub) {
        token = _token;
        hub = _hub;
    }

    function setPayoutBP(uint256 v) external {
        payoutBP = v;
    }

    function setOverreport(bool v) external {
        overreport = v;
    }

    /// Interest accruing on the position without new deposits.
    function accrue(address user, uint256 amount) external {
        supplied[user] += amount;
    }

    function supply(uint256, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256)
    {
        // The Spoke pulls, then forwards to the Hub. It keeps nothing.
        token.transferFrom(msg.sender, address(hub), amount);
        supplied[onBehalfOf] += amount;
        return (amount, amount);
    }

    function withdraw(uint256, uint256 amount, address onBehalfOf)
        external
        returns (uint256, uint256)
    {
        uint256 position = supplied[onBehalfOf];
        uint256 target = amount > position ? position : amount;
        uint256 paid = (target * payoutBP) / 10000;

        supplied[onBehalfOf] = position - paid;
        hub.pay(msg.sender, paid);

        return (paid, overreport ? target : paid);
    }

    function getUserSuppliedAssets(uint256, address user) external view returns (uint256) {
        return supplied[user];
    }
}

/**
 * THE ADAPTER THAT WILL HOLD ESCROW PRINCIPAL ON ARC.
 *
 * The money in here is a freelancer's unpaid wages, so the interesting tests
 * are not the ones where Aave behaves. They are the ones where the reserve has
 * been lent out and the escrow needs to know that BEFORE it promises a payout.
 */
contract AaveV4AdapterTest is Test {
    MockUSDC internal usdc;
    MockAaveHub internal hub;
    MockAaveSpoke internal spoke;
    AaveV4Adapter internal adapter;

    address internal vault = address(0xFA17);
    address internal outsider = address(0xBAD);

    uint256 internal constant RESERVE_ID = 7;
    uint256 internal constant DEPOSIT = 100_000e6;

    function setUp() public {
        usdc = new MockUSDC();
        hub = new MockAaveHub(usdc);
        spoke = new MockAaveSpoke(usdc, hub);
        hub.setSpoke(address(spoke));

        adapter = new AaveV4Adapter(
            vault, address(usdc), address(spoke), address(hub), RESERVE_ID
        );

        usdc.mint(vault, 1_000_000e6);
        vm.prank(vault);
        usdc.approve(address(adapter), type(uint256).max);
    }

    function _deposit(uint256 amount) internal {
        vm.prank(vault);
        adapter.deposit(amount);
    }

    /* ─────────── configuration ─────────── */

    function test_aHubThatIsNotSetIsRefused() public {
        vm.expectRevert(AaveV4Adapter.NotConfigured.selector);
        new AaveV4Adapter(vault, address(usdc), address(spoke), address(0), RESERVE_ID);
    }

    function test_theHubIsImmutableSoItCannotBeRepointedLater() public view {
        assertEq(adapter.hub(), address(hub));
    }

    /* ─────────── nobody but the vault ─────────── */

    function test_aStrangerCannotDeposit() public {
        usdc.mint(outsider, DEPOSIT);
        vm.startPrank(outsider);
        usdc.approve(address(adapter), DEPOSIT);
        vm.expectRevert(AaveV4Adapter.NotVault.selector);
        adapter.deposit(DEPOSIT);
        vm.stopPrank();
    }

    function test_aStrangerCannotWithdraw() public {
        _deposit(DEPOSIT);
        vm.prank(outsider);
        vm.expectRevert(AaveV4Adapter.NotVault.selector);
        adapter.withdraw(DEPOSIT);
    }

    /* ─────────── the money goes where Aave actually puts it ─────────── */

    function test_aDepositSettlesInTheHubAndNotTheSpoke() public {
        _deposit(DEPOSIT);

        assertEq(usdc.balanceOf(address(hub)), DEPOSIT, "hub should hold it");
        assertEq(usdc.balanceOf(address(spoke)), 0, "spoke holds nothing, ever");
        assertEq(usdc.balanceOf(address(adapter)), 0, "adapter keeps no float");
        assertEq(adapter.totalAssets(), DEPOSIT);
    }

    function test_aWithdrawalPaysTheVaultExactlyWhatItAskedFor() public {
        _deposit(DEPOSIT);
        uint256 before = usdc.balanceOf(vault);

        vm.prank(vault);
        uint256 got = adapter.withdraw(40_000e6);

        assertEq(got, 40_000e6, "must report exactly what was asked");
        assertEq(usdc.balanceOf(vault) - before, 40_000e6, "and pay the vault, not the escrow");
        assertEq(adapter.totalAssets(), 60_000e6);
    }

    function test_interestEarnedShowsUpInTotalAssets() public {
        _deposit(DEPOSIT);
        spoke.accrue(address(adapter), 1_300e6);
        assertEq(adapter.totalAssets(), DEPOSIT + 1_300e6);
    }

    /* ─────────── a venue that pays short ─────────── */

    function test_aShortWithdrawalRevertsRatherThanSilentlyPayingLess() public {
        _deposit(DEPOSIT);
        spoke.setPayoutBP(9_000); // pays 90% and says so

        vm.prank(vault);
        vm.expectRevert(AaveV4Adapter.ShortWithdrawal.selector);
        adapter.withdraw(10_000e6);
    }

    function test_aVenueThatOverreportsCannotMakeTheAdapterPayMoneyItDoesNotHave() public {
        _deposit(DEPOSIT);
        spoke.setPayoutBP(9_000);
        spoke.setOverreport(true); // claims the full amount, pays 90%

        // The claim clears the ShortWithdrawal check, so the only thing left
        // standing between a lying venue and a broken promise is the transfer
        // itself failing. It must fail.
        vm.prank(vault);
        vm.expectRevert();
        adapter.withdraw(10_000e6);
    }

    /* ─────────── withdrawability: the reason this file exists ─────────── */

    /**
     * The bug this replaces: `maxWithdrawable` bounded itself on the SPOKE's
     * balance. The Spoke never holds the asset, so it returned zero forever.
     * On Arc mainnet that reads as a reserve that can never pay out, and the
     * vault above would have deployed nothing while every mock-based test
     * carried on passing.
     */
    function test_withdrawabilityIsNotZeroJustBecauseTheSpokeHoldsNothing() public {
        _deposit(DEPOSIT);

        assertEq(usdc.balanceOf(address(spoke)), 0, "precondition: spoke is empty");
        assertEq(
            adapter.maxWithdrawable(),
            DEPOSIT,
            "an empty spoke must not mean an unwithdrawable position"
        );
    }

    function test_withdrawabilityIsCappedByOurOwnPositionWhenTheHubIsDeep() public {
        _deposit(DEPOSIT);
        usdc.mint(address(hub), 50_000_000e6); // other suppliers' money

        assertEq(
            adapter.maxWithdrawable(),
            DEPOSIT,
            "we cannot withdraw more than we put in, however deep the hub is"
        );
    }

    function test_withdrawabilityFallsWithTheHubWhenBorrowersTakeLiquidity() public {
        _deposit(DEPOSIT);
        hub.lendOut(70_000e6);

        assertEq(
            adapter.maxWithdrawable(),
            30_000e6,
            "the honest answer is what is left, not what we are owed"
        );
    }

    /**
     * The state Morpho's cirBTC/USDC market was actually in on 6 October 2026:
     * 100% utilisation, four dollars of liquidity against $193M supplied. An
     * adapter pointed at a reserve in that state must say so plainly, because
     * the escrow sizes its promises on this number.
     */
    function test_aFullyUtilisedReserveReportsNothingWithdrawable() public {
        _deposit(DEPOSIT);
        hub.lendOut(usdc.balanceOf(address(hub)));

        assertEq(adapter.maxWithdrawable(), 0, "fully lent out means zero, not optimism");
        assertEq(adapter.totalAssets(), DEPOSIT, "the position still exists, it just cannot be had");
    }

    function test_withdrawabilityRecoversWhenBorrowersRepay() public {
        _deposit(DEPOSIT);
        hub.lendOut(usdc.balanceOf(address(hub)));
        assertEq(adapter.maxWithdrawable(), 0);

        usdc.mint(address(hub), DEPOSIT); // repayment
        assertEq(adapter.maxWithdrawable(), DEPOSIT, "illiquidity is a state, not a death");
    }
}
