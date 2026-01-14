import { logger } from '../../utils/logger.js';

/**
 * CircuitBreaker
 * 
 * Prevents system from continuing operations during repeated failures
 * States: CLOSED (normal) -> OPEN (tripped) -> HALF_OPEN (testing) -> CLOSED
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  timeoutSeconds: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;

  constructor(private readonly options: CircuitBreakerOptions) {}

  /**
   * Check if circuit allows operation
   */
  canExecute(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        if (this.nextAttemptTime && now >= this.nextAttemptTime) {
          logger.info('Circuit breaker transitioning to HALF_OPEN');
          this.state = CircuitState.HALF_OPEN;
          return true;
        }
        logger.warn(
          { nextAttempt: this.nextAttemptTime },
          'Circuit breaker is OPEN, blocking execution'
        );
        return false;

      case CircuitState.HALF_OPEN:
        // Allow one test execution
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful execution
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      logger.info('Circuit breaker test succeeded, resetting to CLOSED');
      this.reset();
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * Record failed execution
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(
      { failureCount: this.failureCount, threshold: this.options.failureThreshold },
      'Circuit breaker recorded failure %d/%d',
      this.failureCount,
      this.options.failureThreshold
    );

    if (this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  /**
   * Trip the circuit breaker (OPEN state)
   */
  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.options.timeoutSeconds * 1000;

    logger.error(
      { nextAttemptTime: this.nextAttemptTime, timeoutSeconds: this.options.timeoutSeconds },
      'Circuit breaker TRIPPED - blocking operations for %d seconds',
      this.options.timeoutSeconds
    );
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    logger.info('Circuit breaker reset to CLOSED');
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get current failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }
}
