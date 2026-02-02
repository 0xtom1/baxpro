import { PublicKey, Connection, SystemProgram } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { IDL, NftLending } from './idl';

export const PROGRAM_ID = new PublicKey('ECcm4s5nQnNAtMmaKcvkMmSgH3dVyEJGPAAgyZFKVJPu');

export interface LendingPoolAccount {
  authority: PublicKey;
  nftVault: PublicKey;
  totalLoansCreated: anchor.BN;
  totalLoansFunded: anchor.BN;
  totalLoansRepaid: anchor.BN;
  totalLoansLiquidated: anchor.BN;
  bump: number;
}

export interface LoanAccount {
  borrower: PublicKey;
  lender: PublicKey;
  nftMint: PublicKey;
  nftEscrow: PublicKey;
  loanAmount: anchor.BN;
  interestRateBps: number;
  durationSeconds: anchor.BN;
  startTime: anchor.BN;
  status: LoanStatus;
  bump: number;
}

export enum LoanStatus {
  Listed = 'Listed',
  Active = 'Active',
  Repaid = 'Repaid',
  Liquidated = 'Liquidated',
  Cancelled = 'Cancelled',
}

export class NftLendingClient {
  program: anchor.Program<NftLending>;
  connection: Connection;

  constructor(connection: Connection, wallet: anchor.Wallet) {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    this.program = new anchor.Program(IDL, PROGRAM_ID, provider);
    this.connection = connection;
  }

  getLendingPoolPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lending_pool')],
      PROGRAM_ID
    );
  }

  getLoanPDA(nftMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('loan'), nftMint.toBuffer()],
      PROGRAM_ID
    );
  }

  getNftEscrowPDA(nftMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('nft_escrow'), nftMint.toBuffer()],
      PROGRAM_ID
    );
  }

  async initializeLendingPool(authority: PublicKey) {
    const [lendingPool] = this.getLendingPoolPDA();

    return await this.program.methods
      .initializeLendingPool()
      .accounts({
        lendingPool,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async createLoanListing(
    borrower: PublicKey,
    nftMint: PublicKey,
    loanAmount: anchor.BN,
    interestRateBps: number,
    durationSeconds: anchor.BN
  ) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(nftMint);
    const [nftEscrow] = this.getNftEscrowPDA(nftMint);
    
    const borrowerNftAccount = getAssociatedTokenAddressSync(
      nftMint,
      borrower,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.program.methods
      .createLoanListing(loanAmount, interestRateBps, durationSeconds)
      .accounts({
        lendingPool,
        loan,
        nftMint,
        borrowerNftAccount,
        nftEscrow,
        borrower,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async fundLoan(lender: PublicKey, nftMint: PublicKey, borrower: PublicKey) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(nftMint);

    return await this.program.methods
      .fundLoan()
      .accounts({
        lendingPool,
        loan,
        borrower,
        lender,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async repayLoan(
    borrower: PublicKey,
    nftMint: PublicKey,
    lender: PublicKey
  ) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(nftMint);
    const [nftEscrow] = this.getNftEscrowPDA(nftMint);
    
    const borrowerNftAccount = getAssociatedTokenAddressSync(
      nftMint,
      borrower,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.program.methods
      .repayLoan()
      .accounts({
        lendingPool,
        loan,
        nftMint,
        nftEscrow,
        borrowerNftAccount,
        borrower,
        lender,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async liquidateLoan(lender: PublicKey, nftMint: PublicKey) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(nftMint);
    const [nftEscrow] = this.getNftEscrowPDA(nftMint);
    
    const lenderNftAccount = getAssociatedTokenAddressSync(
      nftMint,
      lender,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.program.methods
      .liquidateLoan()
      .accounts({
        lendingPool,
        loan,
        nftMint,
        nftEscrow,
        lenderNftAccount,
        lender,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async cancelListing(borrower: PublicKey, nftMint: PublicKey) {
    const [loan] = this.getLoanPDA(nftMint);
    const [nftEscrow] = this.getNftEscrowPDA(nftMint);
    
    const borrowerNftAccount = getAssociatedTokenAddressSync(
      nftMint,
      borrower,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.program.methods
      .cancelListing()
      .accounts({
        loan,
        nftMint,
        nftEscrow,
        borrowerNftAccount,
        borrower,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async fetchLendingPool(): Promise<LendingPoolAccount | null> {
    const [lendingPool] = this.getLendingPoolPDA();
    try {
      const account = await this.program.account.lendingPool.fetch(lendingPool);
      return account as unknown as LendingPoolAccount;
    } catch {
      return null;
    }
  }

  async fetchLoan(nftMint: PublicKey): Promise<LoanAccount | null> {
    const [loan] = this.getLoanPDA(nftMint);
    try {
      const account = await this.program.account.loan.fetch(loan);
      return account as unknown as LoanAccount;
    } catch {
      return null;
    }
  }

  async fetchAllLoans(): Promise<{ publicKey: PublicKey; account: LoanAccount }[]> {
    const accounts = await this.program.account.loan.all();
    return accounts.map((a) => ({
      publicKey: a.publicKey,
      account: a.account as unknown as LoanAccount,
    }));
  }

  async fetchLoansByStatus(status: 'listed' | 'active' | 'repaid' | 'liquidated' | 'cancelled'): Promise<{ publicKey: PublicKey; account: LoanAccount }[]> {
    const allLoans = await this.fetchAllLoans();
    return allLoans.filter(loan => {
      const loanStatus = loan.account.status;
      const statusKey = Object.keys(loanStatus)[0]?.toLowerCase();
      return statusKey === status;
    });
  }

  async fetchLoansByBorrower(borrower: PublicKey): Promise<{ publicKey: PublicKey; account: LoanAccount }[]> {
    const allLoans = await this.fetchAllLoans();
    return allLoans.filter(loan => loan.account.borrower.equals(borrower));
  }

  async fetchLoansByLender(lender: PublicKey): Promise<{ publicKey: PublicKey; account: LoanAccount }[]> {
    const allLoans = await this.fetchAllLoans();
    return allLoans.filter(loan => loan.account.lender.equals(lender));
  }

  calculateRepaymentAmount(loanAmount: anchor.BN, interestRateBps: number): anchor.BN {
    const interest = loanAmount.muln(interestRateBps).divn(10000);
    return loanAmount.add(interest);
  }

  isLoanExpired(loan: LoanAccount, currentTime?: number): boolean {
    const now = currentTime ?? Math.floor(Date.now() / 1000);
    if (loan.startTime.toNumber() === 0) return false;
    return now > loan.startTime.toNumber() + loan.durationSeconds.toNumber();
  }
}
