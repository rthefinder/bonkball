import { Connection, PublicKey } from '@solana/web3.js';

import {
  SwapEngine,
  SwapParams,
  SwapResult,
  LPAdder,
  LiquidityParams,
  LiquidityResult,
} from './interfaces.js';
import { logger } from '../utils/logger.js';

/**
 * MockSwapEngine
 * 
 * Simulates DEX swap operations for testing
 */
export class MockSwapEngine implements SwapEngine {
  private initialized = false;

  async initialize(): Promise<void> {
    logger.info('MockSwapEngine initialized');
    this.initialized = true;
  }

  async getQuote(params: SwapParams) {
    if (!this.initialized) {
      throw new Error('MockSwapEngine not initialized');
    }

    // Simulate a 1:1000 SOL to TOKEN rate with 2% price impact
    const outputAmount = params.amountIn * 1000n;
    const priceImpactBps = 200; // 2%
    const fee = params.amountIn / 100n; // 1% fee

    logger.debug(
      { params, outputAmount: outputAmount.toString(), priceImpactBps },
      'Mock quote: %s -> %s',
      params.amountIn.toString(),
      outputAmount.toString()
    );

    return {
      outputAmount,
      priceImpactBps,
      fee,
    };
  }

  async swap(params: SwapParams): Promise<SwapResult> {
    if (!this.initialized) {
      throw new Error('MockSwapEngine not initialized');
    }

    const quote = await this.getQuote(params);

    // Simulate successful swap with mock signature
    const mockSignature =
      '5' + 'x'.repeat(87); // Mock transaction signature

    logger.info(
      { params, result: { ...quote, signature: mockSignature } },
      'Mock swap executed: %s in -> %s out',
      params.amountIn.toString(),
      quote.outputAmount.toString()
    );

    return {
      signature: mockSignature,
      amountIn: params.amountIn,
      amountOut: quote.outputAmount,
      priceImpactBps: quote.priceImpactBps,
    };
  }

  async shutdown(): Promise<void> {
    logger.info('MockSwapEngine shutdown');
    this.initialized = false;
  }
}

/**
 * MockLPAdder
 * 
 * Simulates adding liquidity for testing
 */
export class MockLPAdder implements LPAdder {
  private initialized = false;

  async initialize(): Promise<void> {
    logger.info('MockLPAdder initialized');
    this.initialized = true;
  }

  async addLiquidity(params: LiquidityParams): Promise<LiquidityResult> {
    if (!this.initialized) {
      throw new Error('MockLPAdder not initialized');
    }

    // Simulate LP token minting (1% of deposited value)
    const lpTokensReceived = (params.tokenAmount + params.quoteAmount) / 100n;

    const mockSignature = '5' + 'y'.repeat(87);

    logger.info(
      { params, lpTokensReceived: lpTokensReceived.toString() },
      'Mock liquidity added: %s token + %s quote -> %s LP tokens',
      params.tokenAmount.toString(),
      params.quoteAmount.toString(),
      lpTokensReceived.toString()
    );

    return {
      signature: mockSignature,
      tokenAmount: params.tokenAmount,
      quoteAmount: params.quoteAmount,
      lpTokensReceived,
    };
  }

  async shutdown(): Promise<void> {
    logger.info('MockLPAdder shutdown');
    this.initialized = false;
  }
}
