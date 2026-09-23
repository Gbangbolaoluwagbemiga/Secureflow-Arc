import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";
import { ContractService } from "@/lib/web3/contract-service";

/**
 * Does this wallet have any jobs, as either side?
 *
 * WHY THIS ASKS THE CONTRACT ONE QUESTION INSTEAD OF TWENTY.
 *
 * It used to walk escrow ids 1..20 calling getEscrow on each and comparing the
 * depositor, which was wrong in three ways at once:
 *
 *   - It stopped at 20. The twenty-first job posted on the platform would
 *     never light up My Jobs for whoever posted it, and nothing would say why.
 *   - It cost twenty sequential round trips against a public RPC that answers
 *     "rate limit exceeded" under exactly that load, so the answer could come
 *     back "no jobs" simply because the endpoint got tired.
 *   - It only ever matched the depositor, so a freelancer hired onto a job was
 *     not a participant by this measure.
 *
 * The contract already keeps the index: getUserEscrows(address) returns every
 * escrow id a wallet is on, as client or freelancer, in one call.
 */
export function useJobCreatorStatus() {
  const { wallet } = useWeb3();
  const [isJobCreator, setIsJobCreator] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkJobCreatorStatus = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setIsJobCreator(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const contractService = new ContractService(CONTRACTS.ATELIER_ESCROW);
      const ids = await contractService.getUserEscrows(wallet.address);
      setIsJobCreator(Array.isArray(ids) && ids.length > 0);
    } catch {
      /* A read that could not reach its source is not the same answer as "you
         have no jobs", but there is nothing better to show than the nav we
         had. Leaving it false hides My Jobs; it comes back on the next check. */
      setIsJobCreator(false);
    } finally {
      setLoading(false);
    }
  }, [wallet.isConnected, wallet.address]);

  useEffect(() => {
    checkJobCreatorStatus();
  }, [checkJobCreatorStatus]);

  /*
   * Posting a job changes the answer without changing the wallet, and the
   * effect above only re-runs when the wallet does — so My Jobs stayed hidden
   * until a manual reload, right at the moment somebody most wants to see the
   * job they just paid for. CreatePage dispatches this on success.
   */
  useEffect(() => {
    const again = () => void checkJobCreatorStatus();
    window.addEventListener("secureflow:escrows-changed", again);
    return () => window.removeEventListener("secureflow:escrows-changed", again);
  }, [checkJobCreatorStatus]);

  return { isJobCreator, loading, refresh: checkJobCreatorStatus };
}
