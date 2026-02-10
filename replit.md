# BaxPro

## Overview

BaxPro is a spirits collection platform for Baxus.co collectors. Core features: real-time marketplace data and brand analytics (Track), custom alerts for new listings (Trade), and on-chain bottle-backed lending via Solana (Borrow).

Tagline: "Track, Trade & Borrow Your Spirits Collection"

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

- `/dashboard` - Main landing page after sign-in with tabbed interface (Brands, Activity, Loans, My Vault, My Loans)
- `/alerts` - User's alert management page
- `/brand?name=<brand_name>` - Individual brand detail page
- `/my-vault/:assetId` - Bottle detail page with image, traits, and activity
- `/my-vault` - Redirects to `/dashboard` (legacy)
- `/my-bottles` - Redirects to `/dashboard` (legacy)

### Dashboard Page

The Dashboard page (`/dashboard`) is a Blur NFT marketplace-inspired interface with five tabs:

**Brands Tab**:
- Card grid display of brands with images and metrics
- Search filter for brands and producers (300ms debounce, server-side, punctuation-agnostic)
- Click to navigate to individual brand page
- Pagination controls

**Activity Tab**:
- Paginated activity feed showing recent marketplace activity
- Type filter dropdown (New Listing, Purchase, etc.)
- Columns: Asset name, Type badge, Producer, Price, External link, Date
- Delisted items shown with strikethrough styling

**Loans Tab**:
- Marketplace of listed loans available for funding
- Fund, cancel, and repay actions

**My Vault Tab** (formerly My Bottles):
- Card grid display of Baxus bottles owned by the user's wallet
- Portfolio value summary, bottle count, listed count stats
- Empty state when no wallet connected or no matching Baxus bottles
- Click card to view detailed bottle information at `/my-vault/:assetId`
- "Create Loan" button when wallet and bottles are available

**My Loans Tab** (Phantom wallet users only):
- Shows all loans created by or funded by the user (all statuses)
- Role-based actions: borrower can cancel/repay, lender can liquidate expired loans
- Borrower/Lender badge on active loans, expiry countdown
- Collateral images from matched Baxus assets
- Empty state with link to create first loan

**API Endpoints**:
- `GET /api/brands-list` - Returns brands with producer, asset count, listed count, floor price, volume_7d, volume_30d, distinct_owners_count
- `GET /api/activity` - Paginated activity feed with optional type filter
- `GET /api/activity-types` - List of activity type options for filtering
- `GET /api/my-bottles` - Fetches user's wallet bottles from Helius API and matches to baxus.assets
- `GET /api/loans/my` - Returns user's loans from Solana devnet

**Design Features**:
- Desktop: Top tabs, horizontal scroll content
- Mobile: Bottom tab bar navigation
- My Loans tab hidden for non-Phantom wallet users

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

### Bottle Detail Page

The Bottle Detail page (`/my-vault/:assetId`) displays detailed information about a specific bottle:

**API Endpoints**:
- `GET /api/my-bottles/:assetId` - Returns asset details with metadata and activity (ownership verified)

**Wallet Resolution**:
- Uses `phantomWallet` first (for Phantom-authenticated users)
- Falls back to `baxusWallet` (for Gmail users who added wallet in Account Settings)

**Security**:
- All endpoints verify user authentication
- Detail endpoint verifies the asset is in the user's wallet before returning data

**Dependencies**:
- Helius API for wallet data (`HELIUS_API_KEY` environment variable)
- Queries mainnet Solana with `showFungible: true` to include Token 2022 assets

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
- `HELIUS_API_KEY` (for wallet NFT data)
- `DEVNET_ADDRESS_PK` (dev only, private key for devnet bottle airdrop master wallet; JSON byte array format e.g. `[152,143,31,...]`)

### Devnet Bottle Airdrop

**Feature**: In dev environment, Phantom wallet users see a "Devnet Bottle Airdrop!" button in the nav bar. Clicking it sends 2 Token 2022 bottles + 0.5 SOL from a master wallet to the user's Phantom wallet address on Solana devnet.

**Flow**:
- `POST /api/devnet-airdrop` — authenticated, Phantom wallet required, dev-only
- Backend (`server/sdk/airdropService.ts`) reads `DEVNET_ADDRESS_PK`, finds 2 Token 2022 mints with balance in the master wallet, transfers them + 0.5 SOL
- Button grays out after successful airdrop (session-only, no DB tracking)
- Fails if master wallet has fewer than 2 Token 2022 bottles available

**Terraform/Deploy**: `DEVNET_ADDRESS_PK` stored as GitHub secret, passed via `TF_VAR_devnet_address_pk` to terraform which creates a GCP Secret Manager secret and injects it into Cloud Run (dev environment only).