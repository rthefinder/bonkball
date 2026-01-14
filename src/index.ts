import { PublicKey } from '@solana/web3.js';

import { getConfig } from './config/env.js';
import { createConnection, loadOperatorKeypair } from './solana/client.js';
import { logger } from './utils/logger.js';
import { EpochScheduler } from './core/executor/EpochScheduler.js';
import { ExecutionEngine } from './core/executor/ExecutionEngine.js';
import { RiskManager } from './core/risk/RiskManager.js';
import { CircuitBreaker } from './core/risk/CircuitBreaker.js';
import { ReportWriter } from './core/reporting/ReportWriter.js';
import { MockFeeSource } from './core/feeSource/MockFeeSource.js';
import { WebhookFeeSource } from './core/feeSource/WebhookFeeSource.js';
import { ApiFeeSource } from './core/feeSource/ApiFeeSource.js';
import { WalletWatcherFeeSource } from './core/feeSource/WalletWatcherFeeSource.js';
import { MockSwapEngine, MockLPAdder } from './dex/mock.js';
import { RaydiumSwapEngine, RaydiumLPAdder } from './dex/raydium.js';
import { FeeSource } from './core/feeSource/FeeSource.js';
import { SwapEngine, LPAdder } from './dex/interfaces.js';

/**
 * Main application entrypoint
 */
async function main() {
  logger.info('🎱 Bonkball Execution Engine starting...');

  const config = getConfig();

  logger.info({
    network: config.SOLANA_NETWORK,
    feeSourceType: config.FEE_SOURCE_TYPE,
    dexProvider: config.DEX_PROVIDER,
    dryRun: config.DRY_RUN,
    epochInterval: config.EPOCH_INTERVAL_SECONDS,
  }, 'Configuration loaded');

  try {
    // Initialize Solana connection
    const connection = createConnection();
    const operatorKeypair = loadOperatorKeypair();

    logger.info(
      { operator: operatorKeypair.publicKey.toBase58() },
      'Operator wallet: %s',
      operatorKeypair.publicKey.toBase58()
    );

    // Initialize fee source
    const feeSource = await initializeFeeSource(connection, config);

    // Initialize DEX components
    const { swapEngine, lpAdder } = await initializeDEX(connection, operatorKeypair, config);

    // Initialize risk management
    const riskManager = new RiskManager({
      maxBudgetPerEpochSol: config.MAX_BUDGET_PER_EPOCH_SOL,
      minIntervalSeconds: config.MIN_INTERVAL_SECONDS,
      maxSlippageBps: config.MAX_SLIPPAGE_BPS,
      maxPriceImpactBps: config.MAX_PRICE_IMPACT_BPS,
      minLiquidityThresholdSol: config.MIN_LIQUIDITY_THRESHOLD_SOL,
    });

    const circuitBreaker = new CircuitBreaker({
      failureThreshold: config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      timeoutSeconds: config.CIRCUIT_BREAKER_TIMEOUT_SECONDS,
    });

    // Initialize reporting
    const reportWriter = new ReportWriter();

    // Token mint (if configured)
    const tokenMint = config.TOKEN_MINT_ADDRESS
      ? new PublicKey(config.TOKEN_MINT_ADDRESS)
      : PublicKey.default;

    // Initialize execution engine
    const executionEngine = new ExecutionEngine({
      connection,
      feeSource,
      swapEngine,
      lpAdder,
      riskManager,
      circuitBreaker,
      reportWriter,
      tokenMint,
      operatorKeypair,
      allocation: {
        buybackPct: config.BUYBACK_PCT,
        addLpPct: config.ADD_LP_PCT,
        burnPctOfBuyback: config.BURN_PCT_OF_BUYBACK,
        treasuryPct: config.TREASURY_PCT,
      },
      dryRun: config.DRY_RUN,
    });

    // Initialize scheduler
    const scheduler = new EpochScheduler(
      config.EPOCH_INTERVAL_SECONDS,
      async () => {
        await executionEngine.executeEpoch();
      }
    );

    // Start scheduler
    scheduler.start();

    logger.info('✅ Bonkball Execution Engine started successfully');

    if (config.DRY_RUN) {
      logger.warn('⚠️  DRY RUN MODE - No actual transactions will be executed');
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      scheduler.stop();
      await feeSource.shutdown();
      await swapEngine.shutdown();
      await lpAdder.shutdown();
      logger.info('Shutdown complete');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      scheduler.stop();
      await feeSource.shutdown();
      await swapEngine.shutdown();
      await lpAdder.shutdown();
      logger.info('Shutdown complete');
      process.exit(0);
    });

  } catch (error) {
    logger.error({ error }, 'Failed to start Bonkball Execution Engine');
    process.exit(1);
  }
}

/**
 * Initialize fee source based on configuration
 */
async function initializeFeeSource(connection: any, config: any): Promise<FeeSource> {
  let feeSource: FeeSource;

  switch (config.FEE_SOURCE_TYPE) {
    case 'webhook':
      feeSource = new WebhookFeeSource({
        validateSignature: !!config.WEBHOOK_SECRET,
      });
      logger.info('Using WebhookFeeSource (requires webhook server)');
      break;

    case 'api':
      if (!config.FEE_API_URL) {
        throw new Error('FEE_API_URL required for API fee source');
      }
      feeSource = new ApiFeeSource(config.FEE_API_URL, config.FEE_API_KEY);
      logger.info('Using ApiFeeSource');
      break;

    case 'wallet':
      if (!config.FEE_COLLECTOR_WALLET) {
        throw new Error('FEE_COLLECTOR_WALLET required for wallet fee source');
      }
      feeSource = new WalletWatcherFeeSource(
        connection,
        new PublicKey(config.FEE_COLLECTOR_WALLET)
      );
      logger.info('Using WalletWatcherFeeSource');
      break;

    case 'mock':
    default:
      feeSource = new MockFeeSource({ generateOnGet: true, baseAmount: 100_000_000n });
      logger.info('Using MockFeeSource (testing)');
      break;
  }

  await feeSource.initialize();
  return feeSource;
}

/**
 * Initialize DEX components based on configuration
 */
async function initializeDEX(
  connection: any,
  payer: any,
  config: any
): Promise<{ swapEngine: SwapEngine; lpAdder: LPAdder }> {
  let swapEngine: SwapEngine;
  let lpAdder: LPAdder;

  switch (config.DEX_PROVIDER) {
    case 'raydium':
      const poolAddress = config.DEX_POOL_ADDRESS
        ? new PublicKey(config.DEX_POOL_ADDRESS)
        : undefined;

      swapEngine = new RaydiumSwapEngine(connection, payer, poolAddress);
      lpAdder = new RaydiumLPAdder(connection, payer, poolAddress);
      logger.info('Using Raydium DEX (partial implementation)');
      break;

    case 'mock':
    default:
      swapEngine = new MockSwapEngine();
      lpAdder = new MockLPAdder();
      logger.info('Using Mock DEX (testing)');
      break;
  }

  await swapEngine.initialize();
  await lpAdder.initialize();

  return { swapEngine, lpAdder };
}

// Start the application
main().catch((error) => {
  logger.error({ error }, 'Unhandled error in main');
  process.exit(1);
});
