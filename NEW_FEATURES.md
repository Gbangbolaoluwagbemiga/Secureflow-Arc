# SecureFlow - New Features Documentation

This document describes the new features added to SecureFlow to enhance the platform's functionality and user experience.

## 🎯 Overview

Three major feature sets have been implemented:

1. **Analytics Dashboard** - Platform-wide and user-specific metrics
2. **Milestone Negotiation** - Freelancers can propose changes to milestones
3. **Job Management** - Clients can manage open jobs before assignment

---

## 📊 1. Analytics Dashboard

### Description
A comprehensive analytics dashboard that provides insights into platform performance and user activity.

### Features

#### Platform Analytics
- **Total Escrows**: Count of all escrows created on the platform
- **Active Escrows**: Number of currently in-progress projects
- **Completed Escrows**: Successfully finished projects
- **Disputed Escrows**: Projects currently in dispute
- **Total Volume**: Cumulative value of all escrows (in ETH)
- **Platform Fees**: Total fees collected
- **Completion Rate**: Percentage of successfully completed projects
- **Dispute Rate**: Percentage of projects that went into dispute

#### User Analytics (Wallet-Connected)
- **Reputation Score**: On-chain reputation points
- **Average Rating**: Star rating from completed projects
- **Total Earned**: Cumulative earnings as a freelancer
- **Total Spent**: Cumulative spending as a client
- **Active Projects**: Current ongoing projects
- **Projects as Client**: Total projects created
- **Projects as Freelancer**: Total projects worked on
- **Completed Escrows**: Successfully finished projects

#### Visualizations
- **Pie Chart**: Escrow status distribution
- **Bar Charts**: Platform metrics and user activity
- **Trend Analysis**: Status distribution over time

### Access
- **URL**: `/analytics`
- **Navigation**: Available in the main navbar
- **Permissions**: Platform stats visible to all; user stats require wallet connection

### API Endpoints

#### GET `/v1/analytics/platform`
Returns platform-wide statistics.

**Response:**
```json
{
  "totalEscrows": 42,
  "activeEscrows": 8,
  "completedEscrows": 30,
  "disputedEscrows": 2,
  "totalVolume": "125.5",
  "totalFees": "3.1375",
  "completionRate": "71.43",
  "disputeRate": "4.76"
}
```

#### GET `/v1/analytics/user/:address`
Returns user-specific statistics.

**Response:**
```json
{
  "address": "0x...",
  "completedEscrows": 15,
  "reputation": 12,
  "averageRating": 4.5,
  "ratingCount": 10,
  "projectsAsClient": 8,
  "projectsAsFreelancer": 12,
  "totalEarned": "45.5",
  "totalSpent": "32.0",
  "activeProjects": 3
}
```

#### GET `/v1/analytics/trends`
Returns trend data and status distribution.

**Response:**
```json
{
  "totalEscrows": 42,
  "statusDistribution": {
    "pending": 5,
    "inProgress": 8,
    "completed": 30,
    "refunded": 1,
    "disputed": 2,
    "expired": 0,
    "cancelled": 1
  }
}
```

---

## 🤝 2. Milestone Negotiation

### Description
Allows freelancers to propose changes to milestone terms (amount and description) before starting work. Clients can review and approve or reject these proposals.

### Smart Contract Functions

#### `proposeMilestoneChange()`
Freelancer proposes changes to a milestone.

**Parameters:**
- `escrowId` (uint256): The escrow ID
- `milestoneIndex` (uint256): Index of the milestone to modify
- `proposedAmount` (uint256): New proposed amount in wei
- `proposedDescription` (string): New proposed description

**Requirements:**
- Caller must be the beneficiary (freelancer)
- Escrow must be in Pending or InProgress status
- Milestone must be in NotStarted status

**Event Emitted:**
```solidity
event MilestoneProposalSubmitted(
    uint256 indexed escrowId,
    uint256 indexed milestoneIndex,
    address indexed freelancer,
    uint256 proposedAmount,
    string proposedDescription
);
```

#### `approveMilestoneProposal()`
Client approves the proposed milestone changes.

**Parameters:**
- `escrowId` (uint256): The escrow ID
- `milestoneIndex` (uint256): Index of the milestone

**Requirements:**
- Caller must be the depositor (client)
- Milestone must have a pending proposal

**Event Emitted:**
```solidity
event MilestoneProposalApproved(
    uint256 indexed escrowId,
    uint256 indexed milestoneIndex,
    uint256 newAmount,
    string newDescription
);
```

#### `rejectMilestoneProposal()`
Client rejects the proposed milestone changes.

**Parameters:**
- `escrowId` (uint256): The escrow ID
- `milestoneIndex` (uint256): Index of the milestone

**Requirements:**
- Caller must be the depositor (client)
- Milestone must have a pending proposal

**Event Emitted:**
```solidity
event MilestoneProposalRejected(
    uint256 indexed escrowId,
    uint256 indexed milestoneIndex
);
```

### UI Components

#### For Freelancers
- **Propose Changes Button**: Available on NotStarted milestones
- **Proposal Form**: Input fields for amount and description
- **Status Indicator**: Shows when proposal is pending client review

#### For Clients
- **Proposal Card**: Displays proposed changes with comparison to current terms
- **Approve/Reject Buttons**: Quick action buttons for decision
- **Comparison View**: Side-by-side view of current vs. proposed terms

### Use Cases
1. **Scope Clarification**: Freelancer proposes more detailed description
2. **Budget Adjustment**: Freelancer requests higher payment for additional work
3. **Milestone Restructuring**: Freelancer suggests different milestone breakdown

---

## 💼 3. Job Management (Before Assignment)

### Description
Allows clients to manage open jobs before a freelancer is assigned. Clients can add funds, withdraw funds, or cancel the job entirely.

### Smart Contract Functions

#### `cancelJob()`
Cancel an open job and receive a full refund (including platform fees).

**Parameters:**
- `escrowId` (uint256): The escrow ID

**Requirements:**
- Caller must be the depositor (client)
- Job must be open (no freelancer assigned)
- Escrow must be in Pending status

**Event Emitted:**
```solidity
event JobCancelled(
    uint256 indexed escrowId,
    address indexed depositor,
    uint256 refundAmount
);
```

**Refund:**
- Returns `totalAmount + platformFee` to the client
- Updates escrow status to Cancelled

#### `addJobFunds()`
Increase the budget for an open job.

**Parameters:**
- `escrowId` (uint256): The escrow ID
- `additionalAmount` (uint256): Amount to add in wei

**Requirements:**
- Caller must be the depositor (client)
- Job must be open (no freelancer assigned)
- Escrow must be in Pending status
- Must send `additionalAmount + platformFee` in the transaction

**Event Emitted:**
```solidity
event JobFundsUpdated(
    uint256 indexed escrowId,
    uint256 oldAmount,
    uint256 newAmount,
    bool isIncrease
);
```

**Fee Calculation:**
- Platform fee is calculated on the additional amount
- Both amount and fee are added to the escrow

#### `withdrawJobFunds()`
Reduce the budget for an open job.

**Parameters:**
- `escrowId` (uint256): The escrow ID
- `withdrawAmount` (uint256): Amount to withdraw in wei

**Requirements:**
- Caller must be the depositor (client)
- Job must be open (no freelancer assigned)
- Escrow must be in Pending status
- Withdraw amount must not exceed total amount

**Event Emitted:**
```solidity
event JobFundsUpdated(
    uint256 indexed escrowId,
    uint256 oldAmount,
    uint256 newAmount,
    bool isIncrease
);
```

**Refund:**
- Returns `withdrawAmount + proportionalFee` to the client
- Updates escrow total amount and platform fee

### UI Components

#### Job Management Card
Displayed on open jobs in the dashboard:
- **Current Budget Display**: Shows the current escrow amount
- **Add Funds Button**: Opens dialog to add more funds
- **Withdraw Funds Button**: Opens dialog to withdraw funds
- **Cancel Job Button**: Opens confirmation dialog to cancel

#### Add Funds Dialog
- **Amount Input**: Enter additional ETH amount
- **New Total Preview**: Shows what the new total will be
- **Confirm Button**: Executes the transaction

#### Withdraw Funds Dialog
- **Amount Input**: Enter withdrawal amount (max: current total)
- **Remaining Preview**: Shows what will remain after withdrawal
- **Confirm Button**: Executes the transaction

#### Cancel Job Dialog
- **Warning Message**: Explains the action is irreversible
- **Refund Information**: Shows total refund amount
- **Confirm Button**: Executes the cancellation

### Use Cases
1. **Budget Increase**: Client realizes more funds are needed
2. **Budget Decrease**: Client wants to reduce scope before assignment
3. **Job Cancellation**: Client no longer needs the work done
4. **Market Adjustment**: Client adjusts budget based on applicant feedback

---

## 🔧 Technical Implementation

### Smart Contract Changes

#### New Errors
```solidity
error JobAlreadyAssigned();
error CannotCancelAssignedJob();
error NoPendingProposal();
error ProposalAlreadyExists();
```

#### Updated Enums
```solidity
enum EscrowStatus { 
    Pending, 
    InProgress, 
    Released, 
    Refunded, 
    Disputed, 
    Expired, 
    Cancelled  // NEW
}

enum MilestoneStatus { 
    NotStarted, 
    Submitted, 
    Approved, 
    Rejected, 
    Disputed, 
    ProposalPending  // NEW
}
```

#### Updated Milestone Struct
```solidity
struct Milestone {
    uint256 amount;
    string description;
    MilestoneStatus status;
    uint256 submittedAt;
    uint256 approvedAt;
    uint256 disputedAt;
    address disputedBy;
    string disputeReason;
    string rejectionReason;
    uint256 resolvedAt;
    address resolvedBy;
    uint256 proposedAmount;        // NEW
    string proposedDescription;    // NEW
}
```

### Backend Changes

#### New Route: `/v1/analytics`
- `GET /platform` - Platform-wide statistics
- `GET /user/:address` - User-specific statistics
- `GET /trends` - Trend data and status distribution

#### Dependencies
- `viem` - For blockchain interactions
- `recharts` - For data visualization (frontend)

### Frontend Changes

#### New Components
1. **AnalyticsPage** (`src/pages/AnalyticsPage.tsx`)
   - Platform and user analytics tabs
   - Interactive charts and metrics cards

2. **MilestoneNegotiation** (`src/components/milestone-negotiation.tsx`)
   - Proposal form for freelancers
   - Approval/rejection UI for clients

3. **JobManagement** (`src/components/job-management.tsx`)
   - Add/withdraw funds dialogs
   - Cancel job confirmation

#### Updated Components
- **ContractService** - Added new contract methods
- **Navbar** - Added Analytics link
- **App.tsx** - Added Analytics route

### Subgraph Updates

#### Updated Schema
- Escrow status now includes `6=Cancelled`
- Milestone status now includes `5=ProposalPending`
- Milestone entity includes `proposedAmount` and `proposedDescription`

---

## 🚀 Deployment Guide

### 1. Smart Contract Deployment

```bash
cd contracts/solidity

# Compile the updated contract
forge build

# Deploy to Arc Testnet
forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast --verify

# Update contract address in .env files
```

### 2. Backend Deployment

```bash
cd backend

# Install dependencies (if needed)
npm install

# Update .env with new contract address
echo "CONTRACT_ADDRESS=0x..." >> .env

# Build and start
npm run build
npm start
```

### 3. Frontend Deployment

```bash
# Update contract address in .env
echo "VITE_SECUREFLOW_CONTRACT_ADDRESS=0x..." >> .env

# Build
npm run build

# Deploy to Vercel
vercel --prod
```

### 4. Subgraph Deployment

```bash
cd subgraph

# Update contract address in subgraph.yaml
# Update startBlock to deployment block

# Generate code
npm run codegen

# Build
npm run build

# Deploy
npm run deploy
```

---

## 📝 Usage Examples

### Example 1: Freelancer Proposes Milestone Change

```typescript
// Freelancer proposes to increase milestone amount
const { ContractService } = await import("@/lib/web3/contract-service");
const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

await cs.proposeMilestoneChange(
  {
    escrow_id: 1,
    milestone_index: 0,
    proposed_amount: "0.5", // 0.5 ETH
    proposed_description: "Updated: Will include responsive design and mobile optimization",
    freelancer: walletAddress,
  },
  writeContractAsync
);
```

### Example 2: Client Adds Funds to Open Job

```typescript
// Client adds 0.2 ETH to the job budget
const { ContractService } = await import("@/lib/web3/contract-service");
const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

await cs.addJobFunds(
  {
    escrow_id: 1,
    additional_amount: "0.2",
    depositor: walletAddress,
  },
  writeContractAsync
);
```

### Example 3: Fetch Analytics Data

```typescript
// Fetch platform analytics
const response = await fetch(`${API_URL}/v1/analytics/platform`, {
  headers: {
    Authorization: `Bearer ${API_SECRET}`,
  },
});
const analytics = await response.json();

console.log(`Total Volume: ${analytics.totalVolume} ETH`);
console.log(`Completion Rate: ${analytics.completionRate}%`);
```

---

## 🔒 Security Considerations

### Access Control
- **Job Management**: Only the depositor can manage open jobs
- **Milestone Negotiation**: Only the beneficiary can propose changes
- **Proposal Approval**: Only the depositor can approve/reject proposals

### Validation
- All amounts are validated to prevent zero or negative values
- Job management only works on open jobs (no freelancer assigned)
- Milestone negotiation only works on NotStarted milestones

### Reentrancy Protection
- All state-changing functions use `nonReentrant` modifier
- Funds are transferred after state updates (checks-effects-interactions)

### Fee Handling
- Platform fees are properly calculated and refunded on cancellation
- Fee refunds are proportional to withdrawn amounts

---

## 🧪 Testing Recommendations

### Smart Contract Tests
```solidity
// Test milestone negotiation
testProposeMilestoneChange()
testApproveMilestoneProposal()
testRejectMilestoneProposal()

// Test job management
testCancelJob()
testAddJobFunds()
testWithdrawJobFunds()

// Test access control
testUnauthorizedProposal()
testUnauthorizedJobManagement()

// Test edge cases
testProposalOnAssignedJob()
testCancelAssignedJob()
testWithdrawMoreThanBalance()
```

### Integration Tests
- Test full negotiation flow (propose → approve → work)
- Test job management flow (create → add funds → assign)
- Test analytics API endpoints with various scenarios

---

## 📈 Future Enhancements

### Potential Additions
1. **Multi-round Negotiation**: Allow back-and-forth proposals
2. **Partial Withdrawals**: Withdraw from specific milestones
3. **Budget Templates**: Save common budget structures
4. **Analytics Export**: Download analytics data as CSV/PDF
5. **Real-time Analytics**: WebSocket updates for live metrics
6. **Advanced Filters**: Filter analytics by date range, token type, etc.

---

## 🐛 Known Limitations

1. **Analytics Performance**: Fetching all escrows can be slow with many escrows (consider pagination)
2. **Proposal History**: Only one proposal per milestone at a time (no history)
3. **Job Management**: Cannot modify milestones after adding/withdrawing funds
4. **Analytics Caching**: No caching implemented (every request queries blockchain)

---

## 📞 Support

For questions or issues related to these features:
- Open an issue on GitHub
- Contact the development team
- Check the main README.md for general documentation

---

## 📄 License

These features are part of SecureFlow and are licensed under the MIT License.
