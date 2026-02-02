# BaxPro

## Overview

BaxPro is a product availability alert platform for Baxus.co. Users create custom alerts with search criteria (name matches, price limits, age/year filters) and receive email notifications when matching products become available.

The system consists of a main TypeScript/React web application and Python microservices that poll the Baxus API, match listings to alerts, and send notifications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Main Web Application

**Frontend**: React 18 with TypeScript, using Wouter for routing and TanStack Query for server state. UI built with shadcn/ui components and Tailwind CSS. Supports dark/light themes with localStorage persistence.

**Backend**: Express.js server with session-based authentication. Supports Google OAuth and Phantom wallet authentication. Sessions stored in PostgreSQL using connect-pg-simple.

**Authentication Methods**:
- Google OAuth 2.0: Users sign in with Google, email managed by OAuth
- Phantom Wallet: Users sign in by signing a challenge message with their Solana wallet. Wallet users can add/edit their email in account settings for notifications.

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

- `/dashboard` - Main landing page after sign-in with tabbed interface (Brands/Activity)
- `/alerts` - User's alert management page
- `/brand?name=<brand_name>` - Individual brand detail page

### Dashboard Page

The Dashboard page (`/dashboard`) is a Blur NFT marketplace-inspired interface with two tabs:

**Brands Tab**:
- Horizontal scrollable table with sticky first column on mobile
- Columns: Brand (with image), Producer, Floor Price, 7D Volume, 30D Volume, Owners, Supply, Listed
- Search filter for brands and producers
- Click to navigate to individual brand page
- Pagination controls

**Activity Tab**:
- Paginated activity feed showing recent marketplace activity
- Type filter dropdown (New Listing, Purchase, etc.)
- Columns: Asset name, Type badge, Producer, Price, External link, Date
- Delisted items shown with strikethrough styling

**API Endpoints**:
- `GET /api/brands-list` - Returns brands with producer, asset count, listed count, floor price, volume_7d, volume_30d, distinct_owners_count
- `GET /api/activity` - Paginated activity feed with optional type filter
- `GET /api/activity-types` - List of activity type options for filtering

**Design Features**:
- Desktop: Top tabs, horizontal scroll table
- Mobile: Bottom tab bar navigation, sticky first column

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