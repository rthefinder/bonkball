import { logger } from '../src/utils/logger.js';
import { getConfig } from '../src/config/env.js';
import { MockFeeSource } from '../src/core/feeSource/MockFeeSource.js';

/**
 * Simulate a single epoch execution
 * 
 * Usage: pnpm script:simulate-epoch
 */
async function simulateEpoch() {
  logger.info('Simulating epoch execution...');

  try {
    const config = getConfig();

    // Create mock fee source with test data
    const feeSource = new MockFeeSource({
      generateOnGet: true,
      baseAmount: 500_000_000n, // 0.5 SOL
    });

    await feeSource.initialize();

    // Inject some test fees
    feeSource.injectFee({
      amount: 250_000_000n, // 0.25 SOL
      mint: 'So11111111111111111111111111111111111111112',
      timestamp: Date.now(),
      metadata: { source: 'simulation' },
    });

    // Get fees
    const fees = await feeSource.getAvailableFees();
    logger.info({ fees }, 'Available fees: %d', fees.length);

    // Calculate allocation
    const totalLamports = fees.reduce((sum, f) => sum + f.amount, 0n);
    const totalSol = Number(totalLamports) / 1_000_000_000;

    logger.info({ totalSol }, 'Total fees: %f SOL', totalSol);

    const buybackSol = (totalSol * config.BUYBACK_PCT) / 100;
    const addLpSol = (totalSol * config.ADD_LP_PCT) / 100;
    const burnPct = config.BURN_PCT_OF_BUYBACK;

    logger.info({
      buybackSol,
      addLpSol,
      burnPct,
    }, 'Allocation plan:');
    logger.info('  Buyback: %f SOL (%d%%)', buybackSol, config.BUYBACK_PCT);
    logger.info('  Add LP: %f SOL (%d%%)', addLpSol, config.ADD_LP_PCT);
    logger.info('  Burn: %d%% of bought tokens', burnPct);

    // Acknowledge fees
    await feeSource.acknowledgeFees(fees);
    await feeSource.shutdown();

    logger.info('✅ Epoch simulation complete');

  } catch (error) {
    logger.error({ error }, '❌ Simulation failed');
    process.exit(1);
  }
}

simulateEpoch();
