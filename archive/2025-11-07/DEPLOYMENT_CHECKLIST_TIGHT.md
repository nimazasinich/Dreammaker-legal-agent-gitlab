# Deployment Checklist - Tight Do-This-Now Guide
## Staging → Production Rollout

**Status:** ✅ Code on `main` - Ready for deployment  
**Time Estimate:** ~30 min staging + ~15 min production  
**Rollback:** < 2 minutes

---

## ✅ Phase 1: Staging - Flag OFF (Backward Compatibility)

**Goal:** Verify existing functionality unchanged

```bash
# On staging server
git checkout main && git pull --ff-only
cp .env.staging .env  # or edit your env file
echo "FEATURE_FUTURES=false" >> .env

npm ci && npm run build
npm run start &   # or pm2/systemd/docker

# Verify futures disabled
curl -i http://localhost:3001/api/futures/positions   # expect 404/disabled

# Verify baseline endpoints work as before
curl -i http://localhost:3001/api/health   # should work normally
```

**✅ Success Criteria:**
- [ ] Futures endpoint returns 404/disabled
- [ ] Baseline endpoints behave exactly as before
- [ ] No errors in logs

**Time:** ~5 minutes

---

## ✅ Phase 2: Staging - Flag ON (Feature Test)

**Goal:** Verify futures functionality works

```bash
# Set environment variables
export FEATURE_FUTURES=true
export EXCHANGE_KUCOIN=true
export FUTURES_BASE_URL=https://api-futures.kucoin.com
export KUCOIN_FUTURES_KEY=YOUR_STAGING_KEY
export KUCOIN_FUTURES_SECRET=YOUR_STAGING_SECRET
export KUCOIN_FUTURES_PASSPHRASE=YOUR_STAGING_PASSPHRASE

# Restart app/service
npm run start &   # or restart your service

# REST API smoke tests
curl -s http://localhost:3001/api/futures/positions
# Expected: {"success":true,"data":[],"timestamp":...} or 401 if no creds

curl -s -X PUT http://localhost:3001/api/futures/leverage \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","leverage":5,"marginMode":"isolated"}'
# Expected: API call to /api/v1/position/risk-limit-level/change with symbol=XBTUSDTM

curl -s http://localhost:3001/api/futures/funding/BTCUSDTM
# Expected: JSON response with funding rate data

# Optional (requires sandbox creds):
# curl -s -X POST http://localhost:3001/api/futures/orders \
#   -H "Content-Type: application/json" \
#   -d '{"symbol":"BTCUSDTM","side":"BUY","type":"MARKET","qty":1,"leverage":5,"marginMode":"isolated"}'

# WebSocket smoke test
npx wscat -c ws://localhost:3001/ws/futures
# Expected messages:
# - {"type":"futures_connected","message":"Connected to futures channel"}
# - {"type":"position_update","data":[...],"timestamp":...}
# - {"type":"order_update","data":[...],"timestamp":...}
# - {"type":"funding_tick","data":{...},"timestamp":...}
```

**✅ Success Criteria:**
- [ ] Positions endpoint returns 200 or 401
- [ ] Leverage endpoint works (symbol normalized to XBTUSDTM)
- [ ] Funding rate endpoint returns data
- [ ] WebSocket connects and receives events
- [ ] No 5xx errors in logs

**Time:** ~10 minutes

---

## ✅ Phase 3: Monitor on Staging

**Duration:** At least 30 minutes (preferably 1-2 hours)

**Monitor:**

```bash
# Check logs for errors
tail -f staging.log | grep -i error
# Expected: No 5xx spikes

# Check validation errors (should be 4xx)
tail -f staging.log | grep "400\|Bad Request"
# Expected: Typed 4xx for bad payloads
```

**Metrics/Alerts (if wired):**
- [ ] Rate limit hits (should be minimal)
- [ ] Provider errors (should be minimal)
- [ ] WebSocket disconnect streaks (should be none)

**✅ Success Criteria:**
- [ ] No 5xx spikes in logs
- [ ] Bad payloads return typed 4xx
- [ ] No rate limit issues
- [ ] WebSocket connections stable

**Time:** 30-120 minutes monitoring

---

## ✅ Phase 4: Production Deploy (Safe & Reversible)

### Step 4a: Deploy with Flag OFF

```bash
# On production server
git checkout main && git pull --ff-only
echo "FEATURE_FUTURES=false" >> .env
npm ci && npm run build
npm run start &

# Baseline check
curl -i http://localhost:3001/api/health   # should work normally
curl -i http://localhost:3001/api/futures/positions   # expect 404
```

**✅ Success Criteria:**
- [ ] Application boots cleanly
- [ ] Baseline endpoints work
- [ ] Futures endpoints return 404

**Time:** ~5 minutes

---

### Step 4b: Enable Feature (When Ready)

```bash
# Set production credentials
export FEATURE_FUTURES=true
export EXCHANGE_KUCOIN=true
export FUTURES_BASE_URL=https://api-futures.kucoin.com
export KUCOIN_FUTURES_KEY=YOUR_PROD_KEY
export KUCOIN_FUTURES_SECRET=YOUR_PROD_SECRET
export KUCOIN_FUTURES_PASSPHRASE=YOUR_PROD_PASSPHRASE

# Restart app/service
npm run start &   # or restart your service

# Run same REST/WS smokes as staging
curl -s http://localhost:3001/api/futures/positions
curl -s -X PUT http://localhost:3001/api/futures/leverage \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTCUSDTM","leverage":5,"marginMode":"isolated"}'
curl -s http://localhost:3001/api/futures/funding/BTCUSDTM

# WebSocket test
npx wscat -c ws://localhost:3001/ws/futures
```

**✅ Success Criteria:** Same as Phase 2

**Time:** ~10 minutes

---

## 🎯 Go/No-Go Gates

### ✅ GO if:
- [ ] App boots cleanly
- [ ] REST smoke tests pass
- [ ] WebSocket events received
- [ ] No error spikes in logs
- [ ] Validation returns 4xx for bad payloads
- [ ] No rate limit issues

### ❌ NO-GO if:
- [ ] 5xx/429 error spikes
- [ ] Missing WebSocket events
- [ ] Migration/ENV issues
- [ ] Database connection errors
- [ ] Provider authentication failures

---

## 🔄 Instant Rollback (Any Time)

**Rollback Time:** < 2 minutes

```bash
export FEATURE_FUTURES=false
# Restart app/service
npm run start &   # or restart your service

# Verify rollback
curl -i http://localhost:3001/api/futures/positions   # expect 404
```

**Note:** No database changes needed - migrations are idempotent

---

## 📋 Quick Reference

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
- `PUT /api/futures/leverage` - Set leverage (symbol normalized)
- `GET /api/futures/funding/:symbol` - Get funding rate
- `DELETE /api/futures/positions/:symbol` - Close position
- `ws://localhost:3001/ws/futures` - WebSocket channel

### Troubleshooting

**Futures endpoint returns 404:**
- Check `FEATURE_FUTURES=true` is set
- Verify environment variables loaded

**401 Unauthorized:**
- Check KuCoin credentials are correct
- Verify `KUCOIN_FUTURES_KEY`, `KUCOIN_FUTURES_SECRET`, `KUCOIN_FUTURES_PASSPHRASE`

**5xx Errors:**
- Check logs for specific error
- Verify network connectivity to KuCoin API
- Check rate limits

**WebSocket not connecting:**
- Verify `FEATURE_FUTURES=true`
- Check server supports WebSocket
- Verify port 3001 is accessible

---

## ✅ Final Checklist

**Pre-Deployment:**
- [ ] Code merged to `main`
- [ ] Staging credentials configured
- [ ] Production credentials ready
- [ ] Monitoring/alerts configured

**Staging:**
- [ ] Phase 1 complete (flag OFF)
- [ ] Phase 2 complete (flag ON)
- [ ] Phase 3 complete (monitoring)

**Production:**
- [ ] Phase 4a complete (flag OFF)
- [ ] Phase 4b complete (flag ON)
- [ ] Post-deployment monitoring active

---

**Status:** ✅ Ready for deployment  
**Last Updated:** 2025-11-06  
**Next:** Execute Phase 1 → Phase 2 → Phase 3 → Phase 4
