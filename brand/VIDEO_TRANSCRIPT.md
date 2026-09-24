# SecureFlow — Technical Video Transcript

Circle Developer Grants, Cohort 2. Runtime approximately 4 minutes 30 seconds.
Circle products named: **USDC**, **Circle Wallets** (developer-controlled MPC), **Contracts**.

---

## 0:00 — What this is

SecureFlow is milestone escrow for freelance work, live on Arc mainnet at
`0xbdeb44945979a01584fd7d796a71C707D2F83372`. A client funds the whole job up
front, the contract holds the money, and it pays out milestone by milestone as
the work is approved. We never hold the funds, and we cannot decide a dispute.

I am going to show you where each Circle product does the work, in the code,
and then show the whole thing running on mainnet.

---

## 0:30 — USDC

**On screen: `agent/daemon/src/config.ts`, lines 188 to 192**

USDC on Arc is the native gas token, exposed as an ERC-20 at the predeploy
address `0x3600000000000000000000000000000000000000`. That is this line.

This is not a detail. It is the reason the product works for the people it is
for. The freelancer is paid in the same asset they pay gas with, so there is no
second token to acquire, no bridge, and no volatile balance to keep topped up.

**On screen: `agent/daemon/src/workers/wallets.ts`, line 156**

`dripGas` sends a newly registered freelancer one cent of USDC, enough to sign
their first transaction. On mainnet the amount is 0.01; on testnet it is 0.05,
chosen per network in `config.ts` rather than hardcoded.

---

## 1:30 — Circle Wallets

**On screen: `agent/daemon/src/circle/circleSigner.ts`, line 131**

This is `createCircleSigner`. It returns a viem-compatible signer whose private
key does not exist anywhere in our infrastructure. Circle holds the key shares,
and every signature is a developer-controlled wallet request. The agent that
reviews work and releases milestones signs through this.

**On screen: `agent/daemon/src/workers/wallets.ts`, lines 105 to 140**

This is `provisionWorkerWallet`, and it is how somebody with no wallet at all
gets paid.

When a freelancer messages our Telegram bot, this first calls `listWallets`
filtered by a `refId` set to their Telegram id. If a wallet already exists for
that person, it is reused. Only if there is none does it call `createWallets`,
stamping the same `refId` onto the new wallet.

That stamp matters. It means the mapping from a person to their money lives on
Circle's side, not only in our database, so the same person returns to the same
address even if our store is lost entirely.

---

## 2:45 — Contracts

**On screen: `app/contracts/solidity/src/SecureFlow.sol`, line 443**

`createEscrow`. The client's full budget moves into the contract here, before
any freelancer applies, and the milestones are fixed at the same moment.

**On screen: same file, line 606**

`approveMilestone`. This is the only path by which money leaves the escrow to a
freelancer. There is no administrative withdrawal, no pause that moves funds,
and no owner sweep, because every rescue function is also a rug.

The contract is a UUPS proxy on Arc mainnet, covered by 193 contract tests
including invariant suites and a Uniswap v4 fork suite. Three internal review
passes produced eight findings, each fixed with a regression test that fails
against the vulnerable code.

---

## 3:45 — Running on mainnet

**On screen: Telegram, then the app, then explorer.arc.io**

A freelancer messages the bot and is given a wallet and a cent of USDC. They
browse open jobs, apply, and submit work, without installing anything.

The client approves the milestone.

**On screen: the transaction on explorer.arc.io**

0.502747 USDC, released to that freelancer on milestone approval, on Arc
mainnet, on 24 September 2026. Every escrow, application, approval and payout
on this platform is public at that address.

---

## Summary of where each product appears

| Circle product | Where in the codebase |
|---|---|
| USDC | `agent/daemon/src/config.ts:190` (native token address), `agent/daemon/src/workers/wallets.ts:156` (`dripGas`) |
| Circle Wallets | `agent/daemon/src/circle/circleSigner.ts:131` (`createCircleSigner`), `agent/daemon/src/workers/wallets.ts:105` (`provisionWorkerWallet`) |
| Contracts | `app/contracts/solidity/src/SecureFlow.sol:443` (`createEscrow`), `:606` (`approveMilestone`), deployed at `0xbdeb44945979a01584fd7d796a71C707D2F83372` |
