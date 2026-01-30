# NFT Lending Protocol - Integration Guide

This guide explains how to integrate the NFT Lending smart contract into your web application.

## Program Details

| Property | Value |
|----------|-------|
| **Program ID** | `ECcm4s5nQnNAtMmaKcvkMmSgH3dVyEJGPAAgyZFKVJPu` |
| **Network** | Solana Devnet |
| **Token Standard** | Token-2022 (Token Extensions) |

## Quick Start

### 1. Install Dependencies

```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

### 2. Copy SDK Files

Copy these files to your project:
- `sdk/idl.ts` - Program interface definition
- `sdk/client.ts` - TypeScript client wrapper

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

## Program Instructions

### 1. Initialize Lending Pool (One-time Setup)

Creates the global lending pool. Only needs to be called once per deployment.

```typescript
const tx = await client.initializeLendingPool(wallet.publicKey);
console.log('Lending pool initialized:', tx);
```

**Who calls this:** Protocol admin (once per deployment)

---

### 2. Create Loan Listing

Borrower deposits an NFT as collateral and sets loan terms.

```typescript
import { BN } from '@coral-xyz/anchor';

const nftMint = new PublicKey('YOUR_NFT_MINT_ADDRESS');
const loanAmount = new BN(1_000_000_000); // 1 SOL in lamports
const interestRateBps = 500;              // 5% (500 basis points)
const durationSeconds = new BN(86400 * 7); // 7 days

const tx = await client.createLoanListing(
  borrower.publicKey,
  nftMint,
  loanAmount,
  interestRateBps,
  durationSeconds
);
```

**Who calls this:** Borrower (NFT owner)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `loanAmount` | `BN` (u64) | Loan amount in lamports (1 SOL = 1,000,000,000 lamports) |
| `interestRateBps` | `number` (u16) | Interest rate in basis points (100 = 1%, max 10000) |
| `durationSeconds` | `BN` (i64) | Loan duration in seconds |

**What happens:**
- NFT is transferred from borrower to escrow PDA
- Loan account is created with status `Listed`

---

### 3. Fund Loan

Lender provides SOL to the borrower and activates the loan.

```typescript
const tx = await client.fundLoan(
  lender.publicKey,
  nftMint,
  borrower.publicKey
);
```

**Who calls this:** Lender

**What happens:**
- `loanAmount` SOL is transferred from lender to borrower
- Loan status changes to `Active`
- Loan timer starts

---

### 4. Repay Loan

Borrower repays principal + interest to reclaim their NFT.

```typescript
const tx = await client.repayLoan(
  borrower.publicKey,
  nftMint,
  lender.publicKey
);
```

**Who calls this:** Borrower

**What happens:**
- Borrower pays `loanAmount + interest` to lender
- NFT is returned from escrow to borrower
- Loan status changes to `Repaid`

**Repayment calculation:**
```
repaymentAmount = loanAmount + (loanAmount * interestRateBps / 10000)
```

---

### 5. Liquidate Loan

If loan expires without repayment, lender can claim the NFT collateral.

```typescript
const tx = await client.liquidateLoan(lender.publicKey, nftMint);
```

**Who calls this:** Lender (only after loan expires)

**What happens:**
- NFT is transferred from escrow to lender
- Loan status changes to `Liquidated`

**Expiration check:**
```
isExpired = currentTime > startTime + durationSeconds
```

---

### 6. Cancel Listing

Borrower can cancel an unfunded listing and reclaim their NFT.

```typescript
const tx = await client.cancelListing(borrower.publicKey, nftMint);
```

**Who calls this:** Borrower (only for `Listed` status)

**What happens:**
- NFT is returned from escrow to borrower
- Loan status changes to `Cancelled`

---

## Reading Data

### Fetch Lending Pool Stats

```typescript
const pool = await client.fetchLendingPool();
console.log('Total loans created:', pool.totalLoansCreated.toString());
console.log('Total loans funded:', pool.totalLoansFunded.toString());
console.log('Total loans repaid:', pool.totalLoansRepaid.toString());
console.log('Total loans liquidated:', pool.totalLoansLiquidated.toString());
```

### Fetch Single Loan

```typescript
const loan = await client.fetchLoan(nftMint);
if (loan) {
  console.log('Borrower:', loan.borrower.toBase58());
  console.log('Lender:', loan.lender.toBase58());
  console.log('Amount:', loan.loanAmount.toString(), 'lamports');
  console.log('Interest:', loan.interestRateBps, 'bps');
  console.log('Status:', loan.status);
}
```

### Fetch All Loans

```typescript
const allLoans = await client.fetchAllLoans();
for (const { publicKey, account } of allLoans) {
  console.log('Loan PDA:', publicKey.toBase58());
  console.log('  NFT:', account.nftMint.toBase58());
  console.log('  Status:', account.status);
}
```

### Filter Loans by Status

```typescript
import { LoanStatus } from './sdk/client';

const allLoans = await client.fetchAllLoans();

// Get active loans
const activeLoans = allLoans.filter(l => 
  JSON.stringify(l.account.status) === JSON.stringify({ active: {} })
);

// Get listed loans (available for funding)
const listedLoans = allLoans.filter(l => 
  JSON.stringify(l.account.status) === JSON.stringify({ listed: {} })
);
```

---

## PDA Derivation

If you need to derive PDAs manually:

```typescript
import { PublicKey } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('ECcm4s5nQnNAtMmaKcvkMmSgH3dVyEJGPAAgyZFKVJPu');

// Lending Pool PDA
const [lendingPool] = PublicKey.findProgramAddressSync(
  [Buffer.from('lending_pool')],
  PROGRAM_ID
);

// Loan PDA (per NFT)
const [loan] = PublicKey.findProgramAddressSync(
  [Buffer.from('loan'), nftMint.toBuffer()],
  PROGRAM_ID
);

// NFT Escrow PDA (per NFT)
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
| `totalLoansCreated` | `u64` | Counter of listings created |
| `totalLoansFunded` | `u64` | Counter of loans funded |
| `totalLoansRepaid` | `u64` | Counter of loans repaid |
| `totalLoansLiquidated` | `u64` | Counter of loans liquidated |
| `bump` | `u8` | PDA bump seed |

### Loan

| Field | Type | Description |
|-------|------|-------------|
| `borrower` | `PublicKey` | NFT owner / loan recipient |
| `lender` | `PublicKey` | SOL provider (zero if unlisted) |
| `nftMint` | `PublicKey` | NFT token mint address |
| `nftEscrow` | `PublicKey` | Escrow holding the NFT |
| `loanAmount` | `u64` | Loan amount in lamports |
| `interestRateBps` | `u16` | Interest in basis points |
| `durationSeconds` | `i64` | Loan duration in seconds |
| `startTime` | `i64` | Unix timestamp when funded |
| `status` | `LoanStatus` | Current loan state |
| `bump` | `u8` | PDA bump seed |

### LoanStatus

```typescript
enum LoanStatus {
  Listed,     // Waiting for lender
  Active,     // Funded, loan in progress
  Repaid,     // Borrower repaid
  Liquidated, // Lender claimed NFT
  Cancelled   // Borrower cancelled listing
}
```

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
function CreateListingButton({ nftMint }: { nftMint: PublicKey }) {
  const client = useLendingClient();
  const wallet = useWallet();
  
  const handleCreateListing = async () => {
    if (!client || !wallet.publicKey) return;
    
    try {
      const tx = await client.createLoanListing(
        wallet.publicKey,
        nftMint,
        new BN(1_000_000_000), // 1 SOL
        500,                   // 5%
        new BN(86400 * 7)      // 7 days
      );
      console.log('Listing created:', tx);
    } catch (err) {
      console.error('Failed to create listing:', err);
    }
  };
  
  return <button onClick={handleCreateListing}>List NFT for Loan</button>;
}
```

---

## NFT Requirements

The program accepts **Token-2022 NFTs** with:
- 0 decimals
- Supply of 1
- Minted using the Token-2022 program (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`)

---

## Example: Complete Loan Flow

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
  const nftMint = new PublicKey('YOUR_NFT_MINT');
  
  // Create clients
  const borrowerClient = new NftLendingClient(
    connection, 
    new anchor.Wallet(borrowerKeypair)
  );
  const lenderClient = new NftLendingClient(
    connection, 
    new anchor.Wallet(lenderKeypair)
  );
  
  // 1. Borrower lists NFT
  await borrowerClient.createLoanListing(
    borrowerKeypair.publicKey,
    nftMint,
    new BN(1_000_000_000), // 1 SOL
    500,                   // 5% interest
    new BN(86400 * 7)      // 7 days
  );
  console.log('Loan listed');
  
  // 2. Lender funds the loan
  await lenderClient.fundLoan(
    lenderKeypair.publicKey,
    nftMint,
    borrowerKeypair.publicKey
  );
  console.log('Loan funded - borrower received 1 SOL');
  
  // 3a. Borrower repays (happy path)
  await borrowerClient.repayLoan(
    borrowerKeypair.publicKey,
    nftMint,
    lenderKeypair.publicKey
  );
  console.log('Loan repaid - NFT returned to borrower');
  
  // 3b. OR Lender liquidates (if expired)
  // await lenderClient.liquidateLoan(lenderKeypair.publicKey, nftMint);
  // console.log('Loan liquidated - NFT transferred to lender');
}
```

---

## Files to Copy

Copy these files to your project's `sdk/` directory:

1. **`sdk/idl.ts`** - Program IDL (interface definition)
2. **`sdk/client.ts`** - TypeScript client class

Make sure to update the `PROGRAM_ID` in `client.ts` if you deploy to a different address.
