import cron from 'node-cron';

import { logger } from '../../utils/logger.js';

export type EpochHandler = () => Promise<void>;

/**
 * EpochScheduler
 * 
 * Manages periodic execution using cron scheduling
 */
export class EpochScheduler {
  private task?: cron.ScheduledTask;
  private isRunning = false;
  private executionCount = 0;

  constructor(
    private readonly intervalSeconds: number,
    private readonly handler: EpochHandler
  ) {}

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.task) {
      logger.warn('Scheduler already running');
      return;
    }

    // Convert interval to cron expression
    const cronExpression = this.intervalToCron(this.intervalSeconds);

    logger.info(
      { intervalSeconds: this.intervalSeconds, cronExpression },
      'Starting epoch scheduler: every %d seconds',
      this.intervalSeconds
    );

    this.task = cron.schedule(cronExpression, async () => {
      await this.executeEpoch();
    });

    logger.info('Epoch scheduler started');
  }

  /**
   * Execute an epoch immediately (manual trigger)
   */
  async executeNow(): Promise<void> {
    logger.info('Manual epoch execution triggered');
    await this.executeEpoch();
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = undefined;
      logger.info({ executionCount: this.executionCount }, 'Epoch scheduler stopped');
    }
  }

  /**
   * Internal epoch execution
   */
  private async executeEpoch(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Epoch already running, skipping this iteration');
      return;
    }

    this.isRunning = true;
    this.executionCount++;

    const epochId = this.executionCount;
    const startTime = Date.now();

    logger.info({ epochId }, '=== Epoch %d started ===', epochId);

    try {
      await this.handler();

      const duration = Date.now() - startTime;
      logger.info(
        { epochId, durationMs: duration },
        '=== Epoch %d completed successfully in %dms ===',
        epochId,
        duration
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        { epochId, error, durationMs: duration },
        '=== Epoch %d failed after %dms ===',
        epochId,
        duration
      );
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Convert interval in seconds to cron expression
   * Simplified implementation - for production consider using a proper cron library
   */
  private intervalToCron(seconds: number): string {
    if (seconds < 60) {
      // Every N seconds (not directly supported by cron, use every minute as fallback)
      logger.warn(
        'Intervals < 60 seconds not supported by cron, using every minute. Consider using setInterval for sub-minute intervals.'
      );
      return '* * * * *';
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes === 1) {
      return '* * * * *'; // Every minute
    } else if (minutes < 60 && 60 % minutes === 0) {
      return `*/${minutes} * * * *`; // Every N minutes
    } else {
      // For irregular intervals, default to every minute and let rate limiting handle it
      logger.warn(
        { intervalSeconds: seconds },
        'Non-standard interval, using every-minute cron with rate limiting'
      );
      return '* * * * *';
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): { executionCount: number; isRunning: boolean } {
    return {
      executionCount: this.executionCount,
      isRunning: this.isRunning,
    };
  }
}
