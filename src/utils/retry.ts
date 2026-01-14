import { logger } from './logger.js';

export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
  context?: string
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier = 2, maxDelayMs = 30000 } = options;

  let lastError: Error | undefined;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        logger.error(
          { error, attempt, maxAttempts, context },
          'Retry failed after %d attempts: %s',
          maxAttempts,
          context || 'operation'
        );
        throw lastError;
      }

      logger.warn(
        { error, attempt, maxAttempts, delayMs: currentDelay, context },
        'Retry attempt %d/%d failed, retrying in %dms: %s',
        attempt,
        maxAttempts,
        currentDelay,
        context || 'operation'
      );

      await sleep(currentDelay);
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
