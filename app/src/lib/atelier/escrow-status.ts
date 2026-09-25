/**
 * WHAT A JOB'S BADGE SHOULD SAY, FOR WHOEVER IS LOOKING AT IT.
 *
 * The client's card and the freelancer's card derived this separately, and
 * they drifted. An arbiter refunded a client in full, and the client's card
 * said "Dispute Resolved" while the freelancer's said "completed" in the same
 * green it uses for being paid. The person who lost was the one being told the
 * job had gone fine.
 *
 * That was the third divergence between those two views in a day, after the
 * resolution amounts and the handover notification. So the rule lives here and
 * both of them read it.
 *
 * Order matters and is deliberate. A live dispute outranks everything, because
 * it is the only state genuinely out of both parties' hands. A rejected
 * milestone comes next, because somebody can still act on it. An arbitrated
 * job comes before the escrow's own status, because "completed" is true of the
 * escrow and misleading about what happened.
 */

export interface MilestoneLike {
  status?: string | null;
}

export interface EscrowBadge {
  /** What to print. */
  label: string;
  /** Which status the colour should come from. */
  tone: string;
}

export function escrowBadge(
  milestones: readonly MilestoneLike[] | null | undefined,
  escrowStatus: string,
): EscrowBadge {
  const ms = milestones ?? [];
  const any = (s: string) => ms.some((m) => m?.status === s);

  if (any("disputed")) return { label: "disputed", tone: "disputed" };

  /* Rejection means revise and resubmit. The escrow stays in progress and the
     money stays locked, so this must never read as the end of the job. */
  if (any("rejected")) return { label: "revision requested", tone: "rejected" };

  if (any("resolved")) return { label: "Dispute Resolved", tone: "resolved" };

  return { label: escrowStatus, tone: escrowStatus };
}
