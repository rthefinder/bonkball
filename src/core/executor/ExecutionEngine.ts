import { Connection, PublicKey } from '@solana/web3.js';

import { FeeAmount, FeeSource } from '../feeSource/FeeSource.js';
import { CircuitBreaker } from '../risk/CircuitBreaker.js';
import { RiskManager } from '../risk/RiskManager.js';
import { SwapEngine, LPAdder } from '../../dex/interfaces.js';
import { burnTokens } from '../../solana/spl.js';
import { ReportWriter, ExecutionReport } from '../reporting/ReportWriter.js';
import { logger } from '../../utils/logger.js';
import { lamportsToSol, solToLamports } from '../../utils/math.js';

export interface AllocationConfig {
  buybackPct: number;
  addLpPct: number;
  burnPctOfBuyback: number;
  treasuryPct: number;
}

export interface ExecutionEngineConfig {
  connection: Connection;
  feeSource: FeeSource;
  swapEngine: SwapEngine;
  lpAdder: LPAdder;
  riskManager: RiskManager;
  circuitBreaker: CircuitBreaker;
  reportWriter: ReportWriter;
  tokenMint: PublicKey;
  operatorKeypair: any; // Keypair
  allocation: AllocationConfig;
  dryRun: boolean;
}

/**
 * ExecutionEngine
 * 
 * Core orchestrator for:
 * 1. Fetching fees
 * 2. Executing buybacks
 * 3. Burning tokens
 * 4. Adding liquidity
 * 5. Generating reports
 */
export class ExecutionEngine {
  constructor(private readonly config: ExecutionEngineConfig) {}

  /**
   * Execute one epoch
   */
  async executeEpoch(): Promise<void> {
    logger.info('Executing epoch...');

    // 1. Check circuit breaker
    if (!this.config.circuitBreaker.canExecute()) {
      logger.error('Circuit breaker is OPEN - aborting epoch');
      throw new Error('Circuit breaker is open');
    }

    // 2. Check timing constraints
    if (!this.config.riskManager.canExecuteNow()) {
      logger.warn('Minimum interval not elapsed - skipping epoch');
      return;
    }

    try {
      // 3. Fetch available fees
      const fees = await this.config.feeSource.getAvailableFees();

      if (fees.length === 0) {
        logger.info('No fees available - skipping epoch');
        return;
      }

      // 4. Calculate total SOL (normalize if needed)
      const totalSol = this.calculateTotalSol(fees);
      logger.info({ totalSol, feeCount: fees.length }, 'Total fees: %f SOL', totalSol);

      // 5. Build execution plan
      const plan = this.buildExecutionPlan(totalSol);
      logger.info({ plan }, 'Execution plan: %j', plan);

      // 6. Validate plan
      const validation = this.config.riskManager.validatePlan(plan);
      if (!validation.valid) {
        logger.error({ reason: validation.reason }, 'Plan validation failed: %s', validation.reason);
        throw new Error(`Plan validation failed: ${validation.reason}`);
      }

      // 7. Execute plan
      const report = await this.executePlan(plan, fees);

      // 8. Write report
      await this.config.reportWriter.writeReport(report);
      logger.info({ reportId: report.epochId }, 'Report written successfully');

      // 9. Acknowledge fees
      await this.config.feeSource.acknowledgeFees(fees);

      // 10. Record successful execution
      this.config.riskManager.recordExecution();
      this.config.circuitBreaker.recordSuccess();

      logger.info('Epoch completed successfully');
    } catch (error) {
      logger.error({ error }, 'Epoch execution failed');
      this.config.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * Calculate total SOL from fees
   */
  private calculateTotalSol(fees: FeeAmount[]): number {
    let totalLamports = 0n;

    for (const fee of fees) {
      // Assume all fees are in SOL for now
      // TODO: Handle USDC and other tokens with conversion
      if (fee.mint === 'So11111111111111111111111111111111111111112') {
        totalLamports += fee.amount;
      } else {
        logger.warn({ mint: fee.mint }, 'Non-SOL fee detected, skipping (TODO: implement conversion)');
      }
    }

    return lamportsToSol(totalLamports);
  }

  /**
   * Build execution plan from total SOL
   */
  private buildExecutionPlan(totalSol: number) {
    const { buybackPct, addLpPct, treasuryPct } = this.config.allocation;

    const buybackAmountSol = (totalSol * buybackPct) / 100;
    const addLpAmountSol = (totalSol * addLpPct) / 100;
    const treasuryAmountSol = (totalSol * treasuryPct) / 100;

    return {
      buybackAmountSol,
      addLpAmountSol,
      treasuryAmountSol,
      totalSol,
    };
  }

  /**
   * Execute the plan
   */
  private async executePlan(plan: any, fees: FeeAmount[]): Promise<ExecutionReport> {
    const report: ExecutionReport = {
      epochId: Date.now(),
      timestamp: new Date().toISOString(),
      dryRun: this.config.dryRun,
      fees: fees.map((f) => ({
        amount: f.amount.toString(),
        mint: f.mint,
        timestamp: f.timestamp,
      })),
      plan,
      transactions: [],
      summary: '',
    };

    // Step 1: Buyback
    if (plan.buybackAmountSol > 0) {
      logger.info({ amount: plan.buybackAmountSol }, 'Executing buyback: %f SOL', plan.buybackAmountSol);

      if (!this.config.dryRun) {
        try {
          const swapResult = await this.config.swapEngine.swap({
            inputMint: 'So11111111111111111111111111111111111111112',
            outputMint: this.config.tokenMint.toBase58(),
            amountIn: solToLamports(plan.buybackAmountSol),
            slippageBps: 300,
          });

          report.transactions.push({
            type: 'buyback',
            signature: swapResult.signature,
            amountIn: plan.buybackAmountSol,
            amountOut: lamportsToSol(swapResult.amountOut),
          });

          // Step 2: Burn portion of bought tokens
          const burnPct = this.config.allocation.burnPctOfBuyback;
          if (burnPct > 0) {
            const burnAmount = (swapResult.amountOut * BigInt(burnPct)) / 100n;
            logger.info({ amount: lamportsToSol(burnAmount) }, 'Burning %f tokens', lamportsToSol(burnAmount));

            const burnSig = await burnTokens(
              this.config.connection,
              this.config.operatorKeypair,
              this.config.tokenMint,
              burnAmount
            );

            report.transactions.push({
              type: 'burn',
              signature: burnSig,
              amount: lamportsToSol(burnAmount),
            });
          }
        } catch (error) {
          logger.error({ error }, 'Buyback failed');
          throw error;
        }
      } else {
        logger.info('[DRY RUN] Would execute buyback');
      }
    }

    // Step 3: Add liquidity
    if (plan.addLpAmountSol > 0) {
      logger.info({ amount: plan.addLpAmountSol }, 'Adding liquidity: %f SOL', plan.addLpAmountSol);

      if (!this.config.dryRun) {
        try {
          const lpResult = await this.config.lpAdder.addLiquidity({
            tokenMint: this.config.tokenMint.toBase58(),
            quoteMint: 'So11111111111111111111111111111111111111112',
            tokenAmount: 0n, // TODO: Calculate token amount
            quoteAmount: solToLamports(plan.addLpAmountSol),
          });

          report.transactions.push({
            type: 'add_liquidity',
            signature: lpResult.signature,
            amountSol: plan.addLpAmountSol,
          });
        } catch (error) {
          logger.error({ error }, 'Add liquidity failed');
          throw error;
        }
      } else {
        logger.info('[DRY RUN] Would add liquidity');
      }
    }

    // Generate summary
    report.summary = this.generateSummary(report);

    return report;
  }

  /**
   * Generate tweet-ready summary
   */
  private generateSummary(report: ExecutionReport): string {
    const { plan } = report;
    const txCount = report.transactions.length;

    return `🎱 $BONKBALL Epoch ${report.epochId}\n\n` +
      `💰 Fees: ${plan.totalSol.toFixed(4)} SOL\n` +
      `🔄 Buyback: ${plan.buybackAmountSol.toFixed(4)} SOL\n` +
      `🔥 Burned: ${(plan.buybackAmountSol * this.config.allocation.burnPctOfBuyback / 100).toFixed(4)} SOL worth\n` +
      `💧 LP Added: ${plan.addLpAmountSol.toFixed(4)} SOL\n` +
      `✅ Transactions: ${txCount}\n\n` +
      `${this.config.dryRun ? '⚠️ DRY RUN' : '✅ LIVE'}`;
  }
}
