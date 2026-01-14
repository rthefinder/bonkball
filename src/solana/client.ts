import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';
import { readFileSync } from 'fs';

import { getConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Create Solana connection from config
 */
export function createConnection(): Connection {
  const config = getConfig();
  const rpcUrl = config.SOLANA_RPC_URL;

  logger.info({ rpcUrl, network: config.SOLANA_NETWORK }, 'Creating Solana connection');

  return new Connection(rpcUrl, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

/**
 * Load operator keypair from environment
 */
export function loadOperatorKeypair(): Keypair {
  const config = getConfig();

  // Option 1: Base58 encoded private key
  if (config.OPERATOR_PRIVATE_KEY) {
    try {
      const decoded = bs58.decode(config.OPERATOR_PRIVATE_KEY);
      const keypair = Keypair.fromSecretKey(decoded);
      logger.info({ publicKey: keypair.publicKey.toBase58() }, 'Loaded keypair from OPERATOR_PRIVATE_KEY');
      return keypair;
    } catch (error) {
      logger.error({ error }, 'Failed to decode OPERATOR_PRIVATE_KEY');
      throw new Error('Invalid OPERATOR_PRIVATE_KEY format');
    }
  }

  // Option 2: Keypair file path
  if (config.OPERATOR_KEYPAIR_PATH) {
    try {
      const secretKey = JSON.parse(readFileSync(config.OPERATOR_KEYPAIR_PATH, 'utf-8'));
      const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
      logger.info(
        { publicKey: keypair.publicKey.toBase58(), path: config.OPERATOR_KEYPAIR_PATH },
        'Loaded keypair from file'
      );
      return keypair;
    } catch (error) {
      logger.error({ error, path: config.OPERATOR_KEYPAIR_PATH }, 'Failed to load keypair from file');
      throw new Error(`Failed to load keypair from ${config.OPERATOR_KEYPAIR_PATH}`);
    }
  }

  throw new Error('No operator keypair configuration found');
}

/**
 * Get network cluster API URL
 */
export function getClusterUrl(network: 'mainnet-beta' | 'devnet' | 'testnet'): string {
  switch (network) {
    case 'mainnet-beta':
      return clusterApiUrl('mainnet-beta');
    case 'devnet':
      return clusterApiUrl('devnet');
    case 'testnet':
      return clusterApiUrl('testnet');
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}
