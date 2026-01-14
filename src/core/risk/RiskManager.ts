import { logger } from '../../utils/logger.js';

export interface RiskParameters {
  maxBudgetPerEpochSol: number;
  minIntervalSeconds: number;
  maxSlippageBps: number;
  maxPriceImpactBps: number;
  minLiquidityThresholdSol: number;
}

export interface ExecutionPlan {
  buybackAmountSol: number;
  addLpAmountSol: number;
  treasuryAmountSol: number;
  totalSol: number;
}

/**
 * RiskManager
 * 
 * Validates execution plans against risk parameters
 * Enforces safety limits and timing constraints
 */
export class RiskManager {
  private lastExecutionTime?: number;

  constructor(private readonly params: RiskParameters) {}

  /**
   * Validate if execution is allowed based on timing
   */
  canExecuteNow(): boolean {
    if (!this.lastExecutionTime) {
      return true;
    }

    const now = Date.now();
    const elapsed = (now - this.lastExecutionTime) / 1000;

    if (elapsed < this.params.minIntervalSeconds) {
      logger.warn(
        { elapsed, required: this.params.minIntervalSeconds },
        'Execution blocked: minimum interval not elapsed (%ds / %ds)',
        Math.floor(elapsed),
        this.params.minIntervalSeconds
      );
      return false;
    }

    return true;
  }

  /**
   * Validate execution plan
   */
  validatePlan(plan: ExecutionPlan): { valid: boolean; reason?: string } {
    // Check budget limit
    if (plan.totalSol > this.params.maxBudgetPerEpochSol) {
      return {
        valid: false,
        reason: `Total SOL (${plan.totalSol.toFixed(4)}) exceeds max budget per epoch (${this.params.maxBudgetPerEpochSol.toFixed(4)})`,
      };
    }

    // Check for negative amounts
    if (plan.buybackAmountSol < 0 || plan.addLpAmountSol < 0 || plan.treasuryAmountSol < 0) {
      return {
        valid: false,
        reason: 'Execution plan contains negative amounts',
      };
    }

    // All checks passed
    return { valid: true };
  }

  /**
   * Validate swap parameters
   */
  validateSwap(params: {
    inputAmount: bigint;
    expectedOutput: bigint;
    minOutputAmount: bigint;
    actualSlippageBps: number;
    priceImpactBps: number;
  }): { valid: boolean; reason?: string } {
    // Check slippage
    if (params.actualSlippageBps > this.params.maxSlippageBps) {
      return {
        valid: false,
        reason: `Slippage (${params.actualSlippageBps}bps) exceeds max (${this.params.maxSlippageBps}bps)`,
      };
    }

    // Check price impact
    if (params.priceImpactBps > this.params.maxPriceImpactBps) {
      return {
        valid: false,
        reason: `Price impact (${params.priceImpactBps}bps) exceeds max (${this.params.maxPriceImpactBps}bps)`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate liquidity threshold
   */
  validateLiquidity(liquiditySol: number): { valid: boolean; reason?: string } {
    if (liquiditySol < this.params.minLiquidityThresholdSol) {
      return {
        valid: false,
        reason: `Liquidity (${liquiditySol.toFixed(4)} SOL) below minimum threshold (${this.params.minLiquidityThresholdSol.toFixed(4)} SOL)`,
      };
    }

    return { valid: true };
  }

  /**
   * Record successful execution
   */
  recordExecution(): void {
    this.lastExecutionTime = Date.now();
    logger.info({ timestamp: this.lastExecutionTime }, 'Recorded execution timestamp');
  }

  /**
   * Get time until next allowed execution
   */
  getTimeUntilNextExecution(): number {
    if (!this.lastExecutionTime) {
      return 0;
    }

    const now = Date.now();
    const elapsed = (now - this.lastExecutionTime) / 1000;
    const remaining = Math.max(0, this.params.minIntervalSeconds - elapsed);

    return remaining;
  }
}
