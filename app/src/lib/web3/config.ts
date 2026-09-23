import { getCurrentNetwork } from "./arc-config";

export {
  CONTRACTS,
  getCurrentNetwork,
  ARC_NETWORKS,
} from "./arc-config";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

/**
 * The Arc network this build talks to, in EIP-3085 shape.
 *
 * Named ARC_TESTNET for historical reasons and kept that way because 31 files
 * import it — but it has NOT been hardcoded to testnet since mainnet went
 * live. It follows getCurrentNetwork(), so VITE_ARC_CHAIN_ID decides.
 *
 * It being a literal 5042002 is why the app kept behaving like a testnet app
 * after the environment said otherwise: arc-config was switched over and this,
 * the file almost everything actually imports, was not. Anything reading
 * `ARC_TESTNET.chainId` to decide whether a wallet is on the right network was
 * comparing against testnet forever.
 */
const NETWORK = getCurrentNetwork();

export const ARC_TESTNET = {
  chainId: NETWORK.chainId,
  chainName: NETWORK.name,
  nativeCurrency: NETWORK.nativeCurrency,
  rpcUrls: [NETWORK.rpcUrl],
  blockExplorerUrls: [NETWORK.blockExplorer],
};

/** Clearer name for new code. Same object. */
export const ARC_NETWORK = ARC_TESTNET;
