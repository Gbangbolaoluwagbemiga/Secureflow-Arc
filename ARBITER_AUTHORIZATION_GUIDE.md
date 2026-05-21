# Arbiter Authorization Guide

## 🚨 Error: "Unauthorized" When Resolving Disputes

If you see this error when trying to resolve a dispute:
```
You are not authorized as an arbiter. Ask the contract owner to authorize your address in Arbiter Management.
```

This means **your wallet address is not registered as an arbiter** in the smart contract.

---

## How Arbiter Authorization Works

### Contract Requirements
The `resolveDispute` function in the smart contract has the `onlyArbiter` modifier:

```solidity
function resolveDispute(
    uint256 escrowId,
    uint256 milestoneIndex,
    uint256 freelancerAmount,
    uint256 clientAmount
) external onlyArbiter nonReentrant {
    // ... resolution logic
}
```

This means:
- ✅ Only **authorized arbiters** can resolve disputes
- ✅ Only the **contract owner** can authorize arbiters
- ❌ Regular users cannot resolve disputes
- ❌ Unauthorized addresses will get "Unauthorized" error

### Authorization Flow

```
Contract Owner
    ↓
Calls authorizeArbiter(address)
    ↓
Wallet address added to authorizedArbiters mapping
    ↓
That wallet can now call resolveDispute()
```

---

## How to Authorize an Arbiter

### Step 1: Go to Admin Page
Navigate to the Admin Dashboard in your app.

### Step 2: Find "Arbiter Management" Section
Look for the **Arbiter Management** card with the shield icon.

### Step 3: Enter Arbiter Address
In the "Authorize New Arbiter" field, enter the wallet address you want to authorize:
- Example: `0x1234567890123456789012345678901234567890`

### Step 4: Click "Authorize" Button
Click the **Authorize** button to submit the transaction.

### Step 5: Confirm in Wallet
Confirm the transaction in your wallet (MetaMask, etc.)

### Step 6: Verify Authorization
Once confirmed, the address will appear in the "Authorized Arbiters" list below.

---

## Troubleshooting

### Problem: "You are not the contract owner"
**Cause**: Only the contract owner can authorize arbiters.

**Solution**: 
- If you're the contract owner, make sure you're connected with the correct wallet
- If you're not the owner, ask the contract owner to authorize your address

### Problem: "Already authorized"
**Cause**: This address is already an authorized arbiter.

**Solution**: 
- The address is already authorized
- You can now use it to resolve disputes
- If you want to remove it, click the "Remove" button

### Problem: "Invalid address"
**Cause**: The address format is incorrect.

**Solution**:
- Make sure the address starts with `0x`
- Make sure it's 42 characters long (0x + 40 hex characters)
- Example: `0x1234567890123456789012345678901234567890`

### Problem: "Transaction failed"
**Cause**: Various reasons (insufficient gas, network error, etc.)

**Solution**:
- Check your wallet balance for gas fees
- Make sure you're on the correct network (Arc Testnet)
- Try again in a few moments

---

## Authorized Arbiters List

Once authorized, arbiters can:
- ✅ View all active disputes
- ✅ Review evidence from both parties
- ✅ Resolve disputes by splitting funds
- ✅ Send messages to both parties
- ✅ Award funds to either party

### Current Authorized Arbiters
See the "Authorized Arbiters" table in the Arbiter Management section.

### Remove an Arbiter
To remove an arbiter:
1. Find their address in the "Authorized Arbiters" table
2. Click the "Remove" button
3. Confirm the removal in the dialog
4. Confirm the transaction in your wallet

---

## Multi-Sig Dispute Resolution

The contract uses a **multi-sig voting system** for dispute resolution:

```solidity
if (disputeVoteCounts[escrowId] < esc.requiredConfirmations) return;
```

This means:
- Multiple arbiters can vote on the same dispute
- The dispute is only resolved when enough votes are reached
- Each arbiter's vote is recorded on-chain
- The resolution is final once the vote threshold is met

### Example
If `requiredConfirmations = 2`:
1. Arbiter A votes to award 50% to freelancer
2. Arbiter B votes to award 50% to freelancer
3. Once 2 votes are reached, the dispute is resolved
4. Funds are distributed according to the decision

---

## Security Notes

### Only Contract Owner Can Authorize
- ✅ Prevents unauthorized arbiters from being added
- ✅ Ensures only trusted addresses can resolve disputes
- ✅ Protects user funds from malicious arbiters

### Arbiters Are Trusted
- ✅ Arbiters have significant power (can award funds)
- ✅ Only authorize addresses you trust completely
- ✅ Consider using multi-sig for arbiter authorization

### Revoke Access Anytime
- ✅ Contract owner can remove arbiters at any time
- ✅ Removed arbiters cannot resolve new disputes
- ✅ Previous resolutions remain on-chain

---

## Contract Functions

### authorizeArbiter(address arbiter)
**Who can call**: Contract owner only

**What it does**: Adds an address to the authorized arbiters list

**Parameters**:
- `arbiter`: The wallet address to authorize

**Example**:
```solidity
authorizeArbiter(0x1234567890123456789012345678901234567890)
```

### revokeArbiter(address arbiter)
**Who can call**: Contract owner only

**What it does**: Removes an address from the authorized arbiters list

**Parameters**:
- `arbiter`: The wallet address to revoke

**Example**:
```solidity
revokeArbiter(0x1234567890123456789012345678901234567890)
```

### getAuthorizedArbiters()
**Who can call**: Anyone

**What it does**: Returns the list of all authorized arbiters

**Returns**: Array of arbiter addresses

---

## FAQ

### Q: Can I resolve disputes if I'm not an arbiter?
**A**: No. Only authorized arbiters can call `resolveDispute`. You'll get an "Unauthorized" error if you try.

### Q: Who can authorize arbiters?
**A**: Only the contract owner can authorize arbiters using the `authorizeArbiter` function.

### Q: Can I authorize myself?
**A**: Only if you're the contract owner. If you're not, ask the contract owner to authorize your address.

### Q: What if I lose access to my arbiter wallet?
**A**: The contract owner can revoke your access and authorize a new address.

### Q: Can arbiters be removed?
**A**: Yes. The contract owner can revoke any arbiter's access at any time using `revokeArbiter`.

### Q: Is there a limit to how many arbiters can be authorized?
**A**: No. You can authorize as many arbiters as needed.

### Q: Do arbiters need to vote on every dispute?
**A**: Yes. Each arbiter must vote on a dispute. The dispute is only resolved once the required number of votes is reached.

---

## Next Steps

1. **If you're the contract owner**:
   - Go to Admin → Arbiter Management
   - Authorize your wallet address
   - You can now resolve disputes

2. **If you're not the contract owner**:
   - Ask the contract owner to authorize your address
   - Once authorized, you can resolve disputes

3. **To resolve a dispute**:
   - Go to Admin → Disputes
   - Click "Resolve" on a dispute
   - Review evidence and set fund split
   - Confirm the transaction

---

**Status**: ✅ Authorization system working correctly  
**Build**: ✅ Successful  
**Date**: May 21, 2026
