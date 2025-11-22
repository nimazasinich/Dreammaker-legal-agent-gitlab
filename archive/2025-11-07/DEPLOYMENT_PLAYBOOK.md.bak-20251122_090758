# Production Rollout Playbook
## Safe & Reversible Deployment Process

**Status:** ✅ Code merged to `main` - Ready for deployment

---

## 🎯 Deployment Strategy

### Phase 1: Staging - Flag OFF (Backward Compatibility)
**Goal:** Verify existing functionality unchanged

1. **Update code**
   ```bash
   git checkout main && git pull --ff-only
   ```

2. **Set flag OFF**
   ```bash
   echo "FEATURE_FUTURES=false" >> .env
   ```

3. **Build & Start**
   ```bash
   npm ci && npm run build
   npm run start &
   ```

4. **Verify**
   ```bash
   # Futures should return 404
   curl -i http://localhost:3001/api/futures/positions
   # Expected: HTTP/1.1 404 Not Found
   
   # Baseline routes should work
   curl -i http://localhost:3001/api/health
   # Expected: HTTP/1.1 200 OK
   ```

**✅ Success Criteria:** Futures disabled, baseline routes work

---

### Phase 2: Staging - Flag ON (Feature Test)
**Goal:** Verify futures functionality works

1. **Set credentials (staging/sandbox)**
   ```bash
   export FEATURE_FUTURES=true
   export EXCHANGE_KUCOIN=true
   export FUTURES_BASE_URL=https://api-futures.kucoin.com
   export KUCOIN_FUTURES_KEY=your_staging_key
   export KUCOIN_FUTURES_SECRET=your_staging_secret
   export KUCOIN_FUTURES_PASSPHRASE=your_staging_passphrase
   ```

2. **Restart server**
   ```bash
   # Restart with new env
   npm run start &
   ```

3. **REST API Smoke Tests**
   ```bash
   # Positions
   curl -s http://localhost:3001/api/futures/positions
   # Expected: {"success":true,"data":[],"timestamp":...} or 401 if no creds
   
   # Leverage (symbol normalization test)
   curl -s -X PUT http://localhost:3001/api/futures/leverage \
     -H "Content-Type: application/json" \
     -d '{"symbol":"BTCUSDTM","leverage":5,"marginMode":"isolated"}'
   # Expected: API call to /api/v1/position/risk-limit-level/change with symbol=XBTUSDTM
   
   # Funding rate
   curl -s http://localhost:3001/api/futures/funding/BTCUSDTM
   # Expected: JSON response with funding rate data
   
   # Validation (invalid payload → 400)
   curl -i -X POST http://localhost:3001/api/futures/orders \
     -H "Content-Type: application/json" \
     -d '{"symbol":"BTCUSDTM","side":"BUY","type":"MARKET","qty":0}'
   # Expected: HTTP/1.1 400 Bad Request
   ```

4. **WebSocket Smoke Test**
   ```bash
   npx wscat -c ws://localhost:3001/ws/futures
   # Expected messages:
   # - {"type":"futures_connected","message":"Connected to futures channel"}
   # - {"type":"position_update","data":[...],"timestamp":...}
   # - {"type":"order_update","data":[...],"timestamp":...}
   # - {"type":"funding_tick","data":{...},"timestamp":...}
   ```

**✅ Success Criteria:** All endpoints return expected responses, WebSocket connects

---

### Phase 3: Monitoring (During Staging Test)

**Monitor these metrics:**

1. **Logs**
   ```bash
   tail -f staging.log | grep -i error
   # Expected: No 5xx spikes, validation returns typed 4xx
   ```

2. **Metrics/Alerts**
   - Rate limit hits (should be minimal)
   - Provider errors (should be minimal)
   - WebSocket disconnect streaks (should be none)

3. **Key Checks**
   - ✅ No 5xx errors
   - ✅ Validation returns 400 for bad payloads
   - ✅ Rate limiting working
   - ✅ Error handling graceful

**Duration:** Monitor for at least 30 minutes, preferably 1-2 hours

---

### Phase 4: Production Deploy - Flag OFF (Safe Start)
**Goal:** Deploy code with feature disabled

1. **Update code**
   ```bash
   git checkout main && git pull --ff-only
   ```

2. **Set flag OFF**
   ```bash
   echo "FEATURE_FUTURES=false" >> .env
   ```

3. **Build & Start**
   ```bash
   npm ci && npm run build
   npm run start &
   ```

4. **Baseline check**
   ```bash
   # Verify non-futures routes work exactly as before
   curl -i http://localhost:3001/api/health
   # Verify futures routes return 404
   curl -i http://localhost:3001/api/futures/positions
   ```

**✅ Success Criteria:** Baseline functionality unchanged, futures disabled

---

### Phase 5: Production Enable (When Ready)
**Goal:** Enable futures trading in production

1. **Add production credentials**
   ```bash
   # Edit .env and add:
   KUCOIN_FUTURES_KEY=your_production_key
   KUCOIN_FUTURES_SECRET=your_production_secret
   KUCOIN_FUTURES_PASSPHRASE=your_production_passphrase
   ```

2. **Enable flag**
   ```bash
   export FEATURE_FUTURES=true
   export EXCHANGE_KUCOIN=true
   # Restart app/service
   ```

3. **Run smoke tests** (same as staging)

4. **Monitor closely** for first 15-30 minutes

**✅ Success Criteria:** All endpoints work, no errors in logs

---

### Phase 6: Rollback (Instant - < 2 min)

**If any issues occur:**

```bash
# Instant rollback
export FEATURE_FUTURES=false
# Restart app/service
```

**Verify rollback:**
```bash
curl -i http://localhost:3001/api/futures/positions
# Expected: HTTP/1.1 404 Not Found
```

**Note:** No database changes needed - migrations are idempotent

---

## 📋 Quick Reference

### Deployment Scripts
- `scripts/rollout/staging-flag-off.sh` - Staging deployment (flag OFF)
- `scripts/rollout/staging-flag-on.sh` - Staging deployment (flag ON)
- `scripts/rollout/production-deploy.sh` - Production deployment (flag OFF)
- `scripts/rollout/production-enable.sh` - Enable futures in production
- `scripts/rollout/production-rollback.sh` - Instant rollback

### Environment Variables
```bash
FEATURE_FUTURES=false          # Default: false (safe)
EXCHANGE_KUCOIN=true          # Default: true
FUTURES_BASE_URL=https://api-futures.kucoin.com
KUCOIN_FUTURES_KEY=...
KUCOIN_FUTURES_SECRET=...
KUCOIN_FUTURES_PASSPHRASE=...
```

### Key Endpoints
- `GET /api/futures/positions` - Get positions
- `PUT /api/futures/leverage` - Set leverage
- `GET /api/futures/funding/:symbol` - Get funding rate
- `DELETE /api/futures/positions/:symbol` - Close position
- `ws://localhost:3001/ws/futures` - WebSocket channel

---

## ✅ Status Recap

- ✅ Code merged to `main`
- ✅ Documentation complete
- ✅ Verification scripts ready
- ✅ Rollout scripts prepared
- ✅ Rollback procedures documented

**Next:** Execute Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

---

**Last Updated:** 2025-11-06  
**Ready for:** Staging deployment → Production rollout
