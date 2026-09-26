# Deploying: the two gates

Two things need an account only you have. **Do them in this order** — the
subgraph indexes a contract address and a start block, so deploying it before
the contract means deploying it twice.

---

## One key owns everything on mainnet

`0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41` is, on Arc mainnet, all three of:

- **owner of the escrow proxy** `0xbdeb44945979a01584fd7d796a71C707D2F83372`
- **owner of the yield controller** `0x92a0C47e819b84069eb95776497421850103aa37`
- **the only authorised arbiter**

That is a single point of failure over other people's wages, whether or not
anything ever goes wrong with the key itself.

**What the owner can do.** The proxy is UUPS with no timelock, so owner means
`upgradeToAndCall`: the implementation can be replaced over live jobs. The
owner can also point `setYieldAdapter` anywhere. Being the sole arbiter is the
least of it.

**What being the sole arbiter means.** Every dispute on the platform routes to
one key. If it is lost, or simply unavailable for a week, a disputed escrow
cannot be resolved by anyone and the money stays locked.

Splitting these roles is the highest-value change available on the contract
today, and it costs a handful of transactions.

### The sequence

Order matters. Do not revoke the old arbiter until a new owner and new
arbiters are in place, or disputes become unresolvable by anyone.

```bash
export ETH_RPC_URL=https://rpc.mainnet.arc.io

# 1. A fresh key. Not on a shared screen, not in a screenshot, not in a
#    terminal you are recording.
cast wallet new

# 2. Fund it with a little USDC for gas. acceptOwnership is a transaction.

# 3. Hand ownership over, signed by the OLD key, on both contracts.
cast send 0xbdeb44945979a01584fd7d796a71C707D2F83372 \
  'transferOwnership(address)' <NEW_OWNER> --private-key $OLD_KEY
cast send 0x92a0C47e819b84069eb95776497421850103aa37 \
  'transferOwnership(address)' <NEW_OWNER> --private-key $OLD_KEY

# 4. Accept it, signed by the NEW key. Ownable2Step needs both halves; that
#    is the point of it, and ownership does not move until this lands.
cast send 0xbdeb44945979a01584fd7d796a71C707D2F83372 \
  'acceptOwnership()' --private-key $NEW_KEY
cast send 0x92a0C47e819b84069eb95776497421850103aa37 \
  'acceptOwnership()' --private-key $NEW_KEY

# 5. Arbiters, from the new owner. Two or three, none of them the deployer.
cast send 0xbdeb44945979a01584fd7d796a71C707D2F83372 \
  'authorizeArbiter(address)' <ARBITER_1> --private-key $NEW_KEY
cast send 0xbdeb44945979a01584fd7d796a71C707D2F83372 \
  'authorizeArbiter(address)' <ARBITER_2> --private-key $NEW_KEY

# 6. Only now, drop the old one.
cast send 0xbdeb44945979a01584fd7d796a71C707D2F83372 \
  'revokeArbiter(address)' 0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41 \
  --private-key $NEW_KEY

# 7. Check it, signed by nobody.
cast call 0xbdeb44945979a01584fd7d796a71C707D2F83372 'owner()(address)'
cast call 0x92a0C47e819b84069eb95776497421850103aa37 'owner()(address)'
cast call 0xbdeb44945979a01584fd7d796a71C707D2F83372 'getArbiters()(address[])'
```

### After rotating

The Admin panel gates on `owner()`, so you will need to connect the new key to
see it. Nothing else in the app reads the owner address.

---

## Testnet: rotate the deploy key before deploying

`0x3Be7fbBDbC73Fc4731D60EF09c4BA1A94DC58E41` is also the testnet deployer and
owner. Deploying testnet from a key that owns mainnet is worth avoiding on its
own: a key used in more places is a key with more ways to go wrong. Generate a
fresh one, fund it from the faucet, and put that in
`app/contracts/solidity/.env` before deploying.

```bash
cast wallet new                      # gives you an address + private key
# fund it: https://faucet.testnet.arc.network
```

**Also fixed already:** the source repo's `contracts/.env` had
`ARC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc` — Arbitrum Sepolia, not
Arc. Copying that in and deploying would have put the contract on the wrong
chain. `app/contracts/solidity/.env` now points at Arc and is verified
against `cast chain-id` → `5042002`.

---

## Gate 1 — the contract (UUPS proxy)

This is what makes "Hand to Autopilot" stop reverting.

```bash
cd app/contracts/solidity
set -a && . ./.env && set +a

forge test                                            # 47 must pass first
forge script script/Deploy.s.sol --rpc-url arc_testnet # simulate
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
```

Simulation currently reports ~**0.29** in gas against a balance of ~148, so
funding is not a concern.

It prints two addresses. **The PROXY is the contract** — the implementation
changes on every upgrade, the proxy never does. Everything points at the proxy.

### After it lands

1. **Whitelist USDC**, or nobody can create an escrow:

```bash
ATELIER_ADDRESS=<PROXY> forge script script/WhitelistUSDC.s.sol \
  --rpc-url arc_testnet --broadcast
```

2. **Authorise at least one arbiter** (your own address is fine for the demo) —
   without one, disputes have nobody to resolve them:

```bash
cast send <PROXY> "authorizeArbiter(address)" <YOUR_ADDRESS> \
  --rpc-url "$ARC_RPC_URL" --private-key "$PRIVATE_KEY"
```

3. **Point the app at it** — `app/.env`:

```env
VITE_ATELIER_CONTRACT_ADDRESS=<PROXY>
```

   and `backend/.env` (`CONTRACT_ADDRESS`), and
   `agent/daemon/.env` (`ATELIER_CONTRACT_ADDRESS`).

4. **Sync the ABI** so the frontend can encode the new functions:

```bash
cd app && npm run sync-abi
```

5. **Delete the honesty markers**, which are now out of date — and only now:
   - the `TRUE IN THE REPO, NOT YET ON-CHAIN` block in `src/pages/PostJobPage.tsx`
   - the "built and tested but not yet deployed" clause in
     `src/pages/AutopilotComposePage.tsx`
   - the status line at the top of `docs/adr/0001-autopilot-delegation.md`

---

## Gate 1 is done

| | |
|---|---|
| Proxy (this is the contract) | `0xA93F832ccaAb62123f82D4c92ec897A6Bdb252BE` |
| Implementation | `0x38c42aBd2C652784AE3F2100Fa34127Ad67cAc5f` |
| Deploy block | `60797735` |
| USDC accepted / arbiter set | yes / yes |
| Escrows | none — clean history |

**`VITE_GRAPH_URL` and `GRAPH_URL` are deliberately blank.** The Goldsky
endpoint indexes the pre-Atelier contract, so leaving it set made Browse Jobs
list 65 escrow ids that do not exist on this contract, each rendering as
"0 USDC / No description available". Blank means the app falls back to RPC
multicall against the contract it is actually pointed at. **Fill them in with
the Studio query URL below — not with the old Goldsky one.**

## Gate 2 — the subgraph (Subgraph Studio)

This is the $5,000 Graph track. Goldsky does not qualify; the track asks for
"an API key from Subgraph Studio".

1. Go to [Subgraph Studio](https://thegraph.com/studio/), connect a wallet.
2. **Create a Subgraph**, name it `atelier`, network **Arc Testnet**.
3. Copy the **deploy key** it shows you.

Then update the manifest to the new contract — this is why the contract goes
first. In `subgraph/subgraph.yaml`:

```yaml
source:
  address: "<PROXY>"
  startBlock: <the block the proxy was deployed in>
```

Get the block from the deploy output, or:

```bash
cast receipt <DEPLOY_TX_HASH> --rpc-url "$ARC_RPC_URL" | grep blockNumber
```

Using the right `startBlock` matters: too low and indexing crawls millions of
empty blocks, too high and you silently miss escrows.

```bash
cd subgraph
npm run auth -- <DEPLOY_KEY>
npm run codegen
npm run build
npm run deploy:studio          # asks for a version label, e.g. v0.0.1
```

Studio then shows a **query URL** with an API key in it.

### After it's synced

1. Put the query URL in `app/.env` (`VITE_GRAPH_URL`) and
   `agent/daemon/.env` (`GRAPH_URL`).

2. **Use a rate-limited key.** `VITE_GRAPH_URL` ships inside the browser
   bundle — anyone can read it out of your JS. Studio lets you cap a key by
   domain and by rate; do that rather than shipping an unrestricted one.

3. **Now** add `jobManager` to the query, in the same change. It is deliberately
   left out today — GraphQL *errors* on an unknown field rather than ignoring
   it, so adding it while Goldsky is still live would break every escrow query,
   not just the manager lookup. In `src/lib/graph/queries.ts`, add `jobManager`
   to `ESCROW_CORE` and the field to `GQLEscrow`.

---

## Check it worked

```bash
# contract
cast call <PROXY> "version()(string)" --rpc-url "$ARC_RPC_URL"   # 2.0.0-autopilot
cast call <PROXY> "owner()(address)"  --rpc-url "$ARC_RPC_URL"

# subgraph — should return escrows, not an error
curl -s <QUERY_URL> -H 'Content-Type: application/json' \
  -d '{"query":"{ escrows(first:3){ id jobManager } }"}'

# app
cd app && npm run e2e
```

Then in the app: post a job, expand it in **My Jobs**, and press **Hand to
Autopilot**. It should confirm rather than revert — and **Take back control**
should work immediately after.

---

## What is still true afterwards

Deploying does not make the product trustless. The owner of that proxy can ship
a new implementation over live escrows. That is the standard arrangement and it
is fine, but the honest sentence stays:

> The contract cannot take your money, and the owner can change the contract.

Keep the second clause in the submission.


---

## Gate 3 — Google sign-in for managed wallets

The managed-worker door provisions a Circle MPC wallet, so it needs to know who
somebody is before it hands them one. Without this configured the door is closed
rather than open — an unauthenticated wallet service is worse than none.

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
   **Create credentials** → **OAuth client ID** → **Web application**.
2. Authorised JavaScript origins: `http://localhost:5174` for local, plus your
   deployed origin.
3. Copy the **client ID** (the `.apps.googleusercontent.com` one). There is no
   secret to copy — this flow verifies a signed token rather than exchanging a
   code, so nothing confidential ends up in the browser.

```env
# app/.env
VITE_GOOGLE_CLIENT_ID=…apps.googleusercontent.com

# agent/daemon/.env  — the SAME id
GOOGLE_CLIENT_ID=…apps.googleusercontent.com
```

The daemon uses it as the expected **audience** when verifying tokens. Getting
that check wrong is what turns any Google-signed token on the internet into a
valid login here, so the two values must match exactly.
