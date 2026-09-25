import { describe, it, expect } from "vitest";
import { escrowBadge } from "@/lib/atelier/escrow-status";

/**
 * An arbiter refunded a client in full. The client's card said "Dispute
 * Resolved". The freelancer's card said "completed", in the green it uses for
 * being paid, to the person who had just been awarded nothing.
 */
describe("what a job's badge says", () => {
  it("does not call an arbitrated job completed", () => {
    const badge = escrowBadge([{ status: "resolved" }], "completed");
    expect(badge.label).toBe("Dispute Resolved");
    expect(badge.tone).toBe("resolved");
  });

  it("puts a live dispute above everything, because nobody can act on it", () => {
    const badge = escrowBadge(
      [{ status: "resolved" }, { status: "rejected" }, { status: "disputed" }],
      "active",
    );
    expect(badge.label).toBe("disputed");
  });

  it("calls a rejection a revision request, since the job is still alive", () => {
    const badge = escrowBadge([{ status: "rejected" }], "active");
    expect(badge.label).toBe("revision requested");
    expect(badge.tone).toBe("rejected");
  });

  it("ranks a rejection above an older resolved milestone", () => {
    const badge = escrowBadge(
      [{ status: "resolved" }, { status: "rejected" }],
      "active",
    );
    expect(badge.label).toBe("revision requested");
  });

  it("falls through to the escrow's own status when nothing is exceptional", () => {
    expect(escrowBadge([{ status: "approved" }], "completed")).toEqual({
      label: "completed",
      tone: "completed",
    });
  });

  it("survives a job whose milestones have not loaded", () => {
    expect(escrowBadge(undefined, "pending").label).toBe("pending");
    expect(escrowBadge([], "active").label).toBe("active");
  });
});
