import { useState, useEffect, useCallback } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";

/**
 * Has this wallet been hired onto any job?
 *
 * Two round trips, not twenty-one.
 *
 * This used to read nextEscrowId, then walk ids 1..20 calling getEscrow on
 * each and checking the beneficiary. Same faults as the client-side check had:
 * it stopped at 20 regardless of how many jobs existed, so a freelancer hired
 * onto the twenty-first would never get the tab; and twenty sequential reads
 * against a public RPC that rate-limits under that load meant "not a
 * freelancer" could just mean the endpoint gave up.
 *
 * getUserEscrows returns every escrow this wallet is on — but as either party,
 * so it cannot tell being hired from having hired. The ids come back in one
 * call and the escrows themselves in one multicall, and the beneficiary check
 * happens over that handful rather than over twenty arbitrary ids.
 */
export function useFreelancerStatus() {
  const { wallet } = useWeb3();
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkFreelancerStatus = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address) {
      setIsFreelancer(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const contractService = new ContractService(CONTRACTS.ATELIER_ESCROW);

      const ids = await contractService.getUserEscrows(wallet.address);
      if (!Array.isArray(ids) || ids.length === 0) {
        setIsFreelancer(false);
        return;
      }

      const me = wallet.address.toLowerCase().trim();
      const escrows = await contractService.getEscrowsBatch(ids);
      const hired = Object.values(escrows).some(
        (e) => e?.beneficiary && e.beneficiary.toLowerCase().trim() === me,
      );

      setIsFreelancer(hired);
    } catch {
      /* A read that could not reach its source is not the same answer as "you
         were never hired". Leaving it false only hides a tab, and the next
         check restores it. */
      setIsFreelancer(false);
    } finally {
      setLoading(false);
    }
  }, [wallet.isConnected, wallet.address]);

  useEffect(() => {
    checkFreelancerStatus();
  }, [checkFreelancerStatus]);

  /* Being hired changes this answer without the wallet changing, same as
     posting a job does for the client side. */
  useEffect(() => {
    const again = () => void checkFreelancerStatus();
    window.addEventListener("secureflow:escrows-changed", again);
    return () => window.removeEventListener("secureflow:escrows-changed", again);
  }, [checkFreelancerStatus]);

  return { isFreelancer, loading, refresh: checkFreelancerStatus };
}
