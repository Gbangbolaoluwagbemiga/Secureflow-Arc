// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SecureFlow.sol";

contract WhitelistUSDCScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // Read from the environment. This was hardcoded to the Arc TESTNET
        // deployment, which on any other network points at an address with no
        // contract — the call would revert for a reason that looks nothing like
        // the actual mistake.
        address payable secureFlowAddress = payable(vm.envAddress("SECUREFLOW_ADDRESS"));
        
        vm.startBroadcast(deployerPrivateKey);

        SecureFlow secureFlow = SecureFlow(secureFlowAddress);
        
        // Arc's USDC ERC-20 interface. Same address on mainnet and testnet,
        // per Arc's contract-addresses reference. 6 decimals.
        address usdcAddress = 0x3600000000000000000000000000000000000000;
        
        // Whitelist USDC
        secureFlow.whitelistToken(usdcAddress);
        
        console.log("USDC whitelisted:", usdcAddress);

        vm.stopBroadcast();
    }
}
