import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * ONE PERSON, ONE ADDRESS — EVEN WHEN THE DAEMON FORGETS THEM.
 *
 * The wallet was created unconditionally and its id stored in SQLite, which
 * made that row the only link between a person and their money. The store
 * lives on the container's disk, and a deploy without a mounted volume erases
 * it — which happened mid-signup: the worker answered with their name, the
 * container was replaced, and the next command told them they had never
 * signed up. A second /start produced a SECOND wallet, while the first sat
 * holding their gas with nothing left that knew whose it was.
 *
 * refId is Circle's own answer, documented for "associating wallets with
 * entities in your own systems". The Telegram id goes on the wallet, so the
 * store is a cache of something recoverable rather than the only copy.
 */

const listWallets = vi.fn();
const createWallets = vi.fn();
const createWalletSet = vi.fn();

vi.mock("@circle-fin/developer-controlled-wallets", () => ({
  initiateDeveloperControlledWalletsClient: () => ({ listWallets, createWallets, createWalletSet }),
}));
vi.mock("../src/circle/circleSigner.js", () => ({ createCircleSigner: vi.fn() }));
vi.mock("../src/config.js", () => ({
  arcNetwork: { isTestnet: false },
  arcChain: { id: 5042 },
  rpcUrl: "https://rpc.mainnet.arc.io",
  config: {
    circleApiKey: "k",
    circleEntitySecret: "s",
    circleBlockchain: "ARC",
    workerWalletSetId: "set-1",
    usdcAddress: "0x3600000000000000000000000000000000000000",
  },
}));

const { provisionWorkerWallet } = await import("../src/workers/wallets.js");

const EXISTING = { id: "w-old", address: "0xaaaa000000000000000000000000000000000001" };
const FRESH = { id: "w-new", address: "0xbbbb000000000000000000000000000000000002" };

beforeEach(() => {
  listWallets.mockReset();
  createWallets.mockReset();
  createWallets.mockResolvedValue({ data: { wallets: [FRESH] } });
});

describe("the wallet behind a Telegram signup", () => {
  it("comes back to the same address when the daemon has forgotten the person", async () => {
    listWallets.mockResolvedValue({ data: { wallets: [EXISTING] } });

    const w = await provisionWorkerWallet("telegram:12345");

    expect(w.address).toBe(EXISTING.address);
    /* The whole point: no second wallet, so no orphaned gas. */
    expect(createWallets).not.toHaveBeenCalled();
    expect(listWallets).toHaveBeenCalledWith(
      expect.objectContaining({ refId: "telegram:12345", walletSetId: "set-1" }),
    );
  });

  it("stamps the person's id onto a wallet it does create", async () => {
    listWallets.mockResolvedValue({ data: { wallets: [] } });

    const w = await provisionWorkerWallet("telegram:12345");

    expect(w.address).toBe(FRESH.address);
    expect(createWallets).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: [{ refId: "telegram:12345" }] }),
    );
  });

  it("still issues a wallet when the lookup itself fails", async () => {
    listWallets.mockRejectedValue(new Error("circle unreachable"));

    const w = await provisionWorkerWallet("telegram:12345");

    /* A failed lookup is not proof there is no wallet, but locking somebody
       out over a transient error is worse than a duplicate. */
    expect(w.address).toBe(FRESH.address);
    expect(createWallets).toHaveBeenCalled();
  });

  it("does not look up or stamp anything without a ref", async () => {
    const w = await provisionWorkerWallet("");

    expect(listWallets).not.toHaveBeenCalled();
    expect(w.address).toBe(FRESH.address);
    expect(createWallets).toHaveBeenCalledWith(
      expect.not.objectContaining({ metadata: expect.anything() }),
    );
  });
});
