# SecureFlow

<div align="center">

**A decentralized freelancer marketplace built on Arc EVM that provides secure, trustless escrow services for freelance work agreements.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-secureflow--arc.vercel.app-7D00FF?style=flat-square&logo=vercel&logoColor=white)](https://secureflow-arc.vercel.app)
[![Arc EVM](https://img.shields.io/badge/Arc-EVM-7D00FF?style=flat-square)](https://arc.network)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-363636?style=flat-square&logo=solidity)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)

</div>

---

## Overview

SecureFlow is a blockchain-powered freelancer marketplace that enables clients and freelancers to collaborate with trustless, milestone-based escrow contracts. Built on Arc EVM using Solidity smart contracts, SecureFlow ensures secure payments, transparent milestone tracking, and fair dispute resolution—all without requiring trust between parties.

### Why SecureFlow?

- **Trustless Escrow**: Funds are locked in audited smart contracts until work is approved
- **Low-Cost**: Leverages Arc EVM's efficient network for fast, affordable transactions
- **Gasless Option**: EIP-2771 meta-transactions let freelancers apply to jobs without paying gas
- **Fair Disputes**: Multi-arbiter system ensures equitable conflict resolution
- **On-Chain Reputation**: Build verifiable trust through blockchain reputation scores
- **AI-Powered**: Groq-powered milestone generation and cover letter drafting

---

## Features

### Escrow lifecycle (on-chain)

- **Milestone-based escrow** — `createEscrow` locks `totalAmount + platformFee` in the contract; milestones sum exactly to `totalAmount`.
- **Open-job marketplace** — create an escrow with no beneficiary (`address(0)`); freelancers `applyToJob` with a cover letter and proposed timeline; client `acceptFreelancer` to assign.
- **Direct contracts** — assign a freelancer at creation time, skipping the application step.
- **Sequential milestones** — `startWork` flips the escrow to `InProgress`; freelancer must submit milestone N before N+1 becomes eligible.
- **Submit / approve / reject** — `submitMilestone` (with description and optional attachment link) → `approveMilestone` pays in the same transaction, or `rejectMilestone` returns it for resubmission with the rejection reason on-chain.
- **Milestone resubmission** — rejected milestones can be resubmitted with a new description and an optional file attachment (Supabase-hosted, link appended on-chain).
- **Disputes (either party)** — `disputeMilestone` lets the client _or_ freelancer escalate a submitted/rejected milestone to arbiters.
- **Overdue dispute** — `raiseOverdueDispute` if the deadline passes with the escrow still in progress.
- **Emergency refund** — `emergencyRefundAfterDeadline` returns unpaid funds to the depositor 30 days after the deadline.
- **Deadline extension** — `extendDeadline` lets the client add days (minimum 1) to a live escrow.
- **Evidence room (IPFS)** — `submitEvidence` writes a Pinata-pinned IPFS CID to event logs; both parties can submit during a dispute.

### Job-fund management (before assignment)

- **Add funds** — `addJobFunds` lets the depositor increase the budget of an unassigned open job, depositing extra `additionalAmount + fee`.
- **Withdraw funds** — `withdrawJobFunds` lets the depositor reduce the budget of an unassigned open job, refunding the proportional fee.
- **Cancel job** — `cancelJob` refunds the depositor with a **tiered anti-abuse penalty**:
  - 0–2 cancellations: 0% penalty
  - 3–5: 5% · 6–10: 10% · 11+: 15%
  - Plus an additional 5–15% based on how many freelancers had already applied
  - Total capped at 30%; penalty decays one tier per 30 days of clean behavior

### Milestone negotiation

- **Propose changes** — `proposeMilestoneChange` lets the freelancer suggest a new amount and/or description for a `NotStarted` milestone (one proposal per escrow lifetime — enforced client-side).
- **Approve / reject proposal** — `approveMilestoneProposal` or `rejectMilestoneProposal` from the client; on approval the milestone is updated in place.

### Multi-arbiter dispute resolution

- **Multi-sig vote** — arbiters call `resolveDispute(escrowId, milestoneIndex, freelancerAmount, clientAmount, reason)`; the resolution only executes once `requiredConfirmations` votes are reached.
- **Split outcome** — funds split exactly: `freelancerAmount + clientAmount == milestone.amount`; both are transferred atomically.
- **On-chain rationale** — the arbiter's `reason` is stored in the milestone struct and emitted in the `DisputeResolved` event.

### Reputation, ratings, and badges

- **On-chain reputation counter** — `reputation[address]` increments when an escrow is fully released.
- **1–5 star ratings** — `submitRating` is callable by either party exactly once per completed escrow, with a written review.
- **Derived badge tier** — Beginner (≥1), Intermediate (≥5), Advanced (≥10), Expert (≥20) completed escrows.

### Platform UX

- **AI milestone writer** — Groq-powered generation of contextual milestone breakdowns from a project brief + budget.
- **AI cover-letter drafting** — generate or enhance a cover letter when applying to a job.
- **Gasless job applications** — EIP-2771 `MinimalForwarder` relayer pays gas for first-time freelancer applications.
- **Real-time chat** — Supabase-backed in-app messaging, deterministic conversation IDs, attachment-aware.
- **In-app + push notifications** — cross-wallet routing (e.g. freelancer notified when client approves a milestone), unread counts, focus/visibility re-fetch.
- **File uploads** — milestone attachments via Supabase Storage (`milestone-attachments` bucket, 10 MB max, PDF/images/docs).
- **Analytics dashboard** — platform-wide and per-user stats: total volume secured (USDC + ETH), active escrows, completed escrows, dispute rate, per-token breakdown, dispute-resolution-aware volume recovery.
- **Original-brief recovery** — because `submitMilestone` overwrites `m.description` on-chain, the frontend decodes the original `createEscrow` calldata from the `EscrowCreated` event log and shows both the original requirement and the freelancer's submission response.
- **Anti-abuse limits** — freelancer cap of 3 concurrent ongoing projects (UI-enforced).
- **Admin console** — token whitelisting, arbiter management, platform-fee adjustment, fee withdrawal, contract pause/unpause, dispute resolution UI.
- **Token whitelisting** — only `whitelistedTokens` (plus native ETH) can be used as the settlement asset.
- **Indexed history** — The Graph subgraph indexes `EscrowCreated`, milestone events, evidence submissions, and applications for fast historical queries.

---

## Frontend pages

| Route          | Purpose                                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | Home — hero, live platform stats (active escrows, total volume secured, completed escrows)                                                     |
| `/jobs`        | Browse open jobs, filter by status, apply with cover letter + portfolio attachment + AI draft                                                  |
| `/create`      | 3-step wizard: project details → milestones (with AI writer) → review & deposit                                                                |
| `/dashboard`   | Client view: per-escrow card, milestone approve/reject/dispute, deadline extension, job-fund management (add / withdraw / cancel)              |
| `/freelancer`  | Freelancer console: earnings, badge tier, average rating, milestone submit/resubmit (with attachment), propose milestone change, raise dispute |
| `/approvals`   | Job creator approvals: review applicants, accept freelancer, cross-wallet notifications                                                        |
| `/freelancers` | Browse freelancer profiles, ratings, badges, direct-message                                                                                    |
| `/messages`    | Inbox + per-conversation chat                                                                                                                  |
| `/analytics`   | Platform-wide and per-user analytics: volume, completion rate, dispute rate, per-token breakdown                                               |
| `/disputes`    | Arbiter dispute resolution UI (multi-sig vote, evidence viewer, split-amount form)                                                             |
| `/admin`       | Owner-only console: token whitelist, arbiter management, fee config, fee withdrawal, contract pause                                            |

---

## Tech Stack

| Layer                | Technology                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Smart contracts      | Solidity 0.8.20, Foundry, OpenZeppelin (`Ownable2Step`, `ReentrancyGuard`, `Pausable`, `SafeERC20`) |
| Blockchain           | Arc EVM Testnet (chain ID `5042002`)                                                                |
| Frontend             | React 19, TypeScript 5, Vite 7, Framer Motion                                                       |
| Web3 client          | wagmi 3, viem 2                                                                                     |
| Wallet UX            | Reown AppKit (MetaMask, WalletConnect, Coinbase, embedded)                                          |
| UI                   | Radix UI, Tailwind CSS, shadcn/ui                                                                   |
| Backend              | Express.js + TypeScript on Node 20                                                                  |
| Database             | Supabase (PostgreSQL + Storage)                                                                     |
| Tamper-proof storage | IPFS via Pinata (dispute evidence)                                                                  |
| AI                   | Groq SDK (Llama-class models)                                                                       |
| Indexing             | The Graph subgraph (Escrow, Milestone, Evidence, Application)                                       |
| Meta-tx              | EIP-2771 `MinimalForwarder` (gasless onboarding)                                                    |
| CI                   | GitHub Actions — frontend lint+build, backend tsc, `forge build --sizes`                            |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Foundry](https://getfoundry.sh/) (for contract deployment)
- [MetaMask](https://metamask.io/) or any EVM wallet
- Arc Testnet USDC tokens (for testing)

### 1. Clone & Install

```bash
git clone https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc
cd SecureFlow-scaffold
npm install
cd backend && npm install && cd ..
```

### 2. Environment Variables

```bash
# Frontend
cp .env.example .env
# Required variables:
# - VITE_SECUREFLOW_CONTRACT_ADDRESS: Deployed contract address
# - VITE_USDC_TOKEN_CONTRACT: USDC token address (0x3600000000000000000000000000000000000000)
# - VITE_API_URL: Backend API URL (http://localhost:3000 for dev)
# - VITE_SUPABASE_URL: Supabase project URL
# - VITE_SUPABASE_ANON_KEY: Supabase anonymous key

# Backend
cp backend/.env.example backend/.env
# Required variables:
# - SUPABASE_URL: Supabase project URL
# - SUPABASE_SERVICE_KEY: Supabase service role key
# - GROQ_API_KEY: Groq API key for AI features
# - RELAYER_PRIVATE_KEY: Private key for gasless transactions
# - RELAYER_ADDRESS: Address of the relayer
```

### 3. Deploy the Contract

```bash
# Set PRIVATE_KEY and ARC_RPC_URL in .env (or export them)
export PRIVATE_KEY=your_private_key
export ARC_RPC_URL=https://rpc.drpc.testnet.arc.network

chmod +x deploy.sh
./deploy.sh

# Copy the deployed address to VITE_SECUREFLOW_CONTRACT_ADDRESS in .env
```

### 4. Run the App

```bash
# Terminal 1 — frontend dev server
npm run dev

# Terminal 2 — backend API
cd backend && npm run dev
```

Open `http://localhost:5173` and connect MetaMask to Arc Testnet (chain ID 5042002).

### 5. Get Test USDC

1. Visit the [Arc Testnet Faucet](https://faucet.testnet.arc.network)
2. Request test ETH and USDC tokens
3. Tokens will arrive in your wallet within a few minutes

### Arc Testnet Network Details

| Field                   | Value                                          |
| ----------------------- | ---------------------------------------------- |
| Chain ID                | 5042002                                        |
| RPC URL                 | https://rpc.drpc.testnet.arc.network           |
| Block Explorer          | https://testnet.arcscan.app                    |
| Native Currency         | ETH                                            |
| **SecureFlow Contract** | **0x7aB0853325529aF7EB5c4745413BF01E98c0020f** |
| USDC Token              | 0x3600000000000000000000000000000000000000     |

---

## Token Approval Flow

When creating an escrow with USDC tokens, SecureFlow automatically handles the token approval process:

### How It Works

1. **User initiates escrow creation** with USDC amount
2. **App checks current allowance** on the USDC contract
3. **If allowance is insufficient**:
   - Toast notification: "Token Approval Required"
   - Wallet popup appears for user to approve
   - User signs the approval transaction
   - App waits for approval to be mined
4. **After approval is confirmed**:
   - Toast notification: "Token Approved Successfully"
   - Escrow creation proceeds automatically
5. **Escrow is created** and funds are locked in the contract

### User Experience

- **First time**: User sees approval popup, then escrow creation
- **Subsequent times**: If allowance is sufficient, no approval needed
- **Error handling**: Clear messages if user rejects or approval fails

### Technical Details

- USDC on Arc Testnet: `0x3600000000000000000000000000000000000000` (6 decimals)
- Approval amount: `totalAmount + platformFee` (in wei)
- Timeout: 2 minutes for approval confirmation
- Polling interval: 1 second for faster confirmation

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Contract deployed and verified on Arc Mainnet
- [ ] All environment variables configured
- [ ] Backend API deployed and running
- [ ] Supabase database migrated
- [ ] USDC token whitelisted on contract
- [ ] Admin address set on contract
- [ ] Platform fee configured
- [ ] Relayer configured for gasless transactions

### Deployment Steps

1. **Deploy Smart Contract**

   ```bash
   export PRIVATE_KEY=your_mainnet_key
   export ARC_RPC_URL=https://rpc.arc.network
   ./deploy.sh
   ```

2. **Verify Contract on Block Explorer**

   ```bash
   # Use Arc Scan to verify the contract
   # https://arcscan.app
   ```

3. **Deploy Backend**

   ```bash
   # Deploy to your hosting (Vercel, Railway, etc.)
   cd backend
   npm run build
   # Follow your hosting provider's deployment guide
   ```

4. **Deploy Frontend**

   ```bash
   # Build for production
   npm run build

   # Deploy to Vercel, Netlify, or your hosting
   # Update VITE_API_URL to production backend URL
   ```

5. **Configure DNS & SSL**
   - Point domain to frontend hosting
   - Enable SSL/TLS certificates
   - Update CORS settings in backend

### Monitoring

- Monitor contract events on Arc Scan
- Track API errors in backend logs
- Monitor Supabase database performance
- Set up alerts for failed transactions

---

## API Documentation

### Backend Routes (Express, mounted under `/v1`)

#### Gasless relayer (EIP-2771)

- `POST /v1/gasless/relay` — verify a user-signed `ForwardRequest`, submit via `MinimalForwarder.execute()`, relayer pays gas
- `GET  /v1/gasless/nonce/:address` — read the forwarder nonce for a user
- Env required: `RELAYER_PRIVATE_KEY`, `ARC_RPC_URL`, `TRUSTED_FORWARDER_ADDRESS`

#### AI (Groq)

- `POST /v1/ai/milestones` — generate milestone suggestions from a project brief
- `POST /v1/ai/cover-letter` — draft (or enhance) a cover letter for a job application
- `POST /v1/ai/rewrite` — polish arbitrary text

#### Messaging (Supabase)

- `GET  /v1/messages/inbox?wallet=0x…` — conversation list for a wallet
- `GET  /v1/messages/:conversationId` — full conversation history
- `POST /v1/messages` — send a message
- `POST /v1/messages/:conversationId/read` — mark as read

#### Notifications (Supabase)

- `GET   /v1/notifications?wallet=0x…` — list notifications (case-insensitive wallet match)
- `POST  /v1/notifications` — create a notification (used by frontend on counterparty actions)
- `PATCH /v1/notifications/:id/read` — mark one as read
- `GET   /v1/notifications/unread-count?wallet=0x…` — badge count for navbar

#### File uploads (Supabase Storage)

- `POST /v1/upload/milestone` — multipart upload to `milestone-attachments` bucket (10 MB max)

#### Evidence room (IPFS via Pinata)

- `POST /v1/evidence/pin` — multipart upload, pins to IPFS, returns CID; frontend then calls `submitEvidence(escrowId, cid)` on-chain

#### Analytics (on-chain reads)

- `GET /v1/analytics/platform` — total volume, active/completed/disputed counts, per-token breakdown
- `GET /v1/analytics/user/:address` — per-user volume, completion rate, average rating, badge tier

#### Applications

- `GET /v1/applications/:escrowId` — application metadata (cover letter, timeline, attachments)

#### Middleware

- `cors` locked to `FRONTEND_URL` in production
- `express-rate-limit` — 60 requests/minute/IP global, stricter per-route limits on AI endpoints
- `requireApiSecret` — Bearer-token gate on write-heavy routes

---

## Troubleshooting

### Token Approval Not Showing

**Problem**: Wallet popup doesn't appear when creating escrow

**Solutions**:

1. Check that USDC token address is correct in `.env`
2. Ensure wallet is connected to Arc Testnet
3. Try refreshing the page and reconnecting wallet
4. Check browser console for errors

### Escrow Creation Timeout

**Problem**: "Transaction failed - timeout" error

**Solutions**:

1. Check Arc Testnet RPC status
2. Ensure sufficient gas (ETH) in wallet
3. Wait a few minutes and retry
4. Check transaction on Arc Scan

### Insufficient Balance

**Problem**: "Insufficient USDC balance" error

**Solutions**:

1. Request test USDC from faucet
2. Check wallet balance on Arc Scan
3. Ensure you have enough for escrow + platform fee
4. Verify correct network (Arc Testnet, chain ID 5042002)

### Backend API Errors

**Problem**: "Failed to connect to API" error

**Solutions**:

1. Verify backend is running (`npm run dev` in backend folder)
2. Check `VITE_API_URL` in frontend `.env`
3. Verify CORS settings in backend
4. Check backend logs for errors

---

## Security Considerations

### Smart Contract

- **OpenZeppelin primitives**: `Ownable2Step` (two-step ownership transfer), `ReentrancyGuard` on every state-changing payable function, `Pausable` for emergency halts, `SafeERC20` for all token transfers
- **Custom errors** (gas-cheap) instead of string reverts on every revert path
- **Multi-sig dispute resolution** — configurable `requiredConfirmations` arbiter threshold
- **Exact accounting** — milestones sum exactly to `totalAmount`; fee separated at deposit; `escrowedAmount` tracked per token
- **Anti-abuse cancellation** — tiered penalty (0/5/10/15%) + application-based penalty (0/5/10/15%), capped at 30%, with 30-day decay
- **Emergency refund** after `deadline + 30 days` for stuck escrows
- **Platform fee capped** at `MAX_PLATFORM_FEE_BP = 1000` (10%)
- **Token whitelist** — only owner-approved ERC-20s (plus native ETH) can be used as settlement
- **External audit**: planned before mainnet deployment

### Frontend

- No private keys stored in browser; all transactions signed by user wallet
- HTTPS only in production; CSP headers
- Reown AppKit handles wallet session management
- Input validation on every form before submission
- Optimistic UI bounded — destructive actions require explicit confirmation

### Backend

- Environment-scoped secrets (Vercel / Railway env vars); never committed
- `cors` locked to `FRONTEND_URL` in production
- `express-rate-limit` global (60/min/IP) + per-route limits on AI endpoints
- Bearer-token gate (`requireApiSecret`) on write-heavy routes
- Supabase Row-Level Security on `messages`, `notifications`, `applications` tables
- Pinata JWT scoped to evidence-pinning only
- Wallet addresses normalized to lowercase on writes; case-insensitive reads (`ilike`)

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Gbangbolaoluwagbemiga/Secureflow-Arc/discussions)
- **Discord**: [Join our community](https://discord.gg/your-invite)
- **Email**: support@secureflow.app

---

### `SecureFlow.sol` — complete contract surface

```
SecureFlow
│
├── ESCROW LIFECYCLE
│   ├── createEscrow()                — depositor locks totalAmount + fee, defines milestones
│   ├── startWork()                   — freelancer accepts → escrow goes InProgress
│   ├── extendDeadline()              — depositor adds days (≥1) to a live escrow
│   ├── submitMilestone()             — freelancer submits work (description + optional CID)
│   ├── approveMilestone()            — depositor approves → payout in same tx
│   ├── rejectMilestone()             — depositor rejects with reason → freelancer can resubmit
│   ├── disputeMilestone()            — either party escalates to arbiters
│   ├── raiseOverdueDispute()         — either party escalates after deadline
│   ├── resolveDispute()              — multi-sig arbiter splits milestone amount
│   ├── emergencyRefundAfterDeadline()— depositor reclaims unpaid funds 30 days after deadline
│   └── submitEvidence()              — write Pinata IPFS CID to event logs during a dispute
│
├── OPEN JOB MARKETPLACE
│   ├── applyToJob()                  — freelancer submits cover letter + proposed timeline
│   ├── acceptFreelancer()            — depositor assigns one of the applicants
│   ├── cancelJob()                   — depositor cancels unassigned job (tiered penalty)
│   ├── addJobFunds()                 — depositor increases unassigned job budget
│   └── withdrawJobFunds()            — depositor decreases unassigned job budget
│
├── MILESTONE NEGOTIATION
│   ├── proposeMilestoneChange()      — freelancer proposes new amount/description
│   ├── approveMilestoneProposal()    — depositor accepts the proposal
│   └── rejectMilestoneProposal()     — depositor rejects, milestone returns to NotStarted
│
├── REPUTATION & RATINGS
│   ├── submitRating()                — 1–5 star + review (once per party per released escrow)
│   ├── reputation(addr)              — public counter of completed escrows
│   ├── getAverageRating(addr)        — averageX100 + count
│   ├── getRatingsForAddress(addr)    — all ratings received
│   └── getRating(escrowId, rater)    — specific rating
│
├── ADMIN
│   ├── authorizeArbiter() / revokeArbiter()
│   ├── whitelistToken() / blacklistToken()
│   ├── setPlatformFee()              — capped at 1000 bp (2.5%)
│   ├── setFeeCollector()
│   ├── withdrawFees()                — only feeCollector
│   └── pause() / unpause()           — Ownable2Step
│
└── VIEWS
    ├── getEscrow() / getMilestones() / getMilestoneCount()
    ├── getUserEscrows()
    ├── getEscrowApplications() / getApplicationCount()
    ├── getArbiters()
    └── quoteDeposit()                — preview totalAmount + fee
```

### Enums

- `EscrowStatus`: `Pending`, `InProgress`, `Released`, `Refunded`, `Disputed`, `Expired`, `Cancelled`
- `MilestoneStatus`: `NotStarted`, `Submitted`, `Approved`, `Rejected`, `Disputed`, `ProposalPending`

### Events (full list)

`EscrowCreated`, `EscrowUpdated`, `WorkStarted`, `DeadlineExtended`, `MilestoneSubmitted`, `MilestoneApproved`, `MilestoneRejected`, `MilestoneDisputed`, `DisputeVoteCast`, `DisputeResolved`, `FundsRefunded`, `EmergencyRefundExecuted`, `EvidenceSubmitted`, `ApplicationSubmitted`, `FreelancerAccepted`, `OverdueDisputeRaised`, `RatingSubmitted`, `ArbiterAuthorized`, `ArbiterRevoked`, `TokenWhitelisted`, `TokenBlacklisted`, `PlatformFeeUpdated`, `FeeCollectorUpdated`, `FeesWithdrawn`, `JobCancelled`, `JobFundsUpdated`, `MilestoneProposalSubmitted`, `MilestoneProposalApproved`, `MilestoneProposalRejected`.

### Fee Model

The platform fee is deducted **on top of** the escrow amount at creation:

- Client deposits `totalAmount + platformFee`
- `platformFee = totalAmount × platformFeeBP / 10000`
- Milestones sum exactly to `totalAmount`
- Fee is separated immediately into `totalFeesByToken`, withdrawable only by the configured `feeCollector`
- `platformFeeBP` is capped at `MAX_PLATFORM_FEE_BP = 1000` (10%)
- `quoteDeposit(totalAmount)` is a public view for previewing the required deposit + fee

### Cancellation Penalty Model (open jobs only)

When a depositor calls `cancelJob` on an unassigned open job, the refund is reduced by:

```
base_penalty_% = 0      if effective_cancellations ≤ 2
                 5      if 3..5
                 10     if 6..10
                 15     if ≥ 11

applicants_penalty_% = 0   if 0 applicants
                       5   if 1..5
                       10  if 6..10
                       15  if ≥ 11

total_penalty_% = min(base_penalty_% + applicants_penalty_%, 30)
```

`effective_cancellations` decays by 1 for every 30 days since the user's last cancellation, so the system forgives over time and only punishes serial abusers. The penalty is added to `totalFeesByToken` (i.e. flows to the fee collector, not back into the contract reserve).

---

## Project Structure

```
SecureFlow-scaffold/
├── contracts/solidity/      # Foundry project
│   ├── src/SecureFlow.sol   # Main escrow contract
│   └── script/Deploy.s.sol  # Deployment script
├── backend/                 # Express API
│   └── src/routes/          # gasless, ai, messages, notifications
├── src/                     # React frontend
│   ├── pages/               # Route pages
│   ├── components/          # UI components
│   ├── hooks/               # Custom hooks
│   ├── lib/web3/            # Contract service & config
│   └── providers/           # React providers
├── subgraph/                # The Graph indexing
├── supabase/migrations/     # Database schema
├── deploy.sh                # Foundry deploy script
└── .env.example             # Environment template
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m "feat: add my feature"`)
4. Push and open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE)
