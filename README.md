# bonkball

https://x.com/bonkballcoin

<img width="1026" height="405" alt="Capture d’écran 2026-01-14 à 17 37 55" src="https://github.com/user-attachments/assets/ddee29bb-625a-452d-aa74-227dc3fdb3eb" />

> The first token on Bonkers that automatically uses creator fees to market-make itself.

[![CI](https://github.com/rthefinder/bonkball/workflows/CI/badge.svg)](https://github.com/rthefinder/bonkball/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Bonkball is an innovative Solana token that implements automated market-making using creator fees collected from the Bonkers platform. Instead of manually managing liquidity and buybacks, Bonkball automates the entire process through a secure, off-chain execution engine.

### Core Mechanism

Creator fees are automatically allocated to:
1. **Token Buybacks** (60%) - Reducing circulating supply
2. **Token Burns** (25% of buyback) - Permanent supply reduction
3. **Liquidity Provision** (40%) - Deepening market liquidity
4. **Risk Management** - Circuit breakers, slippage protection, rate limiting

### Key Features

- ✅ **Off-chain execution** for flexibility and safety
- ✅ **Multi-source fee ingestion** (webhook, API, wallet monitoring)
- ✅ **Modular DEX connectors** (Raydium, Orca, Meteora)
- ✅ **Comprehensive risk management** (circuit breakers, slippage limits)
- ✅ **Transparent reporting** (signed execution reports, metrics)
- ✅ **Dry-run mode** for testing
- ✅ **Devnet support** for safe development

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Fee Sources                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐             │
│  │ Webhook  │  │ API Poll │  │ Wallet Watch │             │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘             │
│       └─────────────┴────────────────┘                      │
│                      │                                       │
│              ┌───────▼────────┐                             │
│              │  FeeSource     │                             │
│              │  Abstraction   │                             │
│              └───────┬────────┘                             │
└──────────────────────┼──────────────────────────────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   Epoch Scheduler          │
         │   (Cron-based)             │
         └─────────────┬──────────────┘
                       │
         ┌─────────────▼──────────────┐
         │   Execution Engine         │
         │                            │
         │  ┌──────────────────────┐  │
         │  │  Risk Manager        │  │
         │  │  Circuit Breaker     │  │
         │  └──────────────────────┘  │
         └─────────────┬──────────────┘
                       │
        ┌──────────────┴────────────────┐
        │                               │
   ┌────▼─────┐                  ┌─────▼────┐
   │  DEX     │                  │   SPL    │
   │  Swap    │                  │   Burn   │
   │  Engine  │                  │          │
   └────┬─────┘                  └─────┬────┘
        │                              │
        └──────────────┬───────────────┘
                       │
              ┌────────▼─────────┐
              │  Report Writer   │
              │  + Metrics       │
              └──────────────────┘
```

## Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** (recommended) or npm
- **Solana CLI** (optional, for keypair generation)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/rthefinder/bonkball.git
cd bonkball

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

Edit `.env` file:

```bash
# Network Configuration
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Token Configuration (set after deploying token)
TOKEN_MINT_ADDRESS=YourTokenMintAddressHere
TOKEN_DECIMALS=9

# Operator Keypair (NEVER COMMIT REAL KEYS)
# Option 1: Base58 secret key
OPERATOR_PRIVATE_KEY=your_base58_key_here
# Option 2: File path
# OPERATOR_KEYPAIR_PATH=./keypairs/operator.json

# Fee Source
FEE_SOURCE_TYPE=mock  # webhook | api | wallet | mock

# Execution
EPOCH_INTERVAL_SECONDS=1800  # 30 minutes
DRY_RUN=true  # Set to false for live execution

# DEX Configuration
DEX_PROVIDER=mock  # raydium | orca | meteora | mock

# Risk Parameters
MAX_BUDGET_PER_EPOCH_SOL=1.0
MAX_SLIPPAGE_BPS=300  # 3%
MAX_PRICE_IMPACT_BPS=500  # 5%
```

### Running

```bash
# Development mode (with hot reload)
pnpm dev

# Production build
pnpm build
pnpm start

# Run webhook server (for webhook fee source)
pnpm webhook

# Dry-run simulation
DRY_RUN=true pnpm dev
```

## Usage Examples

### Example 1: Mock Mode (Testing)

```bash
# Set up mock configuration
cat > .env << EOF
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
FEE_SOURCE_TYPE=mock
DEX_PROVIDER=mock
DRY_RUN=true
OPERATOR_PRIVATE_KEY=your_test_key
EOF

# Run the executor
pnpm dev
```

### Example 2: Webhook Mode (Production)

```bash
# Terminal 1: Start webhook server
WEBHOOK_PORT=3000 pnpm webhook

# Terminal 2: Start execution engine
FEE_SOURCE_TYPE=webhook pnpm start
```

### Example 3: Manual Epoch Execution

```bash
# Run a single epoch simulation
pnpm script:simulate-epoch
```

## Environment Variables

### Core Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `SOLANA_NETWORK` | Yes | `devnet` | Solana network |
| `SOLANA_RPC_URL` | Yes | - | RPC endpoint URL |
| `TOKEN_MINT_ADDRESS` | Yes* | - | Token mint address |
| `TOKEN_DECIMALS` | No | `9` | Token decimals |

### Keypair Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPERATOR_PRIVATE_KEY` | Yes** | - | Base58 encoded secret key |
| `OPERATOR_KEYPAIR_PATH` | Yes** | - | Path to keypair JSON file |

** One of these must be provided

### Fee Source Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FEE_SOURCE_TYPE` | Yes | `mock` | `webhook`, `api`, `wallet`, or `mock` |
| `WEBHOOK_PORT` | No | `3000` | Webhook server port |
| `WEBHOOK_SECRET` | No | - | Webhook authentication secret |
| `FEE_API_URL` | No | - | Fee API endpoint |
| `FEE_API_KEY` | No | - | Fee API key |
| `FEE_COLLECTOR_WALLET` | No | - | Wallet to monitor for fees |

### Execution Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EPOCH_INTERVAL_SECONDS` | No | `1800` | Time between executions |
| `DRY_RUN` | No | `true` | Simulate without actual transactions |
| `BUYBACK_PCT` | No | `60` | % of fees for buyback |
| `ADD_LP_PCT` | No | `40` | % of fees for LP |
| `BURN_PCT_OF_BUYBACK` | No | `25` | % of bought tokens to burn |
| `TREASURY_PCT` | No | `0` | % of fees for treasury |

### Risk Parameters

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_BUDGET_PER_EPOCH_SOL` | No | `1.0` | Maximum SOL per epoch |
| `MIN_INTERVAL_SECONDS` | No | `900` | Minimum time between executions |
| `MAX_SLIPPAGE_BPS` | No | `300` | Maximum allowed slippage (3%) |
| `MAX_PRICE_IMPACT_BPS` | No | `500` | Maximum price impact (5%) |
| `MIN_LIQUIDITY_THRESHOLD_SOL` | No | `10.0` | Minimum pool liquidity |

### Circuit Breaker

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CIRCUIT_BREAKER_FAILURE_THRESHOLD` | No | `3` | Failures before opening |
| `CIRCUIT_BREAKER_TIMEOUT_SECONDS` | No | `3600` | Cooldown period |

## Scripts

```bash
# Development
pnpm dev              # Start with hot reload
pnpm build            # Build for production
pnpm start            # Run production build

# Testing
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report

# Code Quality
pnpm lint             # Lint code
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code
pnpm format:check     # Check formatting
pnpm typecheck        # Type checking

# Utility Scripts
pnpm script:create-mint       # Create new token mint
pnpm script:verify-mint       # Verify mint configuration
pnpm script:simulate-epoch    # Simulate single epoch
pnpm script:fetch-fees        # Manually fetch fees
```

## Project Structure

```
bonkball/
├── src/
│   ├── config/
│   │   └── env.ts                    # Environment validation (Zod)
│   ├── core/
│   │   ├── feeSource/
│   │   │   ├── FeeSource.ts          # Fee source interface
│   │   │   ├── WebhookFeeSource.ts   # Webhook implementation
│   │   │   ├── ApiFeeSource.ts       # API polling implementation
│   │   │   ├── WalletWatcherFeeSource.ts  # Wallet monitoring
│   │   │   └── MockFeeSource.ts      # Testing implementation
│   │   ├── executor/
│   │   │   ├── EpochScheduler.ts     # Cron-based scheduler
│   │   │   └── ExecutionEngine.ts    # Core execution logic
│   │   ├── risk/
│   │   │   ├── RiskManager.ts        # Risk validation
│   │   │   └── CircuitBreaker.ts     # Failure protection
│   │   └── reporting/
│   │       └── ReportWriter.ts       # Execution reports
│   ├── solana/
│   │   ├── client.ts                 # Connection & keypair management
│   │   └── spl.ts                    # SPL token operations
│   ├── dex/
│   │   ├── interfaces.ts             # DEX abstractions
│   │   ├── raydium.ts                # Raydium connector
│   │   └── mock.ts                   # Mock DEX
│   ├── server/
│   │   └── webhook.ts                # Webhook HTTP server
│   ├── utils/
│   │   ├── logger.ts                 # Pino logger
│   │   ├── retry.ts                  # Retry logic
│   │   └── math.ts                   # Calculation helpers
│   └── index.ts                      # Main entrypoint
├── scripts/
│   ├── create-mint.ts                # Token creation
│   ├── verify-mint.ts                # Mint verification
│   ├── simulate-epoch.ts             # Epoch simulation
│   └── fetch-fees.ts                 # Fee fetching tool
├── tests/
│   ├── unit/                         # Unit tests
│   └── integration/                  # Integration tests
├── docs/
│   ├── architecture.md               # System architecture
│   ├── tokenomics.md                 # Token economics
│   ├── runbook.md                    # Operations guide
│   └── DISCLAIMER.md                 # Legal disclaimer
├── reports/                          # Generated reports
├── .github/
│   └── workflows/
│       └── ci.yml                    # CI/CD pipeline
├── Dockerfile                        # Container image
├── docker-compose.yml                # Docker stack
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
└── README.md                         # This file
```

## Security Considerations

### 🔐 Private Key Management

**CRITICAL**: Never commit private keys to the repository.

```bash
# Generate a new keypair
solana-keygen new -o ./keypairs/operator.json

# Add to .gitignore (already included)
echo "*.keypair" >> .gitignore
echo "keypairs/" >> .gitignore

# Use environment variables
export OPERATOR_KEYPAIR_PATH=./keypairs/operator.json
# OR
export OPERATOR_PRIVATE_KEY=$(solana-keygen pubkey ./keypairs/operator.json --outfile /dev/stdout)
```

### 🛡️ Risk Mitigation

1. **Dry-Run Mode**: Always test with `DRY_RUN=true` first
2. **Start Small**: Begin with low `MAX_BUDGET_PER_EPOCH_SOL`
3. **Monitor Closely**: Check logs and reports after each epoch
4. **Circuit Breakers**: Configured automatically to halt on repeated failures
5. **Rate Limiting**: `MIN_INTERVAL_SECONDS` prevents too-frequent execution
6. **Slippage Protection**: `MAX_SLIPPAGE_BPS` prevents bad trades

### 🔍 Auditing

- All transactions are logged with signatures
- Execution reports saved to `/reports` directory
- Prometheus metrics exposed on port 9090
- Structured logging with correlation IDs

## Devnet vs Mainnet

### Devnet (Recommended for Testing)

```bash
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
DRY_RUN=true
```

**Devnet Benefits:**
- Free SOL from faucet
- No financial risk
- Faster iteration
- Test all features safely

**Get Devnet SOL:**
```bash
solana airdrop 2 <YOUR_WALLET_ADDRESS> --url devnet
```

### Mainnet (Production)

```bash
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# Or use a dedicated RPC provider (Helius, Triton, QuickNode)
DRY_RUN=false
```

**Mainnet Checklist:**
- ✅ Thoroughly tested on devnet
- ✅ Reviewed all risk parameters
- ✅ Secure key management in place
- ✅ Monitoring and alerting configured
- ✅ Backup and recovery procedures documented
- ✅ Team trained on operations
- ✅ Incident response plan ready

## Monitoring

### Logs

Structured JSON logs with Pino:

```bash
# View logs in development
pnpm dev

# View logs in production (pretty format)
pnpm start | pino-pretty

# Filter by level
pnpm start | pino-pretty --level=warn
```

### Metrics

Prometheus metrics exposed on port 9090:

```bash
# Access metrics
curl http://localhost:9090/metrics

# Example metrics:
# - bonkball_epochs_total
# - bonkball_fees_collected_sol
# - bonkball_tokens_burned_total
# - bonkball_circuit_breaker_state
```

### Reports

Execution reports stored in `/reports`:

```bash
reports/
├── epoch-1705234567890.json
├── epoch-1705234567890-summary.txt
└── ...
```

Each report includes:
- Input fees
- Execution plan
- Transaction signatures
- Prices and amounts
- Tweet-ready summary

## Development

### Running Tests

```bash
# Unit tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Adding a New DEX

1. Implement `SwapEngine` and `LPAdder` interfaces in `src/dex/`
2. Add configuration in `src/config/env.ts`
3. Register in factory pattern
4. Add tests
5. Update documentation

### Adding a New Fee Source

1. Implement `FeeSource` interface in `src/core/feeSource/`
2. Add configuration options
3. Register in factory
4. Test with mock fees
5. Document setup process

## Deployment

### Docker

```bash
# Build image
docker build -t bonkball:latest .

# Run container
docker run -d \
  --name bonkball \
  --env-file .env \
  -v $(pwd)/reports:/app/reports \
  -v $(pwd)/keypairs:/app/keypairs:ro \
  bonkball:latest

# View logs
docker logs -f bonkball
```

### Docker Compose

```bash
# Start stack (app + Prometheus)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop stack
docker-compose down
```

### Production Deployment

See [docs/runbook.md](docs/runbook.md) for detailed operations guide including:
- Infrastructure setup
- Monitoring configuration
- Incident response
- Key rotation procedures
- Backup and recovery

## Troubleshooting

### Common Issues

**Issue**: "Invalid environment configuration"
```bash
# Solution: Check .env file format
pnpm typecheck
cat .env | grep -v '^#' | grep -v '^$'
```

**Issue**: "Circuit breaker is OPEN"
```bash
# Solution: Wait for timeout or manually reset
# Check logs for root cause of failures
# Verify RPC endpoint is responsive
# Ensure sufficient SOL balance
```

**Issue**: "Failed to get mint info"
```bash
# Solution: Verify TOKEN_MINT_ADDRESS is correct
pnpm script:verify-mint
```

**Issue**: "Slippage exceeded"
```bash
# Solution: Increase MAX_SLIPPAGE_BPS or reduce trade size
# Check pool liquidity with MIN_LIQUIDITY_THRESHOLD_SOL
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Ensure all checks pass: `pnpm lint && pnpm typecheck && pnpm test`
6. Submit a pull request

## Roadmap

- [x] Core execution engine
- [x] Multi-source fee ingestion
- [x] Risk management system
- [x] Comprehensive testing
- [ ] Raydium integration (partial)
- [ ] Orca integration
- [ ] Meteora integration
- [ ] Advanced analytics dashboard
- [ ] Mobile notifications
- [ ] Multi-token support
- [ ] DAO governance integration

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Disclaimer

**THIS SOFTWARE IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND.**

This is experimental software. Use at your own risk. The authors and contributors:
- Make no guarantees about functionality or profitability
- Are not responsible for any financial losses
- Do not provide financial, legal, or investment advice
- Recommend thorough testing before mainnet deployment

See [docs/DISCLAIMER.md](docs/DISCLAIMER.md) for full legal disclaimer.

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/rthefinder/bonkball/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rthefinder/bonkball/discussions)

---

**Built with ❤️ on Solana**

*Bonkball is not affiliated with or endorsed by Solana Foundation, Bonk, or Bonkers platform.*
