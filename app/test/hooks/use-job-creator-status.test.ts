import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

/**
 * BEING ON A JOB IS NOT THE SAME AS HAVING PAID FOR ONE.
 *
 * This decides whether My Jobs shows a "Hiring" tab, and it was reading the
 * LENGTH of getUserEscrows — an index of every escrow a wallet touches, as
 * either party. The note in use-freelancer-status spells that out, and this
 * hook used the length anyway.
 *
 * So the moment a freelancer was hired, they became a job creator. My Jobs
 * grew a Hiring tab that could only ever say "No Escrows Found", because the
 * list behind it filters on the depositor and a hired freelancer is not it.
 * The page's own header comment promises the opposite: "A freelancer who has
 * never hired anybody does not need a permanently empty Hiring tab."
 *
 * The depositor funded the escrow. That is the only question here.
 */

const WALLET = "0xBA7E939394697E1C3374e2695771DEbbD14D7560";
const CLIENT = "0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41";

const getUserEscrows = vi.fn();
const getEscrowsBatch = vi.fn();

vi.mock("@/contexts/web3-context", () => ({
  useWeb3: () => ({ wallet: { address: WALLET, isConnected: true } }),
}));
vi.mock("@/lib/web3/contract-service", () => ({
  ContractService: vi.fn().mockImplementation(function Mock(this: any) {
    this.getUserEscrows = getUserEscrows;
    this.getEscrowsBatch = getEscrowsBatch;
  }),
}));

const { useJobCreatorStatus } = await import("@/hooks/use-job-creator-status");

beforeEach(() => {
  getUserEscrows.mockReset();
  getEscrowsBatch.mockReset();
});

describe("who counts as hiring", () => {
  it("does not call a hired freelancer a client", async () => {
    /* The live shape of escrow 1: the client funded it, this wallet was hired
       onto it. The index lists it for both of them. */
    getUserEscrows.mockResolvedValue([1]);
    getEscrowsBatch.mockResolvedValue({
      1: { depositor: CLIENT, beneficiary: WALLET },
    });

    const { result } = renderHook(() => useJobCreatorStatus());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isJobCreator).toBe(false);
  });

  it("recognises the wallet that actually funded the escrow", async () => {
    getUserEscrows.mockResolvedValue([1]);
    getEscrowsBatch.mockResolvedValue({
      1: { depositor: WALLET, beneficiary: CLIENT },
    });

    const { result } = renderHook(() => useJobCreatorStatus());

    await waitFor(() => expect(result.current.isJobCreator).toBe(true));
  });

  it("counts somebody who both hires and works", async () => {
    getUserEscrows.mockResolvedValue([1, 2]);
    getEscrowsBatch.mockResolvedValue({
      1: { depositor: CLIENT, beneficiary: WALLET },
      2: { depositor: WALLET, beneficiary: CLIENT },
    });

    const { result } = renderHook(() => useJobCreatorStatus());

    await waitFor(() => expect(result.current.isJobCreator).toBe(true));
  });

  it("asks nothing further when the wallet is on no escrows at all", async () => {
    getUserEscrows.mockResolvedValue([]);

    const { result } = renderHook(() => useJobCreatorStatus());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isJobCreator).toBe(false);
    /* No point multicalling an empty list. */
    expect(getEscrowsBatch).not.toHaveBeenCalled();
  });

  it("matches regardless of address casing", async () => {
    getUserEscrows.mockResolvedValue([1]);
    getEscrowsBatch.mockResolvedValue({
      1: { depositor: WALLET.toLowerCase(), beneficiary: CLIENT },
    });

    const { result } = renderHook(() => useJobCreatorStatus());

    await waitFor(() => expect(result.current.isJobCreator).toBe(true));
  });
});
