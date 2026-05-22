// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockUSDC.sol";

contract DeployUSDCScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        vm.startBroadcast(deployerPrivateKey);

        MockUSDC usdc = new MockUSDC(deployer);

        console.log("MockUSDC deployed to:", address(usdc));
        console.log("Deployer balance:", usdc.balanceOf(deployer) / 1e6, "USDC");

        vm.stopBroadcast();
    }
}
