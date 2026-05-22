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
- Arc Testnet USDC tokens (for testing)

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

| Field | Value |
|-------|-------|
| Chain ID | 5042002 |
| RPC URL | https://rpc.drpc.testnet.arc.network |
| Block Explorer | https://testnet.arcscan.app |
| Native Currency | ETH |
| **SecureFlow Contract** | **0x7aB0853325529aF7EB5c4745413BF01E98c0020f** |
| USDC Token | 0x3600000000000000000000000000000000000000 |

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

### Backend Routes

#### Gasless Transactions
- `POST /api/gasless/apply` — Submit job application without gas
- `POST /api/gasless/relay` — Relay meta-transaction

#### AI Features
- `POST /api/ai/generate-milestones` — Generate milestone suggestions
- `POST /api/ai/draft-cover-letter` — Draft cover letter

#### Messaging
- `GET /api/messages/:escrowId` — Get conversation
- `POST /api/messages` — Send message

#### Notifications
- `GET /api/notifications/:userId` — Get user notifications
- `POST /api/notifications/subscribe` — Subscribe to push notifications

#### Analytics
- `GET /api/analytics/platform` — Platform statistics
- `GET /api/analytics/user/:userId` — User statistics

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
- Audited by [security firm] (if applicable)
- Uses OpenZeppelin contracts
- Multi-sig dispute resolution
- Emergency pause functionality

### Frontend
- No private keys stored in browser
- All transactions signed by user wallet
- HTTPS only in production
- Content Security Policy headers

### Backend
- Environment variables for secrets
- Rate limiting on API endpoints
- Input validation on all routes
- Supabase Row Level Security (RLS)

---

## Support & Community

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Discord**: [Join our community](https://discord.gg/your-invite)
- **Email**: support@secureflow.app

---

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
