# Baxus Monitor Service

Python-based Cloud Run service that monitors the Baxus marketplace and Solana blockchain for activity.

## What It Does

### Marketplace Monitoring
1. Polls the Baxus API continuously for new and updated listings
2. Persists asset data to PostgreSQL (`assets` table)
3. Records listing activity in the `activity_feed` table
4. Publishes Pub/Sub messages when new listings are detected

### Blockchain Activity Tracking
1. Fetches parsed transactions from the Helius RPC API
2. Detects on-chain activity types:
   - **Mints**: New tokens created on-chain
   - **Burns**: Tokens destroyed (redeemed bottles)
   - **Purchases**: USDC marketplace transactions
3. Resolves asset metadata from Baxus API or on-chain sources
4. Records all activity in the `activity_feed` table

## Core Components

### Listing Processing
- `main.py` - Entry point that starts the health check server and runs the monitor loop
- `listing_processor.py` - `ListingProcessor` class that orchestrates API polling and database updates
- `baxus_client.py` - HTTP client for the Baxus API with retry logic

### Blockchain Processing
- `blockchain_processor.py` - `BlockchainProcessor` class that fetches and processes Solana transactions
- `helius_client.py` - Client for the Helius RPC API (parsed transactions and asset metadata)
- `utils/transactions_helper.py` - Utilities for parsing transaction types (mint, burn, purchase)

### Shared
- `asset_repository.py` - Database operations for asset records
- `activity_repository.py` - Database operations for activity feed records
- `models.py` - SQLAlchemy models and data classes

## Configuration

Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASS` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | Database name |
| `INSTANCE_UNIX_SOCKET` | Yes* | Cloud SQL Unix socket path |
| `DATABASE_URL` | Yes* | Alternative: full connection string |
| `GCP_PROJECT_ID` | Yes | GCP project ID for Pub/Sub |
| `PUBSUB_TOPIC` | Yes | Pub/Sub topic name for new listing events |
| `HELIUS_API_KEY` | Yes | Helius RPC API key for blockchain data |
| `BAXUS_API_BASE` | No | Baxus API base URL (default: https://api.baxus.co) |
| `POLL_INTERVAL_SEC` | No | Seconds between polls (default: 300 for dev, 30 for prod) |
| `ENVIRONMENT` | No | Environment name: dev, staging, production (default: dev) |

*One of `DATABASE_URL` or `INSTANCE_UNIX_SOCKET` is required.

## Local Development

```bash
# Install dependencies (using uv)
uv sync

# Or with pip
pip install -r requirements.txt

# Run locally (requires Cloud SQL proxy for database access)
uv run python -m src.main
```

See `.devcontainer/` for local development setup with Cloud SQL proxy.

## Pub/Sub Message Format

When a new listing is detected, publishes to the configured topic:

```json
{
  "event_type": "new_listing",
  "asset_idx": 12345,
  "activity_idx": 67890,
  "name": "Buffalo Trace Kentucky Straight Bourbon",
  "price": 29.99,
  "bottled_year": 2020,
  "age": 8
}
```

## Data Flow

```
                    ┌──────────────────────────────────────┐
                    │           Baxus Monitor              │
                    │                                      │
Baxus API ─────────►│  ListingProcessor                   │
                    │  - Poll listings                     │
                    │  - Persist assets                    │
                    │  - Record activity                   │──────► Pub/Sub
                    │                                      │        (new_listing)
Helius API ────────►│  BlockchainProcessor                │            │
(Solana)            │  - Parse mint/burn/purchase         │            ▼
                    │  - Resolve asset metadata            │     alert-processor
                    │  - Record activity                   │
                    └──────────────┬───────────────────────┘
                                   │
                                   ▼
                              PostgreSQL
                         (assets, activity_feed)
```

## Deployment

Deployed via Terraform as a Cloud Run service. See `terraform/` in the project root.
