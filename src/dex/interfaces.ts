/**
 * DEX Interface Definitions
 * 
 * Abstract interfaces for swap engines and liquidity providers
 * Allows pluggable DEX implementations (Raydium, Orca, Meteora, etc.)
 */

export interface SwapParams {
  inputMint: string;
  outputMint: string;
  amountIn: bigint;
  slippageBps: number;
  minOutputAmount?: bigint;
}

export interface SwapResult {
  signature: string;
  amountIn: bigint;
  amountOut: bigint;
  priceImpactBps: number;
}

export interface SwapEngine {
  /**
   * Initialize the swap engine
   */
  initialize(): Promise<void>;

  /**
   * Get a quote for a swap
   */
  getQuote(params: SwapParams): Promise<{
    outputAmount: bigint;
    priceImpactBps: number;
    fee: bigint;
  }>;

  /**
   * Execute a swap
   */
  swap(params: SwapParams): Promise<SwapResult>;

  /**
   * Cleanup resources
   */
  shutdown(): Promise<void>;
}

export interface LiquidityParams {
  tokenMint: string;
  quoteMint: string;
  tokenAmount: bigint;
  quoteAmount: bigint;
  slippageBps?: number;
}

export interface LiquidityResult {
  signature: string;
  tokenAmount: bigint;
  quoteAmount: bigint;
  lpTokensReceived: bigint;
}

export interface LPAdder {
  /**
   * Initialize the LP adder
   */
  initialize(): Promise<void>;

  /**
   * Add liquidity to a pool
   */
  addLiquidity(params: LiquidityParams): Promise<LiquidityResult>;

  /**
   * Cleanup resources
   */
  shutdown(): Promise<void>;
}

export interface QuoteProvider {
  /**
   * Get current price quote
   */
  getPrice(inputMint: string, outputMint: string, amount: bigint): Promise<bigint>;
}
