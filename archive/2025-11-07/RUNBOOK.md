# Futures Trading Integration - Operations Runbook

**Version:** 1.0  
**Last Updated:** 2025-11-06  
**Integration Status:** ✅ Complete & Verified

---

## Go/No-Go Checklist

Use this checklist before enabling futures trading in production.

### Pre-Deployment Verification

- [ ] **Code Integration**
  - [ ] All files verified via `bash scripts/verify-futures-integration.sh`
  - [ ] Migration v6 exists in `src/data/DatabaseMigrations.ts`
  - [ ] Routes mounted at `/api/futures` in `server.ts`
  - [ ] WebSocket channel integrated at `/ws/futures`
  - [ ] Feature flags configured in `src/config/flags.ts`

- [ ] **Environment Configuration**
  - [ ] `.env` file created from `.env.example`
  - [ ] `FEATURE_FUTURES=false` set (for staging testing)
  - [ ] `EXCHANGE_KUCOIN=true` set
  - [ ] KuCoin Futures credentials entered (`KUCOIN_FUTURES_KEY`, `KUCOIN_FUTURES_SECRET`, `KUCOIN_FUTURES_PASSPHRASE`)
  - [ ] `FUTURES_BASE_URL` configured (default: `https://api-futures.kucoin.com`)

- [ ] **Database Readiness**
  - [ ] Database backup created
  - [ ] Migration v6 will auto-apply on startup
  - [ ] Schema verified: `futures_positions`, `futures_orders`, `leverage_settings`, `funding_rates`

- [ ] **Security Review**
  - [ ] No hardcoded credentials in code
  - [ ] API keys stored in `.env` (not committed)
  - [ ] Rate limiting reviewed (currently provider-level)
  - [ ] Request validation implemented in controller

### Staging Phase 1: Flag OFF

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

### Staging Phase 2: Flag ON

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

### Production Deployment

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

## Rollback Playbook

### Quick Rollback (Instant)

**Symptom:** Issues detected immediately after enabling futures trading.

**Action:**
1. Set `FEATURE_FUTURES=false` in `.env`
2. Restart server: `npm run start` (or restart service)
3. Verify: Futures endpoints return 404
4. Verify: Non-futures routes still work

**Time to rollback:** < 2 minutes

**Impact:** Futures endpoints disabled, system returns to pre-integration state.

---

### Database Rollback (If Needed)

**Symptom:** Issues with database schema or data corruption.

**Action:**
1. Stop server
2. Restore database backup:
   ```bash
   cp data/boltai-backup-YYYY-MM-DD.db data/boltai.db
   ```
3. Or rollback migration:
   ```sql
   -- Connect to database
   sqlite3 data/boltai.db
   -- Remove migration record
   DELETE FROM schema_migrations WHERE version = 6;
   -- Drop tables (if needed)
   DROP TABLE IF EXISTS funding_rates;
   DROP TABLE IF EXISTS leverage_settings;
   DROP TABLE IF EXISTS futures_orders;
   DROP TABLE IF EXISTS futures_positions;
   ```
4. Set `FEATURE_FUTURES=false` in `.env`
5. Restart server

**Time to rollback:** < 5 minutes

**Impact:** Database restored to pre-integration state.

---

### Code Rollback (Full Revert)

**Symptom:** Critical bugs requiring code revert.

**Action:**
1. **Git Revert (Recommended)**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```
   Or:
   ```bash
   git reset --hard <commit-before-integration>
   git push origin main --force
   ```

2. **Set Feature Flag OFF**
   ```bash
   echo "FEATURE_FUTURES=false" >> .env
   ```

3. **Rebuild & Restart**
   ```bash
   npm ci
   npm run build
   npm run start
   ```

4. **Verify**
   - Futures endpoints return 404
   - Non-futures functionality works
   - No errors in logs

**Time to rollback:** < 10 minutes

**Impact:** System fully reverted to pre-integration state.

---

### Partial Rollback (Keep Code, Disable Feature)

**Symptom:** Code works but need to disable feature temporarily.

**Action:**
1. Set `FEATURE_FUTURES=false` in `.env`
2. Restart server
3. Monitor non-futures functionality
4. Keep code in place for future re-enablement

**Time to rollback:** < 2 minutes

**Impact:** Futures disabled, ready to re-enable when issues resolved.

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **API Response Times**
   - `GET /api/futures/positions` - should be < 500ms
   - `POST /api/futures/orders` - should be < 1000ms

2. **Error Rates**
   - 4xx errors (validation) - expected for invalid requests
   - 5xx errors (server) - should be < 1%
   - API provider errors (401/403) - credential issues

3. **WebSocket Connections**
   - Active connections count
   - Connection drop rate
   - Message delivery rate

4. **Database Performance**
   - Migration v6 applied successfully
   - Futures tables query performance
   - Sync latency (exchange → database)

### Alert Thresholds

- **Critical:** 5xx error rate > 5%
- **Warning:** API response time > 2s
- **Warning:** WebSocket connection failures > 10%
- **Info:** Migration v6 not applied

### Log Monitoring

Watch for:
- `Futures service initialized` - successful startup
- `KuCoin Futures credentials loaded` - credentials configured
- `Failed to get positions` - API errors
- `Migration 6 applied successfully` - migration status

---

## Troubleshooting Guide

### Problem: Endpoints Return 404

**Symptoms:**
- `GET /api/futures/positions` returns 404
- Response: `"Futures trading is disabled"`

**Diagnosis:**
```bash
# Check feature flag
grep FEATURE_FUTURES .env
```

**Solution:**
- Set `FEATURE_FUTURES=true` in `.env`
- Restart server

---

### Problem: API Returns 401/403

**Symptoms:**
- `GET /api/futures/positions` returns 401
- Error: `"KuCoin Futures API error: Invalid credentials"`

**Diagnosis:**
```bash
# Check credentials
grep KUCOIN_FUTURES .env
```

**Solution:**
- Verify `KUCOIN_FUTURES_KEY`, `KUCOIN_FUTURES_SECRET`, `KUCOIN_FUTURES_PASSPHRASE` are correct
- Check API key permissions (futures trading enabled)
- Verify passphrase matches API key creation

---

### Problem: Migration Not Applied

**Symptoms:**
- Database errors when accessing futures tables
- Logs show: `no such table: futures_positions`

**Diagnosis:**
```bash
# Check migration status
sqlite3 data/boltai.db "SELECT * FROM schema_migrations WHERE version = 6;"
```

**Solution:**
- Restart server (migrations auto-apply)
- Or manually run migration SQL from `DatabaseMigrations.ts`

---

### Problem: WebSocket Connection Failed

**Symptoms:**
- `wscat -c ws://localhost:3001/ws/futures` fails
- Connection closed immediately

**Diagnosis:**
```bash
# Check feature flag
grep FEATURE_FUTURES .env
# Check server logs
tail -f logs/server.log
```

**Solution:**
- Set `FEATURE_FUTURES=true` in `.env`
- Verify server is running
- Check WebSocket URL: `ws://localhost:3001/ws/futures`

---

### Problem: Order Validation Errors

**Symptoms:**
- `POST /api/futures/orders` returns 400
- Error: `"Missing required fields"`

**Diagnosis:**
- Check request payload matches API spec
- Verify required fields: `symbol`, `side`, `type`, `qty`

**Solution:**
- Review request payload
- Check `docs/New folder/ENDPOINTS.md` for correct format

---

## Emergency Contacts

### Escalation Path

1. **Level 1:** Check runbook troubleshooting
2. **Level 2:** Review logs and run diagnostics
3. **Level 3:** Emergency rollback (see Rollback Playbook)
4. **Level 4:** Engage development team

### Useful Commands

```bash
# Check server status
curl http://localhost:3001/api/health

# Verify integration
bash scripts/verify-futures-integration.sh

# Run smoke tests
bash scripts/test-futures-api.sh

# Check logs
tail -f logs/server.log | grep -i futures

# Verify database
sqlite3 data/boltai.db ".tables" | grep futures
```

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-11-06 | 1.0 | Initial runbook created | Integration Team |

---

## Appendix

### Related Documentation

- **Quick Start:** `FUTURES_QUICKSTART.md`
- **API Reference:** `docs/New folder/ENDPOINTS.md`
- **Integration Report:** `artifacts/FUTURES_INTEGRATION_COMPLETE.md`
- **Test Scripts:** `scripts/test-futures-api.sh` / `.ps1`

### Support

For issues or questions:
1. Check this runbook first
2. Review troubleshooting guide
3. Check logs for error details
4. Escalate if issue persists

---

**Document Maintained By:** Operations Team  
**Last Reviewed:** 2025-11-06  
**Next Review:** After first production deployment
