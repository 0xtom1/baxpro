import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import bs58 from 'bs58';

const SOLANA_RPC = 'https://api.devnet.solana.com';
const SOL_AIRDROP_AMOUNT = 0.5 * LAMPORTS_PER_SOL;
const BOTTLES_TO_SEND = 2;

function getConnection(): Connection {
  return new Connection(SOLANA_RPC, 'confirmed');
}

function getMasterKeypair(): Keypair {
  const pk = process.env.DEVNET_ADDRESS_PK?.trim().replace(/^["']|["']$/g, '');
  if (!pk) {
    throw new Error('DEVNET_ADDRESS_PK not configured');
  }
  return Keypair.fromSecretKey(bs58.decode(pk));
}

async function getToken2022Mints(connection: Connection, owner: PublicKey): Promise<PublicKey[]> {
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  return tokenAccounts.value
    .filter((ta) => {
      const amount = ta.account.data.parsed?.info?.tokenAmount;
      return amount && Number(amount.amount) > 0;
    })
    .map((ta) => new PublicKey(ta.account.data.parsed.info.mint));
}

export async function executeDevnetAirdrop(recipientAddress: string): Promise<{
  success: boolean;
  solSignature?: string;
  tokenSignatures?: string[];
  bottlesSent: number;
  error?: string;
}> {
  const connection = getConnection();
  const masterKeypair = getMasterKeypair();
  const recipient = new PublicKey(recipientAddress);

  const availableMints = await getToken2022Mints(connection, masterKeypair.publicKey);
  const mintsToSend = availableMints.slice(0, BOTTLES_TO_SEND);

  if (mintsToSend.length < BOTTLES_TO_SEND) {
    return { success: false, bottlesSent: 0, error: `Only ${availableMints.length} bottle(s) available in master wallet, need ${BOTTLES_TO_SEND}` };
  }

  const solTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: masterKeypair.publicKey,
      toPubkey: recipient,
      lamports: SOL_AIRDROP_AMOUNT,
    })
  );

  let solSignature: string;
  try {
    solSignature = await sendAndConfirmTransaction(connection, solTx, [masterKeypair]);
  } catch (err: any) {
    return { success: false, bottlesSent: 0, error: `SOL transfer failed: ${err.message}` };
  }

  const tokenSignatures: string[] = [];
  let bottlesSent = 0;

  for (const mint of mintsToSend) {
    try {
      const sourceAta = getAssociatedTokenAddressSync(mint, masterKeypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
      const destAta = getAssociatedTokenAddressSync(mint, recipient, false, TOKEN_2022_PROGRAM_ID);

      const tx = new Transaction();

      let destAccountExists = false;
      try {
        await getAccount(connection, destAta, 'confirmed', TOKEN_2022_PROGRAM_ID);
        destAccountExists = true;
      } catch {
        destAccountExists = false;
      }

      if (!destAccountExists) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            masterKeypair.publicKey,
            destAta,
            recipient,
            mint,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );
      }

      tx.add(
        createTransferInstruction(
          sourceAta,
          destAta,
          masterKeypair.publicKey,
          1,
          [],
          TOKEN_2022_PROGRAM_ID
        )
      );

      const sig = await sendAndConfirmTransaction(connection, tx, [masterKeypair]);
      tokenSignatures.push(sig);
      bottlesSent++;
    } catch (err: any) {
      console.error(`Failed to transfer mint ${mint.toBase58()}:`, err.message);
    }
  }

  if (bottlesSent < BOTTLES_TO_SEND) {
    return {
      success: false,
      solSignature,
      tokenSignatures,
      bottlesSent,
      error: `Only ${bottlesSent} of ${BOTTLES_TO_SEND} bottles transferred successfully (SOL was sent)`,
    };
  }

  return {
    success: true,
    solSignature,
    tokenSignatures,
    bottlesSent,
  };
}
