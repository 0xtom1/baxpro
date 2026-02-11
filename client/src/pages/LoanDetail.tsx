import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Coins, Percent, Clock, Landmark, User, AlertCircle, Loader2, Package } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import DashboardNav from "@/components/DashboardNav";
import GlencairnLogo from "@/components/GlencairnLogo";
import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  formatLamports, formatDuration, formatBps, truncateAddress,
  isLoanStatus, getLoanStatusLabel, signAndSendTransaction
} from "@/hooks/use-lending";
import type { SerializedLoan } from "@/hooks/use-lending";
import { useAuth } from "@/lib/auth";

function isLoanExpired(loan: SerializedLoan): boolean {
  if (!isLoanStatus(loan.status, 'active')) return false;
  const start = parseInt(loan.startTime);
  const dur = parseInt(loan.durationSeconds);
  return Date.now() / 1000 > start + dur;
}

function getTimeRemaining(loan: SerializedLoan): string {
  const start = parseInt(loan.startTime);
  const dur = parseInt(loan.durationSeconds);
  const end = start + dur;
  const now = Date.now() / 1000;
  if (now >= end) return 'Expired';
  const remaining = end - now;
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h remaining`;
  const mins = Math.floor((remaining % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m remaining` : `${mins}m remaining`;
}

export default function LoanDetail() {
  const { publicKey } = useParams<{ publicKey: string }>();
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  usePageTitle("Loan Detail");

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { data: allLoans, isLoading: loansLoading, error: loansError } = useQuery<SerializedLoan[]>({
    queryKey: ['solana-all-loans-detail'],
    queryFn: async () => {
      const [listedRes, activeRes, cancelledRes, repaidRes, liquidatedRes] = await Promise.all([
        fetch('/api/loans?status=listed'),
        fetch('/api/loans?status=active'),
        fetch('/api/loans?status=cancelled'),
        fetch('/api/loans?status=repaid'),
        fetch('/api/loans?status=liquidated'),
      ]);
      const results = await Promise.all([
        listedRes.ok ? listedRes.json() : [],
        activeRes.ok ? activeRes.json() : [],
        cancelledRes.ok ? cancelledRes.json() : [],
        repaidRes.ok ? repaidRes.json() : [],
        liquidatedRes.ok ? liquidatedRes.json() : [],
      ]);
      return results.flat();
    },
    enabled: !!user,
  });

  const loan = allLoans?.find(l => l.publicKey === publicKey);

  const allMints = loan?.nftMints || [];
  const { data: collateralAssets } = useQuery<Record<string, any>>({
    queryKey: ['collateral-assets-detail', allMints.join(',')],
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

  const borrowerAddr = loan?.borrower || '';
  const lenderAddr = loan?.lender || '';
  const addresses = [borrowerAddr, lenderAddr].filter(Boolean);
  const { data: walletNames } = useQuery<Record<string, string>>({
    queryKey: ['resolve-wallets-detail', addresses.join(',')],
    queryFn: async () => {
      if (addresses.length === 0) return {};
      const res = await fetch(`/api/resolve-wallets?addresses=${addresses.join(',')}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: addresses.length > 0,
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

  const renderAddress = (address: string, label: string) => {
    if (!address) return <span className="text-muted-foreground">-</span>;
    const isMe = user?.phantomWallet === address;
    if (isMe) return <span className="font-medium">You</span>;

    const displayName = walletNames?.[address];
    const isRevealed = revealedAddresses.has(address);

    if (displayName && !isRevealed) {
      return (
        <button
          className="hover:text-foreground transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
          onClick={() => toggleReveal(address)}
          title="Click to show wallet address"
          data-testid={`button-reveal-${label}`}
        >
          {displayName}
        </button>
      );
    }
    if (displayName && isRevealed) {
      return (
        <button
          className="hover:text-foreground transition-colors cursor-pointer font-mono"
          onClick={() => toggleReveal(address)}
          title="Click to show display name"
          data-testid={`button-reveal-${label}`}
        >
          {truncateAddress(address)}
        </button>
      );
    }
    return <span className="font-mono">{truncateAddress(address)}</span>;
  };

  const handleAction = async (action: string) => {
    if (!user?.phantomWallet || !loan) return;
    setActionLoading(action);
    try {
      let endpoint = '';
      let body: any = {};

      if (action === 'fund') {
        endpoint = '/api/loans/build-fund';
        body = { borrower: loan.borrower, loanId: loan.loanId };
      } else if (action === 'cancel') {
        endpoint = '/api/loans/build-cancel';
        body = { loanId: loan.loanId };
      } else if (action === 'repay') {
        endpoint = '/api/loans/build-repay';
        body = { loanId: loan.loanId };
      } else if (action === 'liquidate') {
        endpoint = '/api/loans/build-liquidate';
        body = { borrower: loan.borrower, loanId: loan.loanId };
      }

      const res = await apiRequest('POST', endpoint, body);
      const { transaction } = await res.json();
      await signAndSendTransaction(transaction);

      const labels: Record<string, string> = {
        fund: 'Loan funded',
        cancel: 'Loan cancelled',
        repay: 'Loan repaid',
        liquidate: 'Loan liquidated',
      };
      toast({ title: labels[action] || 'Success', description: `Transaction completed` });
      queryClient.invalidateQueries({ queryKey: ['solana-all-loans-detail'] });
      queryClient.invalidateQueries({ queryKey: ['solana-loans'] });
      queryClient.invalidateQueries({ queryKey: ['solana-my-loans'] });
    } catch (err: any) {
      toast({ title: "Transaction failed", description: err.message || "Failed to complete transaction", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  const assets = loan ? allMints.map(mint => collateralAssets?.[mint]).filter(Boolean) : [];
  const totalMarketValue = assets.reduce((sum: number, a: any) => sum + (a.marketPrice || a.price || 0), 0);

  const listed = loan ? isLoanStatus(loan.status, 'listed') : false;
  const active = loan ? isLoanStatus(loan.status, 'active') : false;
  const isBorrower = user?.phantomWallet && loan?.borrower === user.phantomWallet;
  const isLender = user?.phantomWallet && loan?.lender === user.phantomWallet;
  const expired = loan ? isLoanExpired(loan) : false;
  const totalRepayment = loan ? (() => {
    const amount = parseInt(loan.loanAmount);
    const interest = Math.floor(amount * loan.interestRateBps / 10000);
    return amount + interest;
  })() : 0;

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6" data-testid="button-back-to-dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {loansLoading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-48" />
          </div>
        ) : loansError ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-foreground font-medium mb-1">Failed to load loan</p>
            <p className="text-sm text-muted-foreground">Could not connect to Solana network. Please try again.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4" data-testid="button-return-dashboard">
                Return to Dashboard
              </Button>
            </Link>
          </Card>
        ) : !loan ? (
          <Card className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-foreground font-medium mb-1">Loan not found</p>
            <p className="text-sm text-muted-foreground">This loan may have been removed or the address is invalid.</p>
            <Link href="/dashboard">
              <Button variant="outline" className="mt-4" data-testid="button-return-dashboard">
                Return to Dashboard
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-foreground">Loan Details</h1>
                <Badge variant={listed ? "secondary" : active ? "default" : "outline"}>
                  {getLoanStatusLabel(loan.status)}
                </Badge>
              </div>
              {active && (
                <Badge variant={expired ? "destructive" : "secondary"} data-testid="badge-time-remaining">
                  <Clock className="w-3 h-3 mr-1" />
                  {getTimeRemaining(loan)}
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-5">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Loan Terms</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Coins className="w-4 h-4 flex-shrink-0" />
                      <span>Loan Amount</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatLamports(loan.loanAmount)} SOL</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Percent className="w-4 h-4 flex-shrink-0" />
                      <span>Interest Rate</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatBps(loan.interestRateBps)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      <span>Duration</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatDuration(loan.durationSeconds)}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Landmark className="w-4 h-4 flex-shrink-0" />
                      <span>Total Repayment</span>
                    </div>
                    <span className="font-medium tabular-nums text-primary">{formatLamports(totalRepayment)} SOL</span>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Participants</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 flex-shrink-0" />
                      <span>Borrower</span>
                    </div>
                    <span className="text-sm">
                      {renderAddress(loan.borrower, 'borrower')}
                    </span>
                  </div>
                  {(active || isLoanStatus(loan.status, 'repaid') || isLoanStatus(loan.status, 'liquidated')) && loan.lender && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="w-4 h-4 flex-shrink-0" />
                        <span>Lender</span>
                      </div>
                      <span className="text-sm">
                        {renderAddress(loan.lender, 'lender')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-border mt-4 pt-4">
                  <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Collateral Summary</h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">Bottles</span>
                      <span className="font-medium">{loan.collateralCount}</span>
                    </div>
                    {totalMarketValue > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Total Market Value</span>
                        <span className="font-medium text-primary">${totalMarketValue.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex gap-3 flex-wrap">
              {listed && !isBorrower && (
                <Button
                  onClick={() => handleAction('fund')}
                  disabled={!user?.phantomWallet || actionLoading === 'fund'}
                  data-testid="button-fund-loan"
                >
                  {actionLoading === 'fund' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Funding...</>
                  ) : (
                    `Fund ${formatLamports(loan.loanAmount)} SOL`
                  )}
                </Button>
              )}
              {listed && isBorrower && (
                <Button
                  variant="outline"
                  onClick={() => handleAction('cancel')}
                  disabled={actionLoading === 'cancel'}
                  data-testid="button-cancel-loan"
                >
                  {actionLoading === 'cancel' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</>
                  ) : (
                    'Cancel Loan'
                  )}
                </Button>
              )}
              {active && isBorrower && (
                <Button
                  onClick={() => handleAction('repay')}
                  disabled={actionLoading === 'repay'}
                  data-testid="button-repay-loan"
                >
                  {actionLoading === 'repay' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Repaying...</>
                  ) : (
                    `Repay ${formatLamports(totalRepayment)} SOL`
                  )}
                </Button>
              )}
              {active && isLender && expired && (
                <Button
                  variant="destructive"
                  onClick={() => handleAction('liquidate')}
                  disabled={actionLoading === 'liquidate'}
                  data-testid="button-liquidate-loan"
                >
                  {actionLoading === 'liquidate' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Liquidating...</>
                  ) : (
                    'Liquidate Loan'
                  )}
                </Button>
              )}
            </div>

            <div>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Collateral Bottles</h2>
              {assets.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {assets.map((asset: any) => (
                    <Link key={asset.assetIdx} href={`/asset/${asset.assetIdx}`}>
                      <Card
                        className="overflow-hidden hover-elevate cursor-pointer transition-all"
                        data-testid={`card-collateral-${asset.assetIdx}`}
                      >
                        <div className="aspect-square bg-muted relative">
                          {asset.imageUrl ? (
                            <img
                              src={asset.imageUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <GlencairnLogo className="w-16 h-16 text-muted-foreground/30" />
                            </div>
                          )}
                          {asset.isListed && (
                            <div className="absolute top-2 right-2">
                              <span className="bg-green-500/90 text-white text-xs px-2 py-0.5 rounded-full">
                                Listed
                              </span>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <p className="font-medium text-sm text-foreground truncate" title={asset.name}>
                            {asset.name}
                          </p>
                          {asset.producer && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {asset.producer}
                            </p>
                          )}
                          <div className="flex items-center justify-between gap-1 flex-wrap mt-2">
                            {asset.price ? (
                              <span className="text-sm font-medium text-primary">
                                ${asset.price.toLocaleString()}
                              </span>
                            ) : asset.marketPrice ? (
                              <span className="text-xs text-muted-foreground">
                                ~${asset.marketPrice.toLocaleString()}
                              </span>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : allMints.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {allMints.map((mint, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="aspect-square bg-muted flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm text-foreground truncate font-mono" title={mint}>
                          {truncateAddress(mint)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">On-chain asset</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground">No collateral information available</p>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}