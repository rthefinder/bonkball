# Architecture

## System Overview

Bonkball implements an automated market-making system that uses creator fees to perform token buybacks, burns, and liquidity provision. The system is designed with modularity, safety, and transparency as core principles.

## Core Components

### 1. Fee Ingestion Layer

```
┌─────────────────────────────────────────┐
│         Fee Source Abstraction          │
│                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────┐│
│  │ Webhook  │  │   API    │  │Wallet ││
│  │  Push    │  │   Poll   │  │Watch  ││
│  └──────────┘  └──────────┘  └───────┘│
└─────────────────────────────────────────┘
```

**Purpose**: Collect creator fees from various sources

**Implementations**:
- **WebhookFeeSource**: Receives push notifications from Bonkers platform
- **ApiFeeSource**: Polls Bonkers API periodically
- **WalletWatcherFeeSource**: Monitors on-chain wallet for incoming transfers
- **MockFeeSource**: Generates synthetic fees for testing

### 2. Execution Layer

```
┌──────────────────────────────────┐
│      Epoch Scheduler             │
│   (Cron-based Timing)            │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│    Execution Engine              │
│                                  │
│  1. Fetch fees                   │
│  2. Calculate allocation         │
│  3. Validate risk params         │
│  4. Execute buyback              │
│  5. Burn tokens                  │
│  6. Add liquidity                │
│  7. Generate report              │
└──────────────────────────────────┘
```

**Purpose**: Orchestrate periodic execution of market-making operations

**Key Features**:
- Epoch-based execution (configurable interval)
- Atomic operations per epoch
- Comprehensive error handling
- Dry-run mode support

### 3. Risk Management Layer

```
┌──────────────────────────────────┐
│      Risk Manager                │
│                                  │
│  • Budget limits                 │
│  • Timing constraints            │
│  • Slippage protection           │
│  • Price impact limits           │
│  • Liquidity thresholds          │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│    Circuit Breaker               │
│                                  │
│  States: CLOSED → OPEN →         │
│          HALF_OPEN → CLOSED      │
│                                  │
│  • Failure counting              │
│  • Automatic recovery            │
│  • Manual reset support          │
└──────────────────────────────────┘
```

**Purpose**: Prevent unsafe operations and handle failures gracefully

**Parameters**:
- `MAX_BUDGET_PER_EPOCH_SOL`: Maximum SOL to use per epoch
- `MIN_INTERVAL_SECONDS`: Minimum time between executions
- `MAX_SLIPPAGE_BPS`: Maximum acceptable slippage
- `MAX_PRICE_IMPACT_BPS`: Maximum price impact allowed
- `CIRCUIT_BREAKER_FAILURE_THRESHOLD`: Failures before circuit opens

### 4. DEX Integration Layer

```
┌──────────────────────────────────┐
│     DEX Abstraction              │
│                                  │
│  ┌────────────┐  ┌────────────┐ │
│  │SwapEngine  │  │  LPAdder   │ │
│  └────────────┘  └────────────┘ │
└──────────────────────────────────┘
         │                 │
    ┌────┴────┐       ┌────┴────┐
    │ Raydium │       │  Orca   │
    │  Orca   │       │ Meteora │
    │ Meteora │       │         │
    └─────────┘       └─────────┘
```

**Purpose**: Abstract DEX operations for multi-platform support

**Interfaces**:
- `SwapEngine`: Token swaps with quote fetching
- `LPAdder`: Liquidity provision
- `QuoteProvider`: Price information

### 5. Reporting Layer

```
┌──────────────────────────────────┐
│      Report Writer               │
│                                  │
│  • JSON execution reports        │
│  • Transaction signatures        │
│  • SHA-256 integrity hashes      │
│  • Tweet-ready summaries         │
│  • Prometheus metrics            │
└──────────────────────────────────┘
```

**Purpose**: Provide transparency and auditability

**Outputs**:
- `/reports/epoch-{timestamp}.json`: Full execution details
- `/reports/epoch-{timestamp}-summary.txt`: Human-readable summary
- Prometheus metrics on port 9090

## Data Flow

### Normal Epoch Execution

```
1. Scheduler triggers epoch
         ↓
2. Check circuit breaker (CLOSED?)
         ↓
3. Check timing constraints (MIN_INTERVAL elapsed?)
         ↓
4. Fetch available fees from FeeSource
         ↓
5. Calculate total SOL amount
         ↓
6. Build execution plan (buyback%, LP%, treasury%)
         ↓
7. Validate plan against risk parameters
         ↓
8. Execute buyback via SwapEngine
         ↓
9. Burn tokens via SPL burn instruction
         ↓
10. Add liquidity via LPAdder
         ↓
11. Generate execution report
         ↓
12. Write report to disk
         ↓
13. Acknowledge fees (remove from queue)
         ↓
14. Record successful execution
         ↓
15. Update metrics
```

### Failure Handling

```
1. Execution fails
         ↓
2. Log error with context
         ↓
3. Increment circuit breaker failure count
         ↓
4. Failure count >= threshold?
    YES → Open circuit breaker
    NO  → Allow next attempt
         ↓
5. Circuit breaker OPEN
         ↓
6. Block all executions for timeout period
         ↓
7. After timeout, enter HALF_OPEN state
         ↓
8. Allow one test execution
    SUCCESS → Reset to CLOSED
    FAILURE → Back to OPEN
```

## Security Architecture

### Key Management

```
┌──────────────────────────────────┐
│    Private Key Storage           │
│                                  │
│  Option 1: Environment variable  │
│    OPERATOR_PRIVATE_KEY          │
│    (base58 encoded)              │
│                                  │
│  Option 2: Keypair file          │
│    OPERATOR_KEYPAIR_PATH         │
│    (JSON format)                 │
│                                  │
│  ✅ Never in version control     │
│  ✅ Read-only file permissions   │
│  ✅ Encrypted at rest            │
└──────────────────────────────────┘
```

### Transaction Safety

1. **Dry-Run Mode**: Simulate without actual transactions
2. **Slippage Protection**: Reject trades with excessive slippage
3. **Budget Limits**: Cap maximum SOL per epoch
4. **Rate Limiting**: Enforce minimum intervals
5. **Circuit Breakers**: Stop on repeated failures

### Audit Trail

Every execution generates:
- Detailed JSON report with all inputs/outputs
- SHA-256 hash for integrity verification
- Transaction signatures for on-chain verification
- Structured logs with correlation IDs

## Scalability Considerations

### Horizontal Scaling

The system is designed to run as a single instance, but can be scaled:

1. **Active-Passive**: Run multiple instances with leader election
2. **Sharded**: Divide tokens across multiple instances
3. **Regional**: Deploy in multiple regions for redundancy

### Performance Optimization

- Connection pooling for RPC calls
- Batch transaction submission
- Parallel fee source polling
- Cached quote providers

## Monitoring and Observability

### Metrics (Prometheus)

- `bonkball_epochs_total`: Total epochs executed
- `bonkball_epochs_failed`: Failed epochs
- `bonkball_fees_collected_sol`: Total SOL collected
- `bonkball_tokens_bought`: Total tokens purchased
- `bonkball_tokens_burned`: Total tokens burned
- `bonkball_liquidity_added_sol`: Total liquidity added
- `bonkball_circuit_breaker_state`: Current circuit state

### Logs (Pino)

Structured JSON logs with:
- Timestamp
- Log level
- Component context
- Correlation IDs
- Error stack traces

### Alerts

Recommended alerts:
- Circuit breaker OPEN
- Execution failures > threshold
- RPC connection errors
- Slippage exceeded
- Budget exhausted

## Deployment Architectures

### Development

```
┌──────────────┐
│  Developer   │
│   Machine    │
│              │
│  • Mock DEX  │
│  • Dry-run   │
│  • Devnet    │
└──────────────┘
```

### Production

```
┌─────────────────────────────────────┐
│           Production VPS            │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │  Bonkball   │  │ Prometheus   │ │
│  │  Container  │  │  Container   │ │
│  └─────────────┘  └──────────────┘ │
│                                     │
│  ┌─────────────┐  ┌──────────────┐ │
│  │   Reports   │  │  Keypairs    │ │
│  │   Volume    │  │  Volume (RO) │ │
│  └─────────────┘  └──────────────┘ │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│      Monitoring & Alerting          │
│  • Grafana dashboards               │
│  • PagerDuty/OpsGenie              │
│  • Log aggregation                  │
└─────────────────────────────────────┘
```

## Technology Stack

- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm
- **Blockchain**: Solana (web3.js, SPL Token)
- **DEX**: Raydium, Orca, Meteora (pluggable)
- **Logging**: Pino
- **Metrics**: Prometheus
- **Scheduling**: node-cron
- **Validation**: Zod
- **Testing**: Vitest
- **Container**: Docker

## Future Enhancements

1. **Multi-Token Support**: Manage multiple tokens simultaneously
2. **Advanced Strategies**: Dynamic allocation based on market conditions
3. **DAO Integration**: Governance-controlled parameters
4. **Analytics Dashboard**: Real-time performance visualization
5. **Mobile Notifications**: Push alerts for critical events
6. **On-Chain Program**: Optional Anchor program for trustless execution
