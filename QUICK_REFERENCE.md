# SecureFlow Quick Reference

**Last Updated:** May 22, 2026  
**Status:** ✅ Production Ready (Testnet)

---

## 🚀 Quick Start (5 Minutes)

### 1. Setup
```bash
git clone <repo>
cd SecureFlow-scaffold
npm install
cd backend && npm install && cd ..
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run
```bash
# Terminal 1
npm run dev

# Terminal 2
cd backend && npm run dev
```

### 4. Open
```
http://localhost:5173
```

---

## 📋 Key Information

### Arc Testnet
| Field | Value |
|-------|-------|
| Chain ID | 5042002 |
| RPC | https://rpc.drpc.testnet.arc.network |
| Explorer | https://testnet.arcscan.app |
| Faucet | https://faucet.testnet.arc.network |

### Contract
| Field | Value |
|-------|-------|
| Address | 0x24f2ca10f18B7263f2ea9162eF00F6Dce0B76ff7 |
| USDC | 0x3600000000000000000000000000000000000000 |
| Status | ✅ Verified |

### Environment Variables
```bash
# Frontend
VITE_SECUREFLOW_CONTRACT_ADDRESS=0x24f2ca10f18B7263f2ea9162eF00F6Dce0B76ff7
VITE_USDC_TOKEN_CONTRACT=0x3600000000000000000000000000000000000000
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key

# Backend
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
GROQ_API_KEY=your_key
RELAYER_PRIVATE_KEY=your_key
RELAYER_ADDRESS=your_address
```

---

## 🔑 Token Approval Flow

### How It Works
1. User creates escrow with USDC
2. App checks allowance
3. If insufficient → Show approval popup
4. User approves in wallet
5. App waits for confirmation
6. Escrow created

### User Experience
- **First time:** Approval popup + escrow creation
- **Subsequent:** Direct escrow creation (no popup)

### Troubleshooting
| Issue | Solution |
|-------|----------|
| No popup | Check MetaMask is connected to Arc Testnet |
| Approval fails | Ensure sufficient ETH for gas |
| Insufficient balance | Request USDC from faucet |
| Hangs | Wait up to 2 minutes, check Arc Scan |

---

## 📁 Project Structure

```
SecureFlow-scaffold/
├── contracts/          # Smart contracts (Solidity)
├── backend/            # Express API
├── src/                # React frontend
│   ├── pages/          # Route pages
│   ├── components/     # UI components
│   ├── hooks/          # Custom hooks
│   └── lib/web3/       # Web3 integration
├── public/             # Static assets (logos, favicon)
├── .env.example        # Environment template
└── *.md                # Documentation
```

---

## 🧪 Testing Token Approval

### Prerequisites
1. Arc Testnet network added to MetaMask
2. Test USDC tokens (from faucet)
3. App running locally

### Test Steps
1. Go to "Create New Escrow"
2. Fill in details (10 USDC budget)
3. Click "Create Escrow"
4. **Expected:** Approval popup appears
5. Click "Approve" in MetaMask
6. **Expected:** Escrow created successfully

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| README.md | Overview & getting started |
| TOKEN_APPROVAL_GUIDE.md | Token approval details |
| QUICK_START.md | 5-minute setup |
| DEPLOYMENT_GUIDE.md | Deployment instructions |
| TROUBLESHOOTING.md | Common issues |
| PRODUCTION_READY_CHECKLIST.md | Mainnet checklist |
| IMPLEMENTATION_SUMMARY.md | Technical summary |

---

## 🔧 Common Commands

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run linter
```

### Backend
```bash
cd backend
npm run dev          # Start dev server
npm run build        # Build for production
npm run migrate      # Run migrations
```

### Contract
```bash
./deploy.sh          # Deploy contract
# Verify on Arc Scan manually
```

---

## 🐛 Debugging

### Check Build
```bash
npm run build
# Look for errors in output
```

### Check Console
```
Browser DevTools → Console tab
Look for error messages
```

### Check Transactions
```
https://testnet.arcscan.app
Search for wallet address or tx hash
```

### Check Logs
```bash
# Frontend logs in browser console
# Backend logs in terminal
# Contract events on Arc Scan
```

---

## 🚨 Common Issues

### "Token Approval Required" but no popup
- Check MetaMask is connected
- Check Arc Testnet is selected
- Refresh page and retry

### "Insufficient USDC balance"
- Request USDC from faucet
- Check balance on Arc Scan
- Account for platform fee

### "Transaction timeout"
- Arc Testnet can be slow
- Wait up to 2 minutes
- Check Arc Scan for transaction

### "Contract not found"
- Verify contract address in .env
- Check on Arc Scan
- Ensure correct network

---

## 📊 Features

### Core
- ✅ Escrow creation with milestones
- ✅ Milestone submission & approval
- ✅ Dispute resolution
- ✅ Emergency refund
- ✅ Token approval (automatic)

### Platform
- ✅ Job marketplace
- ✅ Freelancer applications
- ✅ Real-time messaging
- ✅ Notifications
- ✅ Ratings & reviews
- ✅ Analytics dashboard
- ✅ Admin panel

### AI
- ✅ Milestone generation
- ✅ Cover letter drafting

---

## 🔐 Security

### Frontend
- No hardcoded secrets
- Environment variables for config
- Input validation on all forms
- XSS & CSRF protection

### Backend
- Rate limiting
- Input validation
- SQL injection prevention
- Authentication & authorization

### Smart Contract
- OpenZeppelin contracts
- Access control
- Emergency pause
- Safe math

---

## 📞 Support

### Resources
1. Check documentation (README.md, guides)
2. Check browser console for errors
3. Check Arc Scan for transactions
4. Contact support: support@secureflow.app

### Useful Links
- Arc Testnet: https://testnet.arc.network
- Arc Scan: https://testnet.arcscan.app
- Faucet: https://faucet.testnet.arc.network
- GitHub: [your-repo]

---

## ✅ Checklist Before Deployment

- [ ] Build succeeds: `npm run build`
- [ ] No console errors
- [ ] Token approval working
- [ ] Escrow creation working
- [ ] All features tested
- [ ] Environment variables configured
- [ ] Documentation reviewed
- [ ] Security audit completed

---

## 🎯 Next Steps

### For Testing
1. Follow "Quick Start" above
2. Request test USDC from faucet
3. Test token approval flow
4. Test all features

### For Mainnet
1. Review PRODUCTION_READY_CHECKLIST.md
2. Deploy contract to Arc Mainnet
3. Update environment variables
4. Deploy backend & frontend
5. Monitor for issues

---

## 📝 Notes

- USDC on Arc Testnet: 6 decimals (not 18)
- Platform fee: Configurable on contract
- Approval timeout: 2 minutes
- Escrow creation timeout: 2 minutes

---

**Version:** 1.0  
**Last Updated:** May 22, 2026  
**Status:** ✅ Production Ready (Testnet)
