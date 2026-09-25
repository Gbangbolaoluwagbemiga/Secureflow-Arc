import { graphQuery, isGraphConfigured } from "@/lib/graph/client";
import { contractService } from "@/lib/web3/contract-service";

/**
 * WHAT HAPPENED TO THE JOBS YOU APPLIED FOR.
 *
 * Applying was a one-way door. A freelancer wrote a cover letter, signed a
 * transaction, and then had nowhere to look: not a list of what they had
 * applied to, not whether the client had chosen anybody, not whether that
 * anybody was them. The only signal was a notification that might never
 * arrive — written from the client's browser, so it depended on the client
 * still having the tab open when the transaction confirmed.
 *
 * That is the wrong shape for something this consequential. A notification is
 * a nudge; the answer has to be somewhere you can go and look. Everything here
 * is derived from the chain's own record of the escrow, so it is correct even
 * if every notification we ever sent was lost.
 */

/** Escrow status codes, as the contract numbers them. */
const PENDING = 0;
const IN_PROGRESS = 1;
const CANCELLED = 6;

const ZERO = "0x0000000000000000000000000000000000000000";

export type ApplicationOutcome =
  /** Nobody hired yet. The client still has this to decide. */
  | "waiting"
  /** You were chosen. */
  | "won"
  /** Somebody else was chosen. */
  | "passed"
  /** The client withdrew the job before choosing anyone. */
  | "withdrawn";

export interface AppliedJob {
  escrowId: string;
  projectTitle: string;
  projectDescription: string;
  category: string | null;
  totalAmount: string;
  /** Needed to render the amount: the escrow's token decides its decimals. */
  token: string | null;
  deadline: number;
  appliedAt: number;
  outcome: ApplicationOutcome;
}

interface RawApplication {
  escrowId: string;
  timestamp: string;
  escrow: {
    beneficiary: string;
    token: string | null;
    status: number;
    totalAmount: string;
    deadline: string;
    projectTitle: string;
    projectDescription: string;
    category: string | null;
  } | null;
}

export const GET_MY_APPLICATIONS = `
  query GetMyApplications($freelancer: Bytes!) {
    applications(
      where: { freelancer: $freelancer }
      orderBy: timestamp
      orderDirection: desc
      first: 200
    ) {
      escrowId
      timestamp
      escrow {
        beneficiary
        token
        status
        totalAmount
        deadline
        projectTitle
        projectDescription
        category
      }
    }
  }
`;

/**
 * What became of one application.
 *
 * Read off the escrow rather than off any record of our own, because the escrow
 * is the only account of a hire that cannot be stale — it IS the hire. A
 * beneficiary that is set and is not you means the job is gone, whether or not
 * anyone remembered to tell you.
 */
export function outcomeOf(
  escrow: { beneficiary?: string | null; status?: number | null } | null | undefined,
  me: string,
): ApplicationOutcome {
  if (!escrow) return "waiting";

  const hired = (escrow.beneficiary ?? "").toLowerCase();
  const mine = me.toLowerCase();

  if (hired && hired !== ZERO) {
    return hired === mine ? "won" : "passed";
  }

  /*
   * Cancelled with nobody hired: the client took the money back. Distinct from
   * "passed" on purpose — being turned down and the job evaporating are
   * different pieces of news, and lumping them together would have a freelancer
   * believe they lost a competition that never concluded.
   */
  if (escrow.status === CANCELLED) return "withdrawn";

  /*
   * A job in progress with no beneficiary should not exist, but the subgraph
   * has trailed the chain before. "Waiting" is the safer wrong answer: it tells
   * someone to check back, where "passed" tells them to stop hoping.
   */
  if (escrow.status === PENDING || escrow.status === IN_PROGRESS) return "waiting";

  return "waiting";
}

/** Only the ones the client has yet to decide. */
export function pendingOnly(jobs: AppliedJob[]): AppliedJob[] {
  return jobs.filter((j) => j.outcome === "waiting");
}

/**
 * How far back to look when reading applications off the chain.
 *
 * Every escrow is one `hasApplied` call, so this is the cost ceiling on the
 * page. Two hundred is far more than this platform has ever had and still one
 * multicall-sized scan.
 */
const CHAIN_SCAN_LIMIT = 200;

/**
 * The same list, read from the contract instead of the index.
 *
 * Browse Jobs has always got this right by asking `hasApplied` per job, while
 * this page asked a subgraph. When the subgraph is not configured — which is
 * how production has been running — `isGraphConfigured()` was false and this
 * returned an empty array, so a freelancer who had just applied was told they
 * had applied for nothing, on the one screen built to answer that question.
 *
 * An empty list and an unanswerable question look identical to the caller, so
 * this throws rather than returning nothing.
 */
async function fetchFromChain(address: string): Promise<AppliedJob[]> {
  const next = await contractService.getNextEscrowIdOrNull();
  if (next === null) {
    throw new Error("Could not read the escrow count from the contract");
  }

  const newest = next - 1;
  if (newest < 1) return [];

  const ids: number[] = [];
  for (let id = newest; id >= 1 && ids.length < CHAIN_SCAN_LIMIT; id--) ids.push(id);

  const flags = await Promise.all(
    ids.map(async (id) => [id, await contractService.hasUserApplied(id, address)] as const),
  );
  const mine = flags.filter(([, applied]) => applied).map(([id]) => id);
  if (mine.length === 0) return [];

  const escrows = await contractService.getEscrowsBatch(mine);

  return mine.flatMap((id) => {
    const e = escrows[id];
    if (!e) return [];
    return [{
      escrowId: String(id),
      projectTitle: e.projectTitle ?? "",
      projectDescription: e.projectDescription ?? "",
      category: null,
      totalAmount: e.totalAmount?.toString() ?? "0",
      token: e.token ?? null,
      deadline: Number(e.deadline ?? 0),
      /* The chain knows the application exists but not cheaply when it was
         made; that needs a log scan. The row does not depend on it. */
      appliedAt: 0,
      outcome: outcomeOf({ beneficiary: e.beneficiary, status: Number(e.status) }, address),
    }];
  });
}

export async function fetchMyApplications(address: string): Promise<AppliedJob[]> {
  if (!address) return [];

  /* The index is faster and carries the application timestamp, so it is still
     preferred. It is no longer required. */
  if (!isGraphConfigured()) return fetchFromChain(address);

  const data = await graphQuery<{ applications: RawApplication[] }>(GET_MY_APPLICATIONS, {
    freelancer: address.toLowerCase(),
  }).catch(() => null);

  /* A subgraph that is configured but unreachable, or trailing far enough
     behind to have missed the application, must not answer "nothing". */
  if (!data) return fetchFromChain(address);
  if ((data.applications ?? []).length === 0) return fetchFromChain(address);

  return (data.applications ?? []).map((a) => ({
    escrowId: a.escrowId,
    projectTitle: a.escrow?.projectTitle ?? "",
    projectDescription: a.escrow?.projectDescription ?? "",
    category: a.escrow?.category ?? null,
    totalAmount: a.escrow?.totalAmount ?? "0",
    token: a.escrow?.token ?? null,
    deadline: Number(a.escrow?.deadline ?? 0),
    appliedAt: Number(a.timestamp ?? 0),
    outcome: outcomeOf(a.escrow, address),
  }));
}
