# Troubleshooting - Job Creation Issue

## Problem
- Job creation transaction shows "Send 0 USDC"
- Transaction fails with contract error
- No tokens are deducted from wallet

## Root Cause Analysis

The transaction is correctly set up:
1. ✅ USDC approval transaction succeeds (10 USDC approved)
2. ✅ `value: 0n` is set (correct for ERC-20 tokens)
3. ❌ `createEscrow` transaction fails

## What's Happening

For ERC-20 tokens like USDC:
- The wallet shows "Send 0 USDC" because `msg.value = 0`
- The actual USDC transfer happens via `transferFrom` inside the contract
- The contract calls `IERC20(token).safeTransferFrom(msg.sender, address(this), totalDeposit)`

## Possible Issues

### 1. Insufficient Approval Amount
The approval might be for the wrong amount. The contract needs:
```
totalDeposit = totalAmount + platformFee
```

**Check**: Did you approve enough USDC to cover the job amount + 2.5% platform fee?

Example:
- Job amount: 10 USDC
- Platform fee (2.5%): 0.25 USDC
- **Total needed**: 10.25 USDC

### 2. Approval Expired or Revoked
The approval transaction succeeded, but it might have been:
- Revoked by another transaction
- Set to a lower amount than needed

### 3. Contract Error
The contract might be reverting for another reason:
- Token not whitelisted (we fixed this)
- Invalid milestone amounts
- Duration is 0
- Other validation errors

## Solution Steps

### Step 1: Check Your USDC Balance
Make sure you have enough USDC:
- Job amount: 10 USDC
- Platform fee: 0.25 USDC
- **Total needed**: 10.25 USDC

### Step 2: Check Approval Amount
View your approval on the blockchain:
1. Go to: https://testnet.arcscan.app/address/YOUR_WALLET_ADDRESS
2. Look for the latest "approve" transaction to `0x5c7D0c...a195`
3. Check the approved amount

### Step 3: Try Creating a Smaller Job
Test with a smaller amount to see if it works:
- Try creating a 1 USDC job
- This will need 1.025 USDC total (1 + 2.5% fee)

### Step 4: Check Browser Console
Open browser console (F12) and look for error messages when creating the job.

## Expected Flow

### Correct Flow:
1. User clicks "Create Escrow"
2. **Approval Transaction** (if needed):
   - Approve USDC spending: `approve(escrowContract, 10.25 USDC)`
   - Transaction succeeds
   - Toast: "USDC approved"
3. **Create Escrow Transaction**:
   - Call `createEscrow(...)` with `value: 0`
   - Contract calls `transferFrom` to pull USDC
   - Transaction succeeds
   - Toast: "Escrow created"
4. Job appears in Browse Jobs and Dashboard

### What You're Seeing:
1. ✅ Approval succeeds
2. ❌ Create Escrow fails (showing "0 USDC" is correct, but transaction reverts)

## Debug Information

### Contract Address
```
0x5c7D0cdB0C844B20f0787eF690a679bBC35Fa195
```

### USDC Address
```
0x3600000000000000000000000000000000000000
```

### Platform Fee
```
2.5% (250 basis points)
```

## Next Steps

1. **Refresh the page** and try again
2. **Check your USDC balance** - make sure you have enough
3. **Look at browser console** for detailed error messages
4. **Try a smaller amount** (1 USDC) to test

## Error Message Improvements

✅ **Fixed**: Error messages are now more readable
- "Transaction cancelled" instead of "User rejected the request..."
- Shortened hex addresses (0x1234...5678)
- Clear, actionable error messages

## Contact

If the issue persists:
1. Check browser console for errors
2. Share the full error message
3. Verify your USDC balance is sufficient

