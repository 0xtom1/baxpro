# NFT Lending SDK

TypeScript SDK for interacting with the NFT Lending Protocol on Solana.

## Installation

Copy this folder to your project and install dependencies:

```bash
npm install @coral-xyz/anchor @solana/web3.js @solana/spl-token
```

## Quick Start

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { NftLendingClient } from './client';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const wallet = new anchor.Wallet(keypair);
const client = new NftLendingClient(connection, wallet);

// Fetch all available loans
const listedLoans = await client.fetchLoansByStatus('listed');
```

## Program Details

- **Program ID**: `ECcm4s5nQnNAtMmaKcvkMmSgH3dVyEJGPAAgyZFKVJPu`
- **Network**: Solana Devnet
- **Token Standard**: Token-2022

See `INTEGRATION.md` for complete documentation.
