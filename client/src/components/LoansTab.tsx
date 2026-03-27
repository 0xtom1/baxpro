import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Landmark, AlertCircle, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { formatLamports, formatDuration, isLoanStatus, getLoanStatusLabel, signAndSendTransaction } from "@/hooks/use-lending";
import type { SerializedLoan } from "@/hooks/use-lending";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import LoanCard, { renderWalletAddress } from "@/components/LoanCard";
import { truncateAddress } from "@/hooks/use-lending";

interface LoansTabProps {
  filterByBrand?: string;
  returnPath?: string;
}

export default function LoansTab({ filterByBrand, returnPath }: LoansTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [fundingLoanId, setFundingLoanId] = useState<string | null>(null);

  const { data: loans, isLoading, error, refetch } = useQuery<SerializedLoan[]>({
    queryKey: ['solana-loans'],
    queryFn: async () => {
      const res = await fetch('/api/loans?status=listed');
      if (!res.ok) throw new Error('Failed to fetch loans');
      const listed: SerializedLoan[] = await res.json();
      const res2 = await fetch('/api/loans?status=active');
      if (!res2.ok) throw new Error('Failed to fetch loans');
      const active: SerializedLoan[] = await res2.json();
      return [...listed, ...active];
    },
    refetchInterval: 30000,
  });

  const [revealedAddresses, setRevealedAddresses] = useState<Set<string>>(new Set());
  const toggleReveal = useCallback((address: string) => {
    setRevealedAddresses(prev => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }, []);

  const allAddresses = loans ? Array.from(new Set(loans.flatMap(l => [l.borrower, l.lender].filter(Boolean)))) : [];
  const { data: walletNames } = useQuery<Record<string, string>>({
    queryKey: ['resolve-wallets', allAddresses.join(',')],
    queryFn: async () => {
      if (allAddresses.length === 0) return {};
      const res = await fetch(`/api/resolve-wallets?addresses=${allAddresses.join(',')}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: allAddresses.length > 0,
  });

  const allMints = loans?.flatMap(l => l.nftMints) || [];
  const { data: collateralAssets } = useQuery<Record<string, any>>({
    queryKey: ['collateral-assets', allMints.join(',')],
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

  const handleFundLoan = async (loan: SerializedLoan) => {
    if (!user?.phantomWallet) {
      toast({ title: "Wallet required", description: "Connect your Phantom wallet to fund loans", variant: "destructive" });
      return;
    }
    setFundingLoanId(loan.publicKey);
    try {
      const res = await apiRequest('POST', '/api/loans/build-fund', {
        borrower: loan.borrower,
        loanId: loan.loanId,
      });
      const { transaction } = await res.json();
      await signAndSendTransaction(transaction);
      toast({ title: "Loan funded", description: `You funded ${formatLamports(loan.loanAmount)} SOL` });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['solana-my-loans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/my-bottles'] });
    } catch (err: any) {
      toast({ title: "Transaction failed", description: err.message || "Failed to fund loan", variant: "destructive" });
    } finally {
      setFundingLoanId(null);
    }
  };

  const getCollateralImages = (mints: string[]) => {
    if (!collateralAssets) return [];
    return mints.map(mint => collateralAssets[mint]).filter(Boolean);
  };

  const filteredLoans = filterByBrand && collateralAssets
    ? (loans || []).filter(loan => {
        return loan.nftMints.some(mint => {
          const asset = collateralAssets[mint];
          return asset && asset.brandName?.toLowerCase() === filterByBrand.toLowerCase();
        });
      })
    : loans || [];

  const isMyLoan = (loan: SerializedLoan) => {
    return user?.phantomWallet && loan.borrower === user.phantomWallet;
  };

  const computeRepayment = (loan: SerializedLoan) => {
    const amount = parseInt(loan.loanAmount);
    const interest = Math.floor(amount * loan.interestRateBps / 10000);
    return amount + interest;
  };

  const sortedLoans = [...filteredLoans].sort((a, b) => {
    const timeA = parseInt(a.startTime) || parseInt(a.loanId);
    const timeB = parseInt(b.startTime) || parseInt(b.loanId);
    return timeB - timeA;
  });

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
        <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()} data-testid="button-retry-loans">
          Try Again
        </Button>
      </div>
    );
  }

  if (sortedLoans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Landmark className="w-12 h-12 mb-4 opacity-30" />
        <p className="font-medium text-foreground mb-1">No loan listings</p>
        <p className="text-sm">No bottles are currently listed as collateral for loans</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {sortedLoans.map(loan => {
        const assets = getCollateralImages(loan.nftMints);
        const listed = isLoanStatus(loan.status, 'listed');
        const active = isLoanStatus(loan.status, 'active');
        const isMine = isMyLoan(loan);

        return (
          <LoanCard
            key={loan.publicKey}
            loan={loan}
            assets={assets}
            walletNames={walletNames}
            revealedAddresses={revealedAddresses}
            onToggleReveal={toggleReveal}
            onClick={() => navigate(`/loan/${loan.publicKey}${returnPath ? `?from=${encodeURIComponent(returnPath)}` : ''}`)}
            totalRepayment={computeRepayment(loan)}
            testIdPrefix="loan"
            statusBadge={
              <Badge variant={listed ? "secondary" : active ? "default" : "outline"}>
                {getLoanStatusLabel(loan.status)}
              </Badge>
            }
            durationDisplay={{
              label: "Duration",
              value: formatDuration(loan.durationSeconds),
            }}
            actions={
              <>
                {listed && !isMine && (
                  <Button
                    className="flex-1"
                    onClick={() => handleFundLoan(loan)}
                    disabled={!user?.phantomWallet || fundingLoanId === loan.publicKey}
                    data-testid={`button-fund-loan-${loan.publicKey}`}
                  >
                    {fundingLoanId === loan.publicKey ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Funding...</>
                    ) : (
                      `Fund ${formatLamports(loan.loanAmount)} SOL`
                    )}
                  </Button>
                )}
                {listed && isMine && (
                  <p className="text-xs text-muted-foreground text-center w-full py-1">
                    Your listing &middot; Manage in My Loans tab
                  </p>
                )}
                {active && (
                  <p className="text-xs text-muted-foreground text-center w-full py-1">
                    Active loan &middot; {isMine ? 'Manage in My Loans tab' : (
                      <>
                        Funded by{' '}
                        {renderWalletAddress(
                          loan.lender,
                          walletNames,
                          revealedAddresses,
                          toggleReveal,
                          `button-reveal-lender-${loan.publicKey}`
                        )}
                      </>
                    )}
                  </p>
                )}
              </>
            }
          />
        );
      })}
    </div>
  );
}
