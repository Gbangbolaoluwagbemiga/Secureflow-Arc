You are a senior pitch-deck designer who has shipped winning grant submissions for Web3 infrastructure projects on Polygon, Optimism, Base, and Arbitrum. Your job is to produce a **12-slide investor + grant pitch deck** for a product called **SecureFlow**. Output the deck as a structured document with one section per slide. For each slide, give: (1) a tight headline, (2) the body copy, (3) suggested visuals/diagrams/charts (described in detail so a designer can build them), (4) a designer-facing layout note (where stats sit, where the screenshot mock goes, color blocks), and (5) a 15-second speaker script for verbal delivery.

The visual identity is **dark mode, neon-purple accent `#7D00FF`, glassmorphism cards, monospaced code accents, generous whitespace**. Slides should feel like Linear, Vercel, and Stripe had a baby — not like a generic crypto deck. **No emoji. No clichés ("revolutionize", "disrupt", "Web3 native"). No stock photos.** Use real on-chain numbers, real screenshots, and concrete user flows.

---

## NORTH-STAR POSITIONING (use this as the deck's spine)

> **SecureFlow is a trustless, milestone-based escrow marketplace for freelance work, native to Arc EVM. Clients deposit USDC into an audited smart contract; freelancers earn it milestone-by-milestone; a multi-arbiter dispute system replaces lawyers and chargebacks. Gasless onboarding, AI-assisted milestone drafting, and an on-chain reputation system make it as smooth as Upwork — but with no platform holding the funds, no payment delays, and no opaque dispute "support tickets."**

Audience for this deck: **Arc Foundation grant reviewers + early ecosystem investors**. Bias the narrative toward (a) why Arc EVM specifically, (b) defensible technical depth, (c) live working product (not slideware), and (d) a clear path from testnet to revenue.

---

## PROJECT FACTS (all true — use these, don't invent)

### Live deployment

- **Chain:** Arc EVM Testnet (chain ID **5042002**, RPC `https://rpc.drpc.testnet.arc.network`, explorer `https://testnet.arcscan.app`).
- **Contract address:** `0x7aB0853325529aF7EB5c4745413BF01E98c0020f` (SecureFlow.sol).
- **Settlement token:** Circle USDC at `0x3600000000000000000000000000000000000000` (6 decimals, native to Arc).
- **Frontend:** live at [`https://secureflow-arc.vercel.app`](https://secureflow-arc.vercel.app) (Vercel, production deployment).
- **Repo:** [`https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc`](https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc) — open-source, Apache-2.0 licensed.

### Tech stack

- **Smart contracts:** Solidity 0.8.20, Foundry, OpenZeppelin (`Ownable2Step`, `ReentrancyGuard`, `Pausable`, `SafeERC20`).
- **Frontend:** React 19 + TypeScript 5 + Vite 7, wagmi 3 / viem 2, Radix UI + Tailwind + shadcn/ui, Framer Motion.
- **Wallet UX:** Reown AppKit (multi-wallet: MetaMask, WalletConnect, Coinbase, embedded).
- **Backend:** Express + TypeScript on Node 20. Routes for `gasless`, `ai`, `messages`, `notifications`, `evidence`, `upload`, `analytics`, `applications`.
- **Data:** Supabase Postgres (messages, notifications, applications metadata). IPFS via Pinata for tamper-proof dispute evidence.
- **AI:** Groq SDK (Llama-class models) for milestone drafting and cover-letter generation.
- **Indexing:** The Graph subgraph (entities: Escrow, Milestone, Evidence, Application).
- **CI:** GitHub Actions — three parallel jobs (frontend lint+build, backend tsc, Solidity `forge build --sizes`).

### Contract surface (every real function — use this list verbatim in slides where contract depth is shown)

**Escrow lifecycle (11 functions):** `createEscrow`, `startWork`, `extendDeadline`, `submitMilestone`, `approveMilestone`, `rejectMilestone`, `disputeMilestone`, `raiseOverdueDispute`, `resolveDispute` (multi-sig arbiter), `emergencyRefundAfterDeadline` (30-day delay), `submitEvidence` (IPFS CID written on-chain).

**Open-job marketplace (5 functions):**

- `applyToJob` — freelancer submits cover letter + proposed timeline
- `acceptFreelancer` — depositor selects one of the applicants
- `cancelJob` — depositor cancels an unassigned job, refund minus tiered penalty
- **`addJobFunds`** — depositor _increases_ the budget of an unassigned open job
- **`withdrawJobFunds`** — depositor _decreases_ the budget of an unassigned open job

**Milestone negotiation (3 functions):** `proposeMilestoneChange` (freelancer proposes new amount/description), `approveMilestoneProposal`, `rejectMilestoneProposal` (depositor decides).

**Reputation & ratings:** `submitRating` (1–5 stars + written review, once per party per _released_ escrow), on-chain `reputation` counter (`completedEscrows[addr]++`), derived **Beginner / Intermediate / Advanced / Expert** badges (≥1 / ≥5 / ≥10 / ≥20 completed escrows). View helpers: `getAverageRating`, `getRatingsForAddress`, `getRating`.

**Admin (Owner-only):** `authorizeArbiter`, `revokeArbiter`, `whitelistToken`, `blacklistToken`, `setPlatformFee` (capped at **`MAX_PLATFORM_FEE_BP = 1000` bp = 10%**), `setFeeCollector`, `withdrawFees` (fee-collector only), `pause` / `unpause`.

**Views (no gas):** `getEscrow`, `getMilestones`, `getMilestoneCount`, `getUserEscrows`, `getEscrowApplications`, `getApplicationCount`, `getArbiters`, `quoteDeposit`.

**Enums:**

- `EscrowStatus`: `Pending`, `InProgress`, `Released`, `Refunded`, `Disputed`, `Expired`, `Cancelled`
- `MilestoneStatus`: `NotStarted`, `Submitted`, `Approved`, `Rejected`, `Disputed`, `ProposalPending`

**Events emitted (29 total):** `EscrowCreated`, `EscrowUpdated`, `WorkStarted`, `DeadlineExtended`, `MilestoneSubmitted`, `MilestoneApproved`, `MilestoneRejected`, `MilestoneDisputed`, `DisputeVoteCast`, `DisputeResolved`, `FundsRefunded`, `EmergencyRefundExecuted`, `EvidenceSubmitted`, `ApplicationSubmitted`, `FreelancerAccepted`, `OverdueDisputeRaised`, `RatingSubmitted`, `ArbiterAuthorized`, `ArbiterRevoked`, `TokenWhitelisted`, `TokenBlacklisted`, `PlatformFeeUpdated`, `FeeCollectorUpdated`, `FeesWithdrawn`, `JobCancelled`, `JobFundsUpdated`, `MilestoneProposalSubmitted`, `MilestoneProposalApproved`, `MilestoneProposalRejected`.

### Defensive design (highlight as moats)

- **Exact fee model:** client deposits `totalAmount + platformFee` upfront; fee is separated immediately into `totalFeesByToken` so milestone math is exact (sum of milestones == totalAmount). Fee capped at 10% (`MAX_PLATFORM_FEE_BP = 1000`).
- **Multi-sig arbiter dispute:** configurable `requiredConfirmations`; arbiters cast votes via `resolveDispute` and the funds split (`freelancerAmount + clientAmount == milestone.amount`) only executes once the threshold is reached. The arbiter's `reason` is required and stored on-chain.
- **Anti-abuse cancellation:** tiered base penalty (0% for first 2 cancels, then 5%/10%/15%) plus an additional 5–15% applicant penalty (more applicants = bigger penalty); total capped at 30%. Penalty decays one tier per 30 days of clean behavior. Implemented in `_calculateCancellationPenalty` and `_getEffectiveCancellations`.
- **Emergency refund:** depositor can reclaim unpaid funds 30 days past deadline if escrow is stuck (`emergencyRefundAfterDeadline`).
- **Overdue dispute path:** either party can escalate (`raiseOverdueDispute`) after the deadline if the counterparty has gone silent.
- **Deadline extension:** depositor can add days (minimum 1) via `extendDeadline` to a live escrow without re-deposit.
- **Pausable:** `Ownable2Step` + `Pausable` for emergency response without an upgrade.
- **Token whitelist:** only `whitelistedTokens` (plus native ETH) can settle escrows — prevents random ERC-20s with malicious transfer hooks.
- **Original-brief recovery:** because `submitMilestone` overwrites the description on-chain, the frontend decodes the original `createEscrow` calldata from the `EscrowCreated` event log so clients always see what they originally asked for _and_ the freelancer's submission. Solves a real UX bug elegantly with chain-only data.

### Platform features (all built and working)

#### Marketplace + creation

- **Open-job marketplace** with cover-letter applications, AI-drafted cover letters, file/portfolio attachments.
- **Direct contracts** with a known freelancer.
- **3-step creation wizard** — project details → milestones (with AI writer) → review & deposit.
- **AI milestone writer** (Groq) — generates contextual milestone breakdowns from a project brief + budget, balancing amounts to sum exactly to `totalAmount`.
- **AI cover-letter draft / enhance** — generates a fresh letter from the job brief, or polishes a user-typed draft.

#### Client controls (before assignment)

- **Add funds** — `addJobFunds` increases the budget of an unassigned open job (deposits `additionalAmount + fee`).
- **Withdraw funds** — `withdrawJobFunds` decreases the budget of an unassigned open job (refunds proportional fee).
- **Cancel job** — `cancelJob` with the tiered penalty model described above.

#### Client controls (during execution)

- **Approve / reject / dispute milestones** with on-chain reason text.
- **Extend deadline** for live escrows.
- **Approve / reject freelancer milestone-change proposals**.

#### Freelancer controls

- **Submit milestone** with description + optional Supabase-hosted file attachment.
- **Resubmit rejected milestones** with new description + optional attachment.
- **Propose milestone changes** — suggest a new amount/description for a `NotStarted` milestone (one proposal per escrow lifetime — UI-enforced).
- **Raise dispute** — escalate a submitted or rejected milestone to arbiters.
- **Raise overdue dispute** — escalate after the deadline if the client has gone silent.

#### Dispute resolution

- **Multi-arbiter vote** — arbiters call `resolveDispute(escrowId, milestoneIndex, freelancerAmount, clientAmount, reason)`; resolution executes only after `requiredConfirmations` votes.
- **IPFS-pinned evidence room** — file uploaded → Pinata pin → CID submitted on-chain via `submitEvidence` → permanent in event logs. Both parties can submit during a dispute.
- **Admin dispute console** — view all disputed escrows, see both parties' evidence, cast a vote, and write the on-chain `reason`.

#### Reputation & social

- **Reputation badges** (Beginner / Intermediate / Advanced / Expert) derived from on-chain completed-escrow count.
- **Star ratings** — 1–5 stars + written review, submitted once per party per _released_ escrow via `submitRating`.
- **Average rating display** — `getAverageRating(addr)` returns `averageX100` (e.g. 450 = 4.50) and count.
- **Freelancers directory** — browse profiles, ratings, badges; direct-message.

#### Real-time UX

- **Gasless job applications** via EIP-2771 `MinimalForwarder` + funded relayer wallet — freelancers apply without ever touching gas.
- **Real-time in-app chat** (Supabase-backed), deterministic conversation IDs, attachment-aware.
- **Push + in-app notifications** with cross-wallet routing (freelancer notified the instant a milestone is approved on-chain), unread counts, focus/visibility re-fetch, case-insensitive wallet matching.

#### Analytics dashboard

- Platform-wide: active escrows, total volume secured (USDC + ETH), completed escrows, dispute rate, per-token breakdown.
- Per-user: lifetime volume, completion rate, average rating, badge tier.
- **Dispute-aware volume recovery** — original work value is reconstructed from `platformFee` even after post-dispute refunds shrink `totalAmount`.

#### Admin console (owner-only)

- Token whitelist / blacklist.
- Arbiter authorization / revocation (enumerable list).
- Platform-fee adjustment (capped at 10%).
- Fee withdrawal (per token).
- Contract pause / unpause.

#### Anti-abuse + integrity

- Freelancer cap of 3 concurrent ongoing projects (UI-enforced).
- One milestone-change proposal per escrow lifetime.
- Tiered cancellation penalty (contract-enforced) with 30-day decay.
- Token whitelist prevents malicious ERC-20s.
- Wallet addresses normalized to lowercase on backend writes; case-insensitive reads (`ilike`).

### Why Arc EVM (the grant angle)

- **Native USDC at a fixed address** means a real stablecoin settlement layer with no bridge risk and no oracle dependency — perfect for cross-border freelance payments.
- **Low fees** make milestone-sized payouts (often $50–$500) economically viable, unlike Ethereum mainnet.
- **EVM equivalence** lets us reuse the entire mature tooling stack (Foundry, viem, wagmi, OpenZeppelin, Reown AppKit) with zero compromise.
- **Testnet faucet + explorer** mean we shipped a fully working demo in weeks, not quarters.
- SecureFlow is positioned as a **flagship consumer use-case** for Arc — every freelance contract that settles in USDC on Arc directly demonstrates the chain's stablecoin-payments thesis.

### Market context (cite as plausible, sized for tone, do not over-claim)

- Global freelance market: **~$1.5T annual gross volume**, growing double-digit.
- Upwork charges freelancers **10%** + payment-processing fees; freelancers wait 5–14 days for funds; chargebacks and disputes are arbitrated by an opaque internal team.
- 60M+ freelancers globally; the largest underbanked population on the internet.
- Stablecoin freelance settlement is already a behavior (search "USDT freelance Telegram") — but happens informally with no escrow, no dispute resolution, and no reputation. SecureFlow formalizes what's already happening.

---

## DELIVERABLE FORMAT

Return the deck as **Markdown with one `## Slide N — Title` heading per slide**, then nested subsections labeled `### Headline`, `### Body`, `### Visual`, `### Layout`, `### Speaker note`. After the 12 slides, append an `## Appendix` section with three optional bonus slides (tokenomics-of-fees, security & audit posture, founding-team placeholder card).

---

## REQUIRED SLIDE ORDER

### Slide 1 — Cover

- **Headline:** SecureFlow
- **Sub-headline:** Trustless milestone escrow for freelance work on Arc EVM.
- **Body:** One sentence positioning + chain + contract address + repo link placeholder.
- **Visual:** Wordmark on dark canvas, neon-purple gradient glow, faint Arc EVM logo bottom-right.

### Slide 2 — The problem

- **Headline:** Freelance payments are still broken.
- **Body:** Three concrete pains: (a) platforms hold funds for 5–14 days and skim 10–20%; (b) disputes are arbitrated by opaque internal teams with no recourse; (c) cross-border freelancers (60M+ globally) can't reliably get paid in stable assets. Show the "informal Telegram USDC handshake" as evidence of pent-up demand with no infrastructure.
- **Visual:** Three-column comparison cards — _Traditional platform_ / _Informal stablecoin DM_ / _(empty spot for SecureFlow)_. Each shows: fees, payout delay, dispute path, trust assumption.

### Slide 3 — The solution

- **Headline:** Smart-contract escrow that pays at the milestone, not the platform.
- **Body:** SecureFlow locks USDC in an audited contract on Arc. Funds release milestone-by-milestone when the client approves. If they don't, a multi-arbiter dispute splits the milestone. If the client ghosts, the freelancer can raise an overdue dispute after the deadline, and there's an automatic emergency refund 30 days past deadline. Highlight: **no human ever holds the money.**
- **Visual:** Animated flow diagram (depict as a horizontal swimlane): Client deposit → Smart Contract Escrow → Milestone 1 approve → Payout → … → Final rating. Side branches for _Reject_ (resubmit) and _Dispute_ (arbiter vote → split).

### Slide 4 — Product (live screenshots)

- **Headline:** Not a deck. A live product.
- **Body:** Bullet **eight** core screens with one-line value props each: **Browse Jobs** (open marketplace with AI cover-letter draft), **Create Escrow Wizard** (3-step with AI milestone writer), **Client Dashboard** (milestone approve/reject/dispute, deadline extension, add/withdraw/cancel job funds), **Freelancer Console** (earnings, badge tier, submit/resubmit with attachments, propose milestone changes, raise disputes), **Analytics Dashboard** (platform + per-user stats, dispute-aware volume recovery), **Disputes Console** (multi-arbiter voting + IPFS evidence viewer), **Messages** (Supabase-backed real-time chat), **Admin Console** (token whitelist, arbiter management, fee config, pause). Mention real on-chain stats from live testnet contract: active escrows, total volume secured (USDC + ETH), completed escrows.
- **Visual:** 4×2 grid of real screenshots — placeholder boxes labeled `Browse Jobs`, `Create Wizard`, `Client Dashboard`, `Freelancer Console`, `Analytics`, `Disputes`, `Messages`, `Admin`. Designer instruction: replace with actual screenshots from `secureflow-arc.vercel.app`.

### Slide 5 — How it works (technical flow)

- **Headline:** Seven contract calls on the happy path. Zero intermediaries on any path.
- **Body:** Walk the canonical happy path: `createEscrow` (client deposits totalAmount + fee) → `applyToJob` + `acceptFreelancer` (or direct assignment) → `startWork` → `submitMilestone` → `approveMilestone` (auto-payout in same tx) → `submitRating` (both parties).
- Annotate the unhappy / control paths so reviewers see the contract is _complete_:
  - **Resubmit:** `rejectMilestone(reason)` → freelancer resubmits with new description + attachment.
  - **Dispute (either party):** `disputeMilestone(reason)` → arbiters `resolveDispute(...)` after `requiredConfirmations` votes → split payout.
  - **Overdue:** deadline passes → `raiseOverdueDispute` or, 30 days later, `emergencyRefundAfterDeadline`.
  - **Extend:** `extendDeadline(days)` keeps a live escrow alive without re-deposit.
  - **Negotiate:** `proposeMilestoneChange` → `approveMilestoneProposal` / `rejectMilestoneProposal`.
  - **Mutate budget (pre-assignment):** `addJobFunds` / `withdrawJobFunds` / `cancelJob`.
  - **Evidence:** `submitEvidence(cid)` writes Pinata-pinned IPFS CID to event logs during a dispute.
- **Visual:** Sequence diagram in monospaced style — four lanes (Client, Freelancer, Smart Contract, Arbiter) with the happy-path arrows in neon-purple and the unhappy-path arrows in muted amber. Function names in `code` style.

### Slide 6 — Differentiators / moats

- **Headline:** What we do that nobody else does.
- **Body:** Nine pills, each with a one-sentence proof and the matching contract function name in monospace:
  1. **Gasless onboarding** — EIP-2771 `MinimalForwarder` relayer pays gas for first-time freelancer `applyToJob` calls; no faucet trip.
  2. **AI milestone drafting** — Groq-powered breakdown (`POST /v1/ai/milestones`) turns a 2-sentence brief into a budget-balanced milestone plan.
  3. **IPFS-anchored evidence** — disputed milestones get Pinata-pinned files with the CID written on-chain via `submitEvidence(escrowId, milestoneIndex, cid)`.
  4. **Multi-arbiter dispute resolution** — configurable `requiredConfirmations` threshold; `resolveDispute(...)` splits the milestone with the arbiter's `reason` recorded on-chain.
  5. **On-chain reputation + badges** — Beginner / Intermediate / Advanced / Expert tiers (≥1/5/10/20) derived from `reputation[addr]`; portable across any frontend.
  6. **Mutable budgets pre-assignment** — clients can `addJobFunds` and `withdrawJobFunds` on open jobs _before_ a freelancer is assigned, with automatic fee adjustment. Most escrow platforms force a single deposit; SecureFlow treats budget like a live posting.
  7. **Milestone negotiation built in** — freelancers `proposeMilestoneChange(amount, description)` for unstarted milestones; clients accept or reject on-chain. No off-chain back-and-forth.
  8. **Either-party dispute + overdue path** — `disputeMilestone` works for both client _and_ freelancer; `raiseOverdueDispute` covers ghosting clients. Symmetric protection.
  9. **Anti-abuse economics on-chain** — tiered cancellation penalty (0/5/10/15%) + applicant penalty (0/5/10/15%) capped at 30%, with 30-day decay, all in `_calculateCancellationPenalty`. Freelancer cap of 3 concurrent projects. One proposal per escrow.
- **Visual:** Nine tiles in a 3×3 grid; each tile shows the differentiator label + the corresponding contract function name in monospace as proof-of-implementation.

### Slide 7 — Why Arc EVM (the grant angle — be specific)

- **Headline:** Built for Arc, not ported to Arc.
- **Body:** Three reasons tied to chain properties:
  1. **Native USDC at `0x3600…0000`** — settlement layer is already a regulated stablecoin; no bridge, no oracle, no wrap.
  2. **Fee profile makes milestone payouts viable** — $50–$500 milestone settlements would be uneconomic on Ethereum L1; Arc makes them routine.
  3. **EVM-equivalent** — we ship with Foundry + viem + OpenZeppelin + Reown AppKit unchanged. Zero compromises, full mature tooling.
- Close with: _SecureFlow is a flagship consumer use-case for Arc's stablecoin-payments thesis. Every escrow on Arc is a live demo of the chain's product–market fit._
- **Visual:** Side-by-side comparison table — Arc EVM vs. generic L1 — across columns: USDC native, fee per tx, EVM equivalence, settlement finality, ecosystem stage.

### Slide 8 — Architecture

- **Headline:** A real stack, not a hackathon stub.
- **Body:** Three-layer diagram: (1) **Smart contract** — Foundry-built, OpenZeppelin-audited primitives, Pausable + ReentrancyGuard + Ownable2Step. (2) **Backend services** — Express + TypeScript: gasless relayer (EIP-2771), Groq AI proxy, Supabase-backed messaging + notifications + applications, Pinata-backed IPFS evidence pinning, on-chain analytics aggregator. (3) **Frontend** — React 19 + Vite, wagmi 3 / viem 2, Reown AppKit for any-wallet support, Tailwind + shadcn/ui. Add: **The Graph subgraph** indexes EscrowCreated/Milestone events for fast historical queries. **CI** runs frontend lint+build, backend tsc, and `forge build --sizes` on every push.
- **Visual:** Three-layer stack diagram (client / backend / contract) with annotated arrows: read paths via viem/wagmi, write paths via wagmi signer or via relayer for gasless, off-chain data via Supabase + IPFS.

### Slide 9 — Traction & status

- **Headline:** Live on testnet. Production-grade today.
- **Body:** A status checklist:
  - Smart contract **deployed and verified** on Arc Testnet at `0x7aB0…0020f`.
  - Live frontend on Vercel; full client + freelancer + admin flows working end-to-end.
  - CI green on three parallel jobs (frontend, backend, contracts).
  - Codebase open-sourced under Apache-2.0.
  - In testnet usage: real escrows created, real disputes resolved, real ratings submitted.
- Then **next 90 days roadmap**: mainnet deployment → external audit → fiat on-ramp partner integration → mobile-first PWA → arbiter staking economics.
- **Visual:** Vertical timeline split into "**Done**" (testnet, contract, app, CI, gasless, AI, IPFS evidence) and "**Next 90 days**" (audit, mainnet, mobile, on-ramp, arbiter staking).

### Slide 10 — Business model

- **Headline:** A small fee on every milestone. Predictable, capped, on-chain.
- **Body:** Platform fee is set on the contract in basis points (currently capped at **10% = 1000 bp**), collected at deposit time alongside `totalAmount`. Fee is held in `totalFeesByToken` and withdrawable only by the configured `feeCollector` address — meaning fee economics are fully on-chain and verifiable. Future revenue lines (none assumed in baseline projection): arbiter staking yield, premium freelancer profiles, fiat on-ramp rev-share.
- **Unit economics example:** at a 3% fee on a $500 milestone, platform earns $15 per milestone × 4 milestones per escrow = $60 / escrow. 10,000 escrows / month = $600k MRR. Conservative tone — "illustrative, not a forecast."
- **Visual:** Stacked bar chart projecting MRR at 1k / 5k / 10k / 50k escrows per month with the 3% fee assumption highlighted.

### Slide 11 — The ask

- **Headline:** What we're asking Arc for.
- **Body:** Be specific. Two columns:
  - **Grant request:** a specific USDC amount earmarked for (a) external security audit, (b) mainnet deployment + liquidity bootstrapping, (c) integration with an Arc-aligned fiat on-ramp, (d) ecosystem co-marketing as a flagship Arc consumer dApp.
  - **What we commit in return:** open-source codebase, public arbiter onboarding, Arc-branded landing, monthly transparency reports on volume + dispute rate, case-study collaboration. Mention any technical contributions back to the Arc ecosystem (e.g. EIP-2771 forwarder template, Reown AppKit Arc network preset).
- **Visual:** Two-column ledger card titled "**Ask / Give**".

### Slide 12 — Team & contact

- **Headline:** Builders, not pitch-deck professionals.
- **Body:** Placeholder cards for founder(s): name, prior shipping credentials (e.g. "shipped X on Y chain"), GitHub, X/Twitter, email. One-line operating principle: **"We ship working code first and tell stories about it second."** Close with the same one-liner from slide 1 for symmetry: _Trustless milestone escrow for freelance work on Arc EVM._
- **Visual:** Founder card(s) in a horizontal row + final wordmark + contact CTA. Two QR codes side by side: one for the **live app** (`https://secureflow-arc.vercel.app`) and one for the **GitHub repo** (`https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc`). Label each QR clearly.

---

## APPENDIX (bonus slides — generate after the main 12)

### Appendix A — Fee economics & tokenomics-of-revenue

A1 paragraph + a table showing fee_bp → effective revenue per $100k of GMV → break-even relative to fixed costs (audit, infra, support).

### Appendix B — Security & audit posture

List the security primitives already in code (`Ownable2Step`, `ReentrancyGuard`, `Pausable`, `SafeERC20`, `nonReentrant` on every state-changing payable function, multi-sig dispute, anti-abuse cancellation logic, emergency refund). Then list the explicit known limitations (single-arbiter possible if owner mis-configures, no formal audit yet, Pinata centralization for evidence pinning) with the mitigation plan for each.

### Appendix C — Founder card placeholder + advisor slots

Photo placeholders, two-line bios, advisor slot openings to signal expansion intent.

---

## TONE & WRITING RULES

- **Concrete > clever.** "Funds release on `approveMilestone` in the same transaction" beats "trustless instant settlement."
- **Numbers in monospace** when displayed inline. Addresses always abbreviated as `0x7aB0…0020f`.
- **No filler adjectives.** Cut "innovative", "cutting-edge", "next-generation", "revolutionary", "seamless", "world-class".
- **Active voice.** "The contract pays the freelancer" not "The freelancer is paid by the contract."
- **Honesty about scope.** Say "testnet" where it's testnet. Say "before mainnet" where it's before mainnet. Reviewers can smell hand-waving from one slide away.
- **Designer-honest layout notes.** When you describe a chart or screenshot, specify pixel-grid suggestions (e.g. "12-col grid, screenshot occupies cols 7–12 full-bleed; copy occupies cols 1–5 with 80px top padding").

---

## OUTPUT CHECKLIST (the deck is not done unless all are true)

- [ ] Exactly 12 main slides + 3 appendix slides.
- [ ] Every claim about contract behavior matches the function names listed in PROJECT FACTS above. No invented features.
- [ ] Arc EVM is named on at least four slides (cover, problem-or-solution, why-Arc, ask).
- [ ] One slide is dedicated to live-product screenshots (placeholder boxes are fine but explicit).
- [ ] Speaker notes are short (~30 words) and read as one breath each.
- [ ] No emoji anywhere. No stock-photo references. No exclamation marks except in section headers.
- [ ] Visuals are described concretely enough that a designer can build them without follow-up questions.

Now produce the deck.
