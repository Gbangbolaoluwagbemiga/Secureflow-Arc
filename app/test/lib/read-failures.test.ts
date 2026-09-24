import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * A READ THAT FAILED IS NOT AN ANSWER.
 *
 * Two reads underpin nearly every list in this app, and both used to turn a
 * failure into a confident, wrong answer:
 *
 *   getUserEscrows  → []  which renders "No Escrows Found"
 *   getNextEscrowId → 1   which makes `for (i = 1; i < nextId)` never run,
 *                         and Browse Freelancers say "No freelancers found yet"
 *
 * The public RPC rate-limits with HTTP 429, and the moment it is most likely
 * to is right after a transaction, when every surface refetches at once. So
 * the app claimed a freelancer who had just completed a job and been rated
 * five stars did not exist.
 *
 * Both retry now. They still fall back to the same shape, because callers have
 * nothing else to accept, but only after the read is genuinely exhausted.
 */

const nextEscrowId = vi.fn();
const getUserEscrows = vi.fn();

vi.mock("viem", async () => {
  const actual = await vi.importActual<typeof import("viem")>("viem");
  return {
    ...actual,
    createPublicClient: () => ({}),
    getContract: () => ({ read: { nextEscrowId, getUserEscrows } }),
  };
});
vi.mock("@/lib/web3/config", () => ({
  CONTRACTS: { ATELIER_ESCROW: "0xbdeb44945979a01584fd7d796a71C707D2F83372" },
  getCurrentNetwork: () => ({ chainId: 5042, name: "Arc", rpcUrl: "https://rpc.mainnet.arc.io" }),
  ARC_TESTNET: { id: 5042 },
  ZERO_ADDRESS: "0x0000000000000000000000000000000000000000",
}));

const { ContractService } = await import("@/lib/web3/contract-service");

beforeEach(() => {
  nextEscrowId.mockReset();
  getUserEscrows.mockReset();
});

describe("reads that the RPC refused", () => {
  it("retries the escrow count rather than reporting an empty platform", async () => {
    /* 429 twice, then success — the shape of a rate limit under a burst. */
    nextEscrowId
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockResolvedValueOnce(7n);

    const svc = new ContractService("0xbdeb44945979a01584fd7d796a71C707D2F83372");
    await expect(svc.getNextEscrowId()).resolves.toBe(7);
    expect(nextEscrowId).toHaveBeenCalledTimes(3);
  });

  it("retries the user's escrow ids too", async () => {
    getUserEscrows
      .mockRejectedValueOnce(new Error("rate limit exceeded"))
      .mockResolvedValueOnce([1n, 2n]);

    const svc = new ContractService("0xbdeb44945979a01584fd7d796a71C707D2F83372");
    await expect(svc.getUserEscrows("0xabc")).resolves.toEqual([1, 2]);
    expect(getUserEscrows).toHaveBeenCalledTimes(2);
  });

  it("gives up only after three attempts, not on the first refusal", async () => {
    nextEscrowId.mockRejectedValue(new Error("rate limit exceeded"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const svc = new ContractService("0xbdeb44945979a01584fd7d796a71C707D2F83372");
    /* 1 is still what callers get — they have no other shape — but it is an
       exhausted read now, and the log says which. */
    await expect(svc.getNextEscrowId()).resolves.toBe(1);
    expect(nextEscrowId).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("getNextEscrowId failed"),
      expect.anything(),
    );
    warn.mockRestore();
  });
});
