import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/*
 * config.ts opens with `import "dotenv/config"`, which reads a local .env and
 * writes it straight into process.env — after this test has cleared the keys
 * it wants absent. Whoever ran it next got the answer their own .env implied
 * rather than the answer the code gives, which is the one way a test about
 * configuration can be actively misleading. Neutralised for this file only.
 */
vi.mock("dotenv/config", () => ({}));

/**
 * THE CHAIN AND THE ADDRESS HAVE TO AGREE.
 *
 * Chain id, both RPC endpoints, the escrow address, the block logs are scanned
 * from and Circle's network name were six independent environment variables,
 * each with its own testnet default. When the escrow default was changed to a
 * mainnet-looking address, the chain id beside it stayed 5042002 — and that
 * combination fails in the one way nobody looks for. Every call is answered,
 * by testnet, where nothing is deployed at that address; so the bot reports an
 * empty marketplace rather than an error, and the logs say nothing at all.
 *
 * It got worse: the address that sat in this file as the mainnet default has
 * no code on chain 5042. It was the TESTNET proxy the whole time. A bot
 * pointed at "mainnet" by that default would have been reading an address that
 * does not exist.
 *
 * These tests exist because a comment saying "keep these in sync" is not a
 * mechanism. Reading the config is the only way to find out what it decided,
 * so that is what they do.
 */

/** config.ts reads process.env once, at import. */
async function loadConfig(env: Record<string, string | undefined>) {
  vi.resetModules();
  const saved = { ...process.env };
  for (const k of Object.keys(env)) {
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
  try {
    return await import("../src/config.js");
  } finally {
    process.env = saved;
  }
}

/** Anything that could carry over from a developer's shell or a .env file. */
const CLEAN = {
  ARC_CHAIN_ID: undefined,
  ARC_NETWORK: undefined,
  ARC_RPC_URL: undefined,
  ARC_LOG_RPC_URL: undefined,
  ATELIER_CONTRACT_ADDRESS: undefined,
  ATELIER_DEPLOY_BLOCK: undefined,
  CIRCLE_BLOCKCHAIN: undefined,
  GATEWAY_FACILITATOR_URL: undefined,
};

const TESTNET_ESCROW = "0x6142bf4855D4F9dbC1cD8109377d4F4E2AF1ab59";
const MAINNET_ESCROW = "0xbdeb44945979a01584fd7d796a71C707D2F83372";

describe("which chain the daemon is on", () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("stays on testnet when nothing says otherwise", async () => {
    const { arcChain, config } = await loadConfig(CLEAN);

    /* A missing variable must never be the thing that points the agent's
       wallet at real money. */
    expect(arcChain.id).toBe(5042002);
    expect(arcChain.testnet).toBe(true);
    expect(config.atelierAddress).toBe(TESTNET_ESCROW);
  });

  it("moves the whole set to mainnet together, not one field at a time", async () => {
    const { arcChain, config, rpcUrl, logRpcUrl } = await loadConfig({
      ...CLEAN,
      ARC_CHAIN_ID: "5042",
    });

    expect(arcChain.id).toBe(5042);
    expect(arcChain.testnet).toBe(false);
    expect(config.atelierAddress).toBe(MAINNET_ESCROW);
    expect(config.atelierDeployBlock).toBe(22260326n);
    expect(config.circleBlockchain).toBe("ARC");
    expect(rpcUrl).not.toMatch(/testnet/i);
    expect(logRpcUrl).not.toMatch(/testnet/i);
  });

  it("never serves the testnet address as a mainnet default", async () => {
    const { config } = await loadConfig({ ...CLEAN, ARC_CHAIN_ID: "5042" });

    /* The original bug, stated directly. 0x6142bf… has no code on 5042. */
    expect(config.atelierAddress.toLowerCase()).not.toBe(TESTNET_ESCROW.toLowerCase());
  });

  it("ignores an RPC override left over from the other network", async () => {
    const { rpcUrl } = await loadConfig({
      ...CLEAN,
      ARC_CHAIN_ID: "5042",
      ARC_RPC_URL: "https://rpc.drpc.testnet.arc.network",
    });

    /* A stale override silently moved the web app to the wrong chain once
       already: balances came back from testnet while the UI said mainnet.
       Refusing it out loud is the difference between a puzzle and a log line. */
    expect(rpcUrl).toBe("https://rpc.mainnet.arc.io");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("ARC_RPC_URL"));
  });

  it("still accepts an override that matches the network", async () => {
    const { rpcUrl } = await loadConfig({
      ...CLEAN,
      ARC_CHAIN_ID: "5042",
      ARC_RPC_URL: "https://my-own-arc-node.example.com",
    });

    expect(rpcUrl).toBe("https://my-own-arc-node.example.com");
    expect(warn).not.toHaveBeenCalled();
  });

  it("takes ARC_NETWORK=mainnet as well, for a deploy that never sets a chain id", async () => {
    const { arcChain } = await loadConfig({ ...CLEAN, ARC_NETWORK: "mainnet" });
    expect(arcChain.id).toBe(5042);
  });
});
