# Amount Display Issue - Debug Guide

## Current Status

**Console**: Shows correct amount (29 USDC)  
**UI**: Shows 0.000000 USDC  

This means the data is being fetched correctly, but something is wrong with how it's being displayed.

---

## Enhanced Debug Logging

The code now logs the amount in multiple formats:

```javascript
Dispute #2 Milestone 0: {
  rawAmount: "29000000000000000000",  // Raw BigInt value
  escrowTotal: "29000000000000000000",
  escrowPaid: "0",
  remaining: "29000000000000000000",
  milestoneAmount: "29000000000000000000",
  finalAmount: "29000000000000000000",
  as_18_decimals: 29,        // ← This should be the display value
  as_6_decimals: 29000000000000,
  as_0_decimals: 2.9e+19
}

Final display amount for Dispute #2: 29
```

---

## What To Check

### 1. Refresh the Disputes Page
```
1. Go to /disputes
2. Open DevTools (F12)
3. Go to Console tab
4. Look for "Final display amount for Dispute #X: Y"
5. This should show the correct number (e.g., 29)
```

### 2. Check the Dispute List
The dispute list (before opening the dialog) should show the correct amount:
```
💰 29.000000 USDC
```

If this shows 0, the issue is in the dispute object creation.  
If this shows 29, the issue is in the dialog display.

### 3. Check the Dialog
When you click "Resolve":
```
Total at stake: X.XXXXXX USDC
```

If this shows 0 but the list showed 29, the issue is with `selectedDispute`.

---

## Possible Issues

### Issue 1: Decimal Places
**Problem**: Contract returns amount with wrong decimal places  
**Solution**: Use correct formatUnits parameter (6 or 18)

### Issue 2: State Update Timing
**Problem**: Dialog opens before state updates  
**Solution**: Force re-render or fetch data in openDialog

### Issue 3: Object Reference
**Problem**: selectedDispute points to old object  
**Solution**: Deep copy or refetch when opening dialog

---

## Quick Fix to Test

If the console shows the correct value but UI shows 0, try this:

### Option 1: Force Refetch on Dialog Open
```typescript
const openDialog = async (dispute: Dispute) => {
  // Refetch the specific dispute data
  const fresh = await refetchDispute(dispute.escrowId, dispute.milestoneIndex);
  setSelectedDispute(fresh);
  setFreelancerPct(50);
  setResolutionReason("");
  setDialogOpen(true);
};
```

### Option 2: Use Computed Value
```typescript
// In dialog, instead of:
{selectedDispute.milestoneAmountEth.toFixed(6)}

// Use:
{Number(formatUnits(selectedDispute.milestoneAmountWei, 18)).toFixed(6)}
```

---

## Next Steps

1. **Refresh /disputes page**
2. **Check console for "Final display amount"**
3. **Check if dispute list shows correct amount**
4. **Check if dialog shows correct amount**
5. **Share console output showing all three checks**

This will tell us exactly where the value is being lost!
