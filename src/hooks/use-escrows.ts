import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWriteContract, useReadContract } from "wagmi";
import { contractService } from "@/lib/web3/contract-service";
import { CONTRACTS } from "@/lib/web3/config";
import SecureFlowABI from "../../contracts/solidity/out/SecureFlow.sol/SecureFlow.json";
import useWalletStore from "@/store/wallet.store";
import { toast } from "@/hooks/use-toast";
import { erc20Abi } from "@/lib/web3/abis";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

function contractAddr() {
  const addr = CONTRACTS.SECUREFLOW_ESCROW;
  if (!addr) throw new Error("VITE_SECUREFLOW_CONTRACT_ADDRESS is not set");
  return addr as `0x${string}`;
}

export function useEscrow(escrowId: number | null) {
  return useQuery({
    queryKey: ["escrow", escrowId],
    queryFn: () => {
      if (!escrowId) throw new Error("Escrow ID is required");
      return contractService.getEscrow(escrowId);
    },
    enabled: !!escrowId,
    staleTime: 30_000,
  });
}

export function useUserEscrows() {
  const { address } = useWalletStore();
  return useQuery({
    queryKey: ["user-escrows", address],
    queryFn: () => {
      if (!address) throw new Error("Wallet not connected");
      return contractService.getUserEscrows(address);
    },
    enabled: !!address,
    staleTime: 30_000,
  });
}

export function useEscrows(escrowIds: number[]) {
  return useQuery({
    queryKey: ["escrows", escrowIds],
    queryFn: async () => {
      const results = await Promise.all(escrowIds.map((id) => contractService.getEscrow(id)));
      return results.filter(Boolean);
    },
    enabled: escrowIds.length > 0,
    staleTime: 30_000,
  });
}

export function useCreateEscrow() {
  const queryClient = useQueryClient();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: {
      depositor: string;
      beneficiary?: string;
      arbiters: string[];
      required_confirmations: number;
      milestones: Array<[string, string]>; // [amount_wei, description]
      token?: string;
      total_amount: string;  // in wei
      duration: number;      // in seconds
      project_title: string;
      project_description: string;
    }) => {
      if (!params.depositor) throw new Error("Wallet not connected");

      const totalAmount = BigInt(params.total_amount);
      const durationDays = BigInt(Math.max(1, Math.round(params.duration / 86400)));
      const token = (params.token || ZERO_ADDRESS) as `0x${string}`;
      const beneficiary = (params.beneficiary || ZERO_ADDRESS) as `0x${string}`;
      const arbiters = (params.arbiters || []) as `0x${string}`[];
      const requiredConfirmations = BigInt(params.required_confirmations || 1);
      const milestoneAmounts = params.milestones.map(([amt]) => BigInt(amt));
      const milestoneDescriptions = params.milestones.map(([, desc]) => desc);

      // Get exact deposit amount (totalAmount + platformFee) from contract
      const { deposit } = await contractService.quoteDeposit(totalAmount);

      const isNativeEth = token === ZERO_ADDRESS;

      // For ERC-20 tokens (e.g. USDC): check allowance and approve if needed
      if (!isNativeEth) {
        const escrowAddr = contractAddr();
        // Read current allowance
        const { createPublicClient, http } = await import("viem");
        const { arcTestnet } = await import("@/providers/WalletProvider");
        const publicClient = createPublicClient({ chain: arcTestnet, transport: http() });
        const allowance = await publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [params.depositor as `0x${string}`, escrowAddr],
        }) as bigint;

        if (allowance < deposit) {
          toast({ title: "Approving USDC…", description: "Please confirm the approval in your wallet." });
          await writeContractAsync({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [escrowAddr, deposit],
          });
          toast({ title: "USDC approved", description: "Now creating escrow…" });
        }
      }

      const hash = await writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "createEscrow",
        args: [
          beneficiary,
          token,
          totalAmount,
          durationDays,
          arbiters,
          requiredConfirmations,
          milestoneAmounts,
          milestoneDescriptions,
          params.project_title,
          params.project_description,
        ],
        value: isNativeEth ? deposit : 0n,
      });

      return hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      queryClient.invalidateQueries({ queryKey: ["escrows"] });
      toast({ title: "Escrow created", description: "Your escrow was created successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create escrow", variant: "destructive" });
    },
  });
}

export function useStartWork() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (escrowId: number) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "startWork",
        args: [BigInt(escrowId)],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Work started", description: "You have accepted this contract." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to start work", variant: "destructive" });
    },
  });
}

export function useSubmitMilestone() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; milestone_index: number; description: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "submitMilestone",
        args: [BigInt(params.escrow_id), BigInt(params.milestone_index), params.description],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Milestone submitted", description: "Awaiting client review." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to submit milestone", variant: "destructive" });
    },
  });
}

export function useApproveMilestone() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; milestone_index: number }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "approveMilestone",
        args: [BigInt(params.escrow_id), BigInt(params.milestone_index)],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Milestone approved", description: "Payment released to freelancer." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to approve milestone", variant: "destructive" });
    },
  });
}

export function useRejectMilestone() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; milestone_index: number; reason: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "rejectMilestone",
        args: [BigInt(params.escrow_id), BigInt(params.milestone_index), params.reason],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Milestone rejected", description: "Freelancer has been notified." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to reject milestone", variant: "destructive" });
    },
  });
}

export function useDisputeMilestone() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; milestone_index: number; reason: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "disputeMilestone",
        args: [BigInt(params.escrow_id), BigInt(params.milestone_index), params.reason],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Dispute raised", description: "An arbiter will review this dispute." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to raise dispute", variant: "destructive" });
    },
  });
}

export function useEmergencyRefund() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (escrowId: number) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "emergencyRefundAfterDeadline",
        args: [BigInt(escrowId)],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Refund executed", description: "Funds have been returned to your wallet." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to execute refund", variant: "destructive" });
    },
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; cover_letter: string; proposed_timeline: number }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "applyToJob",
        args: [BigInt(params.escrow_id), params.cover_letter, BigInt(params.proposed_timeline)],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      toast({ title: "Application submitted", description: "The client has been notified." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to apply to job", variant: "destructive" });
    },
  });
}

export function useAcceptFreelancer() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; freelancer: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "acceptFreelancer",
        args: [BigInt(params.escrow_id), params.freelancer as `0x${string}`],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Freelancer accepted", description: "The freelancer can now start work." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to accept freelancer", variant: "destructive" });
    },
  });
}

export function useSubmitEvidence() {
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; milestone_index: number; cid: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "submitEvidence",
        args: [BigInt(params.escrow_id), BigInt(params.milestone_index), params.cid],
      });
    },
    onSuccess: () => {
      toast({ title: "Evidence submitted", description: "Evidence has been recorded on-chain." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to submit evidence", variant: "destructive" });
    },
  });
}

export function useExtendDeadline() {
  const queryClient = useQueryClient();
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; extra_days: number }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "extendDeadline",
        args: [BigInt(params.escrow_id), BigInt(params.extra_days)],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow"] });
      queryClient.invalidateQueries({ queryKey: ["user-escrows"] });
      toast({ title: "Deadline extended", description: "The project deadline has been extended." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to extend deadline", variant: "destructive" });
    },
  });
}

export function useSubmitRating() {
  const { address } = useWalletStore();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (params: { escrow_id: number; score: number; review: string }) => {
      if (!address) throw new Error("Wallet not connected");
      return writeContractAsync({
        address: contractAddr(),
        abi: SecureFlowABI.abi,
        functionName: "submitRating",
        args: [BigInt(params.escrow_id), params.score, params.review],
      });
    },
    onSuccess: () => {
      toast({ title: "Rating submitted", description: "Your feedback has been recorded on-chain." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to submit rating", variant: "destructive" });
    },
  });
}

// Alias for backwards compatibility
export const useRefundEscrow = useEmergencyRefund;
