# Alert Processor Service

Python-based Cloud Function that matches incoming listings against user-defined alerts and publishes matches for email notification.

## What It Does

1. Receives Pub/Sub messages from the baxus-monitor service
2. Loads all active user alerts from the database
3. Matches each incoming asset against alert criteria (name patterns, price limits, age/year filters)
4. Records matches in the `alert_matches` table
5. Publishes match events to Pub/Sub for the alert-sender service

## Core Components

- `main.py` - Cloud Function entry point (`process_listing`)
- `src/matcher.py` - Alert matching logic (`find_matching_alerts`, `matches_alert`)
- `src/repository.py` - Database operations for fetching alerts and inserting matches
- `src/models.py` - Data classes for `Alert` and `Asset`
- `src/pubsub.py` - Publishes match events to downstream topic

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
| `PUBSUB_TOPIC` | Yes | Topic for publishing matches (e.g., `alert-matches`) |
| `ENVIRONMENT` | No | Environment name: dev, staging, production |

*One of `DATABASE_URL` or `INSTANCE_UNIX_SOCKET` is required.

## Trigger

Triggered by Pub/Sub messages from the `baxus-monitor` service with this format:

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

## Match Criteria

An alert matches an asset when:
- Name contains all specified match strings (or any, depending on `match_all` setting)
- Price is at or below `max_price` (if set)
- Bottled year is within `bottled_year_min` and `bottled_year_max` range (if set)
- Age is within `age_min` and `age_max` range (if set)

## Output

Publishes match events to the configured topic:

```json
{
  "match_idx": 999,
  "alert_id": 123,
  "user_id": "uuid-string",
  "asset_idx": 12345,
  "asset_name": "Buffalo Trace Kentucky Straight Bourbon",
  "asset_price": 29.99,
  "asset_url": "https://baxpro.xyz/asset/12345",
  "alert_name": "My Bourbon Alert",
  "user_email": "user@example.com"
}
```

## Data Flow

```
Pub/Sub (from baxus-monitor)  -->  alert-processor  -->  PostgreSQL (alert_matches)
                                        |
                                        v
                                     Pub/Sub  -->  alert-sender
```
