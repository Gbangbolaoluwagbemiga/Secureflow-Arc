import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWeb3 } from "@/contexts/web3-context";
import { useToast } from "@/hooks/use-toast";
import { contractService } from "@/lib/web3/contract-service";
import { useWriteContract } from "wagmi";
import { Shield, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArbiterManagement } from "@/components/admin/arbiter-management";

const USDC_ADDRESS = (
  (import.meta.env.VITE_USDC_TOKEN_CONTRACT as string | undefined) ?? ""
).trim();

export default function AdminPage() {
  const { wallet } = useWeb3();
  const { toast } = useToast();
  const { writeContractAsync } = useWriteContract();
  const navigate = useNavigate();
  const [isOwner, setIsOwner] = useState(false);
  const [isCheckingOwner, setIsCheckingOwner] = useState(true);
  const [tokenAddress, setTokenAddress] = useState(USDC_ADDRESS);
  const [isWhitelisting, setIsWhitelisting] = useState(false);

  useEffect(() => {
    checkOwnership();
  }, [wallet.address]);

  const checkOwnership = async () => {
    if (!wallet.address) {
      setIsOwner(false);
      setIsCheckingOwner(false);
      return;
    }

    setIsCheckingOwner(true);
    try {
      const owner = await contractService.getOwner();
      
      if (!owner) {
        toast({
          title: "Connection Issue",
          description: "Failed to verify admin access. Retrying...",
          variant: "destructive",
        });
        
        // Retry after 2 seconds
        setTimeout(() => {
          checkOwnership();
        }, 2000);
        return;
      }
      
      setIsOwner(owner?.toLowerCase() === wallet.address.toLowerCase());
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to blockchain. Please refresh the page.",
        variant: "destructive",
      });
      setIsOwner(false);
    } finally {
      setIsCheckingOwner(false);
    }
  };

  const handleWhitelistToken = async () => {
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      toast({
        title: "Invalid address",
        description: "Please enter a valid EVM address (0x...)",
        variant: "destructive",
      });
      return;
    }

    setIsWhitelisting(true);
    try {
      const hash = await contractService.whitelistToken(
        tokenAddress,
        (args) => writeContractAsync(args)
      );

      toast({
        title: "Token whitelisted!",
        description: `Transaction hash: ${hash.slice(0, 10)}...`,
      });

      setTokenAddress("");
    } catch (error: any) {
      toast({
        title: "Failed to whitelist token",
        description: error?.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsWhitelisting(false);
    }
  };

  const handleQuickWhitelistUSDC = async () => {
    if (!USDC_ADDRESS) {
      toast({
        title: "USDC not configured",
        description: "Set VITE_USDC_TOKEN_CONTRACT in your .env file",
        variant: "destructive",
      });
      return;
    }

    setIsWhitelisting(true);
    try {
      const hash = await contractService.whitelistToken(
        USDC_ADDRESS,
        (args) => writeContractAsync(args)
      );

      toast({
        title: "USDC whitelisted!",
        description: `Users can now create escrows with USDC. Tx: ${hash.slice(0, 10)}...`,
      });
    } catch (error: any) {
      const message = error?.message || "Something went wrong";
      
      // Check if already whitelisted
      if (message.includes("already whitelisted") || message.includes("AlreadyWhitelisted")) {
        toast({
          title: "USDC already whitelisted",
          description: "This token is already available for escrows",
        });
      } else {
        toast({
          title: "Failed to whitelist USDC",
          description: message,
          variant: "destructive",
        });
      }
    } finally {
      setIsWhitelisting(false);
    }
  };

  if (!wallet.isConnected) {
    return (
      <div className="min-h-screen py-12 gradient-mesh">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Admin Panel
              </CardTitle>
              <CardDescription>Manage SecureFlow contract settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Wallet not connected</AlertTitle>
                <AlertDescription>
                  Please connect your wallet to access the admin panel.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isCheckingOwner) {
    return (
      <div className="min-h-screen py-12 gradient-mesh flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen py-12 gradient-mesh">
        <div className="container mx-auto px-4 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Admin Panel
              </CardTitle>
              <CardDescription>Manage SecureFlow contract settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                  You are not the contract owner. Only the owner can access this panel.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Troubleshooting:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Make sure you're connected with the owner wallet</li>
                  <li>Check if the RPC connection is working</li>
                  <li>Try refreshing the page</li>
                </ul>
                <Button 
                  onClick={() => {
                    setIsCheckingOwner(true);
                    checkOwnership();
                  }} 
                  variant="outline" 
                  className="w-full mt-3"
                  disabled={isCheckingOwner}
                >
                  {isCheckingOwner ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    "Retry Access Check"
                  )}
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Your Address:</strong> <code className="bg-muted px-1 py-0.5 rounded">{wallet.address}</code></p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 gradient-mesh">
      <div className="container mx-auto px-4 max-w-4xl space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage SecureFlow contract settings and configurations
          </p>
        </div>

        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Owner Access Confirmed</AlertTitle>
          <AlertDescription>
            You are connected as the contract owner and can manage settings.
          </AlertDescription>
        </Alert>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold">Whitelist USDC Token</h3>
                <p className="text-sm text-muted-foreground">
                  Enable USDC ({USDC_ADDRESS.slice(0, 10)}...) for escrow payments
                </p>
              </div>
              <Button
                onClick={handleQuickWhitelistUSDC}
                disabled={isWhitelisting || !USDC_ADDRESS}
              >
                {isWhitelisting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Whitelisting...
                  </>
                ) : (
                  "Whitelist USDC"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Token Management */}
        <Card>
          <CardHeader>
            <CardTitle>Token Management</CardTitle>
            <CardDescription>
              Whitelist ERC-20 tokens for use in escrow payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Contract Address</Label>
              <Input
                id="tokenAddress"
                placeholder="0x..."
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Enter the ERC-20 token contract address to whitelist
              </p>
            </div>

            <Button
              onClick={handleWhitelistToken}
              disabled={isWhitelisting || !tokenAddress}
              className="w-full"
            >
              {isWhitelisting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Whitelisting Token...
                </>
              ) : (
                "Whitelist Token"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Arbiter Management */}
        <ArbiterManagement onArbiterAdded={() => {
          toast({
            title: "Arbiter authorized",
            description: "The arbiter has been successfully authorized",
          });
        }} onArbiterRemoved={() => {
          toast({
            title: "Arbiter removed",
            description: "The arbiter has been successfully removed",
          });
        }} />

        {/* Dispute Management - Navigate to Separate Page */}
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-600" />
              Dispute Management
            </CardTitle>
            <CardDescription>
              View and resolve disputes on a dedicated page for better performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/disputes')} 
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="lg"
            >
              Open Dispute Management Page
            </Button>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Manage active disputes, review evidence, and communicate with parties
            </p>
          </CardContent>
        </Card>

        {/* Information */}
        <Card>
          <CardHeader>
            <CardTitle>Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Contract Address:</span>
              <span className="font-mono">
                {import.meta.env.VITE_SECUREFLOW_CONTRACT_ADDRESS}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Address:</span>
              <span className="font-mono">{wallet.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span>Arc Testnet</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
