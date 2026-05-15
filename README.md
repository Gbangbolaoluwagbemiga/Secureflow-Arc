# SecureFlow

<div align="center">

**A decentralized freelancer marketplace built on Arc EVM that provides secure, trustless escrow services for freelance work agreements.**

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

### Core
- **Smart Contract Escrow**: Milestone-based fund release via `SecureFlow.sol`
- **Open Job Marketplace**: Post open jobs and review applicants
- **Direct Contracts**: Create escrows directly with a known freelancer
- **Multi-Arbiter Disputes**: Configurable multi-sig dispute resolution
- **Emergency Refund**: Automatic refund available 30 days after deadline

### Platform
- **Reputation System**: On-chain reputation incremented on successful escrow completion
- **Gasless Transactions**: EIP-2771 relayer for zero-gas job applications
- **Real-Time Messaging**: Supabase-powered in-app chat
- **Notifications**: Push and in-app notification system
- **AI Milestones**: AI-generated milestone suggestions via Groq
- **File Uploads**: Milestone evidence file attachments

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.20, Foundry, OpenZeppelin |
| Blockchain | Arc EVM Testnet (chain ID 5042002) |
| Frontend | React 19, TypeScript 5, Vite 7 |
| Web3 | wagmi 3, viem 2 |
| UI | Radix UI, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript |
| Database | Supabase (PostgreSQL) |
| AI | Groq SDK |
| Indexing | The Graph (subgraph) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Foundry](https://getfoundry.sh/) (for contract deployment)
- [MetaMask](https://metamask.io/) or any EVM wallet

### 1. Clone & Install

```bash
git clone <repo-url>
cd SecureFlow-scaffold
npm install
cd backend && npm install && cd ..
```

### 2. Environment Variables

```bash
# Frontend
cp .env.example .env
# Fill in VITE_SECUREFLOW_CONTRACT_ADDRESS, VITE_API_URL, etc.

# Backend
cp backend/.env.example backend/.env
# Fill in SUPABASE_*, GROQ_API_KEY, RELAYER_PRIVATE_KEY, etc.
```

### 3. Deploy the Contract

```bash
# Set PRIVATE_KEY and ARC_RPC_URL in .env (or export them)
chmod +x deploy.sh
./deploy.sh
# Copy the deployed address to VITE_SECUREFLOW_CONTRACT_ADDRESS
```

### 4. Run the App

```bash
# Terminal 1 — frontend dev server
npm run dev

# Terminal 2 — backend API
cd backend && npm run dev
```

Open `http://localhost:5173` and connect MetaMask to Arc Testnet (chain ID 5042002).

### Arc Testnet Network Details

| Field | Value |
|-------|-------|
| Chain ID | 5042002 |
| RPC URL | https://rpc.drpc.testnet.arc.network |
| Block Explorer | https://testnet.arcscan.app |
| Native Currency | ETH |

---

## Contract Architecture

### `SecureFlow.sol`

```
SecureFlow
├── createEscrow()         — deposit ETH/ERC-20 + define milestones
├── startWork()            — freelancer accepts the contract
├── submitMilestone()      — freelancer submits a milestone
├── approveMilestone()     — client approves → immediate payout
├── rejectMilestone()      — client rejects with reason
├── disputeMilestone()     — raise a dispute (requires arbiter vote)
├── resolveDispute()       — multi-sig arbiter splits milestone amount
├── emergencyRefund...()   — deadline + 30 days → full refund
├── applyToJob()           — freelancer applies to open job
├── acceptFreelancer()     — client selects a freelancer
└── quoteDeposit()         — preview totalAmount + platformFee
```

### Fee Model

The platform fee is deducted **on top of** the escrow amount at creation:
- Client deposits `totalAmount + platformFee`
- `platformFee = totalAmount × platformFeeBP / 10000`
- Milestones sum exactly to `totalAmount`
- Fee is separated immediately, available for withdrawal by the fee collector

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
