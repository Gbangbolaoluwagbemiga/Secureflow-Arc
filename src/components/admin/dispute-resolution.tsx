import { useState, useEffect } from "react";
import { useWriteContract } from "wagmi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";
import { CONTRACTS } from "@/lib/web3/config";
import { useNotifications } from "@/contexts/notification-context";
import { AlertTriangle, Clock, User, DollarSign, Scale, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatUnits } from "viem";

interface Dispute {
  escrowId: string;
  milestoneIndex: number;
  disputedBy: string;
  disputeReason: string;
  disputedAt: number;
  milestoneAmountWei: bigint;
  milestoneAmountEth: number;
  clientAddress: string;
  freelancerAddress: string;
  projectTitle: string;
  milestoneDescription: string;
}

interface DisputeResolutionProps {
  onDisputeResolved: () => void;
}

export function DisputeResolution({ onDisputeResolved }: DisputeResolutionProps) {
  const { wallet } = useWeb3();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const { addCrossWalletNotification } = useNotifications();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [freelancerPct, setFreelancerPct] = useState(50);
  const [resolutionReason, setResolutionReason] = useState("");

  useEffect(() => {
    if (wallet.isConnected) void fetchDisputes();
  }, [wallet.isConnected]);

  const fetchDisputes = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const svc = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);
      const nextId = await svc.getNextEscrowId();
      const found: Dispute[] = [];

      for (let id = 1; id < nextId; id++) {
        try {
          const escrow = await svc.getEscrow(id);
          if (!escrow || escrow.status !== 4 /* Disputed */) continue;
          const milestones: any[] = await svc.getMilestones(id) as any[];
          milestones.forEach((m, idx) => {
            if (Number(m.status) === 4 /* MilestoneStatus.Disputed */) {
              const amtWei = BigInt(m.amount ?? 0);
              found.push({
                escrowId: id.toString(),
                milestoneIndex: idx,
                disputedBy: m.disputedBy ?? "",
                disputeReason: m.disputeReason ?? "",
                disputedAt: Number(m.disputedAt ?? 0),
                milestoneAmountWei: amtWei,
                milestoneAmountEth: Number(formatUnits(amtWei, 18)),
                clientAddress: escrow.depositor,
                freelancerAddress: escrow.beneficiary,
                projectTitle: escrow.projectTitle || `Project #${id}`,
                milestoneDescription: m.description ?? "",
              });
            }
          });
        } catch {
          /* skip non-existent escrows */
        }
      }
      setDisputes(found);
    } catch {
      toast({ title: "Error", description: "Failed to fetch disputes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setFreelancerPct(50);
    setResolutionReason("");
    setDialogOpen(true);
  };

  const resolveDispute = async () => {
    if (!selectedDispute) return;
    setIsResolving(true);
    try {
      const { ContractService } = await import("@/lib/web3/contract-service");
      const svc = new ContractService(CONTRACTS.SECUREFLOW_ESCROW);
      const total = selectedDispute.milestoneAmountWei;
      const freelancerAmount = (total * BigInt(freelancerPct)) / 100n;

      await svc.arbiterAwardFreelancer(
        { escrow_id: Number(selectedDispute.escrowId), arbiter: wallet.address || "", freelancer_amount: freelancerAmount },
        writeContractAsync
      );

      toast({ title: "Dispute Resolved", description: "Resolution recorded on-chain." });
      addCrossWalletNotification(
        {
          type: "dispute",
          title: "Dispute Resolved by Arbiter",
          message: `Dispute #${selectedDispute.escrowId} resolved. Reason: ${resolutionReason || "No reason provided"}`,
          actionUrl: `/dashboard?escrow=${selectedDispute.escrowId}`,
          data: { escrowId: selectedDispute.escrowId },
        },
        selectedDispute.clientAddress,
        selectedDispute.freelancerAddress
      );

      setDialogOpen(false);
      setSelectedDispute(null);
      await fetchDisputes(false);
      onDisputeResolved();
    } catch (err: any) {
      toast({ title: "Resolution Failed", description: err.message || "Transaction failed", variant: "destructive" });
    } finally {
      setIsResolving(false);
    }
  };

  const getDisputeAge = (ts: number) => {
    const secs = Math.floor(Date.now() / 1000) - ts;
    const days = Math.floor(secs / 86400);
    const hrs = Math.floor(secs / 3600);
    if (days > 0) return `${days}d ago`;
    if (hrs > 0) return `${hrs}h ago`;
    return "Just now";
  };

  const freelancerEth = selectedDispute ? (selectedDispute.milestoneAmountEth * freelancerPct) / 100 : 0;
  const clientEth = selectedDispute ? selectedDispute.milestoneAmountEth - freelancerEth : 0;

  if (loading) {
    return (
      <Card className="glass border-primary/20 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <span className="ml-3">Loading disputes…</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass border-primary/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Scale className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Dispute Resolution</h2>
          <Badge variant="outline" className="ml-auto">{disputes.length} Active</Badge>
          <Button onClick={() => void fetchDisputes(false)} variant="outline" size="sm">Refresh</Button>
        </div>

        {disputes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg">No active disputes</p>
            <p className="text-sm">All escrows are running smoothly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d, i) => (
              <motion.div
                key={`${d.escrowId}-${d.milestoneIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="border-red-200 bg-red-100/80 dark:bg-red-900/20 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="font-semibold text-red-700 dark:text-red-400">Dispute #{d.escrowId}</span>
                        <Badge variant="destructive">Milestone {d.milestoneIndex}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{d.projectTitle}</p>
                      <p className="text-sm mb-1"><strong>Reason:</strong> {d.disputeReason}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />Client: {d.clientAddress.slice(0, 6)}…{d.clientAddress.slice(-4)}</span>
                        <span className="flex items-center gap-1"><User className="h-3 w-3" />Freelancer: {d.freelancerAddress.slice(0, 6)}…{d.freelancerAddress.slice(-4)}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{d.milestoneAmountEth.toFixed(6)} USDC</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{getDisputeAge(d.disputedAt)}</span>
                      </div>
                    </div>
                    <Button onClick={() => openDialog(d)} className="ml-4 shrink-0">Resolve</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Dispute</DialogTitle>
            <DialogDescription>Set the fund split between client and freelancer.</DialogDescription>
          </DialogHeader>

          {selectedDispute && (
            <div className="space-y-5">
              <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-1">
                <p><strong>Project:</strong> {selectedDispute.projectTitle}</p>
                <p><strong>Milestone:</strong> {selectedDispute.milestoneDescription}</p>
                <p><strong>Dispute Reason:</strong> {selectedDispute.disputeReason}</p>
                <p><strong>Total at stake:</strong> {selectedDispute.milestoneAmountEth.toFixed(6)} USDC</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Client gets: {clientEth.toFixed(6)} USDC</span>
                  <span>Freelancer gets: {freelancerEth.toFixed(6)} USDC</span>
                </div>
                <Slider value={[freelancerPct]} onValueChange={([v]) => setFreelancerPct(v)} min={0} max={100} step={1} />
                <p className="text-xs text-muted-foreground text-center">Freelancer's share: {freelancerPct}%</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFreelancerPct(0)}>All to Client</Button>
                  <Button variant="outline" size="sm" onClick={() => setFreelancerPct(50)}>50 / 50</Button>
                  <Button variant="outline" size="sm" onClick={() => setFreelancerPct(100)}>All to Freelancer</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resolution Reason (optional)</Label>
                <Input value={resolutionReason} onChange={(e) => setResolutionReason(e.target.value)} placeholder="Explain your decision…" />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void resolveDispute()} disabled={isResolving} className="bg-green-600 hover:bg-green-700">
              {isResolving ? "Resolving…" : "Resolve Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
