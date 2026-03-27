import { Card } from "@/components/ui/card";
import { Clock, Percent, Coins, User, Landmark } from "lucide-react";
import { formatLamports, formatBps, truncateAddress } from "@/hooks/use-lending";
import type { SerializedLoan } from "@/hooks/use-lending";
import type { ReactNode } from "react";

interface CollateralAsset {
  name?: string;
  imageUrl?: string;
}

interface LoanCardProps {
  loan: SerializedLoan;
  assets: CollateralAsset[];
  walletNames?: Record<string, string>;
  revealedAddresses: Set<string>;
  onToggleReveal: (address: string) => void;
  onClick: () => void;
  totalRepayment: number;
  statusBadge: ReactNode;
  durationDisplay: { label: string; value: string; className?: string };
  extraInfo?: ReactNode;
  actions: ReactNode;
  testIdPrefix?: string;
}

export default function LoanCard({
  loan,
  assets,
  walletNames,
  revealedAddresses,
  onToggleReveal,
  onClick,
  totalRepayment,
  statusBadge,
  durationDisplay,
  extraInfo,
  actions,
  testIdPrefix = "loan",
}: LoanCardProps) {
  const borrowerDisplay = renderWalletAddress(
    loan.borrower,
    walletNames,
    revealedAddresses,
    onToggleReveal,
    `button-reveal-borrower-${testIdPrefix}-${loan.publicKey}`
  );

  return (
    <Card
      className="overflow-visible p-4 flex flex-col gap-3 hover-elevate cursor-pointer"
      data-testid={`card-${testIdPrefix}-${loan.publicKey}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a')) return;
        onClick();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex -space-x-2">
            {assets.length > 0 ? (
              assets.slice(0, 3).map((asset, i) => (
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
          <div className="min-w-0 flex flex-col gap-0.5">
            {assets.length > 0 ? (
              assets.map((asset, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  {asset.name || 'Unknown bottle'}
                </p>
              ))
            ) : (
              <p className="text-xs text-muted-foreground truncate">
                {loan.collateralCount} bottle{loan.collateralCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        {statusBadge}
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
          <span className="text-muted-foreground">{durationDisplay.label}</span>
        </div>
        <span className={`text-right font-medium tabular-nums ${durationDisplay.className || ''}`}>
          {durationDisplay.value}
        </span>

        <div className="flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-muted-foreground">Repayment</span>
        </div>
        <span className="text-right font-bold tabular-nums">{formatLamports(totalRepayment)} SOL</span>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="w-3 h-3 flex-shrink-0" />
        <span>Borrower: </span>
        {borrowerDisplay}
      </div>

      {extraInfo}

      <div className="flex gap-2 mt-1">
        {actions}
      </div>
    </Card>
  );
}

function renderWalletAddress(
  address: string,
  walletNames: Record<string, string> | undefined,
  revealedAddresses: Set<string>,
  onToggleReveal: (address: string) => void,
  testId: string,
): ReactNode {
  const displayName = walletNames?.[address];
  const isRevealed = revealedAddresses.has(address);

  if (displayName && !isRevealed) {
    return (
      <button
        className="hover:text-foreground transition-colors cursor-pointer underline decoration-dotted underline-offset-2"
        onClick={() => onToggleReveal(address)}
        title="Click to show wallet address"
        data-testid={testId}
      >
        {displayName}
      </button>
    );
  }
  if (displayName && isRevealed) {
    return (
      <button
        className="hover:text-foreground transition-colors cursor-pointer font-mono"
        onClick={() => onToggleReveal(address)}
        title="Click to show display name"
        data-testid={testId}
      >
        {truncateAddress(address)}
      </button>
    );
  }
  return <span className="font-mono">{truncateAddress(address)}</span>;
}

export { renderWalletAddress };
