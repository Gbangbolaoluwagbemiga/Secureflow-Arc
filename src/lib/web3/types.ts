export interface Milestone {
  description: string;
  amount: string;
  status:
    | "pending"
    | "submitted"
    | "approved"
    | "rejected"
    | "disputed"
    | "resolved"
    | "proposal_pending";
  submittedAt?: number;
  approvedAt?: number;
  rejectionReason?: string;
  disputeReason?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  resolutionAmount?: string; // Amount paid to beneficiary in resolution (freelancer's share)
  resolutionClientAmount?: string; // Amount refunded to client in resolution
  proposedAmount?: string; // Proposed amount for milestone changes
  proposedDescription?: string; // Proposed description for milestone changes
}

export interface Escrow {
  id: string;
  payer: string;
  beneficiary: string;
  token: string;
  totalAmount: string;
  releasedAmount: string;
  status: "pending" | "active" | "completed" | "disputed" | "cancelled";
  createdAt: number;
  duration: number;
  /** Deadline as Unix timestamp (ms) from the on-chain deadline field */
  deadlineAt?: number;
  milestones: Milestone[];
  projectTitle?: string;
  projectDescription?: string;
  isOpenJob?: boolean;
  applications?: Application[];
  applicationCount?: number;
  isJobCreator?: boolean;
  isClient?: boolean;
  isFreelancer?: boolean;
  milestoneCount?: number;
}

export interface EscrowStats {
  activeEscrows: number;
  totalVolume: string;
  completedEscrows: number;
}

export interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  balance: string; // USDC balance (18 decimals on-chain, displayed as 6)
}

export interface Application {
  freelancerAddress: string;
  coverLetter: string;
  proposedTimeline: number;
  appliedAt: number;
  status: "pending" | "accepted" | "rejected";
  badge?: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  averageRating?: number;
  ratingCount?: number;
}

export interface Rating {
  escrowId: number;
  freelancer: string;
  client: string;
  rating: number; // 1-5
  review: string;
  ratedAt: number;
}

export type Badge = "Beginner" | "Intermediate" | "Advanced" | "Expert";
