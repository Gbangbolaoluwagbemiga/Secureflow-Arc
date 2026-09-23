const ARC_TESTNET_CHAIN_ID = 5042002;
const ARC_MAINNET_CHAIN_ID = 5042;

export const ARC_NETWORKS = {
  testnet: {
    chainId: ARC_TESTNET_CHAIN_ID,
    name: "Arc Testnet",
    rpcUrl: "https://rpc.drpc.testnet.arc.network",
    blockExplorer: "https://testnet.arcscan.app",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  },
  mainnet: {
    chainId: ARC_MAINNET_CHAIN_ID,
    name: "Arc",
    rpcUrl: "https://rpc.mainnet.arc.io",
    blockExplorer: "https://explorer.arc.io",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
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

  const rpcOverride = (import.meta.env.VITE_ARC_RPC_URL ?? "").trim();
  return rpcOverride ? { ...base, rpcUrl: rpcOverride } : base;
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
