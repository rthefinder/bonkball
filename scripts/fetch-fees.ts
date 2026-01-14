import { logger } from '../src/utils/logger.js';
import { getConfig } from '../src/config/env.js';

/**
 * Fetch available creator fees
 * 
 * Usage: pnpm script:fetch-fees
 */
async function fetchFees() {
  logger.info('Fetching creator fees...');

  try {
    const config = getConfig();

    logger.info({ feeSourceType: config.FEE_SOURCE_TYPE }, 'Fee source type: %s', config.FEE_SOURCE_TYPE);

    // TODO: Initialize actual fee source and fetch fees
    logger.warn('Fee fetching not fully implemented - configure your fee source');

    logger.info('Configure one of:');
    logger.info('  - FEE_SOURCE_TYPE=webhook + WEBHOOK_PORT + WEBHOOK_SECRET');
    logger.info('  - FEE_SOURCE_TYPE=api + FEE_API_URL + FEE_API_KEY');
    logger.info('  - FEE_SOURCE_TYPE=wallet + FEE_COLLECTOR_WALLET');
    logger.info('  - FEE_SOURCE_TYPE=mock (for testing)');

  } catch (error) {
    logger.error({ error }, 'Failed to fetch fees');
    process.exit(1);
  }
}

fetchFees();
