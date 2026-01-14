/**
 * FeeSource interface
 * 
 * Abstraction for ingesting creator fees from various sources:
 * - Webhook (push)
 * - API (pull)
 * - Wallet watcher (on-chain monitoring)
 */

export interface FeeAmount {
  /** Amount in lamports (SOL) or smallest unit */
  amount: bigint;
  /** Asset mint address (SOL = native) */
  mint: string;
  /** Timestamp of fee collection */
  timestamp: number;
  /** Optional transaction signature */
  signature?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface FeeSource {
  /**
   * Initialize the fee source
   */
  initialize(): Promise<void>;

  /**
   * Get accumulated fees since last fetch
   * This should be idempotent - calling multiple times without new fees returns empty
   */
  getAvailableFees(): Promise<FeeAmount[]>;

  /**
   * Mark fees as consumed (acknowledged)
   */
  acknowledgeFees(fees: FeeAmount[]): Promise<void>;

  /**
   * Cleanup resources
   */
  shutdown(): Promise<void>;
}
