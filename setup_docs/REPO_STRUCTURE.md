# BaxPro Repository Structure

This monorepo contains all components of the BaxPro spirits collection platform.

## Directory Structure

```
baxpro/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Client utilities
│   │   └── hooks/            # React hooks
│   └── public/               # Static assets
│
├── server/                    # Backend Express API
│   ├── index.ts             # Main entry point
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Database interface
│   ├── db.ts                # Database connection
│   └── sdk/                 # Solana integration (loans, airdrops)
│
├── shared/                    # Shared code between frontend/backend
│   └── schema.ts            # Database schema & types
│
├── integration-sdk/           # Solana lending protocol SDK
│
├── services/
│   ├── baxus-monitor/        # Marketplace & blockchain monitor (Cloud Run Job)
│   │   └── src/              # Python source
│   ├── alert-processor/      # Alert matching (Cloud Function)
│   │   └── src/              # Python source
│   └── alert-sender/         # Email notifications (Cloud Function)
│       └── src/              # Python source
│
├── terraform/                 # Infrastructure as Code
│   ├── main.tf              # Core resources
│   ├── variables.tf         # Input variables
│   └── cloud-functions.tf   # Function definitions
│
├── migrations/                # Database migrations (Drizzle)
│
├── setup_docs/                # Documentation
│
└── .github/workflows/         # CI/CD pipelines
    └── deploy.yml            # Manual deployment (workflow_dispatch)
```

## Tech Stack

### Main Web Application

**Frontend**: React 18 with TypeScript, using Wouter for routing and TanStack Query for server state. UI built with shadcn/ui components and Tailwind CSS. Supports dark/light themes.

**Backend**: Express.js server with session-based authentication. Supports Google OAuth and Phantom wallet authentication. Sessions stored in PostgreSQL via connect-pg-simple.

**Database**: PostgreSQL accessed via Drizzle ORM. Schema defined in `shared/schema.ts`. Supports two connection modes:
- Local/Neon: Uses `DATABASE_URL` environment variable
- GCP Cloud SQL: Uses Unix socket via `INSTANCE_UNIX_SOCKET`, `DB_USER`, `DB_PASS`, `DB_NAME`

### Microservices (Python)

| Service | Runtime | Trigger | Purpose |
|---------|---------|---------|---------|
| **baxus-monitor** | Cloud Run Job | Cloud Scheduler (every 5 min) | Polls Baxus API for listings, tracks on-chain mints/burns/purchases via Helius |
| **alert-processor** | Cloud Function | Pub/Sub | Matches new listings against user alerts |
| **alert-sender** | Cloud Function | Pub/Sub | Sends email notifications via SendGrid |

All Python services use SQLAlchemy for database access and Python 3.11.

### Infrastructure

- Google Cloud Run (web app)
- Google Cloud Run Jobs (baxus-monitor)
- Google Cloud Functions (alert-processor, alert-sender)
- Cloud SQL (PostgreSQL 15)
- Cloud Pub/Sub (event-driven messaging)
- Cloud Scheduler (cron triggers)
- Secret Manager (all credentials)
- Artifact Registry (Docker images)
- Global Load Balancer with managed SSL
- Terraform for IaC
- GitHub Actions for CI/CD

## Architecture

```
[Baxus API]     [Helius API]
     |               |
     v               v
+--------------------------+    +------------+    +----------------+
|     baxus-monitor        |<-->| Cloud SQL  |<-->|    Web App      |
|   (Cloud Run Job)        |    |(PostgreSQL)|    |  (Cloud Run)    |
|  - Poll new listings     |    |            |    |  - React SPA    |
|  - Track on-chain txns   |    |            |    |  - Express API  |
+-----------+--------------+    +------------+    +----------------+
            |
            | Pub/Sub: new_listing
            v
   alert-processor (Cloud Function)
            |
            | Pub/Sub: alert_match
            v
   alert-sender (Cloud Function) --> Email (SendGrid)
```

## Multi-Environment Deployment

BaxPro uses completely separate GCP projects for each environment. Deployments are manual via GitHub Actions `workflow_dispatch`.

| Environment | GCP Project | Domain | Terraform Workspace |
|-------------|-------------|--------|---------------------|
| Production | `GCP_PROJECT_ID` | baxpro.xyz | production |
| Development | `GCP_PROJECT_ID_DEV` | dev.baxpro.xyz | dev |

Each environment has its own:
- VPC Connector & Cloud SQL instance
- Cloud Run services & Cloud Functions
- Pub/Sub topics & subscriptions
- Secrets (OAuth, SendGrid, DB credentials)
- Load Balancer with managed SSL certificate

## Environment Variables

### Web App
- `DATABASE_URL` or `DB_USER`/`DB_PASS`/`DB_NAME`/`INSTANCE_UNIX_SOCKET`
- `SESSION_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `CUSTOM_DOMAIN` (for OAuth redirect)
- `HELIUS_API_KEY` (wallet NFT data)
- `DEVNET_ADDRESS_PK` (dev only, for bottle airdrop)

### Baxus Monitor
- Database credentials (via Secret Manager)
- `HELIUS_API_KEY`

### Alert Sender
- `SENDGRID_API_KEY`
- Database credentials (via Secret Manager)

All secrets stored in GCP Secret Manager and injected at runtime.

## Cost Estimate

**Monthly (approximate):**
- Cloud Run (web app): $0-10
- Cloud Run Job (monitor): $0-5
- Cloud Functions: $0-5
- Cloud SQL: $10-30
- Pub/Sub: $0-1
- SendGrid: Free tier (100 emails/day)

**Estimated Total**: $10-50/month depending on usage

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5000
```

## Related Documentation

- [API Reference](API_REFERENCE.md)
- [GCP Project Setup](GCP_PROJECT_SETUP.md)
- [GitHub Actions Setup](GITHUB_ACTIONS_SETUP.md)
- [Custom Domain Setup](CUSTOM_DOMAIN_SETUP.md)
- [Integration SDK](INTEGRATION.md)
