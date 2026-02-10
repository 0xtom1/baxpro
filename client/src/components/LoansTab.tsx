import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Landmark, Clock, Percent, Coins, User, AlertCircle, Loader2 } from "lucide-react";
import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { formatLamports, formatDuration, formatBps, truncateAddress, isLoanStatus, getLoanStatusLabel, signAndSendTransaction } from "@/hooks/use-lending";
import type { SerializedLoan } from "@/hooks/use-lending";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface LoansTabProps {
  filterByBrand?: string;
}

export default function LoansTab({ filterByBrand }: LoansTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const LoanCard = ({ loan }: { loan: SerializedLoan }) => {
    const assets = getCollateralImages(loan.nftMints);
    const listed = isLoanStatus(loan.status, 'listed');
    const active = isLoanStatus(loan.status, 'active');
    const isMine = isMyLoan(loan);
    const totalRepayment = computeRepayment(loan);

    return (
      <Card
        className="overflow-visible p-4 flex flex-col gap-3"
        data-testid={`card-loan-${loan.publicKey}`}
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
          <Badge variant={listed ? "secondary" : active ? "default" : "outline"}>
            {getLoanStatusLabel(loan.status)}
          </Badge>
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
            <span className="text-muted-foreground">Duration</span>
          </div>
          <span className="text-right font-medium tabular-nums">{formatDuration(loan.durationSeconds)}</span>

          <div className="flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">Repayment</span>
          </div>
          <span className="text-right font-medium tabular-nums text-primary">{formatLamports(totalRepayment)} SOL</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="w-3 h-3 flex-shrink-0" />
          <span>Borrower: </span>
          {isMine ? (
            <span>You</span>
          ) : (() => {
            const displayName = walletNames?.[loan.borrower];
            const isRevealed = revealedAddresses.has(loan.borrower);
            if (displayName && !isRevealed) {
              return (
                <button
                  className="hover:text-foreground transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                  onClick={() => toggleReveal(loan.borrower)}
                  title="Click to show wallet address"
                  data-testid={`button-reveal-borrower-${loan.publicKey}`}
                >
                  {displayName}
                </button>
              );
            }
            if (displayName && isRevealed) {
              return (
                <button
                  className="hover:text-foreground transition-colors cursor-pointer font-mono"
                  onClick={() => toggleReveal(loan.borrower)}
                  title="Click to show display name"
                  data-testid={`button-reveal-borrower-${loan.publicKey}`}
                >
                  {truncateAddress(loan.borrower)}
                </button>
              );
            }
            return <span className="font-mono">{truncateAddress(loan.borrower)}</span>;
          })()}
        </div>

        <div className="flex gap-2 mt-1">
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
                  {(() => {
                    const lenderName = walletNames?.[loan.lender];
                    const isRevealed = revealedAddresses.has(loan.lender);
                    if (lenderName && !isRevealed) {
                      return (
                        <button
                          className="hover:text-foreground transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
                          onClick={() => toggleReveal(loan.lender)}
                          title="Click to show wallet address"
                          data-testid={`button-reveal-lender-${loan.publicKey}`}
                        >
                          {lenderName}
                        </button>
                      );
                    }
                    if (lenderName && isRevealed) {
                      return (
                        <button
                          className="hover:text-foreground transition-colors cursor-pointer font-mono"
                          onClick={() => toggleReveal(loan.lender)}
                          title="Click to show display name"
                          data-testid={`button-reveal-lender-${loan.publicKey}`}
                        >
                          {truncateAddress(loan.lender)}
                        </button>
                      );
                    }
                    return <span className="font-mono">{truncateAddress(loan.lender)}</span>;
                  })()}
                </>
              )}
            </p>
          )}
        </div>
      </Card>
    );
  };

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
      {sortedLoans.map(loan => (
        <LoanCard key={loan.publicKey} loan={loan} />
      ))}
    </div>
  );
}
