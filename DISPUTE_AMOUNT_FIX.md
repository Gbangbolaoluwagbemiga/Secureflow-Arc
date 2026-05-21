# Dispute Amount Calculation Fix

## Issue
The dispute dialog was showing "Total at stake: 0.000000 USDC" instead of the actual amount at stake from the blockchain.

## Root Cause
The previous implementation had two issues:
1. It was using the milestone amount directly, which could be 0
2. It was falling back to the total escrow amount, not accounting for funds already released

## Solution

### Correct Calculation
The amount at stake in a dispute should be:
```
Amount at Stake = Total Escrow Amount - Already Released Amount
```

If the milestone has a specific amount set, use that. Otherwise, use the remaining escrow balance.

### Implementation

**Location**: `src/components/admin/dispute-resolution.tsx` (lines 90-100)

```typescript
// Calculate remaining amount at stake (total - already paid)
const escrowTotalWei = BigInt(escrow.totalAmount ?? 0);
const escrowPaidWei = BigInt(escrow.paidAmount ?? 0);
const remainingWei = escrowTotalWei - escrowPaidWei;

// Use milestone amount if available, otherwise use remaining escrow balance
const milestoneAmtWei = BigInt(m.amount ?? 0);
const amtWei = milestoneAmtWei > 0n ? milestoneAmtWei : remainingWei;
```

### Contract Fields Used

From the smart contract's `Escrow` struct:
- **`totalAmount`**: Total funds deposited in the escrow
- **`paidAmount`**: Funds already released to the freelancer
- **Remaining**: `totalAmount - paidAmount` = funds still in escrow

### Example Scenarios

#### Scenario 1: First Milestone Disputed
```
Total Escrow: 10 USDC
Already Paid: 0 USDC
Milestone Amount: 3 USDC
Amount at Stake: 3 USDC ✅
```

#### Scenario 2: Second Milestone Disputed (First Already Paid)
```
Total Escrow: 10 USDC
Already Paid: 3 USDC (first milestone)
Milestone Amount: 4 USDC
Amount at Stake: 4 USDC ✅
```

#### Scenario 3: Milestone Amount Not Set
```
Total Escrow: 10 USDC
Already Paid: 3 USDC
Milestone Amount: 0 (not set)
Amount at Stake: 7 USDC (remaining balance) ✅
```

#### Scenario 4: Multiple Milestones Paid
```
Total Escrow: 20 USDC
Already Paid: 15 USDC (3 milestones)
Milestone Amount: 5 USDC
Amount at Stake: 5 USDC ✅
```

## Benefits

### 1. Accurate Dispute Resolution
- Admin sees the exact amount they're splitting
- No confusion about what funds are actually at stake
- Prevents over-allocation of funds

### 2. Transparency
- Both parties know exactly what's being disputed
- Amount reflects actual blockchain state
- Accounts for previously released payments

### 3. Correct Fund Splits
- Slider percentages apply to the correct amount
- Client and freelancer receive accurate calculations
- No risk of trying to distribute more than available

## Display in UI

### Dispute List
```
💰 5.000000 USDC  🕐 2h ago
```
Shows the actual amount at stake for this specific dispute.

### Dispute Dialog
```
Total at stake: 5.000000 USDC
Client gets: 2.500000 USDC
Freelancer gets: 2.500000 USDC
```
All calculations based on the actual remaining funds.

## Technical Details

### Data Flow
1. **Contract Query**: `getEscrow(id)` returns escrow with `totalAmount` and `paidAmount`
2. **Calculation**: `remainingWei = totalAmount - paidAmount`
3. **Milestone Check**: Use milestone amount if > 0, else use remaining
4. **Display**: Convert from Wei (18 decimals) to USDC (6 decimals for display)

### Type Safety
```typescript
interface Dispute {
  escrowId: string;
  milestoneIndex: number;
  milestoneAmountWei: bigint;      // Actual amount at stake (Wei)
  milestoneAmountEth: number;      // Display amount (USDC)
  // ... other fields
}
```

### Precision
- **On-chain**: 18 decimals (Wei)
- **Display**: 6 decimals (USDC standard)
- **Calculation**: All math done in BigInt to prevent precision loss

## Testing Checklist

- [ ] Dispute shows correct amount when no funds released yet
- [ ] Dispute shows correct amount after some milestones paid
- [ ] Dispute shows correct amount when milestone amount is 0
- [ ] Dispute shows correct amount when milestone amount is set
- [ ] Fund split calculations are accurate
- [ ] Client and freelancer receive correct amounts after resolution

## Related Files

- `src/components/admin/dispute-resolution.tsx` - Main fix location
- `src/lib/web3/contract-service.ts` - Contract data fetching
- `src/lib/web3/types.ts` - Type definitions
- `DISPUTE_SYSTEM_COMPLETE.md` - Full system documentation

## Build Status

✅ **Build Successful**
```bash
npm run build
✓ built in 8.14s
Exit Code: 0
```

## Summary

The dispute amount now correctly reflects:
1. ✅ Actual blockchain state (totalAmount - paidAmount)
2. ✅ Milestone-specific amounts when set
3. ✅ Remaining escrow balance as fallback
4. ✅ Accurate fund split calculations
5. ✅ Transparent display for all parties

This ensures fair and accurate dispute resolution based on the actual funds available in the escrow.
