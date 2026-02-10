import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Check, Loader2, Package, Wallet, ShieldCheck, Coins, Clock, Percent, Landmark, CalendarClock } from "lucide-react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import { formatLamports, signAndSendTransaction, MAX_COLLATERAL } from "@/hooks/use-lending";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DashboardNav from "@/components/DashboardNav";
import GlencairnLogo from "@/components/GlencairnLogo";
import { usePageTitle } from "@/hooks/use-page-title";

interface BottleAsset {
  assetIdx: number;
  assetId: string;
  name: string;
  brandName: string | null;
  isListed: boolean | null;
  price: number | null;
  age: number | null;
  marketPrice: number | null;
  producer: string | null;
  imageUrl: string | null;
}

interface MyBottlesResponse {
  assets: BottleAsset[];
  hasWallet: boolean;
}

type Step = 'select' | 'terms' | 'confirm' | 'signing';

function getBottleValue(asset: BottleAsset): number | null {
  return asset.price ?? asset.marketPrice ?? null;
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function CreateLoan() {
  const { user, loading: authLoading } = useRequireAuth();
  usePageTitle("Create Loan");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [selectedBottles, setSelectedBottles] = useState<Set<string>>(new Set());
  const [loanAmount, setLoanAmount] = useState("0.5");
  const [interestRate, setInterestRate] = useState("5");
  const [durationDays, setDurationDays] = useState("7");
  const [step, setStep] = useState<Step>('select');
  const [txStatus, setTxStatus] = useState("");

  const { data, isLoading } = useQuery<MyBottlesResponse>({
    queryKey: ["/api/my-bottles"],
    queryFn: async () => {
      const res = await fetch("/api/my-bottles");
      if (!res.ok) throw new Error("Failed to fetch bottles");
      return res.json();
    },
    enabled: !!user,
  });

  const { data: solPriceData } = useQuery<{ price: number }>({
    queryKey: ["/api/sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/sol-price");
      if (!res.ok) throw new Error("Failed to fetch SOL price");
      return res.json();
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const solPrice = solPriceData?.price ?? null;

  function solToUsd(lamports: number): string | null {
    if (!solPrice) return null;
    const sol = lamports / 1_000_000_000;
    const usd = sol * solPrice;
    return `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const bottles = data?.assets || [];
  const hasWallet = data?.hasWallet ?? false;

  const toggleBottle = (assetId: string) => {
    setSelectedBottles(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else if (next.size < MAX_COLLATERAL) {
        next.add(assetId);
      }
      return next;
    });
  };

  const selectedAssets = bottles.filter(b => selectedBottles.has(b.assetId));
  const selectedTotalValue = selectedAssets.reduce((sum, a) => {
    const val = getBottleValue(a);
    return val ? sum + val : sum;
  }, 0);
  const selectedWithValue = selectedAssets.filter(a => getBottleValue(a) !== null).length;

  const amountLamports = Math.floor(parseFloat(loanAmount || "0") * 1_000_000_000);
  const interestBps = Math.floor(parseFloat(interestRate || "0") * 100);
  const durationSeconds = Math.floor(parseFloat(durationDays || "0") * 86400);
  const interestAmount = amountLamports * interestBps / 10000;
  const totalRepayment = amountLamports + interestAmount;

  const isTermsValid = amountLamports > 0 &&
    interestBps > 0 && interestBps <= 10000 &&
    durationSeconds > 0;

  const handleCreate = async () => {
    if (!user?.phantomWallet || !isTermsValid || selectedBottles.size === 0) return;
    setStep('signing');
    try {
      const nftMints = selectedAssets.map(a => a.assetId);
      setTxStatus(`Creating loan with ${nftMints.length} bottle${nftMints.length > 1 ? 's' : ''} as collateral...`);

      const res = await apiRequest('POST', '/api/loans/build-create', {
        nftMints,
        loanAmountLamports: amountLamports,
        interestRateBps: interestBps,
        durationSeconds,
      });
      const { transactions } = await res.json();

      setTxStatus('Please approve the transaction in your Phantom wallet...');
      for (const tx of transactions) {
        await signAndSendTransaction(tx);
      }

      toast({ title: "Loan listed", description: `Your loan for ${loanAmount} SOL has been listed on the marketplace` });
      queryClient.invalidateQueries({ queryKey: ['solana-loans'] });
      queryClient.invalidateQueries({ queryKey: ['solana-my-loans'] });
      setLocation('/my-vault');
    } catch (err: any) {
      console.error('Create loan error:', err);
      setStep('confirm');
      toast({ title: "Transaction failed", description: err.message || "Failed to create loan listing", variant: "destructive" });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/my-vault">
            <Button variant="ghost" size="icon" data-testid="button-back-vault">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create Loan</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {step === 'select' && 'Select bottles to use as collateral'}
              {step === 'terms' && 'Set the terms for your loan'}
              {step === 'confirm' && 'Review and confirm your listing'}
              {step === 'signing' && 'Submitting transaction...'}
            </p>
          </div>
        </div>

        {step === 'select' && (
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  {selectedBottles.size}/{MAX_COLLATERAL} selected
                </Badge>
                {selectedTotalValue > 0 && (
                  <div className="text-sm" data-testid="text-selected-value">
                    <span className="text-muted-foreground">Collateral value: </span>
                    <span className="font-medium text-foreground tabular-nums">{formatUsd(selectedTotalValue)}</span>
                    {selectedWithValue < selectedAssets.length && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({selectedWithValue} of {selectedAssets.length} priced)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={() => setStep('terms')}
                disabled={selectedBottles.size === 0}
                data-testid="button-next-terms"
              >
                Set Loan Terms
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-square" />
                    <CardContent className="p-3">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !hasWallet ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium text-foreground mb-2">No wallet connected</p>
                  <p className="text-sm">
                    Connect your Phantom wallet or add a wallet address in{" "}
                    <Link href="/account-settings" className="text-primary hover:underline">
                      Account Settings
                    </Link>{" "}
                    to create loans.
                  </p>
                </div>
              </Card>
            ) : bottles.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium text-foreground mb-2">No bottles available</p>
                  <p className="text-sm">Your wallet doesn't contain any bottles to use as collateral.</p>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {bottles.map((bottle) => {
                  const isSelected = selectedBottles.has(bottle.assetId);
                  const value = getBottleValue(bottle);
                  const isEstimate = !bottle.price && !!bottle.marketPrice;
                  return (
                    <Card
                      key={bottle.assetId}
                      onClick={() => toggleBottle(bottle.assetId)}
                      className={`overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                          : 'hover-elevate'
                      }`}
                      data-testid={`collateral-bottle-${bottle.assetIdx}`}
                    >
                      <div className="aspect-square bg-muted relative">
                        {bottle.imageUrl ? (
                          <img src={bottle.imageUrl} alt={bottle.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <GlencairnLogo className="w-16 h-16 text-muted-foreground/30" />
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="font-medium text-sm text-foreground truncate" title={bottle.name}>
                          {bottle.name}
                        </p>
                        {bottle.producer && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {bottle.producer}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {value ? (
                            <span className={`text-sm font-medium tabular-nums ${isEstimate ? 'text-muted-foreground' : 'text-primary'}`}>
                              {isEstimate ? 'Est. ' : ''}{formatUsd(value)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No price</span>
                          )}
                          {bottle.age && (
                            <span className="text-xs text-muted-foreground">{bottle.age}yr</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {step === 'terms' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="flex gap-2 flex-wrap mb-2">
              {selectedAssets.map(a => (
                <Badge key={a.assetId} variant="secondary" className="gap-1">
                  {a.imageUrl && <img src={a.imageUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />}
                  <span className="truncate max-w-[120px]">{a.name}</span>
                </Badge>
              ))}
            </div>
            {selectedTotalValue > 0 && (
              <p className="text-sm text-muted-foreground">
                Collateral value: <span className="font-medium text-foreground">{formatUsd(selectedTotalValue)}</span>
              </p>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loan-amount">Loan Amount (SOL)</Label>
                <Input
                  id="loan-amount"
                  type="number"
                  step="0.01"
                  min="0.001"
                  value={loanAmount}
                  onChange={e => setLoanAmount(e.target.value)}
                  data-testid="input-loan-amount"
                />
                {solToUsd(amountLamports) && (
                  <p className="text-xs text-muted-foreground" data-testid="text-loan-usd">
                    {solToUsd(amountLamports)} USD
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.1"
                  min="0.01"
                  max="100"
                  value={interestRate}
                  onChange={e => setInterestRate(e.target.value)}
                  data-testid="input-interest-rate"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  step="1"
                  min="1"
                  value={durationDays}
                  onChange={e => setDurationDays(e.target.value)}
                  data-testid="input-duration"
                />
              </div>

              <Card className="p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Interest amount</span>
                  <div className="text-right">
                    <span className="tabular-nums">{formatLamports(interestAmount)} SOL</span>
                    {solToUsd(interestAmount) && (
                      <span className="text-xs text-muted-foreground ml-1.5">({solToUsd(interestAmount)})</span>
                    )}
                  </div>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Total repayment</span>
                  <div className="text-right">
                    <span className="text-primary tabular-nums">{formatLamports(totalRepayment)} SOL</span>
                    {solToUsd(totalRepayment) && (
                      <span className="text-xs text-muted-foreground ml-1.5">({solToUsd(totalRepayment)})</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep('select')} data-testid="button-back-select">
                Back
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!isTermsValid}
                data-testid="button-next-confirm"
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Collateral ({selectedAssets.length} bottle{selectedAssets.length > 1 ? 's' : ''})</h3>
              <div className="flex gap-2 flex-wrap">
                {selectedAssets.map(a => {
                  const val = getBottleValue(a);
                  return (
                    <Badge key={a.assetId} variant="secondary" className="gap-1.5">
                      {a.imageUrl && <img src={a.imageUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />}
                      <span className="truncate max-w-[100px]">{a.name}</span>
                      {val && <span className="text-muted-foreground">{formatUsd(val)}</span>}
                    </Badge>
                  );
                })}
              </div>
              {selectedTotalValue > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Total collateral value: <span className="font-medium text-foreground">{formatUsd(selectedTotalValue)}</span>
                </p>
              )}
            </div>

            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Coins className="w-4 h-4" />
                  <span>Loan amount</span>
                </div>
                <div className="text-right">
                  <span className="font-medium tabular-nums">{loanAmount} SOL</span>
                  {solToUsd(amountLamports) && (
                    <span className="text-xs text-muted-foreground ml-1.5">({solToUsd(amountLamports)})</span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Percent className="w-4 h-4" />
                  <span>Interest rate</span>
                </div>
                <span className="tabular-nums">{interestRate}%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Duration</span>
                </div>
                <span className="tabular-nums">{durationDays} days</span>
              </div>
              {durationSeconds > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="w-4 h-4" />
                    <span>Expires</span>
                  </div>
                  <span className="tabular-nums text-xs">
                    {new Date(Date.now() + durationSeconds * 1000).toLocaleString('en-US', {
                      timeZone: 'UTC',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })} UTC
                  </span>
                </div>
              )}
              <div className="border-t border-border my-1" />
              <div className="flex items-center justify-between text-sm font-medium">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Landmark className="w-4 h-4" />
                  <span>You repay</span>
                </div>
                <div className="text-right">
                  <span className="text-primary tabular-nums">{formatLamports(totalRepayment)} SOL</span>
                  {solToUsd(totalRepayment) && (
                    <span className="text-xs text-muted-foreground ml-1.5">({solToUsd(totalRepayment)})</span>
                  )}
                </div>
              </div>
            </Card>

            <div className="flex items-start gap-3 rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <ShieldCheck className="w-5 h-5 text-destructive/70 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                Your bottles will be held in escrow until the loan is repaid or cancelled. If you fail to repay by the deadline, the lender can claim your bottles.
              </p>
            </div>

            <div className="flex gap-2 justify-between">
              <Button variant="outline" onClick={() => setStep('terms')} data-testid="button-back-terms">
                Back
              </Button>
              <Button onClick={handleCreate} data-testid="button-confirm-create-loan">
                Create Listing
              </Button>
            </div>
          </div>
        )}

        {step === 'signing' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">{txStatus}</p>
            <p className="text-xs text-muted-foreground text-center">
              You may need to approve multiple transactions in your wallet
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
