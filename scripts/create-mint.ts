import { Keypair } from '@solana/web3.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

import { createConnection } from '../src/solana/client.js';
import { logger } from '../src/utils/logger.js';

/**
 * Create a new SPL token mint
 * 
 * Usage: pnpm script:create-mint
 */
async function createMint() {
  logger.info('Creating new token mint...');

  try {
    const connection = createConnection();
    const { createMint: splCreateMint } = await import('@solana/spl-token');
    const payer = Keypair.generate();

    // In production, use your actual keypair
    logger.warn('Using temporary keypair - fund it first or use actual keypair');
    logger.info({ publicKey: payer.publicKey.toBase58() }, 'Payer: %s', payer.publicKey.toBase58());

    // TODO: Request airdrop on devnet or ensure sufficient funds
    // await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);

    const mintKeypair = Keypair.generate();
    
    logger.info('Creating mint with 9 decimals...');
    
    const mint = await splCreateMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      payer.publicKey, // freeze authority
      9 // decimals
    );

    logger.info({ mint: mint.toBase58() }, 'Token mint created: %s', mint.toBase58());

    // Save mint info
    const mintInfo = {
      mintAddress: mint.toBase58(),
      decimals: 9,
      authority: payer.publicKey.toBase58(),
      network: process.env.SOLANA_NETWORK || 'devnet',
      createdAt: new Date().toISOString(),
    };

    const outputPath = join(process.cwd(), 'mint-info.json');
    writeFileSync(outputPath, JSON.stringify(mintInfo, null, 2));

    logger.info({ path: outputPath }, 'Mint info saved to: %s', outputPath);
    logger.info('Add TOKEN_MINT_ADDRESS=%s to your .env file', mint.toBase58());

  } catch (error) {
    logger.error({ error }, 'Failed to create mint');
    process.exit(1);
  }
}

createMint();
