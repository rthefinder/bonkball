import { FeeAmount, FeeSource } from './FeeSource.js';
import { logger } from '../../utils/logger.js';

/**
 * MockFeeSource
 * 
 * Generates synthetic fee events for testing and development
 */
export class MockFeeSource implements FeeSource {
  private initialized = false;
  private mockFees: FeeAmount[] = [];

  constructor(
    private readonly options: {
      generateOnGet?: boolean;
      baseAmount?: bigint;
    } = {}
  ) {}

  async initialize(): Promise<void> {
    logger.info('MockFeeSource initialized (synthetic fees)');
    this.initialized = true;
  }

  async getAvailableFees(): Promise<FeeAmount[]> {
    if (!this.initialized) {
      throw new Error('MockFeeSource not initialized');
    }

    if (this.options.generateOnGet && this.mockFees.length === 0) {
      // Generate a mock fee
      const baseAmount = this.options.baseAmount || 100_000_000n; // 0.1 SOL
      const variance = BigInt(Math.floor(Math.random() * 50_000_000)); // +/- 0.05 SOL

      this.mockFees.push({
        amount: baseAmount + variance,
        mint: 'So11111111111111111111111111111111111111112', // Native SOL
        timestamp: Date.now(),
        metadata: { source: 'mock' },
      });

      logger.info(
        { amount: this.mockFees[0].amount.toString() },
        'Generated mock fee: %s lamports',
        this.mockFees[0].amount.toString()
      );
    }

    return [...this.mockFees];
  }

  async acknowledgeFees(fees: FeeAmount[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('MockFeeSource not initialized');
    }

    this.mockFees = [];
    logger.info({ count: fees.length }, 'Acknowledged %d mock fees', fees.length);
  }

  /**
   * Manually inject a fee (for testing)
   */
  injectFee(fee: FeeAmount): void {
    this.mockFees.push(fee);
    logger.debug({ fee }, 'Injected mock fee');
  }

  async shutdown(): Promise<void> {
    logger.info('MockFeeSource shutdown');
    this.initialized = false;
    this.mockFees = [];
  }
}
