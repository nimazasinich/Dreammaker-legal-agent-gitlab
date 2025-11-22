# Futures Integration - Pre-Deployment Checklist

**Use this checklist before enabling futures trading in production.**

---

## ✅ Pre-Deployment Verification

### Code Integration
- [ ] All files verified via `bash scripts/verify-futures-integration.sh`
- [ ] Migration v6 exists in `src/data/DatabaseMigrations.ts`
- [ ] Routes mounted at `/api/futures` in `server.ts`
- [ ] WebSocket channel integrated at `/ws/futures`
- [ ] Feature flags configured in `src/config/flags.ts`

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `FEATURE_FUTURES=false` set (for staging testing)
- [ ] `EXCHANGE_KUCOIN=true` set
- [ ] KuCoin Futures credentials entered (`KUCOIN_FUTURES_KEY`, `KUCOIN_FUTURES_SECRET`, `KUCOIN_FUTURES_PASSPHRASE`)
- [ ] `FUTURES_BASE_URL` configured (default: `https://api-futures.kucoin.com`)

### Database Readiness
- [ ] Database backup created
- [ ] Migration v6 will auto-apply on startup
- [ ] Schema verified: `futures_positions`, `futures_orders`, `leverage_settings`, `funding_rates`

### Security Review
- [ ] No hardcoded credentials in code
- [ ] API keys stored in `.env` (not committed)
- [ ] Rate limiting reviewed (currently provider-level)
- [ ] Request validation implemented in controller

---

## ✅ Staging Phase 1: Flag OFF

- [ ] **Server Startup**
  - [ ] `npm ci && npm run build && npm run start` completes successfully
  - [ ] Migration v6 applied (check logs)
  - [ ] No errors in server logs

- [ ] **Non-Futures Routes**
  - [ ] Existing endpoints work as before
  - [ ] `GET /api/health` returns healthy
  - [ ] `GET /api/market/prices` works
  - [ ] Non-futures WebSocket (`/ws`) works

- [ ] **Futures Routes (Disabled)**
  - [ ] `GET /api/futures/positions` returns 404
  - [ ] `POST /api/futures/orders` returns 404
  - [ ] Response includes: `"Futures trading is disabled"`
  - [ ] WebSocket `/ws/futures` connection rejected gracefully

**Result:** ✅ **GO** if all checks pass. System behaves exactly as pre-integration.

---

## ✅ Staging Phase 2: Flag ON

Set `FEATURE_FUTURES=true` in `.env` and restart server.

- [ ] **Server Startup**
  - [ ] Server starts without errors
  - [ ] Futures service initialized (check logs)
  - [ ] KuCoin adapter loaded (or graceful error if no credentials)

- [ ] **API Endpoints (REST)**
  - [ ] `GET /api/futures/positions` returns 200 (or 401 if no credentials)
  - [ ] `POST /api/futures/orders` validates payload correctly
  - [ ] Invalid order (`qty=0`) returns 400 Bad Request
  - [ ] `PUT /api/futures/leverage` validates leverage (1-100)
  - [ ] `GET /api/futures/funding/BTCUSDTM` returns data
  - [ ] Error responses include typed messages

- [ ] **WebSocket Channel**
  - [ ] `wscat -c ws://localhost:3001/ws/futures` connects successfully
  - [ ] Receives `futures_connected` message
  - [ ] Receives `position_update` events (every 5s)
  - [ ] Receives `order_update` events when orders placed/cancelled
  - [ ] Client messages (`subscribe_positions`, `get_orders`) work

- [ ] **Database**
  - [ ] Positions sync to `futures_positions` table
  - [ ] Orders sync to `futures_orders` table
  - [ ] Data persists correctly

- [ ] **Error Handling**
  - [ ] Invalid credentials → clear error message
  - [ ] Network errors → graceful degradation
  - [ ] Rate limit errors → proper error mapping
  - [ ] Missing required fields → 400 validation errors

**Result:** ✅ **GO** if all checks pass. System ready for production.

---

## ✅ Production Deployment

- [ ] **Pre-Production**
  - [ ] Staging Phase 1 & 2 completed successfully
  - [ ] Smoke tests pass (`bash scripts/test-futures-api.sh`)
  - [ ] Database backup created
  - [ ] Rollback plan documented and tested

- [ ] **Deployment**
  - [ ] `FEATURE_FUTURES=true` set in production `.env`
  - [ ] Server restarted
  - [ ] Monitor logs for errors
  - [ ] Verify migration v6 applied

- [ ] **Post-Deployment**
  - [ ] Run smoke tests against production
  - [ ] Monitor error rates
  - [ ] Verify WebSocket connections
  - [ ] Check database sync working

**Result:** ✅ **GO-LIVE** if all checks pass.

---

## 🚨 Rollback Checklist

**Quick Rollback (< 2 minutes):**
1. [ ] Set `FEATURE_FUTURES=false` in `.env`
2. [ ] Restart server
3. [ ] Verify futures endpoints return 404
4. [ ] Verify non-futures routes still work

**Full Rollback (< 10 minutes):**
1. [ ] Set `FEATURE_FUTURES=false` in `.env`
2. [ ] Git revert integration commit (if needed)
3. [ ] Restore database backup (if needed)
4. [ ] Rebuild and restart server
5. [ ] Verify system restored to pre-integration state

---

**Checklist Completed By:** _________________  
**Date:** _________________  
**Signature:** _________________
