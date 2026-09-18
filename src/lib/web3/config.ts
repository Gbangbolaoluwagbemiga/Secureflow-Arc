import { getCurrentNetwork } from "./arc-config";

export {
  CONTRACTS,
  getCurrentNetwork,
  ARC_NETWORKS,
} from "./arc-config";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * The active Arc network in wallet_addEthereumChain shape.
 *
 * Still exported as ARC_TESTNET because call sites import that name; it is
 * whichever network getCurrentNetwork() resolves to, so it can never disagree
 * with the rest of the app.
 */
const active = getCurrentNetwork();

export const ARC_TESTNET = {
  chainId: active.chainId,
  chainName: active.name,
  nativeCurrency: active.nativeCurrency,
  rpcUrls: [active.rpcUrl],
  blockExplorerUrls: [active.blockExplorer],
};
