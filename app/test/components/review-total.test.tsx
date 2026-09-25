import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

/**
 * THE NUMBER THE WALLET IS ABOUT TO ASK FOR.
 *
 * A client posting a 5 USDC job chose "let the escrow earn it", read a line
 * saying the platform fee was "covered by what the escrow earns", and then
 * watched their wallet request 5.1250. Nothing on the review page added up to
 * that figure, so the only available conclusion was that something was out of
 * sync.
 *
 * Nothing was out of sync. `createEscrow` charges budget + fee unconditionally
 * — the escrow contract has no idea the yield controller exists — and the copy
 * was describing a refund that arrives later, out of earnings, as though it
 * were a bill avoided now.
 *
 * So the last thing this page shows before the signature is the same number the
 * signature is for.
 */

vi.mock("wagmi", () => ({ useWriteContract: () => ({ writeContractAsync: vi.fn() }) }));

/* The fee is read from the contract now. Held in a mutable box so a test can
   change it the way an owner changes it on chain. */
const feeBP = { value: 250 as number | null };
vi.mock("@/hooks/use-platform-fee", () => ({
  usePlatformFeeBP: () => feeBP.value,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const { ReviewStep } = await import("@/components/create/review-step");

function review(over: Record<string, unknown> = {}) {
  return render(
    <ReviewStep
      formData={{
        projectTitle: "kairos",
        projectDescription: "A payment firewall.",
        duration: "10",
        totalBudget: "5",
        beneficiary: "",
        token: "",
        useNativeToken: true,
        isOpenJob: true,
        yieldOptIn: false,
        milestones: [
          { description: "Admin panel", amount: "2" },
          { description: "Analytics service", amount: "3" },
        ],
        ...over,
      } as never}
      onConfirm={() => {}}
      onYieldChange={() => {}}
      isSubmitting={false}
      isContractPaused={false}
    />,
  );
}

describe("what the client is told they will pay", () => {
  beforeEach(() => { feeBP.value = 250; });

  it("shows budget plus fee, which is what the wallet asks for", () => {
    review();
    // 5.00 + 2.5% = 5.1250 — the exact figure in the approval dialog.
    expect(screen.getByTestId("approval-total")).toHaveTextContent("5.1250");
  });

  it("shows the fee as its own line, so the total can be checked", () => {
    review();
    expect(screen.getByText(/platform fee \(2\.5%\)/i)).toBeInTheDocument();
    expect(screen.getByText("0.13")).toBeInTheDocument();
  });

  /**
   * The whole reason a client would opt in, in one assertion.
   *
   * This test used to assert the opposite — that the total was the same either
   * way — because it was, and the copy claiming otherwise was the bug. Making
   * the copy honest only exposed that the feature had no benefit to be honest
   * about: 2.5% refunded out of yield needs a 228-day job at 10% APY. The
   * contract waives the fee outright now, so the benefit is visible where it
   * has to be, in the number being approved.
   */
  it("takes the fee off the total when the escrow is put to work", () => {
    const first = review();
    expect(screen.getByTestId("approval-total")).toHaveTextContent("5.1250");
    first.unmount();

    review({ yieldOptIn: true });
    expect(screen.getByTestId("approval-total")).toHaveTextContent("5.0000");
  });

  it("shows the fee struck through rather than silently gone", () => {
    review({ yieldOptIn: true });
    expect(screen.getByTestId("fee-line")).toHaveTextContent(/0\.13\s*waived/);
  });

  it("never claims the fee is covered, since it is charged either way", () => {
    review({ yieldOptIn: true });
    expect(screen.queryByText(/covered by what the escrow earns/i)).not.toBeInTheDocument();
  });

  it("charges the fee in full when the escrow just waits", () => {
    review();
    expect(screen.getByTestId("fee-line")).toHaveTextContent("0.13");
    expect(screen.getByTestId("fee-line")).not.toHaveTextContent(/waived/i);
  });
});

/**
 * The owner set the fee to 1% on chain. This page went on saying 2.5%, and
 * quoting a total that did not match what the wallet asked for a moment later.
 *
 * Nothing was overcharged — the approval comes from `quoteDeposit`, a contract
 * call — but a client reading one figure here and another in their wallet has
 * no way to know which is real, and the honest answer is that the page was the
 * wrong one.
 */
describe("when the owner changes the fee", () => {
  beforeEach(() => { feeBP.value = 250; });

  it("quotes the fee the contract charges now, not the one it charged before", () => {
    feeBP.value = 100;
    review();
    expect(screen.getByTestId("fee-line")).toHaveTextContent("0.05");
    expect(screen.getByTestId("approval-total")).toHaveTextContent("5.0500");
  });

  it("names the rate it is quoting, so the arithmetic can be followed", () => {
    feeBP.value = 100;
    review();
    expect(screen.getByText(/Platform fee \(1%\)/)).toBeInTheDocument();
  });

  it("says it is checking rather than inventing a number the chain has not given", () => {
    feeBP.value = null;
    review();
    expect(screen.getByTestId("fee-line")).toHaveTextContent("checking");
    expect(screen.getByTestId("approval-total")).toHaveTextContent("checking");
    expect(screen.getByTestId("approval-total")).not.toHaveTextContent("5.1250");
  });
});
