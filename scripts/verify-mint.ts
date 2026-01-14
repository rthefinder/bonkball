import { PublicKey } from '@solana/web3.js';

import { createConnection } from '../src/solana/client.js';
import { getMintInfo } from '../src/solana/spl.js';
import { getConfig } from '../src/config/env.js';
import { logger } from '../src/utils/logger.js';

/**
 * Verify token mint configuration
 * 
 * Usage: pnpm script:verify-mint
 */
async function verifyMint() {
  logger.info('Verifying token mint...');

  try {
    const config = getConfig();

    if (!config.TOKEN_MINT_ADDRESS) {
      logger.error('TOKEN_MINT_ADDRESS not set in environment');
      process.exit(1);
    }

    const connection = createConnection();
    const mintAddress = new PublicKey(config.TOKEN_MINT_ADDRESS);

    logger.info({ mint: mintAddress.toBase58() }, 'Checking mint: %s', mintAddress.toBase58());

    const mintInfo = await getMintInfo(connection, mintAddress);

    logger.info({
      mint: mintAddress.toBase58(),
      decimals: mintInfo.decimals,
      supply: mintInfo.supply.toString(),
      mintAuthority: mintInfo.mintAuthority?.toBase58(),
      freezeAuthority: mintInfo.freezeAuthority?.toBase58(),
    }, 'Mint verification successful');

    logger.info('✅ Token mint is valid');

    if (mintInfo.decimals !== config.TOKEN_DECIMALS) {
      logger.warn(
        { expected: config.TOKEN_DECIMALS, actual: mintInfo.decimals },
        '⚠️  Decimals mismatch! Update TOKEN_DECIMALS in .env'
      );
    }

  } catch (error) {
    logger.error({ error }, '❌ Failed to verify mint');
    process.exit(1);
  }
}

verifyMint();
