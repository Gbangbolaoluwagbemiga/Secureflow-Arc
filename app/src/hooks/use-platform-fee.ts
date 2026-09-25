import { useEffect, useState } from "react";
import { contractService } from "@/lib/web3/contract-service";

/**
 * The platform fee, asked of the contract rather than remembered.
 *
 * The review screen hardcoded 250 basis points with a comment saying "2.5%, as
 * the contract charges it". The owner then set the fee to 1% on chain and the
 * last screen before signing went on quoting 2.5%, and a total that did not
 * match what the wallet asked for a moment later.
 *
 * Nothing was overcharged — the approval comes from `quoteDeposit`, which is a
 * contract call — but a client reading a figure on the confirmation screen and
 * a different figure in their wallet has no way to tell which one is real.
 *
 * Returns null while the answer is unknown, including when the read failed, so
 * a caller can say so instead of showing a number it guessed.
 */
export function usePlatformFeeBP(): number | null {
  const [bp, setBp] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    contractService
      .getPlatformFeeBP()
      .then((v) => { if (alive) setBp(v); })
      .catch(() => { if (alive) setBp(null); });
    return () => { alive = false; };
  }, []);

  return bp;
}
