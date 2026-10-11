// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/yield/SecureFlowYield.sol";
import "../src/yield/AaveV4Adapter.sol";

/**
 * Point the yield controller at Aave V4 on Arc.
 *
 *   YIELD_CONTROLLER=0x… forge script script/DeployAaveV4Adapter.s.sol \
 *     --rpc-url arc_mainnet --broadcast
 *
 * Deliberately separate from DeployYield.s.sol, which attaches the controller
 * and stops there. Choosing a venue is a decision about other people's wages
 * and deserves its own transaction and its own moment of thought.
 *
 * WHY AAVE AND NOT MORPHO
 *
 * Measured on Arc mainnet, 11 October 2026:
 *
 *   Aave V4 USDC      1.31% supply   $36.1M withdrawable   42.7% utilised
 *   Morpho cirBTC/USDC 1.92% supply    $185k withdrawable   99.9% utilised
 *
 * Morpho pays more. That 0.6% is the price of the liquidity it does not have:
 * its rate is high *because* the reserve is lent out. Escrow principal is a
 * freelancer's unpaid wages and has to come back the instant a client approves,
 * so the lower rate is the only one this contract can actually spend.
 *
 * Also checked: all 32 Morpho V2 vaults on Arc expose exactly one adapter, so
 * a curated vault gives the same liquidity profile as the single market beneath
 * it. There is nothing to diversify into yet.
 *
 * ADDRESSES are from bgd-labs/aave-address-book (AaveV4Arc), verified live.
 * The Hub and the Spoke are different contracts and the difference matters: a
 * Spoke is an entry point and holds nothing, the Hub holds the liquidity.
 */
contract DeployAaveV4AdapterScript is Script {
    /// Arc mainnet, chain 5042.
    address constant USDC = 0x3600000000000000000000000000000000000000;
    address constant CORE_HUB = 0x17288dfc86205301064577b98B02b81017e6F79C;
    address constant MAIN_SPOKE = 0xB843bdC3a87A05E77E07Df9FE48928b3A34b134d;

    /// USDC on the Main Spoke. Read from getReserve(i) on 11 October 2026:
    /// id 0 USDC, id 1 EURC, id 2 cirBTC, id 3 WETH.
    uint256 constant USDC_RESERVE_ID = 0;

    /// Refuse to deploy into a reserve this shallow. Not a safety mechanism —
    /// the contract has its own — just a sign that something is badly wrong.
    uint256 constant MIN_SANE_LIQUIDITY = 1_000_000e6;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address controller = vm.envAddress("YIELD_CONTROLLER");

        require(block.chainid == 5042, "not Arc mainnet");

        vm.startBroadcast(pk);
        AaveV4Adapter adapter = new AaveV4Adapter(
            controller, USDC, MAIN_SPOKE, CORE_HUB, USDC_RESERVE_ID
        );
        vm.stopBroadcast();

        /*
         * Check the venue before handing it the escrow, not after. If the
         * reserve is drained the adapter is still correct — it would simply
         * report nothing deployable — but a deploy into a dead reserve is
         * worth stopping to look at rather than discovering later.
         */
        uint256 liquid = adapter.availableLiquidity();
        console.log("AaveV4Adapter:", address(adapter));
        console.log("hub liquidity (USDC, 6dp):", liquid);
        require(adapter.asset() == USDC, "adapter points at the wrong asset");
        require(liquid >= MIN_SANE_LIQUIDITY, "reserve too shallow, look before attaching");

        /*
         * Attaching is left as a separate call on purpose. Everything above is
         * reversible; this is the line after which real escrow can move.
         *
         *   SecureFlowYield(controller).setYieldAdapter(USDC, address(adapter));
         */
        console.log("NOT attached. To go live, call as owner:");
        console.log("  setYieldAdapter(address,address) on", controller);
        console.log("  token:", USDC);
        console.log("  adapter:", address(adapter));
    }
}
