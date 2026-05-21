# Debug: Dispute Amount Showing 0

## Issue
The dispute dialog shows "Total at stake: 0.000000 USDC" even after implementing the fix.

## Debugging Steps

### Step 1: Check Console Logs
After refreshing the admin page, open DevTools (F12) and look for these console logs:

```javascript
Escrow #X data: {
  totalAmount: "...",
  paidAmount: "...",
  status: 4
}

Dispute #X Milestone Y: {
  escrowTotal: "...",
  escrowPaid: "...",
  remaining: "...",
  milestoneAmount: "...",
  finalAmount: "...",
  finalAmountUSDC: 0
}
```

### Step 2: Interpret the Logs

**If all values are "0":**
- The contract data isn't being read correctly
- Possible RPC issue
- Possible contract address mismatch

**If totalAmount > 0 but finalAmount is "0":**
- Milestone amount is 0
- Remaining calculation is wrong
- Need to check paidAmount

**If values are in Wei (very large numbers):**
- Conversion issue
- Need to verify formatUnits is working

### Step 3: Manual Contract Check

Use cast to check the contract directly:

```bash
# Get escrow data
cast call 0xEa3245683904A3CF3ad5A5ada56Af007dBc9eaB6 \
  "getEscrow(uint256)" \
  2 \
  --rpc-url https://rpc.prod.testnet.arc.network

# Get milestone data  
cast call 0xEa3245683904A3CF3ad5A5ada56Af007dBc9eaB6 \
  "getMilestones(uint256)" \
  2 \
  --rpc-url https://rpc.prod.testnet.arc.network
```

## Possible Root Causes

### 1. Milestone Amount Not Set During Creation
If milestones were created without amounts, they'll be 0. The fix should use the remaining escrow balance, but if totalAmount is also 0, there's nothing to show.

### 2. Contract Returns Data in Different Format
The contract might return amounts in a different field or format than expected.

### 3. BigInt Conversion Issue
JavaScript BigInt conversion might be losing precision or failing silently.

### 4. RPC Data Corruption
The RPC might be returning corrupted or incomplete data.

## Immediate Fix

Add a fallback that uses a minimum amount if everything is 0:

```typescript
// If we still have 0, something is wrong - use a placeholder
if (amtWei === 0n) {
  console.error(`Dispute #${id} Milestone ${idx}: All amounts are 0!`);
  // This shouldn't happen, but prevents division by zero
  amtWei = 1000000000000000000n; // 1 USDC as placeholder
}
```

## Long-term Solution

### Option 1: Store Amount in Dispute Event
When a dispute is raised, emit an event with the amount:
```solidity
event DisputeRaised(
    uint256 indexed escrowId,
    uint256 indexed milestoneIndex,
    address indexed disputedBy,
    uint256 amountAtStake,
    string reason
);
```

### Option 2: Calculate from Milestone Index
If milestones are sequential, calculate based on position:
```typescript
const milestoneCount = milestones.length;
const amountPerMilestone = remainingWei / BigInt(milestoneCount);
```

### Option 3: Use Escrow Total as Fallback
If milestone amount is 0, always use the full escrow total:
```typescript
const amtWei = milestoneAmtWei > 0n ? milestoneAmtWei : escrowTotalWei;
```

## Testing Commands

### Check if contract has data:
```bash
# Check escrow exists
cast call 0xEa3245683904A3CF3ad5A5ada56Af007dBc9eaB6 "nextEscrowId()" --rpc-url https://rpc.prod.testnet.arc.network

# Check specific escrow
cast call 0xEa3245683904A3CF3ad5A5ada56Af007dBc9eaB6 "getEscrow(uint256)" 2 --rpc-url https://rpc.prod.testnet.arc.network
```

### Check milestone data:
```bash
cast call 0xEa3245683904A3CF3ad5A5ada56Af007dBc9eaB6 "getMilestones(uint256)" 2 --rpc-url https://rpc.prod.testnet.arc.network
```

## What to Check in Console

1. **Escrow data log** - Should show totalAmount and paidAmount
2. **Dispute log** - Should show all calculated values
3. **Final amount** - Should be > 0

If all values are 0, the issue is with data fetching, not calculation.

## Next Steps

1. ✅ Add debug logging (DONE)
2. 🔄 Check console logs after refresh
3. 📝 Share console output
4. 🔧 Implement appropriate fix based on logs
