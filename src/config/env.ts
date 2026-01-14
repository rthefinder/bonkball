import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Solana Network
  SOLANA_NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('devnet'),
  SOLANA_RPC_URL: z.string().url(),

  // Token Configuration
  TOKEN_MINT_ADDRESS: z.string().optional(),
  TOKEN_DECIMALS: z.coerce.number().int().min(0).max(9).default(9),

  // Operator Keypair
  OPERATOR_PRIVATE_KEY: z.string().optional(),
  OPERATOR_KEYPAIR_PATH: z.string().optional(),

  // Fee Source
  FEE_SOURCE_TYPE: z.enum(['webhook', 'api', 'wallet', 'mock']).default('mock'),

  // Webhook Config
  WEBHOOK_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  WEBHOOK_SECRET: z.string().optional(),

  // API Config
  FEE_API_URL: z.string().url().optional(),
  FEE_API_KEY: z.string().optional(),

  // Wallet Watcher Config
  FEE_COLLECTOR_WALLET: z.string().optional(),

  // Execution
  EPOCH_INTERVAL_SECONDS: z.coerce.number().int().min(60).default(1800),
  DRY_RUN: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .default('true'),

  // Fee Allocation (must sum to 100)
  BUYBACK_PCT: z.coerce.number().min(0).max(100).default(60),
  ADD_LP_PCT: z.coerce.number().min(0).max(100).default(40),
  BURN_PCT_OF_BUYBACK: z.coerce.number().min(0).max(100).default(25),
  TREASURY_PCT: z.coerce.number().min(0).max(100).default(0),

  // Risk Parameters
  MAX_BUDGET_PER_EPOCH_SOL: z.coerce.number().positive().default(1.0),
  MIN_INTERVAL_SECONDS: z.coerce.number().int().min(60).default(900),
  MAX_SLIPPAGE_BPS: z.coerce.number().int().min(1).max(10000).default(300),
  MAX_PRICE_IMPACT_BPS: z.coerce.number().int().min(1).max(10000).default(500),
  MIN_LIQUIDITY_THRESHOLD_SOL: z.coerce.number().positive().default(10.0),

  // Circuit Breaker
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().int().min(1).default(3),
  CIRCUIT_BREAKER_TIMEOUT_SECONDS: z.coerce.number().int().min(60).default(3600),

  // DEX
  DEX_PROVIDER: z.enum(['raydium', 'orca', 'meteora', 'mock']).default('mock'),
  DEX_POOL_ADDRESS: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),

  // Metrics
  METRICS_PORT: z.coerce.number().int().min(1).max(65535).default(9090),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedConfig: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('Environment validation failed:');
    console.error(parsed.error.format());
    throw new Error('Invalid environment configuration');
  }

  // Validate allocation percentages sum to 100
  const { BUYBACK_PCT, ADD_LP_PCT, TREASURY_PCT } = parsed.data;
  const total = BUYBACK_PCT + ADD_LP_PCT + TREASURY_PCT;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error(
      `Fee allocation must sum to 100%. Got: ${total}% (buyback: ${BUYBACK_PCT}%, addLp: ${ADD_LP_PCT}%, treasury: ${TREASURY_PCT}%)`
    );
  }

  // Validate at least one keypair source is provided
  if (!parsed.data.OPERATOR_PRIVATE_KEY && !parsed.data.OPERATOR_KEYPAIR_PATH) {
    throw new Error('Either OPERATOR_PRIVATE_KEY or OPERATOR_KEYPAIR_PATH must be provided');
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}
