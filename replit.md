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

### Route Structure

- `/dashboard` - Main landing page after sign-in, displays searchable brands list
- `/alerts` - User's alert management page
- `/brand?name=<brand_name>` - Individual brand detail page
- `/activity` - Activity feed

### Brands Listing Page (Dashboard)

The Dashboard page (`/dashboard`) displays a searchable, sortable list of all brands:

**API Endpoint**:
- `GET /api/brands-list` - Returns all brands with producer, asset count, listed count, floor price

**Features**:
- Search filter for brands and producers
- Sortable columns (brand name, producer, assets, listed, floor price)
- Brand images with fallback icons
- Mobile-responsive layout
- Click to navigate to individual brand page

### Brand Page

The Brand page (`/brand?name=<brand_name>`) displays detailed information about a specific brand:

**API Endpoints**:
- `GET /api/brand-names` - Lists distinct brand names from v_asset_summary view
- `GET /api/brand?name=X&trait_*=Y` - Returns assets, stats, traits, and activity for a brand

**Features**:
- **Items Tab**: Grid of listed bottles with images and prices, filtered by selected traits
- **Loans Tab**: Placeholder for future loan features
- **Charts Tab**: Scatter plot showing price vs market_price
- **Activity Tab**: Activity feed for brand bottles with strikethrough for delisted items
- **Traits Sidebar**: Collapsible sections with checkbox filters extracted from metadata_json.attributes

**Implementation Notes**:
- Uses query parameters instead of path params to handle special characters in brand names
- Trait filters normalized from ParsedQs objects to plain strings to prevent SQL injection
- Mobile-responsive with slide-out filters drawer

### VIP Features

Users with `isVip: true` can access:
- Product hierarchy editor (Producers → Brands → Sub-Brands)
- System-wide alert match refresh
- Refresh brands list materialized view (`POST /api/refresh-brands-list`)

### Performance Optimizations

**Brands List Materialized View** (`baxus.mv_brands_list`):
- Pre-computes brand aggregations (asset counts, floor prices) for faster dashboard loading
- Refresh via VIP endpoint or manually: `REFRESH MATERIALIZED VIEW CONCURRENTLY baxus.mv_brands_list`
- Migration: `migrations/0006_brands_list_materialized_view.sql`

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