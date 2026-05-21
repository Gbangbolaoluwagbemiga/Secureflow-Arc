# SecureFlow Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] Smart contract compiled successfully
- [x] New features implemented:
  - Analytics Dashboard
  - Milestone Negotiation
  - Job Management (cancel, add/withdraw funds)
- [x] Backend analytics API created
- [x] Frontend components created
- [x] Subgraph schema updated

## 🚀 Deployment Steps

### Step 1: Deploy Smart Contract

```bash
cd contracts/solidity

# Make sure .env file exists with PRIVATE_KEY
# Deploy to Arc Testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://rpc.drpc.testnet.arc.network \
  --broadcast \
  --legacy

# Save the contract address from the output!
# It will look like: "SecureFlow deployed to: 0x..."
```

**Expected Output:**
```
SecureFlow deployed to: 0x7aB0853325529aF7EB5c4745413BF01E98c0020f
```

### Step 2: Update Environment Variables

Update the contract address in all `.env` files:

#### Root `.env`
```bash
VITE_SECUREFLOW_CONTRACT_ADDRESS=0x7aB0853325529aF7EB5c4745413BF01E98c0020f
```

#### `backend/.env`
```bash
CONTRACT_ADDRESS=0x7aB0853325529aF7EB5c4745413BF01E98c0020f
```

### Step 3: Update Subgraph Configuration

Edit `subgraph/subgraph.yaml`:

```yaml
dataSources:
  - kind: ethereum
    name: SecureFlow
    network: arc-testnet
    source:
      address: "0x[NEW_ADDRESS]"  # Update this
      abi: SecureFlow
      startBlock: [DEPLOYMENT_BLOCK]  # Update this
```

### Step 4: Build and Deploy Backend

```bash
cd backend

# Install dependencies (if needed)
npm install

# Build
npm run build

# Start the server
npm start

# Or deploy to your hosting service
```

### Step 5: Build and Deploy Subgraph

```bash
cd subgraph

# Generate code from schema
npm run codegen

# Build
npm run build

# Deploy (requires Graph CLI authentication)
npm run deploy
```

### Step 6: Build and Deploy Frontend

```bash
# From project root

# Install dependencies (if needed)
npm install

# Build
npm run build

# Deploy to Vercel (or your hosting)
vercel --prod

# Or test locally
npm run dev
```

## 🧪 Testing the Deployment

### 1. Test Smart Contract Functions

```bash
# Test reading from contract
cast call 0x[NEW_ADDRESS] "nextEscrowId()" --rpc-url https://rpc.drpc.testnet.arc.network

# Should return: 1 (or higher if escrows exist)
```

### 2. Test Backend API

```bash
# Test health endpoint
curl http://localhost:8787/health

# Test analytics endpoint
curl -H "Authorization: Bearer YOUR_API_SECRET" \
  http://localhost:8787/v1/analytics/platform
```

### 3. Test Frontend

1. Open the app in your browser
2. Connect your wallet
3. Navigate to `/analytics` - should load without errors
4. Create a test escrow (open job)
5. Try the new job management features:
   - Add funds
   - Withdraw funds
   - Cancel job
6. Test milestone negotiation (requires a freelancer account)

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Contract deployed successfully
- [ ] All `.env` files updated with new contract address
- [ ] Backend starts without errors
- [ ] Backend `/health` endpoint returns OK
- [ ] Analytics API endpoints return data
- [ ] Frontend builds without errors
- [ ] Frontend connects to wallet
- [ ] Analytics page loads and displays data
- [ ] Job management UI appears on open jobs
- [ ] Milestone negotiation UI appears for freelancers
- [ ] All existing features still work (create escrow, milestones, etc.)

## 🐛 Troubleshooting

### Contract Deployment Fails

**Issue:** `vm.envUint: environment variable "PRIVATE_KEY" not found`

**Solution:** Ensure `.env` file exists in `contracts/solidity/` with:
```
PRIVATE_KEY=0x...
```

### Backend Can't Connect to Contract

**Issue:** Analytics endpoints return errors

**Solution:** 
1. Check `CONTRACT_ADDRESS` in `backend/.env`
2. Verify RPC URL is correct
3. Check contract is deployed: `cast code 0x[ADDRESS] --rpc-url https://rpc.drpc.testnet.arc.network`

### Frontend Shows "Contract Not Found"

**Issue:** Frontend can't interact with contract

**Solution:**
1. Check `VITE_SECUREFLOW_CONTRACT_ADDRESS` in root `.env`
2. Rebuild frontend: `npm run build`
3. Clear browser cache
4. Check browser console for errors

### Analytics Page Shows No Data

**Issue:** Analytics dashboard is empty

**Solution:**
1. Check backend is running
2. Verify `VITE_API_URL` and `VITE_API_SECRET` in root `.env`
3. Check browser network tab for API errors
4. Verify contract has some escrows created

### New Functions Not Available

**Issue:** Job management or milestone negotiation buttons don't appear

**Solution:**
1. Verify you deployed the NEW contract (not old one)
2. Check contract ABI is updated in `contracts/solidity/out/SecureFlow.sol/SecureFlow.json`
3. Rebuild frontend to pick up new ABI
4. Hard refresh browser (Cmd+Shift+R)

## 📊 Post-Deployment Tasks

### 1. Update Documentation

- [ ] Update README.md with new contract address
- [ ] Document new features in user guide
- [ ] Update API documentation

### 2. Announce New Features

- [ ] Notify users about new analytics dashboard
- [ ] Explain milestone negotiation feature
- [ ] Demonstrate job management capabilities

### 3. Monitor Performance

- [ ] Check analytics API response times
- [ ] Monitor contract gas usage
- [ ] Track user adoption of new features

## 🔐 Security Notes

### Important Reminders

1. **Never commit private keys** to version control
2. **Verify contract on block explorer** for transparency
3. **Test all features** on testnet before mainnet
4. **Backup deployment artifacts** (addresses, ABIs, etc.)
5. **Monitor contract for unusual activity**

### Contract Verification

To verify the contract on Arc block explorer:

```bash
forge verify-contract \
  0x[NEW_ADDRESS] \
  src/SecureFlow.sol:SecureFlow \
  --rpc-url https://rpc.drpc.testnet.arc.network \
  --verifier blockscout \
  --verifier-url https://testnet.arcscan.app/api \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" 0x[FEE_COLLECTOR] 250)
```

## 📝 Deployment Log Template

Keep a record of your deployment:

```
Deployment Date: [DATE]
Deployer Address: [ADDRESS]
Network: Arc Testnet
Chain ID: 5042002

Contract Addresses:
- SecureFlow: 0x[NEW_ADDRESS]
- Deployment Block: [BLOCK_NUMBER]
- Deployment TX: 0x[TX_HASH]

Configuration:
- Platform Fee: 2.5% (250 BP)
- Fee Collector: [ADDRESS]

Backend:
- API URL: [URL]
- Deployment: [HOSTING_SERVICE]

Frontend:
- URL: [URL]
- Deployment: [HOSTING_SERVICE]

Subgraph:
- Endpoint: [GRAPHQL_URL]
- Deployment: [GRAPH_NETWORK]

Notes:
[Any special notes about this deployment]
```

## 🎉 Success Criteria

Deployment is successful when:

1. ✅ Contract deployed and verified
2. ✅ Backend API responding to all endpoints
3. ✅ Frontend loads without errors
4. ✅ Analytics dashboard displays data
5. ✅ Job management features work
6. ✅ Milestone negotiation works
7. ✅ All existing features still functional
8. ✅ No console errors in browser
9. ✅ No errors in backend logs
10. ✅ Subgraph indexing events

---

## 🆘 Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review the error messages carefully
3. Check browser console and network tab
4. Review backend logs
5. Verify all environment variables are set correctly

---

**Last Updated:** [Current Date]
**Version:** 2.0.0 (with new features)
