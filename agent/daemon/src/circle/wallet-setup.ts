import "dotenv/config";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { arcNetwork, config, explorerAddress } from "../config.js";

/**
 * One-time setup for Atelier's Circle Programmable Wallet (MPC custody).
 *
 *   npm run circle:setup
 *
 * Creates a wallet set + one MPC wallet on Arc Testnet, DEDICATED to Atelier, and
 * prints the env lines to paste into daemon/.env. This reuses the SAME Circle
 * account (CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET) already registered for the
 * Foreman project — no need to re-register an entity secret — but provisions a
 * brand-new wallet so Atelier's treasury and on-chain identity stay separate from
 * Foreman's. Circle holds the key shares — no raw key ever exists in Atelier.
 *
 * Prerequisite: CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET already set in daemon/.env
 * (copy them from Foreman/.env — same Circle developer account, different wallet).
 */
async function main() {
  const apiKey = config.circleApiKey;
  const entitySecret = config.circleEntitySecret;
  if (!apiKey || !entitySecret) {
    console.error(
      "✗ Set CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in daemon/.env first.\n" +
        "  Reuse the values from Foreman/.env — same Circle account, new wallet.",
    );
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  console.log("→ Creating wallet set 'Atelier Treasury'…");
  const wsRes: any = await client.createWalletSet({ name: "Atelier Treasury" });
  const walletSetId: string | undefined = wsRes?.data?.walletSet?.id;
  if (!walletSetId) throw new Error("no wallet set id returned");

  console.log(`→ Creating an MPC wallet on ${config.circleBlockchain}…`);
  const wRes: any = await client.createWallets({
    walletSetId,
    blockchains: [config.circleBlockchain as never],
    count: 1,
    accountType: "EOA",
  });
  const wallet = wRes?.data?.wallets?.[0];
  if (!wallet?.address) throw new Error("no wallet returned");

  console.log("\n✅ Atelier Agent Wallet created — key shares held by Circle, no raw key in Atelier.\n");
  console.log("   wallet id : " + wallet.id);
  console.log("   address   : " + wallet.address);
  console.log("   chain     : " + (wallet.blockchain ?? config.circleBlockchain));
  console.log("\n── Add these to daemon/.env ──");
  console.log(`CIRCLE_WALLET_ID=${wallet.id}`);
  console.log(`CIRCLE_WALLET_ADDRESS=${wallet.address}`);
  /*
   * This said "fund it from the faucet" unconditionally, which was true for
   * the whole of this project's life until the day it was not. On mainnet
   * there is no faucet: the line sends somebody looking for one, and the
   * wallet it is telling them to fund spends real money. What to do next
   * depends on the network, so it says which network it is on.
   */
  if (arcNetwork.isTestnet) {
    console.log("\nNext: fund that address with testnet USDC on Arc (faucet), then start the daemon.");
  } else {
    console.log("\n⚠ This wallet is on Arc MAINNET. It spends real USDC.");
    console.log("\nNext: send real USDC to that address — there is no faucet. USDC is the gas");
    console.log("token on Arc, so an empty wallet cannot sign anything at all, and the agent");
    console.log("will look idle rather than unfunded.");
    console.log(`\n  ${explorerAddress(wallet.address)}`);
  }
  console.log("\nSet spending policy caps via the Circle console before it holds anything");
  console.log("worth capping — the daemon's own DAILY_SPEND_CAP_USDC is a second cage, not");
  console.log("the first one.\n");
}

main().catch((e) => {
  console.error("✗ circle:setup failed:", e?.response?.data ?? e?.message ?? e);
  process.exit(1);
});
