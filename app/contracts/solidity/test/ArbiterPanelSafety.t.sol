// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";

/**
 * Enforcing the named panel must never leave a dispute unresolvable.
 *
 * resolveDispute requires two things of a caller: global authorisation, and
 * membership of the panel this escrow named. createEscrow checks neither
 * against the arbiter list — it only checks that requiredConfirmations fits
 * the panel — so a client can name addresses that cannot arbitrate, and an
 * authorised arbiter is not on the panel. Both doors shut and the escrow's
 * money has nowhere to go.
 *
 * The same trap opens later even for a well-formed panel: authorisation is
 * revocable, so a panel that was valid at creation can be emptied by
 * revokeArbiter while a dispute is open.
 *
 * The rule these tests hold the contract to: the panel decides who rules when
 * anyone on it still can, and the protocol's arbiters remain the backstop when
 * nobody on it can. A job must never become unarbitrable.
 */
contract ArbiterPanelSafetyTest is JobManagerBase {
    address internal unauthorised = address(0xDEAD01);
    address internal panelMember = address(0xA4B17E4C);

    function _jobWithPanel(address[] memory panel) internal returns (uint256 id) {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = M1;
        amounts[1] = M2;
        string[] memory descs = new string[](2);
        descs[0] = "First";
        descs[1] = "Second";

        vm.prank(client);
        id = sf.createEscrow(
            address(0), address(usdc), BUDGET, 30, panel, 1, amounts, descs, "Logo", "A logo"
        );
        _apply(id, worker);
        vm.prank(client);
        sf.acceptFreelancer(id, worker);
        vm.prank(worker);
        sf.startWork(id);
        _submit(id, 0);
        vm.prank(worker);
        sf.disputeMilestone(id, 0, "needs a ruling");
    }

    /// A panel of addresses that were never authorised must not strand funds.
    function test_panelOfUnauthorisedAddressesDoesNotStrandTheJob() public {
        address[] memory panel = new address[](1);
        panel[0] = unauthorised; // never passed authorizeArbiter
        uint256 id = _jobWithPanel(panel);

        // The named address cannot arbitrate: it holds no protocol authority.
        vm.prank(unauthorised);
        vm.expectRevert(SecureFlow.Unauthorized.selector);
        sf.resolveDispute(id, 0, M1, 0, "I say so");

        // So the protocol's own arbiter must be able to, or the money is lost.
        uint256 before = usdc.balanceOf(worker);
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, M1, 0, "panel cannot act; protocol steps in");
        assertEq(usdc.balanceOf(worker) - before, M1, "dispute must remain resolvable");
    }

    /// A panel emptied by revocation mid-dispute must not strand funds either.
    function test_revokingThePanelMidDisputeDoesNotStrandTheJob() public {
        sf.authorizeArbiter(panelMember);

        address[] memory panel = new address[](1);
        panel[0] = panelMember;
        uint256 id = _jobWithPanel(panel);

        // The panel is valid here. Then the owner revokes them.
        sf.revokeArbiter(panelMember);

        vm.prank(panelMember);
        vm.expectRevert(SecureFlow.Unauthorized.selector);
        sf.resolveDispute(id, 0, M1, 0, "no longer authorised");

        uint256 before = usdc.balanceOf(worker);
        vm.prank(arbiter);
        sf.resolveDispute(id, 0, M1, 0, "backstop");
        assertEq(usdc.balanceOf(worker) - before, M1, "revocation must not lock the escrow");
    }

    /// The control: while the panel can act, only the panel acts.
    function test_aLivePanelStillExcludesOutsiders() public {
        sf.authorizeArbiter(panelMember);

        address[] memory panel = new address[](1);
        panel[0] = panelMember;
        uint256 id = _jobWithPanel(panel);

        // `arbiter` is authorised but not on this panel, and the panel can act.
        vm.prank(arbiter);
        vm.expectRevert(SecureFlow.Unauthorized.selector);
        sf.resolveDispute(id, 0, M1, 0, "not my job to rule on");

        uint256 before = usdc.balanceOf(worker);
        vm.prank(panelMember);
        sf.resolveDispute(id, 0, M1, 0, "the chosen arbiter rules");
        assertEq(usdc.balanceOf(worker) - before, M1, "panel member resolves");
    }
}
