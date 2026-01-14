import { FeeAmount, FeeSource } from './FeeSource.js';
import { logger } from '../../utils/logger.js';

interface ApiFeeResponse {
  fees: Array<{
    amount: string;
    mint: string;
    timestamp: number;
    signature?: string;
  }>;
  cursor?: string;
}

/**
 * ApiFeeSource
 * 
 * Periodically polls Bonkers API for accumulated creator fees
 */
export class ApiFeeSource implements FeeSource {
  private lastCursor?: string;
  private initialized = false;

  constructor(
    private readonly apiUrl: string,
    private readonly apiKey?: string
  ) {}

  async initialize(): Promise<void> {
    logger.info({ apiUrl: this.apiUrl }, 'ApiFeeSource initialized');
    this.initialized = true;
  }

  async getAvailableFees(): Promise<FeeAmount[]> {
    if (!this.initialized) {
      throw new Error('ApiFeeSource not initialized');
    }

    try {
      // TODO: Implement actual API call
      // This is a placeholder showing the expected structure
      logger.warn('ApiFeeSource.getAvailableFees() - TODO: implement actual API integration');

      const url = new URL(this.apiUrl);
      if (this.lastCursor) {
        url.searchParams.set('cursor', this.lastCursor);
      }

      // Example fetch (commented out - needs real endpoint):
      // const response = await fetch(url.toString(), {
      //   headers: {
      //     'Authorization': `Bearer ${this.apiKey}`,
      //     'Content-Type': 'application/json',
      //   },
      // });
      //
      // if (!response.ok) {
      //   throw new Error(`API request failed: ${response.statusText}`);
      // }
      //
      // const data: ApiFeeResponse = await response.json();
      // this.lastCursor = data.cursor;
      //
      // return data.fees.map((f) => ({
      //   amount: BigInt(f.amount),
      //   mint: f.mint,
      //   timestamp: f.timestamp,
      //   signature: f.signature,
      // }));

      return [];
    } catch (error) {
      logger.error({ error }, 'Failed to fetch fees from API');
      throw error;
    }
  }

  async acknowledgeFees(fees: FeeAmount[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('ApiFeeSource not initialized');
    }

    // In API polling mode, acknowledgment is implicit (cursor-based)
    logger.info({ count: fees.length }, 'Acknowledged %d fees (API cursor updated)', fees.length);
  }

  async shutdown(): Promise<void> {
    logger.info('ApiFeeSource shutdown');
    this.initialized = false;
  }
}
