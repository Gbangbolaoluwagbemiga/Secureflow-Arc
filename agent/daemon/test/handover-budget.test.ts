import { describe, it, expect } from "vitest";
import { extractStatedBudget } from "../src/agent/BriefGenerator.js";

/**
 * THE BUDGET IS ALREADY DECIDED BY THE TIME THIS IS ASKED.
 *
 * previewCriteria passed the title and description alone, so the model was
 * asked to propose a budget as well — and validateBrief then measured that
 * invented figure against MAX_JOB_BUDGET_USDC. A 0.51 USDC job whose
 * description mentioned a "billion-dollar enterprise" came back as $500, blew
 * the $100 cap, and 500'd the whole preview. The dialog told the client
 * "Autopilot could not be reached". Autopilot was reachable; it had been
 * asked to invent a number that was already settled on chain.
 *
 * The fix states the real figure in the source text, where the existing
 * "client's stated number wins" rule picks it up. These check the shape that
 * rule depends on, for the amounts this contract actually produces.
 */
describe("the budget handed to the brief generator", () => {
  const sourceFor = (title: string, description: string, base: bigint) =>
    [title, "", description, "", `Budget: ${Number(base) / 1e6} USDC`].join("\n");

  it("states the escrow's real budget, in USDC rather than base units", () => {
    /* 510000 base units is 0.51 USDC — 6 decimals, not the 18 the gas balance uses. */
    const src = sourceFor("mytube", "A premier streaming platform.", 510000n);
    expect(src).toContain("Budget: 0.51 USDC");
    expect(extractStatedBudget(src)).toBe(0.51);
  });

  it("wins over a figure the description happens to mention", () => {
    /* The exact shape that broke it: prose containing a huge number. */
    const src = sourceFor(
      "mytube",
      "We are seeking a premier streaming platform with the potential to become a globally recognized, billion-dollar enterprise.",
      510000n,
    );
    expect(extractStatedBudget(src)).toBe(0.51);
  });

  it("survives a description that names its own dollar figure", () => {
    const src = sourceFor("logo", "Similar to the $5000 rebrand we did last year.", 250000n);
    /* "budget" introduces the authoritative one, so it is preferred over the
       first figure in the text. */
    expect(extractStatedBudget(src)).toBe(0.25);
  });

  it("keeps sub-cent jobs positive rather than rounding them to zero", () => {
    const src = sourceFor("tiny", "A very small task.", 10000n);
    expect(extractStatedBudget(src)).toBe(0.01);
  });
});
