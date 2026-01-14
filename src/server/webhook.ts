import fastify from 'fastify';
import cors from '@fastify/cors';

import { WebhookFeeSource } from '../core/feeSource/WebhookFeeSource.js';
import { getConfig } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface WebhookServerOptions {
  feeSource: WebhookFeeSource;
  port?: number;
  secret?: string;
}

/**
 * Webhook Server
 * 
 * Receives creator fee events from Bonkers platform
 */
export class WebhookServer {
  private app: ReturnType<typeof fastify>;

  constructor(private readonly options: WebhookServerOptions) {
    this.app = fastify({
      logger: false, // We use our own logger
    });

    this.setupRoutes();
  }

  private setupRoutes() {
    // Register CORS
    this.app.register(cors, {
      origin: true,
    });

    // Health check
    this.app.get('/health', async () => {
      return { status: 'ok', timestamp: Date.now() };
    });

    // Fee webhook endpoint
    this.app.post<{
      Body: {
        amount: string;
        mint: string;
        timestamp: number;
        signature?: string;
        metadata?: Record<string, unknown>;
      };
      Headers: {
        'x-webhook-secret'?: string;
      };
    }>('/webhook/fees', async (request, reply) => {
      try {
        // Verify secret if configured
        if (this.options.secret) {
          const providedSecret = request.headers['x-webhook-secret'];
          if (providedSecret !== this.options.secret) {
            logger.warn('Webhook request with invalid secret');
            return reply.code(401).send({ error: 'Unauthorized' });
          }
        }

        // Validate payload
        const { amount, mint, timestamp, signature, metadata } = request.body;

        if (!amount || !mint || !timestamp) {
          logger.warn({ body: request.body }, 'Invalid webhook payload');
          return reply.code(400).send({ error: 'Invalid payload' });
        }

        // Forward to fee source
        await this.options.feeSource.receiveWebhookEvent({
          amount,
          mint,
          timestamp,
          signature,
          metadata,
        });

        logger.info(
          { amount, mint, timestamp },
          'Webhook event received and queued'
        );

        return { success: true, timestamp: Date.now() };
      } catch (error) {
        logger.error({ error }, 'Error processing webhook');
        return reply.code(500).send({ error: 'Internal server error' });
      }
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    const port = this.options.port || 3000;

    try {
      await this.app.listen({ port, host: '0.0.0.0' });
      logger.info({ port }, 'Webhook server listening on port %d', port);
    } catch (error) {
      logger.error({ error, port }, 'Failed to start webhook server');
      throw error;
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    await this.app.close();
    logger.info('Webhook server stopped');
  }
}

/**
 * Start standalone webhook server
 */
export async function startWebhookServer() {
  const config = getConfig();

  if (config.FEE_SOURCE_TYPE !== 'webhook') {
    throw new Error('FEE_SOURCE_TYPE must be "webhook" to run webhook server');
  }

  const feeSource = new WebhookFeeSource({
    validateSignature: !!config.WEBHOOK_SECRET,
  });

  await feeSource.initialize();

  const server = new WebhookServer({
    feeSource,
    port: config.WEBHOOK_PORT,
    secret: config.WEBHOOK_SECRET,
  });

  await server.start();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await server.stop();
    await feeSource.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await server.stop();
    await feeSource.shutdown();
    process.exit(0);
  });
}

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startWebhookServer().catch((error) => {
    logger.error({ error }, 'Failed to start webhook server');
    process.exit(1);
  });
}
