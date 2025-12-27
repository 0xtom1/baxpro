# Baxus Monitor Service

Python-based Cloud Run service that monitors the Baxus API for bourbon listings.

## Features

- Continuously polls Baxus API for new/updated listings
- Persists all listings to PostgreSQL (`baxus_listings` table)
- Publishes Pub/Sub messages when new listings are detected
- Detects and notifies on price changes
- Graceful shutdown handling

## Configuration

Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASS` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | Database name |
| `INSTANCE_UNIX_SOCKET` | Yes | Cloud SQL Unix socket path |
| `GCP_PROJECT_ID` | Yes | GCP project ID for Pub/Sub |
| `PUBSUB_TOPIC` | Yes | Pub/Sub topic name |
| `BAXUS_API_BASE` | No | Baxus API base URL (default: https://api.baxus.co) |
| `BAXUS_API_KEY` | No | Baxus API key if required |
| `POLL_INTERVAL_SEC` | No | Seconds between polls (default: 300 for dev/staging, 30 for prod) |
| `ENVIRONMENT` | No | Environment name: dev, staging, prod (default: dev) |

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally (requires environment variables)
python -m src.main
```

## Docker Build

```bash
docker build -t baxus-monitor .
docker run --env-file .env baxus-monitor
```

## Pub/Sub Message Format

### New Listing Event

```json
{
  "event_type": "new_listing",
  "listing": {
    "external_id": "12345",
    "name": "Buffalo Trace Kentucky Straight Bourbon",
    "price_cents": 2999,
    "url": "https://baxus.co/listing/12345"
  },
  "environment": "production"
}
```

### Price Change Event

```json
{
  "event_type": "price_change",
  "listing": {
    "external_id": "12345",
    "name": "Buffalo Trace Kentucky Straight Bourbon",
    "old_price_cents": 2999,
    "new_price_cents": 2499,
    "url": "https://baxus.co/listing/12345"
  },
  "environment": "production"
}
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Baxus API     │────▶│  Baxus Monitor  │────▶│    Pub/Sub      │
└─────────────────┘     │  (Cloud Run)    │     └─────────────────┘
                        │                 │              │
                        │                 │              ▼
                        │                 │     ┌─────────────────┐
                        │                 │     │  Alert Matcher  │
                        │                 │     │  (future)       │
                        └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Cloud SQL     │
                        │  (PostgreSQL)   │
                        └─────────────────┘
```
