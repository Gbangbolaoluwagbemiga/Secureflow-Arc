import React from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "viem";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { getCurrentNetwork, ARC_MAINNET_CHAIN_ID } from "../lib/web3/arc-config";

// ─── The active Arc network, as a viem Chain ──────────────────────────────────
// Built from getCurrentNetwork() rather than literals, so the wallet is asked
// to switch to the same chain the rest of the app reads from. Still exported as
// `arcTestnet` because call sites import that name.
const active = getCurrentNetwork();

export const arcTestnet = defineChain({
  id: active.chainId,
  name: active.name,
  nativeCurrency: active.nativeCurrency,
  rpcUrls: {
    default: { http: [active.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: active.blockExplorer },
  },
  testnet: active.chainId !== ARC_MAINNET_CHAIN_ID,
});

// Cast to Reown's AppKitNetwork so it works with createAppKit and WagmiAdapter
const arcTestnetReown = arcTestnet as unknown as AppKitNetwork;

const projectId = (import.meta.env.VITE_REOWN_PROJECT_ID as string | undefined) ?? "";

// ─── Wagmi adapter (Reown manages connectors: MetaMask, WC QR, Coinbase, etc.)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [arcTestnetReown],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// ─── Reown AppKit initialisation ──────────────────────────────────────────────
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [arcTestnetReown],
  defaultNetwork: arcTestnetReown,
  metadata: {
    name: "SecureFlow",
    description: "Milestone-based freelancer escrow on Arc EVM",
    url: typeof window !== "undefined" ? window.location.origin : "https://secureflow.app",
    icons: ["/favicon.ico"],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#7D00FF",
    "--w3m-border-radius-master": "8px",
  },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: false } },
});

export const WalletProvider = ({ children }: { children: React.ReactNode }) => (
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  </WagmiProvider>
);
