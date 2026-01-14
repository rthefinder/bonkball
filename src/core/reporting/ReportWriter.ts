import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

import { logger } from '../../utils/logger.js';

export interface ExecutionReport {
  epochId: number;
  timestamp: string;
  dryRun: boolean;
  fees: Array<{
    amount: string;
    mint: string;
    timestamp: number;
  }>;
  plan: {
    buybackAmountSol: number;
    addLpAmountSol: number;
    treasuryAmountSol: number;
    totalSol: number;
  };
  transactions: Array<{
    type: string;
    signature: string;
    [key: string]: any;
  }>;
  summary: string;
}

/**
 * ReportWriter
 * 
 * Writes execution reports to disk with signatures
 */
export class ReportWriter {
  private reportsDir: string;

  constructor(reportsDir = './reports') {
    this.reportsDir = reportsDir;
    this.ensureReportsDir();
  }

  private ensureReportsDir() {
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
      logger.info({ dir: this.reportsDir }, 'Created reports directory');
    }
  }

  /**
   * Write execution report to disk
   */
  async writeReport(report: ExecutionReport): Promise<void> {
    const filename = `epoch-${report.epochId}.json`;
    const summaryFilename = `epoch-${report.epochId}-summary.txt`;
    const filepath = join(this.reportsDir, filename);
    const summaryPath = join(this.reportsDir, summaryFilename);

    try {
      // Add hash to report
      const reportWithHash = {
        ...report,
        hash: this.hashReport(report),
        createdAt: new Date().toISOString(),
      };

      // Write JSON report
      writeFileSync(filepath, JSON.stringify(reportWithHash, null, 2), 'utf-8');

      // Write summary text
      writeFileSync(summaryPath, report.summary, 'utf-8');

      logger.info(
        { filepath, summaryPath },
        'Wrote execution report: %s',
        filename
      );
    } catch (error) {
      logger.error({ error, filepath }, 'Failed to write report');
      throw error;
    }
  }

  /**
   * Generate hash of report for integrity verification
   */
  private hashReport(report: ExecutionReport): string {
    const data = JSON.stringify({
      epochId: report.epochId,
      timestamp: report.timestamp,
      fees: report.fees,
      plan: report.plan,
      transactions: report.transactions,
    });

    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
