import { FeeAmount, FeeSource } from './FeeSource.js';
import { logger } from '../../utils/logger.js';

interface WebhookFeeEvent {
  amount: string;
  mint: string;
  timestamp: number;
  signature?: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebhookFeeSource
 * 
 * Receives fee events pushed from Bonkers platform via webhook
 * Events are stored in memory queue until processed
 */
export class WebhookFeeSource implements FeeSource {
  private feeQueue: FeeAmount[] = [];
  private initialized = false;

  constructor(private readonly options: { validateSignature?: boolean } = {}) {}

  async initialize(): Promise<void> {
    logger.info('WebhookFeeSource initialized (events pushed via webhook server)');
    this.initialized = true;
  }

  /**
   * Called by webhook server when event is received
   */
  async receiveWebhookEvent(event: WebhookFeeEvent): Promise<void> {
    if (!this.initialized) {
      throw new Error('WebhookFeeSource not initialized');
    }

    try {
      const feeAmount: FeeAmount = {
        amount: BigInt(event.amount),
        mint: event.mint,
        timestamp: event.timestamp,
        signature: event.signature,
        metadata: event.metadata,
      };

      this.feeQueue.push(feeAmount);
      logger.info(
        { fee: feeAmount },
        'Received webhook fee event: %s lamports from mint %s',
        feeAmount.amount.toString(),
        feeAmount.mint
      );
    } catch (error) {
      logger.error({ error, event }, 'Failed to process webhook event');
      throw error;
    }
  }

  async getAvailableFees(): Promise<FeeAmount[]> {
    if (!this.initialized) {
      throw new Error('WebhookFeeSource not initialized');
    }

    const fees = [...this.feeQueue];
    logger.debug({ count: fees.length }, 'Retrieved %d fees from webhook queue', fees.length);
    return fees;
  }

  async acknowledgeFees(fees: FeeAmount[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('WebhookFeeSource not initialized');
    }

    // Remove acknowledged fees from queue
    const ackTimestamps = new Set(fees.map((f) => f.timestamp));
    this.feeQueue = this.feeQueue.filter((f) => !ackTimestamps.has(f.timestamp));

    logger.info({ count: fees.length }, 'Acknowledged %d fees', fees.length);
  }

  async shutdown(): Promise<void> {
    logger.info('WebhookFeeSource shutdown');
    this.initialized = false;
    this.feeQueue = [];
  }
}
