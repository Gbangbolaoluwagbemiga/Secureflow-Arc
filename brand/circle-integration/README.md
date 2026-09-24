# Where each Circle product is integrated

Rendered from `main` on 25 September 2026. Every line number in these images is
the real one and resolves in the repository at
`github.com/Gbangbolaoluwagbemiga/Secureflow-Arc`.

Three Circle products are in use. Two screenshots each.

## USDC

| Image | File | Lines | What it shows |
| --- | --- | --- | --- |
| `01-usdc-native-token.png` | `agent/daemon/src/config.ts` | 185–189 | USDC is the native gas token on Arc, reached at its ERC-20 predeploy `0x3600…0000`. This is why a freelancer is paid in the same asset they pay gas with: no bridge, no swap, no second token |
| `02-usdc-gas-drip.png` | `agent/daemon/src/workers/wallets.ts` | 147–175 | `dripGas` sends a newly registered freelancer enough USDC to sign their first transaction, per network rather than hardcoded |

## Circle Wallets (developer-controlled, MPC)

| Image | File | Lines | What it shows |
| --- | --- | --- | --- |
| `03-wallets-provision.png` | `agent/daemon/src/workers/wallets.ts` | 105–145 | `provisionWorkerWallet`. `listWallets` filtered by a `refId` set to the person's Telegram id, reused if found, otherwise `createWallets` stamping the same `refId`. The mapping from a person to their money lives on Circle's side, so they return to the same address even if our store is lost |
| `04-wallets-signer.png` | `agent/daemon/src/circle/circleSigner.ts` | 128–136 | `createCircleSigner` returns a viem-compatible signer whose private key exists nowhere in our infrastructure. Circle holds the key shares, and the agent that reviews work and releases milestones signs through this |

## Contracts

| Image | File | Lines | What it shows |
| --- | --- | --- | --- |
| `05-contracts-create-escrow.png` | `app/contracts/solidity/src/SecureFlow.sol` | 443–462 | `createEscrow`. The client's full budget moves into the contract before any freelancer applies, and the milestones are fixed at the same moment |
| `06-contracts-approve-milestone.png` | `app/contracts/solidity/src/SecureFlow.sol` | 606–626 | `approveMilestone`. The only path by which money leaves the escrow to a freelancer. No administrative withdrawal, no owner sweep |

Deployed as a UUPS proxy on Arc mainnet at
`0xbdeb44945979a01584fd7d796a71C707D2F83372`.

## Not claimed

`agent/daemon/src/circle/gateway.ts` contains a Circle Gateway integration, but
nothing calls `getGateway()`, so Gateway is **not** listed as a product in use.
It is written and unreachable, and saying otherwise would not survive someone
reading the file.
