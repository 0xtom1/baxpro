# BaxPro

## Overview

BaxPro is a product availability alert platform for Baxus.co. Users create custom alerts with search criteria (name matches, price limits, age/year filters) and receive email notifications when matching products become available.

The system consists of a main TypeScript/React web application and Python microservices that poll the Baxus API, match listings to alerts, and send notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Main Web Application

**Frontend**: React 18 with TypeScript, using Wouter for routing and TanStack Query for server state. UI built with shadcn/ui components and Tailwind CSS. Supports dark/light themes with localStorage persistence.

**Backend**: Express.js server with session-based authentication. Google OAuth is the primary auth method. Sessions stored in PostgreSQL using connect-pg-simple.

**Database**: PostgreSQL accessed via Drizzle ORM. Schema defined in `shared/schema.ts`. Supports two connection modes:
- Replit/Neon: Uses `DATABASE_URL` environment variable
- GCP Cloud SQL: Uses Unix socket via `INSTANCE_UNIX_SOCKET`, `DB_USER`, `DB_PASS`, `DB_NAME`

**Key Files**:
- `server/routes.ts` - API endpoints and auth logic
- `server/storage.ts` - Database operations interface
- `server/db.ts` - Connection configuration
- `shared/schema.ts` - Drizzle schema and types

### Microservices (Python)

Three Python services handle the event pipeline:

1. **baxus-monitor** (Cloud Run): Polls Baxus API continuously. Publishes new/changed listings to Pub/Sub.

2. **alert-processor** (Cloud Function): Receives Pub/Sub messages, matches listings against user alerts, publishes matches.

3. **alert-sender** (Cloud Function): Receives match messages, sends email notifications via SendGrid.

Services use SQLAlchemy for database access and share common patterns in their `src/` directories.

### Data Flow

```
Baxus API → baxus-monitor → Pub/Sub → alert-processor → Pub/Sub → alert-sender → Email
```

### VIP Features

Users with `isVip: true` can access:
- Product hierarchy editor (Producers → Brands → Sub-Brands)
- System-wide alert match refresh

## External Dependencies

**Authentication**:
- Google OAuth 2.0 (client ID/secret required)

**Database**:
- PostgreSQL (Neon on Replit, Cloud SQL on GCP)

**Messaging**:
- Google Cloud Pub/Sub for inter-service communication

**Email**:
- SendGrid for notification delivery

**Infrastructure**:
- Google Cloud Run (web app, baxus-monitor)
- Google Cloud Functions (alert-processor, alert-sender)
- Terraform for infrastructure-as-code (see `terraform/`)

**Environment Variables** (main app):
- `DATABASE_URL` or `DB_USER`/`DB_PASS`/`DB_NAME`/`INSTANCE_UNIX_SOCKET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `CUSTOM_DOMAIN` (optional, for OAuth redirect)