import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * WHO IS JUDGING THIS WORK, ON THE FREELANCER'S OWN CARD.
 *
 * The client's side of a delegated job says AUTOPILOT in three places. The
 * freelancer's side said nothing, so the person whose payment depends on the
 * answer could not tell whether a human or an agent was reading what they
 * submitted. They would find out from the outcome.
 *
 * The daemon messages them at hand-over now, but a notification can be missed,
 * deleted, or arrive before they ever opened the job. The card is where they
 * look while actually working.
 */

const useJobManager = vi.fn();
vi.mock("@/hooks/use-job-manager", () => ({
  useJobManager: (id: number | null) => useJobManager(id),
}));

const { AgentManagedBadge } = await import("@/components/atelier/agent-managed-badge");

const AGENT = "0x5e8bba91898d8c2b6a235619180dbe93e956fc08";

beforeEach(() => useJobManager.mockReset());

describe("telling the freelancer an agent is judging", () => {
  it("shows when the job has been handed to an agent", async () => {
    useJobManager.mockReturnValue({ manager: AGENT, loaded: true });
    render(<AgentManagedBadge escrowId={1} />);

    expect(await screen.findByText(/agent managed/i)).toBeInTheDocument();
  });

  it("says nothing when the client runs the job themselves", () => {
    /* manager === null is a real answer, not an absence of one. */
    useJobManager.mockReturnValue({ manager: null, loaded: true });
    const { container } = render(<AgentManagedBadge escrowId={1} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("waits rather than guessing while the answer is unknown", () => {
    useJobManager.mockReturnValue({ manager: null, loaded: false });
    const { container } = render(<AgentManagedBadge escrowId={1} />);

    /* Rendering "not managed" before the read lands would be a claim, and it
       would be wrong half the time it mattered. */
    expect(container).toBeEmptyDOMElement();
  });

  it("asks about the escrow it was given", async () => {
    useJobManager.mockReturnValue({ manager: AGENT, loaded: true });
    render(<AgentManagedBadge escrowId={7} />);

    await waitFor(() => expect(useJobManager).toHaveBeenCalledWith(7));
  });
});
