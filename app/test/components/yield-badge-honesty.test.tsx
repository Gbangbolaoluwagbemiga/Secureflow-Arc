import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * OPTED IN IS NOT THE SAME AS EARNING.
 *
 * The chip said "Escrow yield" whenever the escrow had opted in, regardless of
 * whether a venue existed to earn in. On mainnet that was the live state:
 * yieldAdapter(USDC) was the zero address, deployedAssets was 0, escrowYield
 * was 0, and the card told the client their money was working.
 *
 * `available` was already computed correctly from the adapter. It gated the
 * opt-in offer and not the badge, so the one surface that made a claim was the
 * one not checking it.
 */

const getYieldStatus = vi.fn();
vi.mock("@/lib/web3/contract-service", () => ({
  ContractService: vi.fn().mockImplementation(function Mock(this: any) {
    this.getYieldStatus = getYieldStatus;
  }),
}));
vi.mock("wagmi", () => ({ useWriteContract: () => ({ writeContractAsync: vi.fn() }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const { YieldOptIn } = await import("@/components/atelier/yield-opt-in");

const base = { optedIn: true, choiceMade: true, deployed: 0n, freelancerShareBP: 7000 };

beforeEach(() => getYieldStatus.mockReset());

describe("the Escrow yield chip", () => {
  it("says nothing when there is no venue to earn in", async () => {
    /* The exact mainnet state: opted in, no adapter wired. */
    getYieldStatus.mockResolvedValue({ ...base, available: false });

    const { container } = render(<YieldOptIn escrowId={1} isClient status="active" />);

    await waitFor(() => expect(getYieldStatus).toHaveBeenCalled());
    expect(screen.queryByText(/escrow yield/i)).toBeNull();
    expect(container.textContent ?? "").not.toMatch(/yield/i);
  });

  it("shows once a venue exists", async () => {
    getYieldStatus.mockResolvedValue({ ...base, available: true });

    render(<YieldOptIn escrowId={1} isClient status="active" />);

    expect(await screen.findByText(/escrow yield/i)).toBeInTheDocument();
  });

  it("stays quiet on a job that has already settled", async () => {
    getYieldStatus.mockResolvedValue({ ...base, available: true });

    const { container } = render(<YieldOptIn escrowId={1} isClient status="completed" />);

    await waitFor(() => expect(getYieldStatus).toHaveBeenCalled());
    expect(container.textContent ?? "").not.toMatch(/escrow yield/i);
  });
});
