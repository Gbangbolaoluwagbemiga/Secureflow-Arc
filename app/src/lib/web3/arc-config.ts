/*
 * USDC IS THE NATIVE TOKEN HERE, AND IT IS 18 DECIMALS — NOT 6.
 *
 * Both of these said 6, because USDC is a 6-decimal token everywhere else and
 * that is what everyone assumes. On Arc it is also the gas token, and the
 * native balance is scaled like any other EVM native unit: 18.
 *
 * Measured, not assumed — a 1 USDC transfer to the agent wallet arrived as
 * exactly 1e18, and three separate addresses only read sanely at 1e18 against
 * what MetaMask and the app itself display. Testnet is the same.
 *
 * Both scales are live in this app and both are correct in their place: the
 * escrow contract moves USDC through the predeploy at 6 decimals (a 0.5 USDC
 * job is 500000 on chain), while the balance that pays for gas is 18. The
 * declaration below is only ever about the second one.
 */
const ARC_TESTNET_CHAIN_ID = 5042002;
const ARC_MAINNET_CHAIN_ID = 5042;

export const ARC_NETWORKS = {
  testnet: {
    chainId: ARC_TESTNET_CHAIN_ID,
    name: "Arc Testnet",
    rpcUrl: "https://rpc.drpc.testnet.arc.network",
    blockExplorer: "https://testnet.arcscan.app",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  },
  mainnet: {
    chainId: ARC_MAINNET_CHAIN_ID,
    name: "Arc",
    rpcUrl: "https://rpc.mainnet.arc.io",
    blockExplorer: "https://explorer.arc.io",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  },
} as const;

/**
 * Which chain the app talks to, decided by VITE_ARC_CHAIN_ID.
 *
 * Testnet stays the default, so a deployment with no chain id set keeps the
 * behaviour it had before mainnet existed rather than silently pointing real
 * money at a contract the operator did not choose. An explicit 5042 is the
 * only thing that selects mainnet.
 *
 * VITE_ARC_RPC_URL still wins over the built-in endpoint when set, so a
 * deployment can use its own provider without editing source.
 */
export function getCurrentNetwork() {
  const configured = Number(import.meta.env.VITE_ARC_CHAIN_ID ?? ARC_TESTNET_CHAIN_ID);
  const base =
    configured === ARC_MAINNET_CHAIN_ID ? ARC_NETWORKS.mainnet : ARC_NETWORKS.testnet;

  /*
   * AN OVERRIDE MAY NOT MOVE YOU TO ANOTHER NETWORK.
   *
   * VITE_ARC_RPC_URL exists so a deployment can use its own provider instead
   * of the public endpoint. It is not a way to change chain, and when the two
   * disagreed the result was silent and confusing: chain id said 5042 while a
   * stale testnet URL served every read, so balances came back from testnet
   * and a mainnet contract address returned "0x" as though it had no code.
   *
   * So an override that names the wrong network is ignored rather than
   * honoured. Losing a custom RPC is a performance problem; reading the wrong
   * chain while believing otherwise is a correctness one.
   */
  const rpcOverride = (import.meta.env.VITE_ARC_RPC_URL ?? "").trim();
  if (!rpcOverride) return base;

  const overrideLooksTestnet = /testnet/i.test(rpcOverride);
  const wantTestnet = base.chainId !== ARC_MAINNET_CHAIN_ID;
  if (overrideLooksTestnet !== wantTestnet) {
    console.warn(
      `[arc-config] Ignoring VITE_ARC_RPC_URL (${rpcOverride}): it does not ` +
        `match chain ${base.chainId}. Using ${base.rpcUrl} instead.`,
    );
    return base;
  }

  return { ...base, rpcUrl: rpcOverride };
}

export const CONTRACTS = {
  ATELIER_ESCROW: (
    /* The old VITE_SECUREFLOW_* name is still read as a fallback. A deployment
       that already has it set should not break the moment the constant is
       renamed in source — the value is the same address either way. */
    import.meta.env.VITE_ATELIER_CONTRACT_ADDRESS ??
    import.meta.env.VITE_SECUREFLOW_CONTRACT_ADDRESS ??
    ""
  ).trim() as `0x${string}` | "",

  TRUSTED_FORWARDER: (
    import.meta.env.VITE_TRUSTED_FORWARDER_ADDRESS ?? ""
  ).trim() as `0x${string}` | "",

  /** MockUSDC on Arc Testnet (6 decimals). Empty = use native USDC. */
  USDC: (
    import.meta.env.VITE_USDC_TOKEN_CONTRACT ?? ""
  ).trim() as `0x${string}` | "",
} as const;
