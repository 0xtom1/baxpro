import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Landmark, Clock, Percent, Coins, AlertCircle, Loader2, Wallet, Gavel } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { formatLamports, formatDuration, formatBps, signAndSendTransaction, isLoanStatus, getLoanStatusLabel } from "@/hooks/use-lending";
import type { SerializedLoan } from "@/hooks/use-lending";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

function isLoanExpired(loan: SerializedLoan): boolean {
  const startTime = parseInt(loan.startTime);
  const duration = parseInt(loan.durationSeconds);
  if (startTime === 0 || duration === 0) return false;
  const expiryTime = (startTime + duration) * 1000;
  return Date.now() > expiryTime;
}

function getTimeRemaining(loan: SerializedLoan): string {
  const startTime = parseInt(loan.startTime);
  const duration = parseInt(loan.durationSeconds);
  if (startTime === 0 || duration === 0) return "";
  const expiryMs = (startTime + duration) * 1000;
  const remaining = expiryMs - Date.now();
  if (remaining <= 0) return "Expired";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h left`;
  }
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

export default function MyLoansTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cancellingLoanId, setCancellingLoanId] = useState<string | null>(null);
  const [repayingLoanId, setRepayingLoanId] = useState<string | null>(null);
  const [liquidatingLoanId, setLiquidatingLoanId] = useState<string | null>(null);

  const { data: myLoans, isLoading, error, refetch } = useQuery<SerializedLoan[]>({
    queryKey: ['solana-my-loans', user?.phantomWallet],
    queryFn: async () => {
      const res = await fetch('/api/loans/my');
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.phantomWallet,
    refetchInterval: 30000,
  });

  const allMints = myLoans?.flatMap(l => l.nftMints) || [];
  const { data: collateralAssets } = useQuery<Record<string, any>>({
    queryKey: ['collateral-assets-my', allMints.join(',')],
    queryFn: async () => {
      if (allMints.length === 0) return {};
      try {
        const res = await fetch(`/api/assets-by-mints?mints=${allMints.join(',')}`);
        if (!res.ok) return {};
        return await res.json();
      } catch {
        return {};
      }
    },
    enabled: allMints.length > 0,
  });

  const handleCancelLoan = async (loan: SerializedLoan) => {
    if (!user?.phantomWallet) return;
    setCancellingLoanId(loan.publicKey);
    try {
      const res = await apiRequest('POST', '/api/loans/build-cancel', { loanId: loan.loanId });
      const { transaction } = await res.json();
      await signAndSendTransaction(transaction);
      toast({ title: "Listing cancelled", description: "Your loan listing has been cancelled and collateral returned" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['solana-loans'] });
    } catch (err: any) {
      toast({ title: "Transaction failed", description: err.message || "Failed to cancel listing", variant: "destructive" });
    } finally {
      setCancellingLoanId(null);
    }
  };

  const handleRepayLoan = async (loan: SerializedLoan) => {
    if (!user?.phantomWallet) return;
    setRepayingLoanId(loan.publicKey);
    try {
      const res = await apiRequest('POST', '/api/loans/build-repay', { loanId: loan.loanId });
      const { transaction } = await res.json();
      await signAndSendTransaction(transaction);
      toast({ title: "Loan repaid", description: "Your loan has been repaid and collateral returned" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['solana-loans'] });
    } catch (err: any) {
      toast({ title: "Transaction failed", description: err.message || "Failed to repay loan", variant: "destructive" });
    } finally {
      setRepayingLoanId(null);
    }
  };

  const handleLiquidateLoan = async (loan: SerializedLoan) => {
    if (!user?.phantomWallet) return;
    setLiquidatingLoanId(loan.publicKey);
    try {
      const res = await apiRequest('POST', '/api/loans/build-liquidate', { loanId: loan.loanId, borrower: loan.borrower });
      const { transaction } = await res.json();
      await signAndSendTransaction(transaction);
      toast({ title: "Loan liquidated", description: "The collateral has been transferred to your wallet" });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['solana-loans'] });
    } catch (err: any) {
      toast({ title: "Transaction failed", description: err.message || "Failed to liquidate loan", variant: "destructive" });
    } finally {
      setLiquidatingLoanId(null);
    }
  };

  const getCollateralImages = (mints: string[]) => {
    if (!collateralAssets) return [];
    return mints.map(mint => collateralAssets[mint]).filter(Boolean);
  };

  const computeRepayment = (loan: SerializedLoan) => {
    const amount = parseInt(loan.loanAmount);
    const interest = Math.floor(amount * loan.interestRateBps / 10000);
    return amount + interest;
  };

  const getStatusVariant = (status: string): "secondary" | "default" | "outline" | "destructive" => {
    if (isLoanStatus(status, 'listed')) return "secondary";
    if (isLoanStatus(status, 'active')) return "default";
    if (isLoanStatus(status, 'repaid')) return "outline";
    if (isLoanStatus(status, 'liquidated')) return "destructive";
    if (isLoanStatus(status, 'cancelled')) return "outline";
    return "outline";
  };

  if (!user?.phantomWallet) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Wallet className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-foreground mb-2">No wallet connected</p>
        <p className="text-sm text-center">
          Connect your Phantom wallet or add a wallet address in{" "}
          <Link href="/account-settings" className="text-primary hover:underline">
            Account Settings
          </Link>{" "}
          to view your loans.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-10 h-10 rounded-md" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-9 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-foreground mb-1">Failed to load loans</p>
        <p className="text-sm">Could not connect to Solana network</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()} data-testid="button-retry-my-loans">
          Try Again
        </Button>
      </div>
    );
  }

  if (!myLoans || myLoans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Landmark className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-foreground mb-1">No loans yet</p>
        <p className="text-sm mb-4">You haven't created any loans. Use your bottles as collateral to borrow SOL.</p>
        <Link href="/create-loan">
          <Button data-testid="button-create-first-loan">
            <Landmark className="w-4 h-4 mr-2" />
            Create Loan
          </Button>
        </Link>
      </div>
    );
  }

  const wallet = user.phantomWallet;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {myLoans.map((loan) => {
        const assets = getCollateralImages(loan.nftMints);
        const listed = isLoanStatus(loan.status, 'listed');
        const active = isLoanStatus(loan.status, 'active');
        const totalRepayment = computeRepayment(loan);
        const isBorrower = loan.borrower === wallet;
        const isLender = loan.lender === wallet;
        const expired = isLoanExpired(loan);
        const timeLeft = active ? getTimeRemaining(loan) : '';

        return (
          <Card
            key={loan.publicKey}
            className="overflow-visible p-4 flex flex-col gap-3"
            data-testid={`card-my-loan-${loan.publicKey}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex -space-x-2">
                  {assets.length > 0 ? (
                    assets.slice(0, 3).map((asset: any, i: number) => (
                      <div key={i} className="w-10 h-10 rounded-md border-2 border-background overflow-hidden bg-muted flex-shrink-0">
                        {asset.imageUrl ? (
                          <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                            {loan.collateralCount}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center text-muted-foreground text-xs flex-shrink-0">
                      {loan.collateralCount}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  {assets.length > 0 ? (
                    <p className="text-sm font-medium truncate">{assets[0].name}</p>
                  ) : (
                    <p className="text-sm font-medium truncate">{loan.collateralCount} bottle{loan.collateralCount > 1 ? 's' : ''}</p>
                  )}
                  {assets.length > 1 && (
                    <p className="text-xs text-muted-foreground">+{assets.length - 1} more</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={getStatusVariant(loan.status)}>
                  {getLoanStatusLabel(loan.status)}
                </Badge>
                {active && (
                  <Badge variant="secondary" className="text-[10px]">
                    {isBorrower ? "Borrower" : "Lender"}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Amount</span>
              </div>
              <span className="text-right font-medium tabular-nums">{formatLamports(loan.loanAmount)} SOL</span>

              <div className="flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Interest</span>
              </div>
              <span className="text-right font-medium tabular-nums">{formatBps(loan.interestRateBps)}</span>

              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">{active ? "Time Left" : "Duration"}</span>
              </div>
              <span className={`text-right font-medium tabular-nums ${active && expired ? 'text-destructive' : ''}`}>
                {active ? timeLeft : formatDuration(loan.durationSeconds)}
              </span>

              <div className="flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Repayment</span>
              </div>
              <span className="text-right font-medium tabular-nums text-primary">{formatLamports(totalRepayment)} SOL</span>
            </div>

            <div className="flex gap-2 mt-1">
              {listed && isBorrower && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleCancelLoan(loan)}
                  disabled={cancellingLoanId === loan.publicKey}
                  data-testid={`button-cancel-my-loan-${loan.publicKey}`}
                >
                  {cancellingLoanId === loan.publicKey ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</>
                  ) : (
                    'Cancel Listing'
                  )}
                </Button>
              )}
              {active && isBorrower && !expired && (
                <Button
                  className="flex-1"
                  onClick={() => handleRepayLoan(loan)}
                  disabled={repayingLoanId === loan.publicKey}
                  data-testid={`button-repay-my-loan-${loan.publicKey}`}
                >
                  {repayingLoanId === loan.publicKey ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repaying...</>
                  ) : (
                    `Repay ${formatLamports(totalRepayment)} SOL`
                  )}
                </Button>
              )}
              {active && isLender && expired && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleLiquidateLoan(loan)}
                  disabled={liquidatingLoanId === loan.publicKey}
                  data-testid={`button-liquidate-my-loan-${loan.publicKey}`}
                >
                  {liquidatingLoanId === loan.publicKey ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Liquidating...</>
                  ) : (
                    <><Gavel className="w-4 h-4 mr-2" />Liquidate Collateral</>
                  )}
                </Button>
              )}
              {active && isLender && !expired && (
                <p className="text-xs text-muted-foreground text-center w-full py-1">
                  Awaiting borrower repayment &middot; {timeLeft}
                </p>
              )}
              {active && isBorrower && expired && (
                <p className="text-xs text-destructive text-center w-full py-1">
                  Loan expired &middot; Collateral may be liquidated by lender
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
