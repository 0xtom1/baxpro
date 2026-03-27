# API Reference

## Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/auth/google` | Initiate Google OAuth flow | None |
| GET | `/api/auth/google/callback` | Handle OAuth callback | None |
| POST | `/api/auth/phantom` | Authenticate with Phantom wallet signature | None |
| POST | `/api/auth/demo-login` | Demo login (dev only) | None |
| POST | `/api/auth/logout` | Destroy session | Session |
| GET | `/api/auth/me` | Get current user | Session |

## User Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/user/complete-notification-setup` | Mark notification setup seen | Session |
| PATCH | `/api/user/notifications` | Update email preferences | Session |
| PATCH | `/api/user/account` | Update display name / wallet | Session |
| DELETE | `/api/user/account` | Delete user account | Session |

## Alerts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/alerts` | Get user's alerts | Session |
| POST | `/api/alerts` | Create new alert | Session |
| PATCH | `/api/alerts/:id` | Update alert | Session |
| DELETE | `/api/alerts/:id` | Delete alert | Session |
| POST | `/api/alerts/refresh-all-matches` | Refresh all matches | VIP |

## Activity & Assets

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/activity-types` | Get activity type list | Session |
| GET | `/api/activity` | Get activity feed (paginated) | Session |
| GET | `/api/assets/idx/:assetIdx` | Get asset by index | Session |
| GET | `/api/assets/:assetId` | Get asset by ID | Session |
| GET | `/api/my-bottles` | Get user's wallet bottles | Session |
| GET | `/api/my-bottles/:assetId` | Get bottle detail (ownership verified) | Session |

## Brands

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/brand-names` | Get list of distinct brand names | Session |
| GET | `/api/brands-list` | Get all brands with stats (count, floor price, volume) | Session |
| GET | `/api/brand?name=X&trait_*=Y` | Get brand assets, stats, traits, and activity | Session |
| POST | `/api/refresh-brands-list` | Refresh brands materialized view | VIP |

## Loans

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/loans` | Get listed loans for marketplace | Session |
| GET | `/api/loans/my` | Get user's loans (borrower + lender) | Session |

## Product Hierarchy (VIP)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/producers` | List producers | VIP |
| GET | `/api/brands/:producerIdx` | Get brands for producer | VIP |
| GET | `/api/sub-brands/:brandIdx` | Get sub-brands for brand | VIP |
| GET | `/api/brand-hierarchy` | Get hierarchy with filters | VIP |
| PATCH | `/api/brands/:brandIdx` | Update brand name | VIP |
| PATCH | `/api/sub-brands/:subBrandIdx` | Update sub-brand name | VIP |
| PATCH | `/api/brands/:brandIdx/review` | Update brand review status | VIP |
| GET | `/api/brand-details/:brandIdx` | Get brand details | VIP |
| POST | `/api/move-bottles` | Move bottles between sub-brands | VIP |
| GET | `/api/sub-brand-assets/:subBrandIdx` | Get assets for sub-brand | VIP |

## Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/unsubscribe` | Unsubscribe from emails (uses UUID in body) | None |
| POST | `/api/notifications/test-email` | Send test email | Session |

## Devnet (Dev Only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/devnet-airdrop` | Airdrop 2 Token 2022 bottles + 0.5 SOL to user's wallet | Session + Phantom |

## System

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | None |
| GET | `/api/system/version` | Get version info | None |
| GET | `/read-me` | Redirect to GitHub README | None |
