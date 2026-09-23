import { getCurrentNetwork, CONTRACTS } from "@/lib/web3/config";

/**
 * A localStorage key for per-escrow UI state, scoped to the chain it belongs to.
 *
 * Archive flags were stored as `archived_escrows_<wallet>` and held raw escrow
 * ids. Escrow ids restart at 1 on every deployment, so the same wallet that
 * archived job 1 on testnet came to mainnet, posted its first job — also id 1 —
 * and watched it vanish from My Jobs while the totals above still counted it.
 * Nothing was broken on chain and nothing said why.
 *
 * Including the chain id and the contract address means a new deployment starts
 * with a clean slate rather than inheriting somebody else's hidden rows.
 */
export function archiveKey(prefix: string, address?: string | null): string {
  const { chainId } = getCurrentNetwork();
  const contract = (CONTRACTS.ATELIER_ESCROW || "none").toLowerCase();
  return `${prefix}_${chainId}_${contract}_${address ?? ""}`;
}
