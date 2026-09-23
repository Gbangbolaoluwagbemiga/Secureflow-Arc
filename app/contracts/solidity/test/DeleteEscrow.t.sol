// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./JobManagerBase.t.sol";

/**
 * deleteEscrow reads through a storage pointer it has already deleted.
 *
 *     delete escrows[escrowId];
 *     _removeFromUserEscrows(esc.depositor, escrowId);
 *     if (esc.beneficiary != address(0)) { ... }
 *
 * `esc` is a storage reference, so after the delete every field it exposes is
 * zero. The depositor is scrubbed from address(0)'s index instead of their own,
 * and the beneficiary branch cannot run because the address it tests is now
 * zero by construction.
 *
 * The escrow is gone from the mapping while both parties' index arrays still
 * name it, so getUserEscrows hands out an id that _requireEscrow rejects. The
 * funds are safe — deletion requires a terminal state with nothing left — but
 * the dashboard's "my jobs" list is left pointing at something that no longer
 * exists, for both parties, permanently.
 */
contract DeleteEscrowTest is JobManagerBase {
    function _completedJob() internal returns (uint256 id) {
        id = _liveAutopilotJob();
        _submit(id, 0);
        vm.prank(manager);
        sf.approveMilestone(id, 0);
        _submit(id, 1);
        vm.prank(manager);
        sf.approveMilestone(id, 1);
    }

    function test_deleteLeavesDanglingIndexEntries() public {
        uint256 id = _completedJob();

        assertEq(sf.getUserEscrows(client).length, 1, "client indexed before delete");
        assertEq(sf.getUserEscrows(worker).length, 1, "worker indexed before delete");

        sf.deleteEscrow(id); // owner

        assertEq(
            sf.getUserEscrows(client).length, 0,
            "client index still names a deleted escrow"
        );
        assertEq(
            sf.getUserEscrows(worker).length, 0,
            "worker index still names a deleted escrow"
        );
    }

    /**
     * The consequence a user actually meets: an id that the index hands out
     * and the contract then refuses to resolve.
     */
    function test_danglingEntryCannotBeResolved() public {
        uint256 id = _completedJob();
        sf.deleteEscrow(id);

        uint256[] memory stillListed = sf.getUserEscrows(client);
        if (stillListed.length > 0) {
            vm.expectRevert(SecureFlow.EscrowNotFound.selector);
            sf.getEscrow(stillListed[0]);
        }
    }
}
