# NFT Lending Protocol - Integration Guide

This guide explains how to integrate the NFT Lending smart contract into your web application. The protocol supports **1-5 NFTs as collateral** per loan using Token-2022.

## Program Details

| Property | Value |
|----------|-------|
| **Program ID** | `ECcm4s5nQnNAtMmaKcvkMmSgH3dVyEJGPAAgyZFKVJPu` |
| **Network** | Solana Devnet |
| **Token Standard** | Token-2022 (Token Extensions) |
| **Max Collateral** | 5 NFTs per loan |
| **Protocol Fee** | 10% of interest (1000 bps), configurable at pool init |

## Quick Start

### 1. Install Dependencies

```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

### 2. Copy SDK Files

Copy these files to your project:
- `integration-sdk/idl.ts` - Program interface definition
- `integration-sdk/client.ts` - TypeScript client wrapper

### 3. Initialize the Client

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { NftLendingClient } from './sdk/client';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new anchor.Wallet(keypair); // Your wallet keypair
const client = new NftLendingClient(connection, wallet);
```

---

## Loan Lifecycle

```
create_loan (Draft) → add_collateral (1-5x) → activate_listing (Listed) → fund_loan (Active)
                                                                              ↓
                                                          repay_loan (Repaid) OR liquidate_loan (Liquidated)

cancel_listing can be called from Draft or Listed status
```

---

## Program Instructions

### 1. Initialize Lending Pool (One-time Setup)

Creates the global lending pool with a fee wallet and fee rate. Only needs to be called once per deployment.

```typescript
const feeWallet = new PublicKey('YOUR_FEE_WALLET_ADDRESS');
const feeBps = 1000; // 10% of interest goes to protocol

const tx = await client.initializeLendingPool(wallet.publicKey, feeWallet, feeBps);
console.log('Lending pool initialized:', tx);
```

**Who calls this:** Protocol admin (once per deployment)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `feeWallet` | `PublicKey` | Wallet that receives protocol fees |
| `feeBps` | `number` (u16) | Fee rate in basis points applied to interest (1000 = 10%, max 10000) |

---

### 2. Create Loan (Draft)

Creates a loan with specified terms. The loan starts in `Draft` status.

```typescript
import { BN } from '@coral-xyz/anchor';

const loanId = new BN(Date.now()); // Unique loan ID
const loanAmount = new BN(1_000_000_000); // 1 SOL in lamports
const interestRateBps = 500;              // 5% (500 basis points)
const durationSeconds = new BN(86400 * 7); // 7 days

const tx = await client.createLoan(
  borrower.publicKey,
  loanId,
  loanAmount,
  interestRateBps,
  durationSeconds
);
```

**Who calls this:** Borrower

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `loanId` | `BN` (u64) | Unique identifier for the loan |
| `loanAmount` | `BN` (u64) | Loan amount in lamports (1 SOL = 1,000,000,000 lamports) |
| `interestRateBps` | `number` (u16) | Interest rate in basis points (100 = 1%, max 10000) |
| `durationSeconds` | `BN` (i64) | Loan duration in seconds |

---

### 3. Add Collateral (1-5 NFTs)

Deposits an NFT into escrow as collateral. Can be called up to 5 times per loan while in `Draft` status.

```typescript
const nftMint = new PublicKey('YOUR_NFT_MINT_ADDRESS');
const tx = await client.addCollateral(borrower.publicKey, loanId, nftMint);
```

**Who calls this:** Borrower (while loan is Draft)

**What happens:**
- NFT is transferred from borrower to a program-owned escrow PDA
- Collateral count is incremented

---

### 4. Activate Listing

Transitions the loan from `Draft` to `Listed` status, making it available for lenders.

```typescript
const tx = await client.activateListing(borrower.publicKey, loanId);
```

**Who calls this:** Borrower (requires at least 1 collateral NFT)

---

### 5. Convenience: Create + Add Collateral + Activate (All-in-one)

For convenience, the SDK provides a method that handles the full listing flow:

```typescript
const nftMints = [nftMint1, nftMint2, nftMint3]; // 1-5 NFTs
const txIds = await client.createLoanAndList(
  borrower.publicKey,
  loanId,
  nftMints,
  new BN(1_000_000_000), // 1 SOL
  500,                    // 5%
  new BN(86400 * 7)       // 7 days
);
```

---

### 6. Fund Loan

Lender provides SOL to the borrower and activates the loan.

```typescript
const tx = await client.fundLoan(
  lender.publicKey,
  borrower.publicKey,
  loanId
);
```

**Who calls this:** Lender

**What happens:**
- `loanAmount` SOL is transferred from lender to borrower
- Loan status changes to `Active`
- Loan timer starts

---

### 7. Repay Loan

Borrower repays principal + interest to reclaim all collateral NFTs.

```typescript
const tx = await client.repayLoan(
  borrower.publicKey,
  loanId,
  lender.publicKey
);
```

**Who calls this:** Borrower

**What happens:**
- Borrower pays `loanAmount + interest` (split between lender and protocol fee wallet)
- Protocol fee (% of interest) is sent to the fee wallet configured in the lending pool
- Lender receives the remainder (principal + interest - protocol fee)
- All collateral NFTs are returned from escrow to borrower
- Escrow accounts are closed (rent returned to borrower)
- Loan status changes to `Repaid`

**Repayment calculation:**
```
interest = loanAmount * interestRateBps / 10000
totalRepayment = loanAmount + interest
protocolFee = interest * feeBps / 10000
lenderReceives = totalRepayment - protocolFee
```

**Example:** 1 SOL loan at 5% interest with 10% protocol fee (1000 bps):
- Interest: 0.05 SOL
- Protocol fee: 0.005 SOL (10% of 0.05)
- Lender receives: 1.045 SOL
- Borrower pays: 1.05 SOL total

---

### 8. Liquidate Loan

If loan expires without repayment, lender can claim all collateral NFTs.

```typescript
const tx = await client.liquidateLoan(
  lender.publicKey,
  borrower.publicKey,
  loanId
);
```

**Who calls this:** Lender (only after loan expires)

**What happens:**
- All collateral NFTs are transferred from escrow to lender
- Escrow accounts are closed (rent returned to lender)
- Loan status changes to `Liquidated`

**Expiration check:**
```
isExpired = currentTime > startTime + durationSeconds
```

---

### 9. Cancel Listing

Borrower can cancel a `Draft` or `Listed` loan and reclaim their collateral NFTs.

```typescript
const tx = await client.cancelListing(borrower.publicKey, loanId);
```

**Who calls this:** Borrower (only for `Draft` or `Listed` status)

**What happens:**
- All collateral NFTs are returned from escrow to borrower
- Loan status changes to `Cancelled`

---

## Reading Data

### Fetch Lending Pool Stats

```typescript
const pool = await client.fetchLendingPool();
console.log('Fee wallet:', pool.feeWallet.toBase58());
console.log('Fee rate:', pool.feeBps, 'bps');
console.log('Total loans created:', pool.totalLoansCreated.toString());
console.log('Total loans funded:', pool.totalLoansFunded.toString());
console.log('Total loans repaid:', pool.totalLoansRepaid.toString());
console.log('Total loans liquidated:', pool.totalLoansLiquidated.toString());
```

### Fetch Single Loan

```typescript
const loan = await client.fetchLoan(borrower.publicKey, loanId);
if (loan) {
  console.log('Borrower:', loan.borrower.toBase58());
  console.log('Lender:', loan.lender.toBase58());
  console.log('Amount:', loan.loanAmount.toString(), 'lamports');
  console.log('Interest:', loan.interestRateBps, 'bps');
  console.log('Collateral count:', loan.collateralCount);
  console.log('Status:', loan.status);

  // Get active collateral mints
  const mints = client.getActiveCollateralMints(loan);
  mints.forEach((m, i) => console.log(`  NFT ${i}:`, m.toBase58()));
}
```

### Fetch All Loans

```typescript
const allLoans = await client.fetchAllLoans();
for (const { publicKey, account } of allLoans) {
  console.log('Loan PDA:', publicKey.toBase58());
  console.log('  Collateral:', account.collateralCount, 'NFTs');
  console.log('  Status:', account.status);
}
```

### Filter Loans

```typescript
// By status
const listedLoans = await client.fetchLoansByStatus('listed');
const activeLoans = await client.fetchLoansByStatus('active');

// By participant
const myLoansAsBorrower = await client.fetchLoansByBorrower(wallet.publicKey);
const myLoansAsLender = await client.fetchLoansByLender(wallet.publicKey);
```

### Utility Methods

```typescript
// Calculate repayment amount (total borrower pays)
const repayment = client.calculateRepaymentAmount(loan.loanAmount, loan.interestRateBps);

// Calculate protocol fee
const pool = await client.fetchLendingPool();
const fee = client.calculateProtocolFee(loan.loanAmount, loan.interestRateBps, pool.feeBps);

// Calculate what lender receives (repayment - fee)
const lenderAmount = client.calculateLenderAmount(loan.loanAmount, loan.interestRateBps, pool.feeBps);

// Check if loan is expired
const expired = client.isLoanExpired(loan);
```

---

## PDA Derivation

If you need to derive PDAs manually:

```typescript
import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

const PROGRAM_ID = new PublicKey('ECcm4s5nQnNAtMmaKcvkMmSgH3dVyEJGPAAgyZFKVJPu');

// Lending Pool PDA
const [lendingPool] = PublicKey.findProgramAddressSync(
  [Buffer.from('lending_pool')],
  PROGRAM_ID
);

// Loan PDA (per borrower + loan_id)
const loanId = new BN(1);
const [loan] = PublicKey.findProgramAddressSync(
  [Buffer.from('loan'), borrower.toBuffer(), loanId.toArrayLike(Buffer, 'le', 8)],
  PROGRAM_ID
);

// NFT Escrow PDA (per NFT mint)
const [nftEscrow] = PublicKey.findProgramAddressSync(
  [Buffer.from('nft_escrow'), nftMint.toBuffer()],
  PROGRAM_ID
);
```

---

## Account Structures

### LendingPool

| Field | Type | Description |
|-------|------|-------------|
| `authority` | `PublicKey` | Pool creator/admin |
| `nftVault` | `PublicKey` | Reserved for future use |
| `feeWallet` | `PublicKey` | Wallet that receives protocol fees on repayment |
| `feeBps` | `u16` | Fee rate in basis points applied to interest (1000 = 10%) |
| `totalLoansCreated` | `u64` | Counter of listings created |
| `totalLoansFunded` | `u64` | Counter of loans funded |
| `totalLoansRepaid` | `u64` | Counter of loans repaid |
| `totalLoansLiquidated` | `u64` | Counter of loans liquidated |
| `bump` | `u8` | PDA bump seed |

### Loan

| Field | Type | Description |
|-------|------|-------------|
| `borrower` | `PublicKey` | NFT owner / loan recipient |
| `lender` | `PublicKey` | SOL provider (zero if unfunded) |
| `loanId` | `u64` | Unique loan identifier |
| `nftMints` | `[PublicKey; 5]` | Collateral NFT mint addresses (padded with default) |
| `nftEscrows` | `[PublicKey; 5]` | Escrow account addresses (padded with default) |
| `collateralCount` | `u8` | Number of active collateral NFTs (1-5) |
| `loanAmount` | `u64` | Loan amount in lamports |
| `interestRateBps` | `u16` | Interest in basis points |
| `durationSeconds` | `i64` | Loan duration in seconds |
| `startTime` | `i64` | Unix timestamp when funded |
| `status` | `LoanStatus` | Current loan state |
| `bump` | `u8` | PDA bump seed |

### LoanStatus

```typescript
enum LoanStatus {
  Draft,      // Created, accepting collateral
  Listed,     // Activated, waiting for lender
  Active,     // Funded, loan in progress
  Repaid,     // Borrower repaid
  Liquidated, // Lender claimed NFTs
  Cancelled   // Borrower cancelled listing
}
```

---

## Remaining Accounts Pattern

For `repayLoan`, `liquidateLoan`, and `cancelListing`, the multi-NFT return is handled via Solana's `remaining_accounts` pattern. For each collateral NFT, you must pass 3 accounts in order:

```
[nft_mint, nft_escrow, recipient_token_account] × collateral_count
```

The SDK handles this automatically by fetching the loan state and building the accounts. If building transactions manually, ensure you provide the correct remaining accounts.

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | `InvalidLoanState` | Wrong status for this operation |
| 6001 | `LoanNotExpired` | Cannot liquidate - loan not expired |
| 6002 | `InterestRateTooHigh` | Interest > 10000 bps (100%) |
| 6003 | `InvalidDuration` | Duration must be positive |
| 6004 | `InvalidLoanAmount` | Amount must be > 0 |
| 6005 | `UnauthorizedBorrower` | Only borrower can do this |
| 6006 | `UnauthorizedLender` | Only lender can do this |
| 6007 | `MathOverflow` | Arithmetic overflow |
| 6008 | `InvalidNft` | Not a valid Token-2022 NFT |
| 6009 | `TooManyCollateral` | Exceeded 5 NFT collateral limit |
| 6010 | `NoCollateral` | Must add collateral before activating |
| 6011 | `InvalidRemainingAccounts` | Wrong number of remaining accounts |
| 6012 | `CollateralMintMismatch` | Remaining account mint doesn't match loan |
| 6013 | `CollateralEscrowMismatch` | Remaining account escrow doesn't match loan |
| 6014 | `InvalidFeeWallet` | Fee wallet doesn't match lending pool config |

---

## Wallet Integration

### With Wallet Adapter (React)

```typescript
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { NftLendingClient } from './sdk/client';
import * as anchor from '@coral-xyz/anchor';

function useLendingClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  if (!wallet.publicKey || !wallet.signTransaction) {
    return null;
  }

  const anchorWallet = {
    publicKey: wallet.publicKey,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  } as anchor.Wallet;

  return new NftLendingClient(connection, anchorWallet);
}
```

### Usage in Component

```typescript
function CreateListingButton({ nftMints }: { nftMints: PublicKey[] }) {
  const client = useLendingClient();
  const wallet = useWallet();

  const handleCreateListing = async () => {
    if (!client || !wallet.publicKey) return;

    try {
      const loanId = new BN(Date.now());
      const txIds = await client.createLoanAndList(
        wallet.publicKey,
        loanId,
        nftMints,            // 1-5 NFTs
        new BN(1_000_000_000), // 1 SOL
        500,                   // 5%
        new BN(86400 * 7)      // 7 days
      );
      console.log('Listing created:', txIds);
    } catch (err) {
      console.error('Failed to create listing:', err);
    }
  };

  return <button onClick={handleCreateListing}>List NFTs for Loan</button>;
}
```

---

## NFT Requirements

The program accepts **Token-2022 NFTs** with:
- 0 decimals
- Supply of 1
- Minted using the Token-2022 program (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

---

## Example: Complete Multi-Collateral Loan Flow

```typescript
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { NftLendingClient } from './sdk/client';

async function loanFlow() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Setup wallets
  const borrowerKeypair = Keypair.generate();
  const lenderKeypair = Keypair.generate();

  // Create clients
  const borrowerClient = new NftLendingClient(
    connection,
    new anchor.Wallet(borrowerKeypair)
  );
  const lenderClient = new NftLendingClient(
    connection,
    new anchor.Wallet(lenderKeypair)
  );

  const nftMints = [
    new PublicKey('NFT_MINT_1'),
    new PublicKey('NFT_MINT_2'),
    new PublicKey('NFT_MINT_3'),
  ];

  const loanId = new BN(Date.now());

  // 1. Borrower lists 3 NFTs as collateral
  await borrowerClient.createLoanAndList(
    borrowerKeypair.publicKey,
    loanId,
    nftMints,
    new BN(1_000_000_000), // 1 SOL
    500,                    // 5% interest
    new BN(86400 * 7)       // 7 days
  );
  console.log('Loan listed with 3 NFTs as collateral');

  // 2. Lender funds the loan
  await lenderClient.fundLoan(
    lenderKeypair.publicKey,
    borrowerKeypair.publicKey,
    loanId
  );
  console.log('Loan funded - borrower received 1 SOL');

  // 3a. Borrower repays (happy path) - all 3 NFTs returned
  await borrowerClient.repayLoan(
    borrowerKeypair.publicKey,
    loanId,
    lenderKeypair.publicKey
  );
  console.log('Loan repaid - 3 NFTs returned to borrower');

  // 3b. OR Lender liquidates (if expired) - all 3 NFTs go to lender
  // await lenderClient.liquidateLoan(
  //   lenderKeypair.publicKey,
  //   borrowerKeypair.publicKey,
  //   loanId
  // );
  // console.log('Loan liquidated - 3 NFTs transferred to lender');
}
```

---

## Files to Copy

Copy these files to your project's `sdk/` directory:

1. **`integration-sdk/idl.ts`** - Program IDL (interface definition)
2. **`integration-sdk/client.ts`** - TypeScript client class

Make sure to update the `PROGRAM_ID` in `client.ts` if you deploy to a different address.
