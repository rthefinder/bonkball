import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

import { FeeAmount, FeeSource } from './FeeSource.js';
import { logger } from '../../utils/logger.js';

/**
 * WalletWatcherFeeSource
 * 
 * Monitors a specific wallet for incoming SOL/USDC transfers
 * representing creator fees
 */
export class WalletWatcherFeeSource implements FeeSource {
  private lastSignature?: string;
  private initialized = false;
  private pollInterval?: NodeJS.Timeout;

  constructor(
    private readonly connection: Connection,
    private readonly walletAddress: PublicKey,
    private readonly options: {
      pollIntervalMs?: number;
    } = {}
  ) {}

  async initialize(): Promise<void> {
    logger.info(
      { wallet: this.walletAddress.toBase58() },
      'WalletWatcherFeeSource initialized'
    );
    this.initialized = true;

    // Optionally start background polling (for continuous monitoring)
    // In practice, getAvailableFees() is called by the executor
  }

  async getAvailableFees(): Promise<FeeAmount[]> {
    if (!this.initialized) {
      throw new Error('WalletWatcherFeeSource not initialized');
    }

    try {
      // Fetch recent transactions
      const signatures = await this.connection.getSignaturesForAddress(this.walletAddress, {
        limit: 10,
        before: this.lastSignature,
      });

      if (signatures.length === 0) {
        return [];
      }

      // Update cursor
      this.lastSignature = signatures[0].signature;

      // Parse transactions for incoming transfers
      const fees: FeeAmount[] = [];

      for (const sigInfo of signatures) {
        try {
          const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx) continue;

          const incomingAmount = this.extractIncomingAmount(tx);
          if (incomingAmount > 0n) {
            fees.push({
              amount: incomingAmount,
              mint: 'So11111111111111111111111111111111111111112', // Native SOL
              timestamp: (sigInfo.blockTime || 0) * 1000,
              signature: sigInfo.signature,
            });
          }
        } catch (error) {
          logger.error({ error, signature: sigInfo.signature }, 'Failed to parse transaction');
        }
      }

      logger.info({ count: fees.length }, 'Found %d fee transactions', fees.length);
      return fees;
    } catch (error) {
      logger.error({ error }, 'Failed to fetch wallet transactions');
      throw error;
    }
  }

  private extractIncomingAmount(tx: ParsedTransactionWithMeta): bigint {
    // TODO: Implement proper parsing of incoming SOL/SPL transfers
    // This is a simplified version
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];

    if (preBalances.length === 0 || postBalances.length === 0) {
      return 0n;
    }

    // Find our wallet's index in accounts
    const accountIndex = tx.transaction.message.accountKeys.findIndex(
      (key) => key.pubkey.equals(this.walletAddress)
    );

    if (accountIndex === -1) {
      return 0n;
    }

    const preBalance = BigInt(preBalances[accountIndex] || 0);
    const postBalance = BigInt(postBalances[accountIndex] || 0);
    const diff = postBalance - preBalance;

    return diff > 0n ? diff : 0n;
  }

  async acknowledgeFees(fees: FeeAmount[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('WalletWatcherFeeSource not initialized');
    }

    logger.info({ count: fees.length }, 'Acknowledged %d fees', fees.length);
    // Fees are acknowledged via lastSignature cursor
  }

  async shutdown(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
    logger.info('WalletWatcherFeeSource shutdown');
    this.initialized = false;
  }
}
