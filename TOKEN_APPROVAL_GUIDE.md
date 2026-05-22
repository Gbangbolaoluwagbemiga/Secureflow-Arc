# Token Approval Flow - Complete Guide

## Overview

SecureFlow implements a seamless token approval flow that automatically handles ERC-20 token approvals when creating escrows. This guide explains how the system works, how to test it, and how to troubleshoot issues.

---

## How Token Approval Works

### The Problem

When using ERC-20 tokens (like USDC) on blockchain, users must first **approve** the contract to spend tokens on their behalf. This is a security feature that prevents contracts from spending unlimited tokens.

### The Solution

SecureFlow automates this process:

1. **User creates escrow** with USDC amount
2. **App checks current allowance** on USDC contract
3. **If allowance < required amount**:
   - Show "Token Approval Required" toast
   - Trigger wallet popup for approval
   - Wait for approval transaction to be mined
   - Show "Token Approved Successfully" toast
4. **Proceed with escrow creation**

---

## Technical Implementation

### Code Flow

#### 1. CreatePage.tsx - User Input

```typescript
// Always use USDC as ERC-20 token (not native)
const tokenToPass = USDC_ADDRESS || "0x3600000000000000000000000000000000000000";

// Call the mutation with USDC token address
const result = await createEscrow.mutateAsync({
  depositor: wallet.address,
  token: tokenToPass,  // USDC ERC-20 token
  total_amount: totalAmountWei.toString(),
  // ... other params
});
```

#### 2. use-escrows.ts - Approval Logic

```typescript
const isNativeToken = token === ZERO_ADDRESS;

// For ERC-20 tokens: check allowance and approve if needed
if (!isNativeToken) {
  const escrowAddr = contractAddr();
  
  // Read current allowance
  const allowance = await publicClient.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [params.depositor as `0x${string}`, escrowAddr],
  }) as bigint;

  if (allowance < deposit) {
    // Show approval required message
    toast({ 
      title: "Token Approval Required", 
      description: "Please approve the token transfer in your wallet. A popup will appear shortly." 
    });
    
    // Small delay to ensure toast is visible
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Trigger approval transaction - wallet popup appears here
    const approvalHash = await writeContractAsync({
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrowAddr, deposit],
    });
    
    // Wait for approval to be mined
    const approvalReceipt = await publicClient.waitForTransactionReceipt({ 
      hash: approvalHash as `0x${string}`,
      timeout: 120_000,  // 2 minutes
      pollingInterval: 1_000,  // Check every 1 second
    });
    
    if (approvalReceipt.status !== "success") {
      throw new Error("Token approval transaction failed");
    }
    
    // Show success message
    toast({ 
      title: "Token Approved Successfully", 
      description: "Your tokens have been approved. Creating escrow..." 
    });
  }
}

// Now proceed with escrow creation
const hash = await writeContractAsync({
  address: contractAddr(),
  abi: SecureFlowABI.abi,
  functionName: "createEscrow",
  args: [/* ... */],
  value: isNativeToken ? deposit : 0n,
});
```

### Key Configuration

**Arc Testnet USDC Details:**
- Address: `0x3600000000000000000000000000000000000000`
- Decimals: 6
- Type: ERC-20 token (NOT native ETH)
- Whitelisted: Yes (on SecureFlow contract)

**Environment Variable:**
```bash
VITE_USDC_TOKEN_CONTRACT=0x3600000000000000000000000000000000000000
```

---

## User Experience Flow

### Scenario 1: First Time Creating Escrow

```
1. User fills in escrow details
2. User clicks "Create Escrow"
3. App shows: "Creating Escrow - Processing your job creation..."
4. App checks USDC allowance (0 initially)
5. App shows: "Token Approval Required - Please approve the token transfer..."
6. MetaMask popup appears: "Approve USDC spending"
7. User clicks "Approve" in MetaMask
8. App waits for approval transaction (usually 10-30 seconds)
9. App shows: "Token Approved Successfully - Your tokens have been approved..."
10. App creates escrow (another 10-30 seconds)
11. App shows: "Job Created Successfully - Your job #123 has been created..."
12. User redirected to dashboard
```

### Scenario 2: Subsequent Escrows (Allowance Sufficient)

```
1. User fills in escrow details
2. User clicks "Create Escrow"
3. App shows: "Creating Escrow - Processing your job creation..."
4. App checks USDC allowance (sufficient from previous approval)
5. App skips approval step
6. App creates escrow directly
7. App shows: "Job Created Successfully..."
8. User redirected to dashboard
```

### Scenario 3: User Rejects Approval

```
1. User fills in escrow details
2. User clicks "Create Escrow"
3. App shows: "Token Approval Required..."
4. MetaMask popup appears
5. User clicks "Reject" in MetaMask
6. App shows: "Transaction Failed - You rejected the token approval..."
7. User can try again
```

---

## Testing the Token Approval Flow

### Prerequisites

1. **Arc Testnet Network**
   - Chain ID: 5042002
   - RPC: https://rpc.drpc.testnet.arc.network
   - Add to MetaMask

2. **Test USDC Tokens**
   - Visit: https://faucet.testnet.arc.network
   - Request test USDC
   - Wait for tokens to arrive (usually 1-2 minutes)

3. **Running App**
   ```bash
   npm run dev
   ```

### Test Steps

#### Test 1: First Approval

1. Open app at `http://localhost:5173`
2. Connect MetaMask wallet
3. Go to "Create New Escrow"
4. Fill in all fields:
   - Project Title: "Test Project"
   - Description: "This is a test project to verify token approval flow"
   - Duration: 7 days
   - Total Budget: 10 USDC
   - Beneficiary: (leave empty for open job)
   - Milestones: 10 USDC
5. Click "Next" → "Next" → "Create Escrow"
6. **Expected**: 
   - Toast: "Creating Escrow..."
   - Toast: "Token Approval Required..."
   - MetaMask popup appears
7. Click "Approve" in MetaMask
8. **Expected**:
   - Toast: "Token Approved Successfully..."
   - Toast: "Job Created Successfully..."
   - Redirected to dashboard

#### Test 2: Subsequent Approval (No Popup)

1. Go to "Create New Escrow" again
2. Fill in different details
3. Click "Create Escrow"
4. **Expected**:
   - Toast: "Creating Escrow..."
   - NO MetaMask popup (allowance already sufficient)
   - Toast: "Job Created Successfully..."

#### Test 3: Insufficient Balance

1. Create multiple escrows until USDC balance is low
2. Try to create escrow with amount > balance
3. **Expected**:
   - Toast: "Insufficient USDC balance..."
   - Escrow not created

#### Test 4: User Rejects Approval

1. Go to "Create New Escrow"
2. Fill in details
3. Click "Create Escrow"
4. When MetaMask popup appears, click "Reject"
5. **Expected**:
   - Toast: "Transaction Failed - You rejected the token approval..."
   - Escrow not created

---

## Troubleshooting

### Issue: Wallet Popup Doesn't Appear

**Symptoms:**
- App shows "Token Approval Required" but no MetaMask popup
- Escrow creation hangs

**Solutions:**
1. **Check MetaMask is connected**
   - Click MetaMask icon
   - Verify wallet is connected to Arc Testnet
   - Verify chain ID is 5042002

2. **Check browser console for errors**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for error messages
   - Share errors with support

3. **Refresh and retry**
   - Refresh page (Cmd+R)
   - Reconnect wallet
   - Try creating escrow again

4. **Check MetaMask settings**
   - Ensure MetaMask is not in "Restricted" mode
   - Check if popup blocker is enabled
   - Try in incognito/private window

### Issue: "Token Approval Failed" Error

**Symptoms:**
- Toast shows "Token approval transaction failed"
- Escrow not created

**Solutions:**
1. **Check gas balance**
   - Ensure you have enough ETH for gas
   - Request test ETH from faucet

2. **Check network status**
   - Verify Arc Testnet RPC is responding
   - Try refreshing page

3. **Check USDC balance**
   - Ensure you have enough USDC
   - Request more from faucet

4. **Try again**
   - Wait 30 seconds
   - Retry escrow creation

### Issue: "Insufficient USDC Balance" Error

**Symptoms:**
- Toast shows "Insufficient USDC balance"
- Escrow not created

**Solutions:**
1. **Request more test USDC**
   - Visit: https://faucet.testnet.arc.network
   - Request USDC tokens
   - Wait for tokens to arrive

2. **Check wallet balance**
   - Open MetaMask
   - Verify USDC balance
   - Check on Arc Scan: https://testnet.arcscan.app

3. **Account for platform fee**
   - Escrow amount = total budget + platform fee
   - Ensure balance > escrow amount

### Issue: Approval Hangs (Waiting for Confirmation)

**Symptoms:**
- App shows "Token Approved Successfully" but then hangs
- Escrow creation doesn't proceed

**Solutions:**
1. **Wait longer**
   - Arc Testnet can be slow
   - Wait up to 2 minutes

2. **Check transaction on Arc Scan**
   - Go to: https://testnet.arcscan.app
   - Search for your wallet address
   - Look for approval transaction
   - Check if it's confirmed

3. **Refresh and retry**
   - Refresh page
   - Try creating escrow again

---

## Advanced Configuration

### Adjusting Approval Timeout

In `use-escrows.ts`, modify the timeout:

```typescript
const approvalReceipt = await publicClient.waitForTransactionReceipt({ 
  hash: approvalHash as `0x${string}`,
  timeout: 180_000,  // 3 minutes instead of 2
  pollingInterval: 1_000,
});
```

### Adjusting Polling Interval

For faster confirmation checks:

```typescript
const approvalReceipt = await publicClient.waitForTransactionReceipt({ 
  hash: approvalHash as `0x${string}`,
  timeout: 120_000,
  pollingInterval: 500,  // Check every 500ms instead of 1s
});
```

### Custom Approval Amount

To approve a specific amount instead of exact deposit:

```typescript
// Approve 10x the deposit for multiple escrows
const approvalAmount = deposit * 10n;

const approvalHash = await writeContractAsync({
  address: token,
  abi: erc20Abi,
  functionName: "approve",
  args: [escrowAddr, approvalAmount],
});
```

---

## Production Considerations

### Mainnet Deployment

1. **Update USDC Address**
   - Mainnet USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
   - Update in `.env`

2. **Update Contract Address**
   - Deploy contract to Arc Mainnet
   - Update `VITE_SECUREFLOW_CONTRACT_ADDRESS`

3. **Increase Timeouts**
   - Mainnet can be slower
   - Increase timeout to 5 minutes

4. **Monitor Gas Prices**
   - Approval transactions cost gas
   - Monitor Arc Mainnet gas prices

### Security Best Practices

1. **Never approve unlimited amount**
   - Always approve exact amount needed
   - Current implementation: ✅ Correct

2. **Verify contract address**
   - Ensure USDC address is correct
   - Check on Arc Scan before deployment

3. **Test thoroughly**
   - Test all approval scenarios
   - Test error cases
   - Test with different wallet types

---

## Support

For issues or questions:

1. **Check this guide** - Most issues are covered above
2. **Check browser console** - Look for error messages
3. **Check Arc Scan** - Verify transactions on blockchain
4. **Contact support** - Email: support@secureflow.app

---

## Changelog

### v1.0.0 (Current)
- ✅ Automatic token approval on escrow creation
- ✅ Wallet popup for user confirmation
- ✅ Proper error handling and user feedback
- ✅ Support for ERC-20 tokens (USDC)
- ✅ 2-minute timeout for approval confirmation
- ✅ Comprehensive error messages

### Future Improvements
- [ ] Batch approvals for multiple escrows
- [ ] Approval history tracking
- [ ] Custom approval amounts
- [ ] Approval revocation UI
- [ ] Multi-token support
