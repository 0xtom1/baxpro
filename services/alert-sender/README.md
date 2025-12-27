# Alert Sender Service

Python-based Cloud Function that sends email notifications to users when their alerts match new listings.

## What It Does

1. Receives Pub/Sub messages from the alert-processor service
2. Builds an HTML email with the matched listing details
3. Sends the email via SendGrid
4. Logs successful email sends to the `email_logs` table

## Core Components

- `main.py` - Cloud Function entry point (`send_alert`) and email building logic
- `src/config.py` - Environment configuration
- `src/db.py` - Database connection manager
- `src/log.py` - Logging setup for Cloud Functions

## Configuration

Environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SENDGRID_API_KEY` | Yes | SendGrid API key for sending emails |
| `DB_USER` | Yes | PostgreSQL username |
| `DB_PASS` | Yes | PostgreSQL password |
| `DB_NAME` | Yes | Database name |
| `INSTANCE_UNIX_SOCKET` | Yes* | Cloud SQL Unix socket path |
| `DATABASE_URL` | Yes* | Alternative: full connection string |
| `GCP_PROJECT_ID` | Yes | GCP project ID |
| `ENVIRONMENT` | No | Environment name: dev, staging, production |

*One of `DATABASE_URL` or `INSTANCE_UNIX_SOCKET` is required.

## Trigger

Triggered by Pub/Sub messages from the `alert-processor` service. Supports two event types:

### baxus_listing_alert

Standard alert notification when a listing matches a user's alert:

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

### user_example

Test message for sending example emails to users:

```json
{
  "user_id": "uuid-string",
  "user_email": "user@example.com"
}
```

## Email Content

Sends an HTML email containing:
- Alert name that matched
- Asset name and price
- Link to view the listing on BaxPro
- Unsubscribe and notification settings links

Emails are sent from `alerts@baxpro.xyz`.

## Data Flow

```
Pub/Sub (from alert-processor)  -->  alert-sender  -->  SendGrid  -->  User Email
                                          |
                                          v
                                     PostgreSQL (email_logs)
```
