# BaxPro Repository Structure

This monorepo contains all components of the BaxPro bourbon alert platform.

## Directory Structure
```
# to get structure
find . -name node_modules -prune -o -name .git -prune -o -name .terraform -prune -o -print | sort | sed -e "s/[^-][^\/]*\//│   /g" -e "s/│   \([^│]\)/├── \1/"
```

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
│   └── vite.ts              # Vite integration
│
├── shared/                    # Shared code between frontend/backend
│   └── schema.ts            # Database schema & types
│
├── functions/                 # Cloud Functions
│   └── baxus-monitor/        # Monitoring function
│       ├── src/
│       │   └── index.ts     # Function entry point
│       ├── package.json
│       └── README.md
│
├── services/                  # Cloud Run Services
│   └── alert-processor/      # Alert notification service
│       ├── src/
│       │   └── index.ts     # Service entry point
│       ├── package.json
│       └── README.md
│
├── terraform/                 # Infrastructure as Code
│   ├── main.tf              # Main web app infrastructure
│   ├── functions.tf         # Cloud Functions infrastructure
│   ├── services.tf          # Backend services infrastructure
│   ├── variables.tf         # Configuration variables
│   ├── outputs.tf           # Deployment outputs
│   ├── backend.tf           # State backend config
│   └── README.md
│
├── .github/
│   └── workflows/
│       ├── deploy.yml       # Auto-deploy on push to main
│       └── test.yml         # PR validation
│
├── attached_assets/           # Static assets (images, etc.)
├── Dockerfile                # Web app container
├── package.json              # Root dependencies
└── Documentation files...
```

## Component Overview

### 1. Web Application (`client/` + `server/`)

**Purpose**: User-facing website for managing bourbon alerts

**Tech Stack**:
- Frontend: React + TypeScript + Wouter
- Backend: Express + Node.js
- Database: PostgreSQL (Cloud SQL)
- UI: shadcn/ui + Tailwind CSS

**Deployment**: Cloud Run (containerized)

**Entry Points**:
- Development: `npm run dev` (starts both frontend and backend)
- Production: `npm start` (serves built app)

### 2. Baxus Monitor (`functions/baxus-monitor/`)

**Purpose**: Periodically checks Baxus.co for new bourbon listings

**Tech Stack**: Node.js Cloud Function

**Triggers**: Cloud Scheduler (every 15 minutes)

**Workflow**:
1. Fetch current Baxus listings via API
2. Load active user alerts from database
3. Match listings against alert criteria
4. Publish matches to Pub/Sub topic

**Deployment**: Cloud Functions (via Terraform)

### 3. Alert Processor (`services/alert-processor/`)

**Purpose**: Sends SMS notifications when matches are found

**Tech Stack**: Express + Cloud Run

**Triggers**: Pub/Sub push subscription

**Workflow**:
1. Receive alert match from Pub/Sub
2. Load user phone number from database
3. Send SMS via Twilio
4. Log notification to database

**Deployment**: Cloud Run (containerized)

### 4. Infrastructure (`terraform/`)

**Purpose**: Manages all GCP resources

**Key Resources**:
- Cloud Run (web app + alert processor)
- Cloud Functions (baxus monitor)
- Cloud SQL (PostgreSQL database)
- Secret Manager (credentials)
- Artifact Registry (Docker images)
- Pub/Sub (messaging)
- Cloud Scheduler (cron jobs)

**Deployment**: `terraform apply`

## Data Flow

```
User creates alert in Web App
  ↓
Stored in Cloud SQL
  ↓
Cloud Scheduler triggers Baxus Monitor (every 15 min)
  ↓
Monitor checks Baxus.co API
  ↓
Matches found? → Publish to Pub/Sub
  ↓
Alert Processor receives message
  ↓
Send SMS via Twilio
  ↓
Log notification to database
```

## Development Workflow

### Working on Web App

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access at http://localhost:5000

# Build for production
npm run build
```

### Working on Cloud Function

```bash
cd functions/baxus-monitor

# Install dependencies
npm install

# Run locally
npm run dev

# Deploy (via Terraform)
cd ../../terraform
terraform apply -var="enable_monitoring=true"
```

### Working on Alert Processor

```bash
cd services/alert-processor

# Install dependencies
npm install

# Run locally
npm run dev

# Test with mock Pub/Sub message
curl -X POST http://localhost:8080/alerts \
  -H "Content-Type: application/json" \
  -d '{"message":{"data":"eyJ1c2VySWQiOjEsImFsZXJ0SWQiOjF9"}}'

# Deploy (via Terraform)
cd ../../terraform
terraform apply -var="enable_alert_processor=true"
```

### Infrastructure Changes

```bash
cd terraform

# Initialize (first time)
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy everything (careful!)
terraform destroy
```

## CI/CD Pipeline

### On Push to `main`:

1. ✅ Build web app Docker image
2. ✅ Push to Artifact Registry
3. ✅ Run Terraform to deploy infrastructure
4. ✅ Update Cloud Run with new image

### On Pull Request:

1. ✅ Type check
2. ✅ Build validation
3. ✅ Docker build test
4. ✅ Terraform validation

See `.github/workflows/` for workflow definitions.

## Deployment Strategy

### Phase 1: Web App Only (Current)
- Deploy web app to Cloud Run
- Users can create alerts
- No monitoring or notifications yet

### Phase 2: Add Monitoring
- Deploy Baxus Monitor function
- Function checks Baxus but doesn't send notifications
- Test matching logic

### Phase 3: Add Notifications
- Deploy Alert Processor service
- Enable SMS notifications via Twilio
- Full end-to-end functionality

### Phased Deployment

```bash
# Phase 1: Web app
terraform apply

# Phase 2: Add monitoring
terraform apply -var="enable_monitoring=true"

# Phase 3: Add notifications
terraform apply \
  -var="enable_monitoring=true" \
  -var="enable_alert_processor=true"
```

## Database Schema

Shared database schema defined in `shared/schema.ts`:

- **users**: User accounts (OAuth, phone number)
- **alerts**: User-created bourbon alerts
- **notifications** (future): SMS notification history

All services access the same Cloud SQL instance.

## Environment Variables

### Web App
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `PORT`: Server port (8080 in production)

### Baxus Monitor
- `DATABASE_URL`: PostgreSQL connection string
- `BAXUS_API_URL`: Baxus API endpoint
- `ALERT_TOPIC`: Pub/Sub topic for alerts

### Alert Processor
- `DATABASE_URL`: PostgreSQL connection string
- `TWILIO_ACCOUNT_SID`: Twilio account ID
- `TWILIO_AUTH_TOKEN`: Twilio API key
- `TWILIO_PHONE_NUMBER`: Sending phone number

All secrets stored in GCP Secret Manager.

## Adding a New Service

1. **Create service directory**
   ```bash
   mkdir services/new-service
   cd services/new-service
   npm init
   ```

2. **Add Dockerfile** (if Cloud Run)
   ```dockerfile
   FROM node:20-slim
   # ... build steps ...
   ```

3. **Add Terraform config**
   Create `terraform/new-service.tf`

4. **Update CI/CD**
   Add build/deploy steps to `.github/workflows/deploy.yml`

5. **Document**
   Create `services/new-service/README.md`

## Testing

```bash
# Web app tests
npm test

# Cloud Function tests
cd functions/baxus-monitor
npm test

# Alert Processor tests
cd services/alert-processor
npm test

# E2E tests (future)
npm run test:e2e
```

## Monitoring

```bash
# View Cloud Run logs
gcloud run services logs read baxpro-production --region=us-central1

# View Cloud Function logs
gcloud functions logs read baxus-monitor --region=us-central1

# View Pub/Sub metrics
gcloud pubsub topics describe bourbon-alerts
```

## Cost Breakdown

- **Cloud Run (web)**: ~$0-10/month (free tier)
- **Cloud Run (alerts)**: ~$0-5/month (minimal usage)
- **Cloud Functions**: ~$0-5/month (15-min schedule)
- **Cloud SQL**: ~$10-30/month (db-f1-micro)
- **Pub/Sub**: ~$0-1/month (low volume)
- **Twilio SMS**: ~$0.0075 per message

**Estimated Total**: $10-50/month depending on usage

## Security

- ✅ No secrets in code (Secret Manager)
- ✅ Least-privilege service accounts
- ✅ Private database (Cloud SQL Proxy)
- ✅ HTTPS enforced everywhere
- ✅ Workload Identity Federation for CI/CD

## Next Steps

1. Implement Baxus API integration
2. Build alert matching algorithm
3. Set up Twilio account and test SMS
4. Add notification preferences (quiet hours, etc.)
5. Implement monitoring dashboard
6. Add email notification option
7. Support multiple bourbon marketplaces

## Support

- **Web App**: See `DEPLOYMENT.md`
- **CI/CD**: See `GITHUB_ACTIONS_SETUP.md`
- **Custom Domain**: See `CUSTOM_DOMAIN_SETUP.md`
- **Functions**: See `functions/*/README.md`
- **Services**: See `services/*/README.md`
