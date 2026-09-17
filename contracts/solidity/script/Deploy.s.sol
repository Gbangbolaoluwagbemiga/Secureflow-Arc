// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SecureFlow.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Fee collector defaults to the deployer; override with FEE_COLLECTOR.
        address feeCollector = vm.envOr("FEE_COLLECTOR", vm.addr(deployerPrivateKey));

        // 100 bp = 1%, matching the live Arc testnet deployment and the copy
        // shown to every freelancer ("the 1% network fee is paid by the client").
        // This script said 250, so deploying it unchanged would have charged
        // clients 2.5x testnet and made that sentence untrue on day one.
        uint256 platformFeeBP = vm.envOr("PLATFORM_FEE_BP", uint256(100));

        SecureFlow secureFlow = new SecureFlow(feeCollector, platformFeeBP);

        console.log("SecureFlow deployed to:", address(secureFlow));

        vm.stopBroadcast();
    }
}
