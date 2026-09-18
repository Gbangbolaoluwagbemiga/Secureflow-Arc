/**
 * Arc network definitions. ONE source of truth for the whole app.
 *
 * Arc mainnet went live in September 2026 and SecureFlow is deployed on it, so
 * the default is mainnet: a missing VITE_ARC_CHAIN_ID should land on the
 * network the contract actually runs on, not quietly point a live UI at
 * testnet while looking perfectly healthy.
 */
export const ARC_MAINNET_CHAIN_ID = 5042;
export const ARC_TESTNET_CHAIN_ID = 5042002;

export const ARC_NETWORKS = {
  mainnet: {
    chainId: ARC_MAINNET_CHAIN_ID,
    name: "Arc",
    rpcUrl: "https://rpc.mainnet.arc.io",
    blockExplorer: "https://explorer.arc.io",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  },
  testnet: {
    chainId: ARC_TESTNET_CHAIN_ID,
    name: "Arc Testnet",
    rpcUrl: "https://rpc.testnet.arc.io",
    blockExplorer: "https://explorer.testnet.arc.io",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  },
} as const;

/** Which network this build talks to, decided once, from the environment. */
export function getCurrentNetwork() {
  const id = Number(import.meta.env.VITE_ARC_CHAIN_ID ?? ARC_MAINNET_CHAIN_ID);
  const net = id === ARC_TESTNET_CHAIN_ID ? ARC_NETWORKS.testnet : ARC_NETWORKS.mainnet;
  return {
    ...net,
    // Env overrides win, so a custom RPC or explorer needs no code change.
    rpcUrl: (import.meta.env.VITE_ARC_RPC_URL as string | undefined)?.trim() || net.rpcUrl,
    blockExplorer: (import.meta.env.VITE_ARC_EXPLORER_URL as string | undefined)?.trim() || net.blockExplorer,
  };
}

export const CONTRACTS = {
  SECUREFLOW_ESCROW: (
    import.meta.env.VITE_SECUREFLOW_CONTRACT_ADDRESS ?? ""
  ).trim() as `0x${string}` | "",

  TRUSTED_FORWARDER: (
    import.meta.env.VITE_TRUSTED_FORWARDER_ADDRESS ?? ""
  ).trim() as `0x${string}` | "",

  /** USDC ERC-20 interface (6 decimals). Same address on Arc mainnet and testnet. Empty = native USDC. */
  USDC: (
    import.meta.env.VITE_USDC_TOKEN_CONTRACT ?? ""
  ).trim() as `0x${string}` | "",
} as const;
