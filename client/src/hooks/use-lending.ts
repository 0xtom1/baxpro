import { useAuth } from '@/lib/auth';

export interface SerializedLoan {
  publicKey: string;
  borrower: string;
  lender: string;
  loanId: string;
  nftMints: string[];
  collateralCount: number;
  loanAmount: string;
  interestRateBps: number;
  durationSeconds: string;
  startTime: string;
  status: string;
}

export const MAX_COLLATERAL = 5;

export function formatLamports(lamports: number | string): string {
  const val = typeof lamports === 'string' ? parseInt(lamports, 10) : lamports;
  return (val / 1_000_000_000).toFixed(4);
}

export function formatDuration(seconds: number | string): string {
  const secs = typeof seconds === 'string' ? parseInt(seconds, 10) : seconds;
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((secs % 3600) / 60);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function truncateAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function getLoanStatusLabel(status: string): string {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function isLoanStatus(status: string, expected: string): boolean {
  if (!status) return false;
  return status.toLowerCase() === expected.toLowerCase();
}

let _phantomSdkSolana: any = null;

export function setPhantomSdkSolana(solana: any) {
  _phantomSdkSolana = solana;
}

function getPhantomProvider(): any | null {
  const phantom = (window as any).phantom?.solana;
  if (phantom?.isPhantom) return phantom;
  return null;
}

export async function signAndSendTransaction(serializedTxBase64: string): Promise<string> {
  const { Transaction, VersionedTransaction } = await import('@solana/web3.js');
  const txBytes = Uint8Array.from(atob(serializedTxBase64), c => c.charCodeAt(0));

  if (_phantomSdkSolana?.signAndSendTransaction) {
    try {
      const transaction = Transaction.from(txBytes);
      const result = await _phantomSdkSolana.signAndSendTransaction(transaction);
      return result.signature || result.hash || '';
    } catch (sdkErr: any) {
      console.warn('Phantom SDK signAndSendTransaction failed, trying extension provider:', sdkErr.message);
    }
  }

  const phantom = getPhantomProvider();
  if (!phantom) throw new Error('Phantom wallet not found. Please ensure Phantom is connected.');

  const transaction = Transaction.from(txBytes);
  const { signature } = await phantom.signAndSendTransaction(transaction);
  return signature;
}

export function useHasWallet(): boolean {
  const { user } = useAuth();
  return !!user?.phantomWallet;
}
