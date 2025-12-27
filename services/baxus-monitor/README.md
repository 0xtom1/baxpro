# Baxus Monitor Service

Python-based Cloud Run service that polls the Baxus API for spirit listings and publishes notifications when new listings are detected.

## What It Does

1. Polls the Baxus API continuously for new and updated listings
2. Persists asset data to PostgreSQL (`assets` table)
3. Records listing activity in the `activity_feed` table
4. Publishes Pub/Sub messages when new listings are detected

## Core Components

- `main.py` - Entry point that starts the health check server and runs the monitor loop
- `processor.py` - `ListingProcessor` class that orchestrates API polling and database updates
- `baxus_client.py` - HTTP client for the Baxus API with retry logic
- `asset_repository.py` - Database operations for asset records
- `activity_repository.py` - Database operations for activity feed records

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
| `BAXUS_API_BASE` | No | Baxus API base URL (default: https://api.baxus.co) |
| `POLL_INTERVAL_SEC` | No | Seconds between polls (default: 300 for dev, 30 for prod) |
| `ENVIRONMENT` | No | Environment name: dev, staging, production (default: dev) |

*One of `DATABASE_URL` or `INSTANCE_UNIX_SOCKET` is required.

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python -m src.main
```

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
Baxus API  -->  Baxus Monitor  -->  PostgreSQL (assets, activity_feed)
                     |
                     v
                  Pub/Sub  -->  alert-processor
```
