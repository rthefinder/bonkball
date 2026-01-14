/**
 * Math utilities for Solana amounts and calculations
 */

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: bigint): number {
  return Number(lamports) / LAMPORTS_PER_SOL;
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.floor(sol * LAMPORTS_PER_SOL));
}

/**
 * Calculate percentage of amount
 */
export function percentage(amount: bigint, percent: number): bigint {
  return (amount * BigInt(Math.floor(percent * 100))) / 10000n;
}

/**
 * Calculate basis points (bps) from two amounts
 * Returns difference as basis points (1 bp = 0.01%)
 */
export function calculateBps(original: bigint, changed: bigint): number {
  if (original === 0n) {
    return 0;
  }

  const diff = changed - original;
  const bps = Number((diff * 10000n) / original);
  return Math.abs(bps);
}

/**
 * Apply slippage to amount
 */
export function applySlippage(amount: bigint, slippageBps: number): bigint {
  const slippageAmount = (amount * BigInt(slippageBps)) / 10000n;
  return amount - slippageAmount;
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmed = fractionStr.replace(/0+$/, '');

  return `${whole}.${trimmed}`;
}

/**
 * Parse token amount from string with decimals
 */
export function parseTokenAmount(amountStr: string, decimals: number): bigint {
  const [whole = '0', fraction = '0'] = amountStr.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(paddedFraction);
}
