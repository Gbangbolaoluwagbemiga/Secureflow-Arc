const ARC_TESTNET_CHAIN_ID = 5042002;

export const ARC_NETWORKS = {
  testnet: {
    chainId: ARC_TESTNET_CHAIN_ID,
    name: "Arc Testnet",
    rpcUrl: "https://rpc.drpc.testnet.arc.network",
    blockExplorer: "https://testnet.arcscan.app",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  },
} as const;

export function getCurrentNetwork() {
  return ARC_NETWORKS.testnet;
}

export const CONTRACTS = {
  SECUREFLOW_ESCROW: (
    import.meta.env.VITE_SECUREFLOW_CONTRACT_ADDRESS ?? ""
  ).trim() as `0x${string}` | "",

  TRUSTED_FORWARDER: (
    import.meta.env.VITE_TRUSTED_FORWARDER_ADDRESS ?? ""
  ).trim() as `0x${string}` | "",
} as const;
