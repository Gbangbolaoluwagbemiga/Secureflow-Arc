import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

/**
 * THE WATCHER ONLY REACHES THIS TAB.
 *
 * watchManager is an in-page pub/sub. It tells other instances of this hook in
 * the same document, which is what makes the client's own card update the
 * moment they delegate. The freelancer is in a different browser, so nothing
 * reached them at all: their "Agent managed" chip stayed on after the client
 * took the job back, and only a hard refresh cleared it. The badge was telling
 * them an agent still decided their payment when it no longer did.
 *
 * There is no push to subscribe to, so it re-reads when the tab becomes
 * visible — one call, at the moment a stale answer starts being looked at.
 */

const getJobManager = vi.fn();
vi.mock("@/lib/web3/contract-service", () => ({
  contractService: { getJobManager: (id: number) => getJobManager(id) },
}));
vi.mock("wagmi", () => ({
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
  usePublicClient: () => ({ waitForTransactionReceipt: vi.fn() }),
}));
vi.mock("@/contexts/web3-context", () => ({
  useWeb3: () => ({ wallet: { address: "0xclient", isConnected: true } }),
}));
vi.mock("@/lib/atelier/agent-api", () => ({ AUTOPILOT_CONFIGURED: true }));

const { useJobManager } = await import("@/hooks/use-job-manager");

const AGENT = "0x5e8bba91898d8c2b6a235619180dbe93e956fc08";

beforeEach(() => getJobManager.mockReset());

describe("keeping the manager answer fresh", () => {
  it("picks up a revoke that happened in someone else's browser", async () => {
    getJobManager.mockResolvedValue(AGENT);
    const { result } = renderHook(() => useJobManager(1));
    await waitFor(() => expect(result.current.manager).toBe(AGENT));

    /* The client revokes elsewhere. Nothing in this tab hears about it.
       getJobManager maps the zero address to null, so that is what a revoked
       job actually reads as. */
    getJobManager.mockResolvedValue(null);

    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await waitFor(() => expect(result.current.manager).toBeNull());
  });

  it("re-reads on window focus too, for a tab that never went hidden", async () => {
    getJobManager.mockResolvedValue(AGENT);
    const { result } = renderHook(() => useJobManager(1));
    await waitFor(() => expect(result.current.manager).toBe(AGENT));

    const before = getJobManager.mock.calls.length;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(getJobManager.mock.calls.length).toBeGreaterThan(before));
  });

  it("stops listening once unmounted", async () => {
    getJobManager.mockResolvedValue(AGENT);
    const { result, unmount } = renderHook(() => useJobManager(1));
    await waitFor(() => expect(result.current.manager).toBe(AGENT));

    unmount();
    const after = getJobManager.mock.calls.length;
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    /* A listener left behind would keep polling the chain for a card that is
       no longer on screen. */
    expect(getJobManager.mock.calls.length).toBe(after);
  });
});
