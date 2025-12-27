# BaxPro - Product Availability Alert Platform

Never miss products on Baxus.co. Get instant email alerts when items matching your criteria become available at the right price.

## Features

- **Custom Alerts** - Set multiple search criteria per alert
- **Price Filtering** - Only get notified for products within your budget
- **Year & Age Filters** - Filter by bottled year and product age
- **Email Notifications** - Receive email alerts via SendGrid
- **Secure Authentication** - Sign in with Google

### VIP Features (Experimental)

- **Product Hierarchy Editor** - Browse and manage the product hierarchy (Producers, Brands, Sub-Brands) for better alert matching
- **Refresh All Alert Matches** - System-wide background processing to re-match all user alerts against current listings. Used when importing historical listings.

## Live

**Production**: [baxpro.xyz](https://baxpro.xyz)
**Development**: [dev.baxpro.xyz](https://dev.baxpro.xyz)

## Tech Stack

### Main Web Application

**Frontend**
- React 18 + TypeScript
- Wouter for routing
- shadcn/ui + Tailwind CSS
- TanStack Query for state management
- Framer Motion for animations

**Backend**
- Express.js + Node.js
- PostgreSQL (Cloud SQL on GCP, Neon on Replit)
- Drizzle ORM
- Session-based authentication with Google OAuth

### Microservices (Python)

| Service | Type | Purpose |
|---------|------|---------|
| **baxus-monitor** | Cloud Run | Polls Baxus API for listings (30s prod / 300s dev) |
| **alert-processor** | Cloud Function | Matches listings to user alerts |
| **alert-sender** | Cloud Function | Sends email notifications via SendGrid |

**Shared Stack:**
- Python 3.11
- SQLAlchemy for database access
- Google Cloud Pub/Sub for messaging
- functions-framework (Cloud Functions)

### Infrastructure
- Google Cloud Platform
- Cloud Run (web app + baxus-monitor)
- Cloud Functions (alert-processor, alert-sender)
- Cloud SQL (PostgreSQL 15)
- Pub/Sub for event-driven messaging
- Terraform for IaC
- GitHub Actions for CI/CD

## Architecture

```
[Baxus API]
     │
     ▼
┌─────────────────┐    ┌────────────┐    ┌─────────────────┐
│  baxus-monitor  │◄──►│ Cloud SQL  │◄──►│    Web App      │
│  (Cloud Run)    │    │(PostgreSQL)│    │  (Cloud Run)    │
│Find new listings│    │            │    │                 │
└────────┬────────┘    └────────────┘    └─────────────────┘
         │
         │ Pub/Sub: new_listing
         ▼
┌─────────────────┐
│ alert-processor │
│ (Cloud Function)│
│ Match listings  │
│   to alerts     │
└────────┬────────┘
         │
         │ Pub/Sub: alert_match
         ▼
┌─────────────────┐
│  alert-sender   │
│ (Cloud Function)│
│   Send email    │
└────────┬────────┘
         │
         ▼
   [Email to User]
```

All services connect to Cloud SQL for reads/writes.

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Initiate Google OAuth flow |
| GET | `/api/auth/google/callback` | Handle OAuth callback |
| POST | `/api/auth/demo-login` | Demo login (dev only) |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/auth/me` | Get current user |

### User Settings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/complete-notification-setup` | Mark notification setup seen |
| PATCH | `/api/user/notifications` | Update email preferences |
| PATCH | `/api/user/account` | Update display name / wallet |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get user's alerts |
| POST | `/api/alerts` | Create new alert |
| PATCH | `/api/alerts/:id` | Update alert |
| DELETE | `/api/alerts/:id` | Delete alert |
| POST | `/api/alerts/refresh-all-matches` | Refresh all matches (VIP) |

### Activity & Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activity-types` | Get activity type list |
| GET | `/api/activity` | Get activity feed (paginated) |
| GET | `/api/assets/idx/:assetIdx` | Get asset by index |
| GET | `/api/assets/:assetId` | Get asset by ID |

### Product Hierarchy (VIP)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/producers` | List producers |
| GET | `/api/brands/:producerIdx` | Get brands for producer |
| GET | `/api/sub-brands/:brandIdx` | Get sub-brands for brand |
| GET | `/api/brand-hierarchy` | Get hierarchy with filters |
| PATCH | `/api/brands/:brandIdx` | Update brand name |
| PATCH | `/api/sub-brands/:subBrandIdx` | Update sub-brand name |
| PATCH | `/api/brands/:brandIdx/review` | Update brand review status |
| GET | `/api/brand-details/:brandIdx` | Get brand details |
| POST | `/api/move-bottles` | Move bottles between sub-brands |
| GET | `/api/sub-brand-assets/:subBrandIdx` | Get assets for sub-brand |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/unsubscribe` | Unsubscribe from emails |
| POST | `/api/notifications/test-email` | Send test email |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/system/version` | Get version info |

## Multi-Environment Deployment

BaxPro uses completely separate GCP projects for production and development.

| Environment | GCP Project | Domain | Branch | Polling |
|-------------|-------------|--------|--------|---------|
| Production | `GCP_PROJECT_ID` | baxpro.xyz | main | 30s |
| Development | `GCP_PROJECT_ID_DEV` | dev.baxpro.xyz | dev | 300s |

Each environment has its own:
- VPC Connector & Cloud SQL instance
- Cloud Run services & Cloud Functions
- Pub/Sub topics & subscriptions
- Secrets (OAuth, SendGrid, DB)
- Load Balancer with SSL certificate

## Repository Structure

```
baxpro/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utilities & API client
├── server/                  # Express backend
│   ├── routes.ts            # API endpoints
│   ├── storage.ts           # Database operations
│   └── auth.ts              # Google OAuth
├── shared/                  # Shared types & schema
│   └── schema.ts            # Drizzle ORM models
├── services/
│   ├── baxus-monitor/       # Listing scraper (Cloud Run)
│   │   └── src/             # Python source
│   ├── alert-processor/     # Alert matching (Cloud Function)
│   │   └── src/             # Python source
│   └── alert-sender/        # Notifications (Cloud Function)
│       └── src/             # Python source
├── terraform/               # Infrastructure as Code
│   ├── main.tf              # Core resources
│   ├── variables.tf         # Input variables
│   └── cloud-functions.tf   # Function definitions
├── migrations/              # Database migrations
└── .github/workflows/       # CI/CD pipelines
    └── deploy.yml           # Unified deployment (auto: main→prod, manual: dev/prod)
```

See [REPO_STRUCTURE.md](setup_docs/REPO_STRUCTURE.md) for detailed documentation.

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- GCP account with billing enabled
- Terraform 1.0+
- gcloud CLI

### Local Development

See [.devcontainer/README.md](.devcontainer/README.md) for local development setup instructions.

## Environment Variables

### Web App
```bash
DATABASE_URL=postgresql://user:pass@host/db
SESSION_SECRET=your-secret-key
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

### Alert Sender
```bash
SENDGRID_API_KEY=SG.xxxxx
```

All secrets managed via GCP Secret Manager.

## Documentation

- **[GCP_PROJECT_SETUP.md](setup_docs/GCP_PROJECT_SETUP.md)** - GCP project setup
- **[GITHUB_ACTIONS_SETUP.md](setup_docs/GITHUB_ACTIONS_SETUP.md)** - CI/CD setup
- **[CUSTOM_DOMAIN_SETUP.md](setup_docs/CUSTOM_DOMAIN_SETUP.md)** - Custom domain configuration

## CI/CD

Deployment via GitHub Actions:

- Push to `main` → Auto-deploy to production (baxpro.xyz)
- Manual trigger → Choose dev or production environment

## Cost Estimate

**Monthly (approximate):**
- Cloud Run: $0-10
- Cloud Functions: $0-5
- Cloud SQL: $10-30
- Pub/Sub: $0-1
- SendGrid: Free tier (100 emails/day)

**Total**: $10-45/month depending on usage

## License

MIT

## Support

For issues: support@baxpro.xyz

## Disclaimer

BaxPro is not affiliated with Baxus.co. This is an independent monitoring tool.

---

Built with ❤️ for bourbon enthusiasts
