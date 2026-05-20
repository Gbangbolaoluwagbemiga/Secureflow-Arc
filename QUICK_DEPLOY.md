# Quick Deployment Instructions

## 🚀 Deploy in 5 Steps

### Step 1: Deploy Smart Contract (5 minutes)

```bash
cd contracts/solidity

# Deploy to Arc Testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://rpc.drpc.testnet.arc.network \
  --broadcast \
  --legacy

# SAVE THE CONTRACT ADDRESS from the output!
# Look for: "SecureFlow deployed to: 0x..."
```

**Copy the contract address:** `0x_______________`

---

### Step 2: Update Environment Variables (2 minutes)

#### Update Root `.env`
```bash
# Open .env file and update:
VITE_SECUREFLOW_CONTRACT_ADDRESS=0x[PASTE_NEW_ADDRESS_HERE]
```

#### Update Backend `.env`
```bash
# Open backend/.env and add/update:
CONTRACT_ADDRESS=0x[PASTE_NEW_ADDRESS_HERE]
```

---

### Step 3: Update Subgraph Config (2 minutes)

```bash
# Open subgraph/subgraph.yaml
# Find the dataSources section and update:

dataSources:
  - kind: ethereum
    name: SecureFlow
    network: arc-testnet
    source:
      address: "0x[PASTE_NEW_ADDRESS_HERE]"
      abi: SecureFlow
      startBlock: [DEPLOYMENT_BLOCK_NUMBER]  # Get from deployment output
```

---

### Step 4: Build Everything (3 minutes)

```bash
# Build backend
cd backend
npm install  # if needed
npm run build

# Build subgraph
cd ../subgraph
npm install  # if needed
npm run codegen
npm run build

# Build frontend
cd ..
npm install  # if needed
npm run build
```

---

### Step 5: Start/Deploy (5 minutes)

#### Option A: Test Locally

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Start frontend
cd ..
npm run dev

# Open http://localhost:5173 in your browser
```

#### Option B: Deploy to Production

```bash
# Deploy backend (example with your hosting service)
cd backend
# ... your backend deployment command ...

# Deploy subgraph
cd ../subgraph
npm run deploy

# Deploy frontend
cd ..
vercel --prod  # or your deployment method
```

---

## ✅ Verification (2 minutes)

### 1. Check Contract is Deployed
```bash
cast code 0x[YOUR_NEW_ADDRESS] --rpc-url https://rpc.drpc.testnet.arc.network
```
Should return bytecode (long hex string)

### 2. Check Backend is Running
```bash
curl http://localhost:8787/health
```
Should return: `{"ok":true,...}`

### 3. Check Frontend
- Open the app in browser
- Connect wallet
- Navigate to `/analytics`
- Should load without errors

---

## 🎉 You're Done!

### Test the New Features:

1. **Analytics Dashboard**
   - Go to `/analytics`
   - Should see platform metrics
   - Connect wallet to see personal stats

2. **Job Management**
   - Create an open job
   - Try "Add Funds", "Withdraw Funds", "Cancel Job"
   - All should work before assigning freelancer

3. **Milestone Negotiation**
   - As freelancer: Click "Propose Changes" on a milestone
   - As client: Approve or reject the proposal

---

## 🐛 Quick Troubleshooting

### Contract deployment fails
- Check you have testnet ETH in your wallet
- Verify PRIVATE_KEY in contracts/solidity/.env

### Backend can't connect to contract
- Verify CONTRACT_ADDRESS in backend/.env
- Check RPC URL is correct

### Frontend shows errors
- Clear browser cache
- Check VITE_SECUREFLOW_CONTRACT_ADDRESS in .env
- Rebuild: `npm run build`

### Analytics shows no data
- Check backend is running
- Verify API_SECRET matches in .env and backend/.env
- Check browser console for errors

---

## 📝 Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Contract address saved
- [ ] Root .env updated
- [ ] Backend .env updated
- [ ] Subgraph config updated
- [ ] Backend built and running
- [ ] Subgraph built and deployed
- [ ] Frontend built and deployed
- [ ] Analytics page loads
- [ ] Job management works
- [ ] Milestone negotiation works
- [ ] All existing features still work

---

## 🎯 Next Steps

1. **Test thoroughly** using TESTING_CHECKLIST.md
2. **Create demo video** showing new features
3. **Update README** with new contract address
4. **Prepare grant application** highlighting these features

---

**Need detailed help?** See DEPLOYMENT_GUIDE.md

**Need to test?** See TESTING_CHECKLIST.md

**Need feature docs?** See NEW_FEATURES.md
