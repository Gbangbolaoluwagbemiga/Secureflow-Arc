import { describe, expect, it } from "vitest";
import { daysUntil, describeDaysLeft, describeTimeRemaining } from "@/lib/atelier/deadline";

/**
 * ONE ANSWER, FROM THE ONE FIELD THE CHAIN STORES.
 *
 * An escrow has no createdAt and no duration on-chain — it has a deadline. Both
 * of the others were synthesised, and the two loaders disagreed: the RPC path
 * set createdAt to Date.now() and duration to the seconds remaining, the
 * subgraph path set createdAt to the real creation time and duration to the
 * seconds remaining too. `createdAt + duration - now` therefore meant the time
 * left on one path and the time left minus the job's age on the other, and a
 * background refresh made one card alternate between them.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 11, 12, 0, 0);

describe("days until a deadline", () => {
  it("rounds up, because a part-day is still a day you have to work in", () => {
    // Escrow 7, exactly: 9.464 days out. Rounding down told somebody they had
    // nine days to hit a deadline on the tenth.
    expect(daysUntil(NOW + 9.464 * DAY, NOW)).toBe(10);
    expect(daysUntil(NOW + 0.1 * DAY, NOW)).toBe(1);
  });

  it("never goes negative on a deadline that has passed", () => {
    expect(daysUntil(NOW - 3 * DAY, NOW)).toBe(0);
  });

  it("says nothing when there is no deadline to read", () => {
    // Better than "0 days left", which reads as an emergency.
    expect(daysUntil(undefined, NOW)).toBeNull();
    expect(daysUntil(0, NOW)).toBeNull();
  });

  it("gives the same answer however the escrow was loaded", () => {
    // The whole point: the deadline is a fact, so both loaders agree on it.
    const deadline = NOW + 9.464 * DAY;
    expect(daysUntil(deadline, NOW)).toBe(daysUntil(deadline, NOW));
  });
});

describe("how it reads", () => {
  it("counts days, singular and plural", () => {
    expect(describeDaysLeft(NOW + 9.464 * DAY, NOW)).toBe("10 days left");
    expect(describeDaysLeft(NOW + 0.5 * DAY, NOW)).toBe("1 day left");
  });

  it("says due today rather than 0 days left", () => {
    expect(describeDaysLeft(NOW - 1000, NOW)).toBe("due today");
  });

  it("stays silent with no deadline", () => {
    expect(describeDaysLeft(undefined, NOW)).toBeNull();
  });
});

describe("a job that has finished", () => {
  const NOW_ = 1_700_000_000_000;
  const DAY_ = 24 * 60 * 60 * 1000;

  it("stops counting down, however it ended", () => {
    for (const status of ["completed", "cancelled", "refunded", "expired"]) {
      expect(
        describeTimeRemaining({ deadlineAt: NOW_ + 20 * DAY_, status }, NOW_),
      ).toBeNull();
    }
  });

  it("keeps counting while it is still running", () => {
    expect(
      describeTimeRemaining({ deadlineAt: NOW_ + 20 * DAY_, status: "active" }, NOW_),
    ).toBe("20 days left");
    // A dispute is not the end of a job, and the deadline still decides when
    // an emergency refund unlocks.
    expect(
      describeTimeRemaining({ deadlineAt: NOW_ + 3 * DAY_, status: "disputed" }, NOW_),
    ).toBe("3 days left");
  });

  it("does not care how the status was cased", () => {
    expect(
      describeTimeRemaining({ deadlineAt: NOW_ + 5 * DAY_, status: "Completed" }, NOW_),
    ).toBeNull();
  });

  it("falls back to the duration when no deadline was stored, in English", () => {
    expect(describeTimeRemaining({ duration: 86400, status: "active" }, NOW_)).toBe("1 day");
    expect(describeTimeRemaining({ duration: 3 * 86400, status: "active" }, NOW_)).toBe("3 days");
    expect(describeTimeRemaining({ status: "active" }, NOW_)).toBeNull();
  });
});
