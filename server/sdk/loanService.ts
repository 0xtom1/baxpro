import { PublicKey, Connection, Transaction, SystemProgram } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import { IDL } from './idl';

const PROGRAM_ID = new PublicKey('DR1NKAAitegi5hzbrTbj2bLD7EueL56girTwdGDCDJxW');
const SOLANA_RPC = 'https://api.devnet.solana.com';

function getConnection(): Connection {
  return new Connection(SOLANA_RPC, 'confirmed');
}

function getProgram(connection: Connection): anchor.Program {
  const dummyKeypair = anchor.web3.Keypair.generate();
  const dummyWallet = new anchor.Wallet(dummyKeypair);
  const provider = new anchor.AnchorProvider(connection, dummyWallet, { commitment: 'confirmed' });
  const idlWithAddress = { ...IDL, address: PROGRAM_ID.toBase58(), metadata: { address: PROGRAM_ID.toBase58() } };
  return new anchor.Program(idlWithAddress as any, provider);
}

function getLendingPoolPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('lending_pool')], PROGRAM_ID);
}

function getLoanPDA(borrower: PublicKey, loanId: anchor.BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('loan'), borrower.toBuffer(), loanId.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  );
}

function getNftEscrowPDA(nftMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('nft_escrow'), nftMint.toBuffer()], PROGRAM_ID);
}

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

function parseLoanStatus(status: any): string {
  if (!status) return 'unknown';
  const key = typeof status === 'object' ? Object.keys(status)[0] : String(status);
  return key?.toLowerCase() || 'unknown';
}

function serializeLoan(publicKey: PublicKey, account: any): SerializedLoan {
  const mints: string[] = [];
  for (let i = 0; i < account.collateralCount; i++) {
    mints.push(account.nftMints[i].toBase58());
  }
  return {
    publicKey: publicKey.toBase58(),
    borrower: account.borrower.toBase58(),
    lender: account.lender.toBase58(),
    loanId: account.loanId.toString(),
    nftMints: mints,
    collateralCount: account.collateralCount,
    loanAmount: account.loanAmount.toString(),
    interestRateBps: account.interestRateBps,
    durationSeconds: account.durationSeconds.toString(),
    startTime: account.startTime.toString(),
    status: parseLoanStatus(account.status),
  };
}

export async function fetchLoans(statusFilter?: string): Promise<SerializedLoan[]> {
  const connection = getConnection();
  const program = getProgram(connection);
  const allLoans = await (program.account as any).loan.all();
  return allLoans
    .map((l: any) => serializeLoan(l.publicKey, l.account))
    .filter((l: SerializedLoan) => {
      if (!statusFilter) return true;
      return l.status === statusFilter;
    });
}

export async function fetchLoansByWallet(walletAddress: string): Promise<SerializedLoan[]> {
  const allLoans = await fetchLoans();
  return allLoans.filter(l => l.borrower === walletAddress || l.lender === walletAddress);
}

export async function fetchLendingPool(): Promise<any> {
  const connection = getConnection();
  const program = getProgram(connection);
  const [lendingPool] = getLendingPoolPDA();
  try {
    const account = await (program.account as any).lendingPool.fetch(lendingPool);
    return {
      authority: account.authority.toBase58(),
      feeWallet: account.feeWallet.toBase58(),
      feeBps: account.feeBps,
      totalLoansCreated: account.totalLoansCreated.toString(),
      totalLoansFunded: account.totalLoansFunded.toString(),
      totalLoansRepaid: account.totalLoansRepaid.toString(),
      totalLoansLiquidated: account.totalLoansLiquidated.toString(),
    };
  } catch {
    return null;
  }
}

export async function buildCreateLoanTx(
  borrowerAddress: string,
  loanIdNum: number,
  nftMintAddresses: string[],
  loanAmountLamports: number,
  interestRateBps: number,
  durationSeconds: number
): Promise<string[]> {
  const connection = getConnection();
  const program = getProgram(connection);
  const borrower = new PublicKey(borrowerAddress);
  const loanId = new anchor.BN(loanIdNum);

  const [loan] = getLoanPDA(borrower, loanId);
  const [lendingPool] = getLendingPoolPDA();

  const transactions: string[] = [];

  const createIx = await program.methods
    .createLoan(loanId, new anchor.BN(loanAmountLamports), interestRateBps, new anchor.BN(durationSeconds))
    .accounts({
      loan,
      borrower,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const collateralIxs: anchor.web3.TransactionInstruction[] = [];
  for (const mintAddr of nftMintAddresses) {
    const nftMint = new PublicKey(mintAddr);
    const [nftEscrow] = getNftEscrowPDA(nftMint);
    const borrowerNftAccount = getAssociatedTokenAddressSync(nftMint, borrower, false, TOKEN_2022_PROGRAM_ID);

    const ix = await program.methods
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
      .instruction();
    collateralIxs.push(ix);
  }

  const activateIx = await program.methods
    .activateListing()
    .accounts({
      lendingPool,
      loan,
      borrower,
    })
    .instruction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const tx = new Transaction({
    blockhash,
    lastValidBlockHeight,
    feePayer: borrower,
  });
  tx.add(createIx);
  for (const ix of collateralIxs) {
    tx.add(ix);
  }
  tx.add(activateIx);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  transactions.push(Buffer.from(serialized).toString('base64'));

  return transactions;
}

export async function buildFundLoanTx(
  lenderAddress: string,
  borrowerAddress: string,
  loanIdStr: string
): Promise<string> {
  const connection = getConnection();
  const program = getProgram(connection);
  const lender = new PublicKey(lenderAddress);
  const borrower = new PublicKey(borrowerAddress);
  const loanId = new anchor.BN(loanIdStr);

  const [lendingPool] = getLendingPoolPDA();
  const [loan] = getLoanPDA(borrower, loanId);

  const ix = await program.methods
    .fundLoan()
    .accounts({
      lendingPool,
      loan,
      borrower,
      lender,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: lender });
  tx.add(ix);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return Buffer.from(serialized).toString('base64');
}

export async function buildRepayLoanTx(
  borrowerAddress: string,
  loanIdStr: string
): Promise<string> {
  const connection = getConnection();
  const program = getProgram(connection);
  const borrower = new PublicKey(borrowerAddress);
  const loanId = new anchor.BN(loanIdStr);

  const [lendingPool] = getLendingPoolPDA();
  const [loan] = getLoanPDA(borrower, loanId);

  const loanAccount = await (program.account as any).loan.fetch(loan);
  const poolAccount = await (program.account as any).lendingPool.fetch(lendingPool);

  const remainingAccounts: anchor.web3.AccountMeta[] = [];
  for (let i = 0; i < loanAccount.collateralCount; i++) {
    const mint = loanAccount.nftMints[i];
    const escrow = loanAccount.nftEscrows[i];
    const recipient = getAssociatedTokenAddressSync(mint, borrower, false, TOKEN_2022_PROGRAM_ID);
    remainingAccounts.push(
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    );
  }

  const ix = await program.methods
    .repayLoan()
    .accounts({
      lendingPool,
      loan,
      borrower,
      lender: loanAccount.lender,
      feeWallet: poolAccount.feeWallet,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: borrower });
  tx.add(ix);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return Buffer.from(serialized).toString('base64');
}

export async function buildCancelLoanTx(
  borrowerAddress: string,
  loanIdStr: string
): Promise<string> {
  const connection = getConnection();
  const program = getProgram(connection);
  const borrower = new PublicKey(borrowerAddress);
  const loanId = new anchor.BN(loanIdStr);

  const [loan] = getLoanPDA(borrower, loanId);

  const loanAccount = await (program.account as any).loan.fetch(loan);

  const remainingAccounts: anchor.web3.AccountMeta[] = [];
  for (let i = 0; i < loanAccount.collateralCount; i++) {
    const mint = loanAccount.nftMints[i];
    const escrow = loanAccount.nftEscrows[i];
    const recipient = getAssociatedTokenAddressSync(mint, borrower, false, TOKEN_2022_PROGRAM_ID);
    remainingAccounts.push(
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: escrow, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    );
  }

  const ix = await program.methods
    .cancelListing()
    .accounts({
      loan,
      borrower,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ blockhash, lastValidBlockHeight, feePayer: borrower });
  tx.add(ix);

  const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
  return Buffer.from(serialized).toString('base64');
}
