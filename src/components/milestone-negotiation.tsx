import { useState } from "react";
import { useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";
import { MessageSquare, Check, X, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface MilestoneNegotiationProps {
  escrowId: string;
  milestoneIndex: number;
  milestone: {
    description: string;
    amount: string;
    status: string;
    proposedAmount?: string;
    proposedDescription?: string;
  };
  isFreelancer: boolean;
  isClient: boolean;
  onUpdate?: () => void;
}

export function MilestoneNegotiation({
  escrowId,
  milestoneIndex,
  milestone,
  isFreelancer,
  isClient,
  onUpdate,
}: MilestoneNegotiationProps) {
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();
  const { wallet } = useWeb3();
  const [isProposing, setIsProposing] = useState(false);
  const [proposedAmount, setProposedAmount] = useState("");
  const [proposedDescription, setProposedDescription] = useState(milestone.description);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasProposal = milestone.status === "proposal_pending";

  const handleProposeChange = async () => {
    if (!proposedAmount || parseFloat(proposedAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

      toast({
        title: "Proposing changes...",
        description: "Please confirm the transaction in your wallet",
      });

      await cs.proposeMilestoneChange(
        {
          escrow_id: Number(escrowId),
          milestone_index: milestoneIndex,
          proposed_amount: proposedAmount,
          proposed_description: proposedDescription,
          freelancer: wallet.address || "",
        },
        writeContractAsync
      );

      toast({
        title: "Proposal Submitted",
        description: "The client will review your proposed changes",
      });

      setIsProposing(false);
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Proposal Failed",
        description: error.message || "Failed to submit proposal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveProposal = async () => {
    setIsSubmitting(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

      toast({
        title: "Approving proposal...",
        description: "Please confirm the transaction in your wallet",
      });

      await cs.approveMilestoneProposal(
        {
          escrow_id: Number(escrowId),
          milestone_index: milestoneIndex,
          depositor: wallet.address || "",
        },
        writeContractAsync
      );

      toast({
        title: "Proposal Approved",
        description: "Milestone has been updated with the new terms",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve proposal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectProposal = async () => {
    setIsSubmitting(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

      toast({
        title: "Rejecting proposal...",
        description: "Please confirm the transaction in your wallet",
      });

      await cs.rejectMilestoneProposal(
        {
          escrow_id: Number(escrowId),
          milestone_index: milestoneIndex,
          depositor: wallet.address || "",
        },
        writeContractAsync
      );

      toast({
        title: "Proposal Rejected",
        description: "The freelancer can submit a new proposal",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject proposal",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show proposal UI for freelancers on NotStarted milestones
  if (isFreelancer && milestone.status === "pending" && !hasProposal) {
    return (
      <Dialog open={isProposing} onOpenChange={setIsProposing}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Propose Changes
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Propose Milestone Changes</DialogTitle>
            <DialogDescription>
              Suggest changes to this milestone. The client will review and approve or reject.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Proposed Amount (USDC)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                placeholder="0.5"
                value={proposedAmount}
                onChange={(e) => setProposedAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Current: {parseFloat(milestone.amount) / 1e18} USDC
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Proposed Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the milestone deliverables..."
                value={proposedDescription}
                onChange={(e) => setProposedDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsProposing(false)}>
              Cancel
            </Button>
            <Button onClick={handleProposeChange} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Proposal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show pending proposal for clients
  if (isClient && hasProposal && milestone.proposedAmount) {
    return (
      <Card className="glass border-yellow-500/50 p-4 mt-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Edit className="h-4 w-4 text-yellow-500" />
              <h4 className="font-semibold text-yellow-500">Pending Proposal</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Proposed Amount: </span>
                <span className="font-medium">
                  {parseFloat(milestone.proposedAmount) / 1e18} USDC
                </span>
                <span className="text-muted-foreground ml-2">
                  (Current: {parseFloat(milestone.amount) / 1e18} USDC)
                </span>
              </div>
              {milestone.proposedDescription && (
                <div>
                  <span className="text-muted-foreground">Proposed Description: </span>
                  <p className="mt-1 text-foreground">{milestone.proposedDescription}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              size="sm"
              variant="default"
              onClick={handleApproveProposal}
              disabled={isSubmitting}
              className="gap-1"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleRejectProposal}
              disabled={isSubmitting}
              className="gap-1"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Show proposal status for freelancers
  if (isFreelancer && hasProposal) {
    return (
      <Card className="glass border-yellow-500/50 p-4 mt-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-yellow-500" />
          <span className="text-sm text-yellow-500 font-medium">
            Proposal pending client review
          </span>
        </div>
      </Card>
    );
  }

  return null;
}
