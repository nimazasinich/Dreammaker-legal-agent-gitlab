# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added - Futures Trading Integration

#### Features
- **Futures Trading API** - Complete REST API for futures trading operations
  - Positions management (`GET /api/futures/positions`)
  - Order placement and cancellation (`POST /api/futures/orders`, `DELETE /api/futures/orders/:id`)
  - Leverage management (`PUT /api/futures/leverage`)
  - Account balance (`GET /api/futures/account/balance`)
  - Orderbook data (`GET /api/futures/orderbook/:symbol`)
  - Funding rates (`GET /api/futures/funding/:symbol`)

- **WebSocket Channel** - Real-time futures updates
  - Position updates (`position_update`)
  - Order updates (`order_update`)
  - Funding rate ticks (`funding_tick`)
  - Channel: `ws://localhost:3001/ws/futures`

- **KuCoin Futures Adapter** - Provider adapter for KuCoin Futures API
  - HMAC signature authentication
  - Error handling and retry logic
  - Rate limit compliance
  - Support for isolated/cross margin modes

- **Database Migrations** - Futures data persistence
  - Migration v6: `create_futures_tables`
  - Tables: `futures_positions`, `futures_orders`, `leverage_settings`, `funding_rates`
  - Repositories: `FuturesPositionRepository`, `FuturesOrderRepository`

- **Feature Flags** - Safe rollout mechanism
  - `FEATURE_FUTURES` - Enable/disable futures trading (default: `false`)
  - `EXCHANGE_KUCOIN` - Enable/disable KuCoin exchange (default: `true`)

#### Documentation
- **API Documentation** - Updated `docs/New folder/ENDPOINTS.md` with Futures Trading section
- **Operations Runbook** - `RUNBOOK.md` with rollback procedures
- **Deployment Checklist** - `DEPLOYMENT_CHECKLIST.md` for verification
- **Quick Start Guide** - `FUTURES_QUICKSTART.md` for setup
- **Git Workflow** - `GIT_WORKFLOW.md` for safe merge procedures
- **Integration Report** - `artifacts/FUTURES_INTEGRATION_COMPLETE.md`

#### Testing
- **Verification Script** - `scripts/verify-futures-integration.sh`
- **Smoke Tests** - `scripts/test-futures-api.sh` (bash) and `.ps1` (PowerShell)
- **Pre-Merge Verification** - `scripts/pre-merge-verify.sh`
- **CI/CD** - GitHub Actions workflow (`.github/workflows/ci-futures.yml`)

#### Configuration
- **Environment Variables** - Added to `.env.example`:
  - `FEATURE_FUTURES` - Enable futures trading
  - `EXCHANGE_KUCOIN` - Enable KuCoin exchange
  - `KUCOIN_FUTURES_KEY` - KuCoin Futures API key
  - `KUCOIN_FUTURES_SECRET` - KuCoin Futures API secret
  - `KUCOIN_FUTURES_PASSPHRASE` - KuCoin Futures API passphrase
  - `FUTURES_BASE_URL` - KuCoin Futures API base URL

### Changed
- **Feature Flags** - Added futures-related flags to `src/config/flags.ts`
- **Server Routes** - Mounted futures routes at `/api/futures`
- **WebSocket Handler** - Integrated futures WebSocket channel

### Security
- **No Hardcoded Secrets** - All credentials via environment variables
- **Request Validation** - Input validation on all futures endpoints
- **Error Handling** - Proper error mapping and logging

### Breaking Changes
- **None** - Feature is disabled by default (`FEATURE_FUTURES=false`)
- System behavior unchanged when flag is OFF

---

## [1.0.0] - 2025-11-06

### Added
- Initial futures trading integration
- Feature flag system for safe rollout

---

## Upgrade Guide

### Enabling Futures Trading

1. **Set Environment Variables:**
   ```bash
   FEATURE_FUTURES=true
   KUCOIN_FUTURES_KEY=your_key
   KUCOIN_FUTURES_SECRET=your_secret
   KUCOIN_FUTURES_PASSPHRASE=your_passphrase
   ```

2. **Restart Server:**
   ```bash
   npm run start
   ```

3. **Verify:**
   ```bash
   curl http://localhost:3001/api/futures/positions
   ```

### Disabling Futures Trading

1. **Set Environment Variable:**
   ```bash
   FEATURE_FUTURES=false
   ```

2. **Restart Server:**
   ```bash
   npm run start
   ```

3. **Verify:**
   ```bash
   curl http://localhost:3001/api/futures/positions
   # Should return 404
   ```

---

## Migration Notes

### Database Migration v6

The `create_futures_tables` migration will automatically apply on server startup. No manual intervention required.

**Tables Created:**
- `futures_positions` - Open futures positions
- `futures_orders` - Futures orders (pending/active/filled)
- `leverage_settings` - Leverage configuration per symbol
- `funding_rates` - Funding rate history

**Rollback:** If needed, restore database backup from before migration v6.

---

## Deprecations

None in this release.

---

## Security Advisories

- **API Credentials:** Store KuCoin Futures credentials securely in environment variables, never in code
- **Feature Flag:** Keep `FEATURE_FUTURES=false` in production until fully tested
- **Rate Limits:** Monitor API rate limits to avoid service disruption

---

## Known Issues

None reported.

---

## Contributors

- Integration Team - Futures trading integration

---

**Format:** [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
**Versioning:** [Semantic Versioning](https://semver.org/)
