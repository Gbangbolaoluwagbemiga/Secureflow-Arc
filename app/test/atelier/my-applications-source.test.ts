import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * "YOU HAVEN'T APPLIED FOR ANYTHING YET", TO SOMEBODY WHO JUST APPLIED.
 *
 * Browse Jobs showed the job as Applied. The Applications tab, one click away,
 * said the freelancer had applied for nothing. Both were reading the same fact.
 *
 * Browse Jobs asks the contract, per job, whether this address has applied.
 * This page asked a subgraph, and `VITE_GRAPH_URL` has never been set on the
 * deployed build — so `isGraphConfigured()` was false and the fetch returned an
 * empty array without going anywhere near the chain. The component then did
 * exactly what it was told: no rows, so print the empty state.
 *
 * The empty state is a claim about somebody's work. It is only allowed when the
 * chain actually says so.
 */

const graph = { configured: false, result: null as unknown };
vi.mock("@/lib/graph/client", () => ({
  isGraphConfigured: () => graph.configured,
  graphQuery: async () => {
    if (graph.result instanceof Error) throw graph.result;
    return graph.result;
  },
}));

const chain = {
  nextId: 4 as number | null,
  applied: new Set<number>(),
};
vi.mock("@/lib/web3/contract-service", () => ({
  contractService: {
    getNextEscrowIdOrNull: async () => chain.nextId,
    hasUserApplied: async (id: number) => chain.applied.has(id),
    getEscrowsBatch: async (ids: number[]) =>
      Object.fromEntries(ids.map((id) => [id, {
        beneficiary: "0x0000000000000000000000000000000000000000",
        token: "0x0000000000000000000000000000000000000000",
        status: 0,
        totalAmount: 5_000_000n,
        deadline: 1_800_000_000n,
        projectTitle: `Job ${id}`,
        projectDescription: "",
      }])),
  },
}));

const { fetchMyApplications } = await import("@/lib/atelier/applications");
const ME = "0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41";

beforeEach(() => {
  graph.configured = false;
  graph.result = null;
  chain.nextId = 4;
  chain.applied = new Set([2]);
});

describe("where the applications list comes from", () => {
  it("reads the chain when no subgraph is configured, instead of saying nothing", async () => {
    const jobs = await fetchMyApplications(ME);
    expect(jobs.map((j) => j.escrowId)).toEqual(["2"]);
    expect(jobs[0].projectTitle).toBe("Job 2");
    expect(jobs[0].outcome).toBe("waiting");
  });

  it("falls back to the chain when the subgraph is configured but unreachable", async () => {
    graph.configured = true;
    graph.result = new Error("502");
    const jobs = await fetchMyApplications(ME);
    expect(jobs.map((j) => j.escrowId)).toEqual(["2"]);
  });

  it("falls back to the chain when the subgraph is merely behind", async () => {
    graph.configured = true;
    graph.result = { applications: [] };
    const jobs = await fetchMyApplications(ME);
    expect(jobs.map((j) => j.escrowId)).toEqual(["2"]);
  });

  it("refuses to answer at all when the chain cannot be read", async () => {
    chain.nextId = null;
    await expect(fetchMyApplications(ME)).rejects.toThrow(/escrow count/i);
  });

  it("still says nothing when there genuinely is nothing", async () => {
    chain.applied = new Set();
    await expect(fetchMyApplications(ME)).resolves.toEqual([]);
  });

  it("carries the token through, so the amount is not assumed to be six decimals", async () => {
    const [job] = await fetchMyApplications(ME);
    expect(job.token).toBe("0x0000000000000000000000000000000000000000");
    expect(job.totalAmount).toBe("5000000");
  });
});
