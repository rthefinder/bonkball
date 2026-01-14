import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAccount,
  getMint,
  getOrCreateAssociatedTokenAccount,
  burn,
  createBurnInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

import { logger } from '../utils/logger.js';

/**
 * Get token mint information
 */
export async function getMintInfo(connection: Connection, mintAddress: PublicKey) {
  try {
    const mintInfo = await getMint(connection, mintAddress);
    logger.debug(
      {
        mint: mintAddress.toBase58(),
        decimals: mintInfo.decimals,
        supply: mintInfo.supply.toString(),
      },
      'Retrieved mint info'
    );
    return mintInfo;
  } catch (error) {
    logger.error({ error, mint: mintAddress.toBase58() }, 'Failed to get mint info');
    throw error;
  }
}

/**
 * Get or create associated token account
 */
export async function getOrCreateATA(
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  owner: PublicKey
) {
  try {
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      owner
    );

    logger.debug(
      {
        ata: ata.address.toBase58(),
        mint: mint.toBase58(),
        owner: owner.toBase58(),
      },
      'Got or created ATA'
    );

    return ata;
  } catch (error) {
    logger.error({ error, mint: mint.toBase58(), owner: owner.toBase58() }, 'Failed to get/create ATA');
    throw error;
  }
}

/**
 * Get token account balance
 */
export async function getTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<bigint> {
  try {
    const account = await getAccount(connection, tokenAccount);
    return account.amount;
  } catch (error) {
    logger.error({ error, tokenAccount: tokenAccount.toBase58() }, 'Failed to get token balance');
    throw error;
  }
}

/**
 * Burn tokens from owner's account
 */
export async function burnTokens(
  connection: Connection,
  owner: Keypair,
  mint: PublicKey,
  amount: bigint
): Promise<string> {
  try {
    logger.info(
      { mint: mint.toBase58(), amount: amount.toString(), owner: owner.publicKey.toBase58() },
      'Burning %s tokens',
      amount.toString()
    );

    // Get owner's token account
    const ata = await getOrCreateATA(connection, owner, mint, owner.publicKey);

    // Execute burn
    const signature = await burn(
      connection,
      owner,
      ata.address,
      mint,
      owner,
      amount
    );

    logger.info(
      { signature, amount: amount.toString() },
      'Burned %s tokens, signature: %s',
      amount.toString(),
      signature
    );

    return signature;
  } catch (error) {
    logger.error({ error, mint: mint.toBase58(), amount: amount.toString() }, 'Failed to burn tokens');
    throw error;
  }
}

/**
 * Transfer SPL tokens
 */
export async function transferTokens(
  connection: Connection,
  from: Keypair,
  to: PublicKey,
  mint: PublicKey,
  amount: bigint
): Promise<string> {
  try {
    const { transfer } = await import('@solana/spl-token');
    
    const fromAta = await getOrCreateATA(connection, from, mint, from.publicKey);
    const toAta = await getOrCreateATA(connection, from, mint, to);

    const signature = await transfer(
      connection,
      from,
      fromAta.address,
      toAta.address,
      from,
      amount
    );

    logger.info(
      { signature, amount: amount.toString(), from: from.publicKey.toBase58(), to: to.toBase58() },
      'Transferred %s tokens',
      amount.toString()
    );

    return signature;
  } catch (error) {
    logger.error({ error }, 'Failed to transfer tokens');
    throw error;
  }
}
