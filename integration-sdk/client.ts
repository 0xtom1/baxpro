import { PublicKey, Connection, SystemProgram, AccountMeta } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { IDL, NftLending } from '../server/sdk/idl';

export const PROGRAM_ID = new PublicKey('DR1NKAAitegi5hzbrTbj2bLD7EueL56girTwdGDCDJxW');

export const MAX_COLLATERAL = 5;

export interface LendingPoolAccount {
  authority: PublicKey;
  nftVault: PublicKey;
  feeWallet: PublicKey;
  feeBps: number;
  totalLoansCreated: anchor.BN;
  totalLoansFunded: anchor.BN;
  totalLoansRepaid: anchor.BN;
  totalLoansLiquidated: anchor.BN;
  bump: number;
}

export interface LoanAccount {
  borrower: PublicKey;
  lender: PublicKey;
  loanId: anchor.BN;
  nftMints: PublicKey[];
  nftEscrows: PublicKey[];
  collateralCount: number;
  loanAmount: anchor.BN;
  interestRateBps: number;
  durationSeconds: anchor.BN;
  startTime: anchor.BN;
  status: LoanStatus;
  bump: number;
}

export enum LoanStatus {
  Draft = 'Draft',
  Listed = 'Listed',
  Active = 'Active',
  Repaid = 'Repaid',
  Liquidated = 'Liquidated',
  Cancelled = 'Cancelled',
}

export class NftLendingClient {
  program: anchor.Program;
  connection: Connection;

  constructor(connection: Connection, wallet: anchor.Wallet) {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    const idlWithAddress = { ...IDL, address: PROGRAM_ID.toBase58(), metadata: { address: PROGRAM_ID.toBase58() } };
    this.program = new anchor.Program(idlWithAddress as any, provider);
    this.connection = connection;
  }

  getLendingPoolPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('lending_pool')],
      PROGRAM_ID
    );
  }

  getLoanPDA(borrower: PublicKey, loanId: anchor.BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('loan'), borrower.toBuffer(), loanId.toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
  }

  getNftEscrowPDA(nftMint: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('nft_escrow'), nftMint.toBuffer()],
      PROGRAM_ID
    );
  }

  async initializeLendingPool(authority: PublicKey, feeWallet: PublicKey, feeBps: number) {
    const [lendingPool] = this.getLendingPoolPDA();

    return await this.program.methods
      .initializeLendingPool(feeWallet, feeBps)
      .accounts({
        lendingPool,
        authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async createLoan(
    borrower: PublicKey,
    loanId: anchor.BN,
    loanAmount: anchor.BN,
    interestRateBps: number,
    durationSeconds: anchor.BN
  ) {
    const [loan] = this.getLoanPDA(borrower, loanId);

    return await this.program.methods
      .createLoan(loanId, loanAmount, interestRateBps, durationSeconds)
      .accounts({
        loan,
        borrower,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async addCollateral(
    borrower: PublicKey,
    loanId: anchor.BN,
    nftMint: PublicKey
  ) {
    const [loan] = this.getLoanPDA(borrower, loanId);
    const [nftEscrow] = this.getNftEscrowPDA(nftMint);

    const borrowerNftAccount = getAssociatedTokenAddressSync(
      nftMint,
      borrower,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    return await this.program.methods
      .addCollateral()
      .accounts({
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

  async activateListing(borrower: PublicKey, loanId: anchor.BN) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(borrower, loanId);

    return await this.program.methods
      .activateListing()
      .accounts({
        lendingPool,
        loan,
        borrower,
      })
      .rpc();
  }

  async createLoanAndList(
    borrower: PublicKey,
    loanId: anchor.BN,
    nftMints: PublicKey[],
    loanAmount: anchor.BN,
    interestRateBps: number,
    durationSeconds: anchor.BN
  ): Promise<string[]> {
    if (nftMints.length === 0 || nftMints.length > MAX_COLLATERAL) {
      throw new Error(`Must provide 1-${MAX_COLLATERAL} NFT mints`);
    }

    const txIds: string[] = [];

    const createTx = await this.createLoan(borrower, loanId, loanAmount, interestRateBps, durationSeconds);
    txIds.push(createTx);

    for (const mint of nftMints) {
      const addTx = await this.addCollateral(borrower, loanId, mint);
      txIds.push(addTx);
    }

    const activateTx = await this.activateListing(borrower, loanId);
    txIds.push(activateTx);

    return txIds;
  }

  async fundLoan(lender: PublicKey, borrower: PublicKey, loanId: anchor.BN) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(borrower, loanId);

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

  private buildCollateralRemainingAccounts(
    loan: LoanAccount,
    recipientGetter: (mint: PublicKey) => PublicKey
  ): AccountMeta[] {
    const remaining: AccountMeta[] = [];
    for (let i = 0; i < loan.collateralCount; i++) {
      const mint = loan.nftMints[i];
      const escrow = loan.nftEscrows[i];
      const recipient = recipientGetter(mint);
      remaining.push(
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: escrow, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: true },
      );
    }
    return remaining;
  }

  async repayLoan(
    borrower: PublicKey,
    loanId: anchor.BN,
    lender: PublicKey
  ) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(borrower, loanId);

    const loanAccount = await this.fetchLoan(borrower, loanId);
    if (!loanAccount) throw new Error('Loan not found');

    const poolAccount = await this.fetchLendingPool();
    if (!poolAccount) throw new Error('Lending pool not found');

    const remainingAccounts = this.buildCollateralRemainingAccounts(
      loanAccount,
      (mint) => getAssociatedTokenAddressSync(mint, borrower, false, TOKEN_2022_PROGRAM_ID)
    );

    return await this.program.methods
      .repayLoan()
      .accounts({
        lendingPool,
        loan,
        borrower,
        lender,
        feeWallet: poolAccount.feeWallet,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async liquidateLoan(
    lender: PublicKey,
    borrower: PublicKey,
    loanId: anchor.BN
  ) {
    const [lendingPool] = this.getLendingPoolPDA();
    const [loan] = this.getLoanPDA(borrower, loanId);

    const loanAccount = await this.fetchLoan(borrower, loanId);
    if (!loanAccount) throw new Error('Loan not found');

    const remainingAccounts = this.buildCollateralRemainingAccounts(
      loanAccount,
      (mint) => getAssociatedTokenAddressSync(mint, lender, false, TOKEN_2022_PROGRAM_ID)
    );

    return await this.program.methods
      .liquidateLoan()
      .accounts({
        lendingPool,
        loan,
        lender,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async cancelListing(
    borrower: PublicKey,
    loanId: anchor.BN
  ) {
    const [loan] = this.getLoanPDA(borrower, loanId);

    const loanAccount = await this.fetchLoan(borrower, loanId);
    if (!loanAccount) throw new Error('Loan not found');

    const remainingAccounts = this.buildCollateralRemainingAccounts(
      loanAccount,
      (mint) => getAssociatedTokenAddressSync(mint, borrower, false, TOKEN_2022_PROGRAM_ID)
    );

    return await this.program.methods
      .cancelListing()
      .accounts({
        loan,
        borrower,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async fetchLendingPool(): Promise<LendingPoolAccount | null> {
    const [lendingPool] = this.getLendingPoolPDA();
    try {
      const account = await (this.program.account as any).lendingPool.fetch(lendingPool);
      return account as LendingPoolAccount;
    } catch {
      return null;
    }
  }

  async fetchLoan(borrower: PublicKey, loanId: anchor.BN): Promise<LoanAccount | null> {
    const [loan] = this.getLoanPDA(borrower, loanId);
    try {
      const account = await (this.program.account as any).loan.fetch(loan);
      return account as LoanAccount;
    } catch {
      return null;
    }
  }

  async fetchAllLoans(): Promise<{ publicKey: PublicKey; account: LoanAccount }[]> {
    const accounts = await (this.program.account as any).loan.all();
    return accounts.map((a: any) => ({
      publicKey: a.publicKey,
      account: a.account as LoanAccount,
    }));
  }

  async fetchLoansByStatus(status: 'draft' | 'listed' | 'active' | 'repaid' | 'liquidated' | 'cancelled'): Promise<{ publicKey: PublicKey; account: LoanAccount }[]> {
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

  calculateProtocolFee(loanAmount: anchor.BN, interestRateBps: number, feeBps: number): anchor.BN {
    const interest = loanAmount.muln(interestRateBps).divn(10000);
    return interest.muln(feeBps).divn(10000);
  }

  calculateLenderAmount(loanAmount: anchor.BN, interestRateBps: number, feeBps: number): anchor.BN {
    const repayment = this.calculateRepaymentAmount(loanAmount, interestRateBps);
    const fee = this.calculateProtocolFee(loanAmount, interestRateBps, feeBps);
    return repayment.sub(fee);
  }

  isLoanExpired(loan: LoanAccount, currentTime?: number): boolean {
    const now = currentTime ?? Math.floor(Date.now() / 1000);
    if (loan.startTime.toNumber() === 0) return false;
    return now > loan.startTime.toNumber() + loan.durationSeconds.toNumber();
  }

  getActiveCollateralMints(loan: LoanAccount): PublicKey[] {
    return loan.nftMints.slice(0, loan.collateralCount);
  }
}
