// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SecureFlow.sol";

contract WhitelistUSDCScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        // Hardcode the deployed contract address
        address payable secureFlowAddress = payable(0x7aB0853325529aF7EB5c4745413BF01E98c0020f);
        
        vm.startBroadcast(deployerPrivateKey);

        SecureFlow secureFlow = SecureFlow(secureFlowAddress);
        
        // Arc Testnet USDC address
        address usdcAddress = 0x3600000000000000000000000000000000000000;
        
        // Whitelist USDC
        secureFlow.whitelistToken(usdcAddress);
        
        console.log("USDC whitelisted:", usdcAddress);

        vm.stopBroadcast();
    }
}
