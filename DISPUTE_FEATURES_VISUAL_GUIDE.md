# Dispute System - Visual Feature Guide

## 🎯 Quick Navigation
1. [Evidence Submission (Client/Freelancer)](#1-evidence-submission-clientfreelancer)
2. [Admin Dispute Resolution](#2-admin-dispute-resolution)
3. [Admin Communication](#3-admin-communication)
4. [Arbiter Management](#4-arbiter-management)
5. [Scalability Features](#5-scalability-features)

---

## 1. Evidence Submission (Client/Freelancer)

### Where to Find It
**Client**: Dashboard → Escrow Card → Disputed Milestone Section  
**Freelancer**: Freelancer Page → Active Jobs → Disputed Milestone Section

### What You'll See
```
┌─────────────────────────────────────────────────┐
│ 🔴 Milestone 1: Design Phase                    │
│ Status: Disputed - Under Review                 │
│                                                  │
│ This milestone is currently under dispute.      │
│ The admin will review the case and make a       │
│ fair resolution.                                 │
│                                                  │
│ ┌─────────────────────────────────────────────┐ │
│ │ Reason for dispute:                         │ │
│ │ Work not completed as agreed                │ │
│ └─────────────────────────────────────────────┘ │
│                                                  │
│ [👁️ View Evidence]  [📄 Submit Evidence]        │
└─────────────────────────────────────────────────┘
```

### Submit Evidence Dialog
```
┌──────────────────────────────────────────────────┐
│ Submit Evidence                              [X] │
├──────────────────────────────────────────────────┤
│                                                  │
│ Evidence Link or IPFS CID                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ QmXxx... or https://...                      │ │
│ └──────────────────────────────────────────────┘ │
│ Upload files to IPFS and paste the CID          │
│                                                  │
│ Description (Optional)                           │
│ ┌──────────────────────────────────────────────┐ │
│ │ Screenshot showing completed work with       │ │
│ │ all requested features implemented           │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ℹ️ IPFS Upload Services:                         │
│ • Pinata.cloud - Free IPFS pinning              │
│ • NFT.Storage - Free permanent storage          │
│ • Or use any direct URL to your evidence        │
│                                                  │
│              [Cancel]  [📤 Submit Evidence]      │
└──────────────────────────────────────────────────┘
```

### View Evidence Dialog
```
┌────────────────────────────────────────────────────────┐
│ Dispute Evidence                                   [X] │
├────────────────────────────────────────────────────────┤
│ Evidence & Communication                               │
│ View and submit evidence for Escrow #5, Milestone 0   │
│                                                        │
│ [Evidence Thread] [Submit Evidence]                    │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 [Client] 0x1234...5678        🕐 May 21, 2026  │ │
│ │                                                    │ │
│ │ Screenshot showing completed work with all         │ │
│ │ requested features implemented                     │ │
│ │                                                    │ │
│ │ 📄 QmXxx...abc123                    [🔗 Open]    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 [Freelancer] 0xabcd...ef01    🕐 May 21, 2026  │ │
│ │                                                    │ │
│ │ Work was completed according to specifications    │ │
│ │ as shown in the attached documentation            │ │
│ │                                                    │ │
│ │ 📄 QmYyy...def456                    [🔗 Open]    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 [Admin] 0x9999...0000          🕐 May 21, 2026 │ │
│ │                                                    │ │
│ │ Additional evidence requested from both parties   │ │
│ │                                                    │ │
│ │ 📄 https://example.com/notes.pdf    [🔗 Open]    │ │
│ └────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 2. Admin Dispute Resolution

### Where to Find It
**Admin**: Admin Page → Dispute Resolution Section

### Dispute List View
```
┌─────────────────────────────────────────────────────────┐
│ ⚖️ Dispute Resolution                    [45 Active] [▼] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Sort by: [Newest ▼]  Per page: [10 ▼]  [🔄 Refresh]   │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ Dispute #5  [Milestone 0]                        │ │
│ │ E-commerce Website Development                      │ │
│ │ Reason: Work not completed as agreed                │ │
│ │                                                     │ │
│ │ 👤 Client: 0x1234...5678                           │ │
│ │ 👤 Freelancer: 0xabcd...ef01                       │ │
│ │ 💰 5.000000 USDC  🕐 2h ago                        │ │
│ │                                      [Resolve]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ⚠️ Dispute #12  [Milestone 1]                       │ │
│ │ Mobile App Development                              │ │
│ │ Reason: Milestone rejected unfairly                 │ │
│ │                                                     │ │
│ │ 👤 Client: 0x5678...1234                           │ │
│ │ 👤 Freelancer: 0xef01...abcd                       │ │
│ │ 💰 10.000000 USDC  🕐 5h ago                       │ │
│ │                                      [Resolve]     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Showing 1-10 of 45 disputes                            │
│ [Previous]  Page 1 of 5  [Next]                        │
└─────────────────────────────────────────────────────────┘
```

### Resolve Dispute Dialog - Tab 1: Dispute Details
```
┌────────────────────────────────────────────────────────┐
│ Resolve Dispute                                    [X] │
├────────────────────────────────────────────────────────┤
│ [Dispute Details] [Evidence & Communication] [Message] │
│                                                        │
│ ℹ️ Dispute Information                                 │
│ Project: E-commerce Website Development                │
│ Milestone: Design Phase                                │
│ Dispute Reason: Work not completed as agreed           │
│ Total at stake: 5.000000 USDC                          │
│ Client: 0x1234567890abcdef1234567890abcdef12345678     │
│ Freelancer: 0xabcdef1234567890abcdef1234567890abcdef   │
│                                                        │
│ 💰 Fund Split                                          │
│ Client gets: 2.500000 USDC                             │
│ Freelancer gets: 2.500000 USDC                         │
│                                                        │
│ ├────────────●────────────┤                            │
│         Freelancer's share: 50%                        │
│                                                        │
│ [All to Client] [50 / 50] [All to Freelancer]         │
│                                                        │
│ Resolution Reason (optional)                           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Both parties provided valid evidence. Splitting  │   │
│ │ funds equally as a fair compromise.              │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│                      [Cancel]  [✅ Resolve Dispute]    │
└────────────────────────────────────────────────────────┘
```

### Resolve Dispute Dialog - Tab 2: Evidence & Communication
```
┌────────────────────────────────────────────────────────┐
│ Resolve Dispute                                    [X] │
├────────────────────────────────────────────────────────┤
│ [Dispute Details] [Evidence & Communication] [Message] │
│                                                        │
│ 💬 Dispute Evidence & Communication    [3 Submissions] │
│ Evidence and communication thread for Escrow #5        │
│                                                        │
│ [Evidence Thread] [Submit Evidence]                    │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 [Client] 0x1234...5678        🕐 May 21, 2026  │ │
│ │ Screenshot showing incomplete work                 │ │
│ │ 📄 QmXxx...abc123                    [🔗 Open]    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 👤 [Freelancer] 0xabcd...ef01    🕐 May 21, 2026  │ │
│ │ Work completed as per original specifications     │ │
│ │ 📄 QmYyy...def456                    [🔗 Open]    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│                      [Cancel]  [✅ Resolve Dispute]    │
└────────────────────────────────────────────────────────┘
```

### Resolve Dispute Dialog - Tab 3: Message Parties
```
┌────────────────────────────────────────────────────────┐
│ Resolve Dispute                                    [X] │
├────────────────────────────────────────────────────────┤
│ [Dispute Details] [Evidence & Communication] [Message] │
│                                                        │
│ 💬 Admin Communication                                 │
│ Send private messages to client or freelancer         │
│                                                        │
│ [To Client] [To Freelancer] [To Both]                 │
│                                                        │
│ 👤 Client  [0x1234...5678]                            │
│                                                        │
│ Your Message                                           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Thank you for submitting evidence. I need        │   │
│ │ additional clarification on the scope of work.   │   │
│ │ Please provide the original project requirements │   │
│ │ document.                                        │   │
│ └──────────────────────────────────────────────────┘   │
│ The client will receive this as a notification         │
│                                                        │
│                            [📤 Send to Client]         │
│                                                        │
│ ℹ️ Communication Tips:                                 │
│ • Be professional and neutral                          │
│ • Request additional evidence if needed                │
│ • Clarify any unclear points                           │
│ • Set expectations for resolution timeline             │
│                                                        │
│                      [Cancel]  [✅ Resolve Dispute]    │
└────────────────────────────────────────────────────────┘
```

---

## 3. Admin Communication

### Sending to Client Only
```
┌────────────────────────────────────────────────────────┐
│ [To Client] [To Freelancer] [To Both]                 │
│                                                        │
│ 👤 Client  [0x1234...5678]                            │
│                                                        │
│ Your Message                                           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ I've reviewed your evidence. Can you provide    │   │
│ │ more details about the original agreement?       │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│                            [📤 Send to Client]         │
└────────────────────────────────────────────────────────┘
```

### Sending to Freelancer Only
```
┌────────────────────────────────────────────────────────┐
│ [To Client] [To Freelancer] [To Both]                 │
│                                                        │
│ 👤 Freelancer  [0xabcd...ef01]                        │
│                                                        │
│ Your Message                                           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ Please submit proof of work completion including│   │
│ │ screenshots and any relevant documentation.      │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│                         [📤 Send to Freelancer]        │
└────────────────────────────────────────────────────────┘
```

### Sending to Both Parties
```
┌────────────────────────────────────────────────────────┐
│ [To Client] [To Freelancer] [To Both]                 │
│                                                        │
│ 👤 Client  [0x1234...5678]                            │
│ 👤 Freelancer  [0xabcd...ef01]                        │
│                                                        │
│ Your Message                                           │
│ ┌──────────────────────────────────────────────────┐   │
│ │ I'm reviewing this dispute and will make a       │   │
│ │ decision within 48 hours. Both parties should    │   │
│ │ submit any final evidence by tomorrow.           │   │
│ └──────────────────────────────────────────────────┘   │
│                                                        │
│                      [📤 Send to Both Parties]         │
└────────────────────────────────────────────────────────┘
```

---

## 4. Arbiter Management

### Where to Find It
**Admin**: Admin Page → Arbiter Management Section (between Token Management and Dispute Resolution)

### Arbiter Management Interface
```
┌─────────────────────────────────────────────────────────┐
│ 👥 Arbiter Management                    [3 Active] [▼] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Manage authorized arbiters who can resolve disputes    │
│                                                         │
│ Add New Arbiter                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 0x...                                               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                      [➕ Add Arbiter]   │
│                                                         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                         │
│ Authorized Arbiters                                     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 0x1234567890abcdef1234567890abcdef12345678       │ │
│ │    Added: May 20, 2026                              │ │
│ │                                      [🗑️ Remove]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 0xabcdef1234567890abcdef1234567890abcdef         │ │
│ │    Added: May 18, 2026                              │ │
│ │                                      [🗑️ Remove]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 👤 0x9876543210fedcba9876543210fedcba98765432       │ │
│ │    Added: May 15, 2026                              │ │
│ │                                      [🗑️ Remove]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ℹ️ Only authorized arbiters can resolve disputes       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Remove Arbiter Confirmation
```
┌────────────────────────────────────────────────────────┐
│ Remove Arbiter                                     [X] │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Are you sure you want to remove this arbiter?          │
│                                                        │
│ Address: 0x1234567890abcdef1234567890abcdef12345678    │
│                                                        │
│ This arbiter will no longer be able to resolve        │
│ disputes. This action cannot be undone.                │
│                                                        │
│                      [Cancel]  [🗑️ Remove Arbiter]     │
└────────────────────────────────────────────────────────┘
```

---

## 5. Scalability Features

### Pagination Controls
```
┌─────────────────────────────────────────────────────────┐
│ Sort by: [Newest ▼]  Per page: [10 ▼]  [🔄 Refresh]   │
│                                                         │
│ [Dispute cards displayed here...]                      │
│                                                         │
│ Showing 1-10 of 45 disputes                            │
│ [◀ Previous]  Page 1 of 5  [Next ▶]                    │
└─────────────────────────────────────────────────────────┘
```

### Sorting Options
```
┌─────────────────────┐
│ Sort by:            │
├─────────────────────┤
│ ✓ Newest            │
│   Oldest            │
│   Amount            │
└─────────────────────┘
```

### Items Per Page Options
```
┌─────────────────────┐
│ Per page:           │
├─────────────────────┤
│   5                 │
│ ✓ 10                │
│   25                │
│   50                │
└─────────────────────┘
```

### Collapsible Section
```
Collapsed:
┌─────────────────────────────────────────────────────────┐
│ ⚖️ Dispute Resolution            [45 Active] [▶]        │
└─────────────────────────────────────────────────────────┘

Expanded:
┌─────────────────────────────────────────────────────────┐
│ ⚖️ Dispute Resolution            [45 Active] [▼]        │
├─────────────────────────────────────────────────────────┤
│ [Full dispute list displayed here...]                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 User Flow Examples

### Example 1: Client Submits Evidence
1. Client goes to Dashboard
2. Finds disputed escrow card
3. Clicks "Submit Evidence" button
4. Uploads file to IPFS (e.g., Pinata)
5. Pastes IPFS CID in dialog
6. Adds description
7. Clicks "Submit Evidence"
8. Evidence recorded on-chain
9. Admin can now see evidence in dispute dialog

### Example 2: Admin Resolves Dispute
1. Admin goes to Admin Page
2. Sees new dispute notification
3. Clicks "Resolve" on dispute card
4. Reviews evidence in Tab 2
5. Sends message to both parties in Tab 3
6. Sets fund split in Tab 1 (e.g., 60% to freelancer)
7. Adds resolution reason
8. Clicks "Resolve Dispute"
9. Both parties receive notification
10. Funds distributed according to split

### Example 3: Admin Adds Arbiter
1. Admin goes to Admin Page
2. Scrolls to Arbiter Management
3. Enters arbiter address
4. Clicks "Add Arbiter"
5. Arbiter is authorized
6. Arbiter can now resolve disputes

---

## 📱 Notification Examples

### Client Receives Admin Message
```
┌────────────────────────────────────────────────────────┐
│ 🔔 New Notification                                    │
├────────────────────────────────────────────────────────┤
│ Admin Message: E-commerce Website Development          │
│                                                        │
│ Thank you for submitting evidence. I need additional   │
│ clarification on the scope of work. Please provide     │
│ the original project requirements document.            │
│                                                        │
│ [View Dashboard]                                       │
└────────────────────────────────────────────────────────┘
```

### Both Parties Receive Resolution Notification
```
┌────────────────────────────────────────────────────────┐
│ 🔔 New Notification                                    │
├────────────────────────────────────────────────────────┤
│ Dispute Resolved by Arbiter                            │
│                                                        │
│ Dispute #5 resolved. Reason: Both parties provided     │
│ valid evidence. Splitting funds equally as a fair      │
│ compromise.                                            │
│                                                        │
│ [View Details]                                         │
└────────────────────────────────────────────────────────┘
```

---

## 🔑 Key Features Summary

### For Clients & Freelancers
✅ Submit evidence with IPFS support  
✅ View all evidence in chronological order  
✅ Receive admin messages as notifications  
✅ Clear dispute status indicators  
✅ Easy-to-use interface

### For Admins
✅ View all disputes with pagination  
✅ Sort by newest, oldest, or amount  
✅ Review evidence from both parties  
✅ Send private messages to either party  
✅ Authorize/remove arbiters  
✅ Flexible fund split (0-100%)  
✅ Collapsible sections for organization  
✅ Real-time notifications

### Technical
✅ On-chain evidence storage  
✅ IPFS integration  
✅ Event-based updates  
✅ Secure access control  
✅ Scalable architecture  
✅ Mobile-responsive design

---

## 📚 Related Documentation
- [DISPUTE_SYSTEM_COMPLETE.md](./DISPUTE_SYSTEM_COMPLETE.md) - Technical implementation details
- [FEATURES_SUMMARY.md](./FEATURES_SUMMARY.md) - All platform features
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Deployment instructions
