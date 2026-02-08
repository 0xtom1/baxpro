import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatLamports, signAndSendTransaction, MAX_COLLATERAL } from "@/hooks/use-lending";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface BottleAsset {
  assetIdx: number;
  assetId: string;
  name: string;
  brandName: string | null;
  isListed: boolean | null;
  price: number | null;
  age: number | null;
  producer: string | null;
  imageUrl: string | null;
}

interface CreateLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bottles: BottleAsset[];
}

export default function CreateLoanModal({ open, onOpenChange, bottles }: CreateLoanModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedBottles, setSelectedBottles] = useState<Set<string>>(new Set());
  const [loanAmount, setLoanAmount] = useState("0.5");
  const [interestRate, setInterestRate] = useState("5");
  const [durationDays, setDurationDays] = useState("7");
  const [step, setStep] = useState<'select' | 'terms' | 'confirm' | 'signing'>('select');
  const [txStatus, setTxStatus] = useState("");

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
  const amountLamports = Math.floor(parseFloat(loanAmount || "0") * 1_000_000_000);
  const interestBps = Math.floor(parseFloat(interestRate || "0") * 100);
  const durationSeconds = Math.floor(parseFloat(durationDays || "0") * 86400);

  const interestAmount = amountLamports * interestBps / 10000;
  const totalRepayment = amountLamports + interestAmount;

  const isValid = selectedBottles.size > 0 &&
    amountLamports > 0 &&
    interestBps > 0 && interestBps <= 10000 &&
    durationSeconds > 0;

  const handleCreate = async () => {
    if (!user?.phantomWallet || !isValid) return;

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

      toast({
        title: "Loan listed",
        description: `Your loan for ${loanAmount} SOL has been listed on the marketplace`,
      });

      queryClient.invalidateQueries({ queryKey: ['solana-loans'] });
      queryClient.invalidateQueries({ queryKey: ['solana-my-loans'] });

      resetAndClose();
    } catch (err: any) {
      console.error('Create loan error:', err);
      setStep('confirm');
      toast({
        title: "Transaction failed",
        description: err.message || "Failed to create loan listing",
        variant: "destructive",
      });
    }
  };

  const resetAndClose = () => {
    setSelectedBottles(new Set());
    setLoanAmount("0.5");
    setInterestRate("5");
    setDurationDays("7");
    setStep('select');
    setTxStatus("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={step === 'signing' ? undefined : resetAndClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' && 'Select Collateral'}
            {step === 'terms' && 'Set Loan Terms'}
            {step === 'confirm' && 'Confirm Listing'}
            {step === 'signing' && 'Creating Loan...'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && `Choose up to ${MAX_COLLATERAL} bottles as collateral for your loan`}
            {step === 'terms' && 'Set the amount, interest rate, and duration for your loan'}
            {step === 'confirm' && 'Review your loan listing before submitting'}
            {step === 'signing' && 'Please approve the transactions in your Phantom wallet'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selected: {selectedBottles.size}/{MAX_COLLATERAL}
            </p>
            <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
              {bottles.map(bottle => {
                const isSelected = selectedBottles.has(bottle.assetId);
                return (
                  <div
                    key={bottle.assetId}
                    onClick={() => toggleBottle(bottle.assetId)}
                    className={`relative rounded-md border-2 cursor-pointer transition-colors overflow-hidden ${
                      isSelected ? 'border-primary' : 'border-border hover:border-muted-foreground/30'
                    }`}
                    data-testid={`collateral-bottle-${bottle.assetIdx}`}
                  >
                    <div className="aspect-square bg-muted">
                      {bottle.imageUrl ? (
                        <img src={bottle.imageUrl} alt={bottle.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate">{bottle.name}</p>
                      {bottle.producer && (
                        <p className="text-xs text-muted-foreground truncate">{bottle.producer}</p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {bottles.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bottles available in your wallet</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={resetAndClose} data-testid="button-cancel-create-loan">
                Cancel
              </Button>
              <Button
                onClick={() => setStep('terms')}
                disabled={selectedBottles.size === 0}
                data-testid="button-next-terms"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 'terms' && (
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

            <Card className="p-3 space-y-1 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interest amount</span>
                <span className="tabular-nums">{formatLamports(interestAmount)} SOL</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">Total repayment</span>
                <span className="text-primary tabular-nums">{formatLamports(totalRepayment)} SOL</span>
              </div>
            </Card>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('select')} data-testid="button-back-select">
                Back
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!isValid}
                data-testid="button-next-confirm"
              >
                Review
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Collateral ({selectedAssets.length} bottle{selectedAssets.length > 1 ? 's' : ''})</h4>
              <div className="flex gap-2 flex-wrap">
                {selectedAssets.map(a => (
                  <Badge key={a.assetId} variant="secondary" className="gap-1">
                    {a.imageUrl && <img src={a.imageUrl} alt="" className="w-4 h-4 rounded-sm object-cover" />}
                    <span className="truncate max-w-[120px]">{a.name}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="p-3 space-y-1.5 bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Loan amount</span>
                <span className="font-medium tabular-nums">{loanAmount} SOL</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interest rate</span>
                <span className="tabular-nums">{interestRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="tabular-nums">{durationDays} days</span>
              </div>
              <div className="border-t border-border my-1" />
              <div className="flex justify-between text-sm font-medium">
                <span className="text-muted-foreground">You repay</span>
                <span className="text-primary tabular-nums">{formatLamports(totalRepayment)} SOL</span>
              </div>
            </Card>

            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-muted-foreground">
              Your bottles will be held in escrow until the loan is repaid or cancelled. If you fail to repay by the deadline, the lender can claim your bottles.
            </div>

            <div className="flex gap-2 justify-end">
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
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">{txStatus}</p>
            <p className="text-xs text-muted-foreground text-center">
              You may need to approve multiple transactions in your wallet
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
