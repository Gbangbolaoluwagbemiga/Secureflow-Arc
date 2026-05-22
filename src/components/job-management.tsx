import { useState } from "react";
import { useWriteContract } from "wagmi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";
import { PlusCircle, MinusCircle, XCircle, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface JobManagementProps {
  escrowId: string;
  isOpenJob: boolean;
  isClient: boolean;
  totalAmount: string;
  token: string;
  onUpdate?: () => void;
}

export function JobManagement({
  escrowId,
  isOpenJob,
  isClient,
  totalAmount,
  token,
  onUpdate,
}: JobManagementProps) {
  const { writeContractAsync } = useWriteContract();
  const { toast } = useToast();
  const { wallet } = useWeb3();
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [additionalAmount, setAdditionalAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isNativeToken = token === "0x0000000000000000000000000000000000000000";
  // Arc Testnet USDC uses 6 decimals, not 18
  const currentAmount = parseFloat(totalAmount) / 1e6;

  // Only show for open jobs (no freelancer assigned yet)
  if (!isOpenJob || !isClient) {
    return null;
  }

  const handleAddFunds = async () => {
    if (!additionalAmount || parseFloat(additionalAmount) <= 0) {
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
        title: "Adding funds...",
        description: "Please confirm the transaction in your wallet",
      });

      await cs.addJobFunds(
        {
          escrow_id: Number(escrowId),
          additional_amount: additionalAmount,
          depositor: wallet.address || "",
        },
        writeContractAsync
      );

      toast({
        title: "Funds Added",
        description: `Successfully added ${additionalAmount} USDC to the job`,
      });

      setIsAddingFunds(false);
      setAdditionalAmount("");
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Failed to Add Funds",
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawFunds = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(withdrawAmount) > currentAmount) {
      toast({
        title: "Invalid Amount",
        description: "Cannot withdraw more than the current amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

      toast({
        title: "Withdrawing funds...",
        description: "Please confirm the transaction in your wallet",
      });

      await cs.withdrawJobFunds(
        {
          escrow_id: Number(escrowId),
          withdraw_amount: withdrawAmount,
          depositor: wallet.address || "",
        },
        writeContractAsync
      );

      toast({
        title: "Funds Withdrawn",
        description: `Successfully withdrew ${withdrawAmount} USDC from the job`,
      });

      setIsWithdrawing(false);
      setWithdrawAmount("");
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Failed to Withdraw Funds",
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelJob = async () => {
    setIsSubmitting(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const cs = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);

      toast({
        title: "Cancelling job...",
        description: "Please confirm the transaction in your wallet",
      });

      await cs.cancelJob(
        {
          escrow_id: Number(escrowId),
          depositor: wallet.address || "",
        },
        writeContractAsync
      );

      toast({
        title: "Job Cancelled",
        description: "Your funds have been refunded",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Failed to Cancel Job",
        description: error.message || "Transaction failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="glass border-primary/20 p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Job Management</h3>
        <span className="text-sm text-muted-foreground">
          Current Budget: {currentAmount.toFixed(4)} USDC
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Add Funds Dialog */}
        <Dialog open={isAddingFunds} onOpenChange={setIsAddingFunds}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Funds
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funds to Job</DialogTitle>
              <DialogDescription>
                Increase the budget for this job before assigning a freelancer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-amount">Additional Amount (USDC)</Label>
                <Input
                  id="add-amount"
                  type="number"
                  step="0.001"
                  placeholder="0.5"
                  value={additionalAmount}
                  onChange={(e) => setAdditionalAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  New total: {(currentAmount + parseFloat(additionalAmount || "0")).toFixed(4)}{" "}
                  USDC
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingFunds(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFunds} disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Funds"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Funds Dialog */}
        <Dialog open={isWithdrawing} onOpenChange={setIsWithdrawing}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <MinusCircle className="h-4 w-4" />
              Withdraw Funds
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Funds from Job</DialogTitle>
              <DialogDescription>
                Reduce the budget for this job before assigning a freelancer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount">Withdraw Amount (USDC)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.001"
                  placeholder="0.5"
                  max={currentAmount}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Remaining: {(currentAmount - parseFloat(withdrawAmount || "0")).toFixed(4)} USDC
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsWithdrawing(false)}>
                Cancel
              </Button>
              <Button onClick={handleWithdrawFunds} disabled={isSubmitting}>
                {isSubmitting ? "Withdrawing..." : "Withdraw Funds"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Job Alert Dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <XCircle className="h-4 w-4" />
              Cancel Job
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Cancel This Job?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the job and refund all your funds (including platform fees).
                This action cannot be undone. You can only cancel jobs that haven't been assigned
                to a freelancer yet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Job</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelJob}
                disabled={isSubmitting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isSubmitting ? "Cancelling..." : "Cancel Job"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        💡 You can only manage funds before assigning a freelancer to this job.
      </p>
    </Card>
  );
}
