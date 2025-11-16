# Production Smoke Test Plan

**Last Updated:** 2025-11-16  
**Purpose:** Repeatable validation plan to ensure the application is healthy before and after deployment

This document provides a step-by-step manual test plan that can be executed by a human operator (and later automated) to validate core functionality in production-like environments.

---

## Prerequisites

### Environment Setup

1. **Backend Server:**
   - Backend runs on `PORT=8001` (default)
   - Verify: `curl http://localhost:8001/api/health`

2. **Environment Profiles:**
   - **Real data profile:** `npm run dev:real` (uses `env.real`)
   - **Mock/demo profile:** `npm run dev:mock` (uses `env.mock`, if still supported)

3. **Required Environment Variables:**
   - See `docs/production-env-config.md` for complete list
   - Critical variables:
     - `VITE_APP_MODE=online`
     - `VITE_STRICT_REAL_DATA=true`
     - `VITE_HF_ENGINE_URL` (HF Data Engine base URL)
     - `VITE_KUCOIN_API_KEY`, `VITE_KUCOIN_API_SECRET`, `VITE_KUCOIN_API_PASSPHRASE` (for trading)

---

## Pre-Checks (Before Starting Application)

### 1. HF Data Engine Health Check

**Command:**
```bash
curl -f http://localhost:8001/api/hf/health || echo "HF Engine health check failed"
```

**Expected:** HTTP 200 with JSON response containing `status: "ok"` or similar

**If Failed:**
- Check `VITE_HF_ENGINE_URL` is set correctly
- Verify HF Engine is accessible from deployment environment
- Check network connectivity

---

### 2. KuCoin Futures Testnet Credentials

**Check:** Verify credentials are present (either in env vars or config)

**Command:**
```bash
# Check env vars (be careful - contains secrets!)
echo "API Key present: $([ -n "$VITE_KUCOIN_API_KEY" ] && echo "yes" || echo "no")"
echo "API Secret present: $([ -n "$VITE_KUCOIN_API_SECRET" ] && echo "yes" || echo "no")"
echo "Passphrase present: $([ -n "$VITE_KUCOIN_API_PASSPHRASE" ] && echo "yes" || echo "no")"
```

**Expected:** All three should be "yes" for trading functionality

**If Missing:**
- Trading features will be unavailable
- UI should show clear "credentials not configured" message
- Application should still function for data viewing

---

### 3. Required Environment Variables

**Check:** Run helper script (if available):
```bash
bash scripts/print-runtime-config.sh
```

**Or manually verify:**
- `VITE_APP_MODE` = `online`
- `VITE_STRICT_REAL_DATA` = `true`
- `VITE_USE_MOCK_DATA` = `false`
- `VITE_ALLOW_FAKE_DATA` = `false`
- `VITE_TRADING_MODE` = `TESTNET` (or `DRY_RUN` for testing)
- `VITE_HF_ENGINE_URL` is set

**Expected:** All critical variables match production requirements

---

## Frontend Smoke Test Steps

### Step 1: Start Application

**Command:**
```bash
npm run dev:real
```

**Expected:**
- Backend starts on port 8001
- Frontend starts on port 5173 (or configured port)
- No fatal errors in console
- Application loads in browser

**If Failed:**
- Check port availability (`lsof -i :8001` or `netstat -an | grep 8001`)
- Check environment variables are set correctly
- Review console logs for specific errors

---

### Step 2: Open Application in Browser

**URL:** `http://localhost:5173` (or configured frontend port)

**Expected:**
- Application loads without blank screen
- Sidebar navigation visible
- Status ribbon shows connection status
- No red error overlays

**If Failed:**
- Check browser console for JavaScript errors
- Verify backend is running (`curl http://localhost:8001/api/health`)
- Check WebSocket connection status (should show in status ribbon)

---

### Step 3: Navigate Through All Views

**Test:** Click through all 21 views from the Sidebar navigation

**Views to Test:**
1. Dashboard (`dashboard`)
2. Charting (`charting`)
3. Market (`market`)
4. Scanner (`scanner`)
5. Futures Trading (`futures`)
6. Unified Trading (`trading`)
7. Enhanced Trading (`enhanced-trading`)
8. Positions (`positions`)
9. Portfolio (`portfolio`)
10. Training (`training`)
11. Risk (`risk`)
12. Professional Risk (`professional-risk`)
13. Backtest (`backtest`)
14. Strategy Builder (`strategyBuilder`)
15. Strategy Insights (`strategy-insights`)
16. Strategy Lab (`strategylab`)
17. Health (`health`)
18. Settings (`settings`)
19. Exchange Settings (`exchange-settings`)
20. Monitoring (`monitoring`)
21. Diagnostics (`diagnostics`)

**Pass Criteria (per page):**
- ✅ Page renders without crash
- ✅ Key widgets/components visible
- ✅ No red error overlays
- ✅ Loading states resolve (no infinite spinners)
- ✅ Data displays (or shows "no data" message if appropriate)

**If Failed:**
- Note which view failed
- Check browser console for errors
- Verify view component exists and exports correctly
- Check if view requires specific data that's unavailable

---

### Step 4: Key Page Expectations

#### Dashboard (`dashboard`)
- **Expected:** Signal overview, market summary, recent activity
- **Pass:** Widgets load, no blank sections

#### Scanner (`scanner`)
- **Expected:** Multiple scanner tabs (SMC, AI Signals, Whales, Sentiment, Technical Patterns)
- **Pass:** Scanners can be switched, no errors

#### Futures Trading (`futures`)
- **Expected:** Trading interface with order form, positions table, orderbook
- **Pass:** Form renders, positions load (or show "no positions"), orderbook visible

#### Positions (`positions`)
- **Expected:** List of open positions with PnL, leverage, liquidation price
- **Pass:** Positions display (or "no open positions" message)

#### Portfolio (`portfolio`)
- **Expected:** Portfolio value, asset allocation, performance metrics
- **Pass:** Portfolio data displays (or "no portfolio data" message)

#### Settings (`settings`)
- **Expected:** Configuration options, data source selector, exchange settings
- **Pass:** Settings form renders, can be modified

#### Health (`health`)
- **Expected:** System health metrics, service status, data source health
- **Pass:** Health indicators show status, no red errors

#### Diagnostics (`diagnostics`)
- **Expected:** System diagnostics, network checks, API status
- **Pass:** Diagnostic data displays

---

## Futures Trading Smoke Steps

### Step 5: DRY_RUN Mode Test

**Prerequisites:**
- `VITE_TRADING_MODE=DRY_RUN`
- Navigate to Futures Trading view (`futures`)

**Test:**
1. Select a symbol (e.g., `BTCUSDT`)
2. Set order parameters:
   - Side: `BUY`
   - Quantity: `0.001` (small test amount)
   - Type: `MARKET`
3. Click "Place Order" or equivalent button

**Expected:**
- Order is simulated (not sent to exchange)
- UI shows feedback: "Order simulated" or "DRY_RUN: Order would be placed"
- Order appears in orders list with simulated order ID
- No actual API call to KuCoin

**Pass Criteria:**
- ✅ Order feedback is clear and indicates simulation
- ✅ No errors in console
- ✅ Order appears in UI with simulated status

**If Failed:**
- Check `VITE_TRADING_MODE` is set to `DRY_RUN`
- Verify RiskGuard is not blocking (check console logs)
- Check order form validation

---

### Step 6: TESTNET Mode Test (Optional - Requires Testnet Credentials)

**⚠️ WARNING:** Only perform this step with TESTNET credentials. Never use mainnet credentials for testing.

**Prerequisites:**
- `VITE_TRADING_MODE=TESTNET`
- `VITE_KUCOIN_TESTNET=true`
- Valid KuCoin testnet credentials configured
- Navigate to Futures Trading view (`futures`)

**Test:**
1. Verify credentials are configured (check Exchange Settings view)
2. Select a symbol (e.g., `BTCUSDT`)
3. Set order parameters:
   - Side: `BUY`
   - Quantity: `0.001` (very small testnet amount)
   - Type: `MARKET`
4. Click "Place Order"

**Expected:**
- Order is placed on KuCoin testnet
- UI shows order confirmation with real order ID
- Order appears in orders list
- Position updates (if order fills)

**Pass Criteria:**
- ✅ Order confirmation received
- ✅ Order ID is real (not simulated)
- ✅ Position/orders update correctly
- ✅ No errors in console

**If Failed:**
- Check credentials are valid and have trading permissions
- Verify testnet URL is correct (`https://api-sandbox-futures.kucoin.com`)
- Check network connectivity to KuCoin
- Review error message (should be clear and non-technical)

---

## WebSocket Smoke Steps

### Step 7: Futures WebSocket Connection

**Test:**
1. Navigate to Positions view (`positions`)
2. Observe WebSocket status indicator (usually in status ribbon or top bar)
3. Check if positions update automatically

**Expected:**
- WebSocket status shows "Connected" (green indicator)
- Positions update automatically every 5 seconds (if positions exist)
- Order updates broadcast in real-time

**Pass Criteria:**
- ✅ WebSocket status is visible and shows "Connected"
- ✅ No "Disconnected" or "Error" states
- ✅ Real-time updates work (if applicable)

**If Failed:**
- Check backend WebSocket server is running (`/ws` endpoint)
- Verify WebSocket URL is correct (`ws://localhost:8001/ws` or `wss://...` for HTTPS)
- Check browser console for WebSocket errors
- Verify CORS is configured correctly

---

### Step 8: Score Stream WebSocket (If Enabled)

**Test:**
1. Navigate to Scanner or Strategy Lab view
2. Check if live scoring updates are received

**Expected:**
- Score stream connects (if feature enabled)
- Live scores update for configured symbols
- No connection errors

**Pass Criteria:**
- ✅ Score stream connects (if enabled)
- ✅ Updates received (or shows "not enabled" message)

**If Failed:**
- Check if `FEATURE_LIVE_SCORING` is enabled
- Verify Score Stream Gateway is running on backend
- Check WebSocket channel subscription

---

## Failure Response Guidance

### If a Page Does Not Load

**Checklist:**
1. ✅ Browser console for JavaScript errors
2. ✅ Network tab for failed API requests
3. ✅ Backend logs for errors
4. ✅ View component exists and exports correctly
5. ✅ Required data is available (HF Engine, KuCoin, etc.)

**Common Issues:**
- **Blank screen:** Check ErrorBoundary caught an error, review console
- **Infinite spinner:** Check API endpoint is responding, verify data source
- **404 on API call:** Verify backend route exists, check API base URL

---

### If WebSocket Shows Disconnected

**Checklist:**
1. ✅ Backend WebSocket server is running (`/ws` endpoint)
2. ✅ WebSocket URL is correct (check `VITE_WS_BASE`)
3. ✅ Network connectivity (firewall, proxy)
4. ✅ CORS configuration allows WebSocket connections
5. ✅ Browser supports WebSocket (modern browsers)

**Common Issues:**
- **Connection refused:** Backend not running or wrong port
- **CORS error:** Backend CORS config needs WebSocket origin
- **SSL/TLS mismatch:** `ws://` vs `wss://` mismatch

---

### If Futures Calls Fail

**Checklist:**
1. ✅ KuCoin credentials are configured
2. ✅ Credentials are valid (test with testnet)
3. ✅ Trading mode is correct (`TESTNET` for testnet, `DRY_RUN` for simulation)
4. ✅ Network connectivity to KuCoin
5. ✅ API permissions (trading enabled, withdraw disabled)

**Common Issues:**
- **"Credentials not configured":** Set API key/secret/passphrase in Exchange Settings
- **"Invalid credentials":** Verify credentials are correct, check passphrase
- **"Rate limit exceeded":** Reduce request frequency, implement backoff
- **"Network error":** Check internet connectivity, verify KuCoin is accessible

**Expected Error Messages:**
- Should be clear and non-technical
- Should indicate what action user should take
- Should NOT expose API keys or secrets

---

## Quick Smoke Test (Short Version)

For rapid validation, perform these minimal checks:

1. ✅ Backend health: `curl http://localhost:8001/api/health`
2. ✅ Frontend loads: Open `http://localhost:5173`
3. ✅ Navigate to 5 key views: Dashboard, Futures Trading, Positions, Health, Settings
4. ✅ WebSocket status: Check status ribbon shows "Connected"
5. ✅ DRY_RUN order: Place simulated order in Futures Trading view

**Time:** ~5 minutes

---

## Full Smoke Test (Complete Version)

Perform all steps above in sequence.

**Time:** ~30-45 minutes

---

## Automation Notes

This plan is designed to be:
- **Repeatable:** Same steps work every time
- **Clear:** Pass/fail criteria are explicit
- **Safe:** No destructive operations (uses DRY_RUN or TESTNET)

**Future Automation:**
- Can be automated with Playwright/E2E tests
- API health checks can be scripted
- WebSocket connection can be tested programmatically
- View navigation can be automated

---

## Related Documentation

- `docs/production-env-config.md` - Environment variable reference
- `ARCHITECTURE_REPORT.md` - System architecture overview
- `NAVIGATION_AND_UI_AUDIT_REPORT.md` - View navigation details
- `docs/logging-and-observability.md` - Logging and debugging guide

---

**Key Takeaway:** This smoke test validates that the application is functional and ready for production use. All steps should pass before deploying to production.
