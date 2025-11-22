# Production Smoke Test Plan

**Last Updated:** 2025-11-16  
**Purpose:** Provide a clear, repeatable manual test plan for validating production readiness

This document outlines the step-by-step smoke tests that should be performed before and after deployment to ensure the DreammakerCryptoSignalAndTrader application is functioning correctly.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checks](#pre-deployment-checks)
3. [Frontend Smoke Tests](#frontend-smoke-tests)
4. [Futures Trading Smoke Tests](#futures-trading-smoke-tests)
5. [WebSocket Smoke Tests](#websocket-smoke-tests)
6. [Failure Response Tests](#failure-response-tests)
7. [Test Results Template](#test-results-template)

---

## Prerequisites

### Environment Setup

Before running smoke tests, ensure:

- **Backend Server:** Running on `PORT=8001` (or configured port)
- **Profile:** Using `npm run dev:real` for real data testing
- **Environment Variables:** All required variables from `docs/production-env-config.md` are set
- **Browser:** Modern browser (Chrome, Firefox, or Edge) with DevTools available

### Required Credentials

For full smoke test coverage:

- ✅ **HF Data Engine:** URL and API key (if required)
- ✅ **KuCoin Futures Testnet:** API key, secret, and passphrase
- ⚠️ **Never use production/mainnet credentials for testing**

### Configuration Verification Script

Run this before smoke tests:

```bash
# Print current runtime configuration
./scripts/print-runtime-config.sh

# Or manually check
echo "APP_MODE: $VITE_APP_MODE"
echo "TRADING_MODE: $VITE_TRADING_MODE"
echo "STRICT_REAL_DATA: $VITE_STRICT_REAL_DATA"
```

---

## Pre-Deployment Checks

### 1. HF Data Engine Health Check

**Objective:** Verify the HF Data Engine is reachable and operational.

**Steps:**

```bash
# Test HF Engine health endpoint
curl -s http://localhost:8001/api/hf/health | jq

# Expected response:
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

**Pass Criteria:**
- ✅ HTTP 200 status
- ✅ `status: "ok"` in response
- ✅ Response time < 5 seconds

**Failure Handling:**
- If health check fails, verify `VITE_HF_ENGINE_URL` is correct
- Check network connectivity to HF Engine
- Review HF Engine logs for errors

---

### 2. KuCoin Futures Credentials Check

**Objective:** Verify KuCoin Futures testnet credentials are configured.

**Steps:**

```bash
# Check if credentials are set (without revealing values)
test -n "$VITE_KUCOIN_API_KEY" && echo "✅ API Key set" || echo "❌ API Key missing"
test -n "$VITE_KUCOIN_API_SECRET" && echo "✅ API Secret set" || echo "❌ API Secret missing"
test -n "$VITE_KUCOIN_API_PASSPHRASE" && echo "✅ Passphrase set" || echo "❌ Passphrase missing"
test "$VITE_KUCOIN_TESTNET" = "true" && echo "✅ Testnet mode enabled" || echo "⚠️ MAINNET MODE (DANGER)"
```

**Pass Criteria:**
- ✅ All three credentials are set
- ✅ `VITE_KUCOIN_TESTNET=true` (for safe testing)

**Failure Handling:**
- If credentials missing, configure in Exchange Settings view
- If testnet not enabled, **STOP** and enable testnet mode before proceeding

---

### 3. Required Environment Variables

**Objective:** Verify all critical environment variables are set correctly.

**Steps:**

Check the following variables (refer to `docs/production-env-config.md`):

| Variable | Expected Value (Production) | Critical? |
|----------|----------------------------|-----------|
| `VITE_APP_MODE` | `online` | ✅ |
| `VITE_STRICT_REAL_DATA` | `true` | ✅ |
| `VITE_ALLOW_FAKE_DATA` | `false` | ✅ |
| `VITE_TRADING_MODE` | `TESTNET` or `DRY_RUN` | ✅ |
| `VITE_HF_ENGINE_URL` | Valid URL | ✅ |
| `VITE_LOG_LEVEL` | `warn` or `info` | ⚠️ |

**Pass Criteria:**
- ✅ All critical variables are set correctly
- ✅ No conflicting configurations (e.g., `STRICT_REAL_DATA=true` with `ALLOW_FAKE_DATA=true`)

---

## Frontend Smoke Tests

### Starting the Application

```bash
# Start backend and frontend in real data mode
npm run dev:real

# Wait for both to start
# Backend should show: "Server running on port 8001"
# Frontend should show: "Local: http://localhost:5173"
```

Open the application in your browser: `http://localhost:5173`

---

### View Navigation Tests

**Objective:** Verify all 21 views are accessible and render without errors.

**Instructions:**
- Navigate through each view using the Sidebar
- Check for JavaScript errors in browser DevTools Console (F12)
- Verify no blank pages or crash screens

#### 1. Dashboard View

**Path:** `/` or `/dashboard`

**What to Check:**
- ✅ Page renders without errors
- ✅ Market overview widgets load
- ✅ Price tickers display (if HF Engine is available)
- ✅ No red error overlays

**Expected State:**
- Loading state → Data appears (or "data unavailable" message if HF Engine is down)

**Pass/Fail:**
- ✅ **Pass:** Page renders, key sections visible
- ❌ **Fail:** Blank page, console errors, crash

---

#### 2. Scanner View

**Path:** `/scanner`

**What to Check:**
- ✅ Scanner feed panel renders
- ✅ Signal cards appear (or "no signals" message)
- ✅ Filters and controls are functional

**Pass/Fail:**
- ✅ **Pass:** Scanner UI visible and interactive
- ❌ **Fail:** Component crash, blank screen

---

#### 3. Strategy Builder View

**Path:** `/strategy-builder`

**What to Check:**
- ✅ Strategy editor interface loads
- ✅ Template selector is functional
- ✅ Strategy configuration forms render

**Pass/Fail:**
- ✅ **Pass:** Strategy builder loads, forms are interactive
- ❌ **Fail:** Blank page, errors in console

---

#### 4. Enhanced Strategy Lab View

**Path:** `/strategy-lab`

**What to Check:**
- ✅ Lab interface renders
- ✅ Strategy testing controls are visible
- ✅ Performance metrics section loads

**Pass/Fail:**
- ✅ **Pass:** Lab UI fully rendered
- ❌ **Fail:** Component not found, crash

---

#### 5. Futures Trading View

**Path:** `/trading/futures`

**What to Check:**
- ✅ Trading interface renders
- ✅ Order form is functional
- ✅ Symbol selector works
- ✅ Leverage controls visible
- ✅ Shows "Futures Only" indicator

**Pass/Fail:**
- ✅ **Pass:** Futures trading UI loads correctly
- ❌ **Fail:** Spot trading options visible (should not appear), errors

---

#### 6. Unified Trading View

**Path:** `/trading/unified`

**What to Check:**
- ✅ Unified interface renders
- ✅ Advanced order types visible
- ✅ Chart integration works

**Pass/Fail:**
- ✅ **Pass:** Unified trading view functional
- ❌ **Fail:** Layout broken, components missing

---

#### 7. Enhanced Trading View

**Path:** `/trading/enhanced`

**What to Check:**
- ✅ Enhanced UI renders
- ✅ Multi-pane layout functional
- ✅ Risk indicators visible

**Pass/Fail:**
- ✅ **Pass:** Enhanced view loads without issues
- ❌ **Fail:** Panes not rendering, crashes

---

#### 8. Positions View

**Path:** `/positions`

**What to Check:**
- ✅ Positions table renders
- ✅ "No positions" message if no active positions
- ✅ Position details are formatted correctly

**Expected Behavior:**
- If KuCoin credentials are valid: Shows real positions (or empty state)
- If credentials invalid/missing: Shows clear error message

**Pass/Fail:**
- ✅ **Pass:** Positions view loads, handles empty/error states gracefully
- ❌ **Fail:** Crash, infinite spinner, cryptic error

---

#### 9. Portfolio View

**Path:** `/portfolio`

**What to Check:**
- ✅ Portfolio summary renders
- ✅ Balance details visible
- ✅ PnL metrics display

**Pass/Fail:**
- ✅ **Pass:** Portfolio view functional
- ❌ **Fail:** Blank screen, data fetch errors not handled

---

#### 10. Market View

**Path:** `/market`

**What to Check:**
- ✅ Market data tables render
- ✅ Price charts load
- ✅ Ticker data updates

**Pass/Fail:**
- ✅ **Pass:** Market view displays data or clear error state
- ❌ **Fail:** Stuck loading, no error handling

---

#### 11. Charting View

**Path:** `/charting`

**What to Check:**
- ✅ Chart canvas renders
- ✅ Symbol selector functional
- ✅ Timeframe controls work

**Pass/Fail:**
- ✅ **Pass:** Charting interface loads
- ❌ **Fail:** Blank canvas, chart library errors

---

#### 12. Risk View

**Path:** `/risk`

**What to Check:**
- ✅ Risk metrics panel renders
- ✅ Liquidation indicators visible
- ✅ Risk gauges functional

**Pass/Fail:**
- ✅ **Pass:** Risk view displays correctly
- ❌ **Fail:** Metrics not loading, component crash

---

#### 13. Professional Risk View

**Path:** `/risk/professional`

**What to Check:**
- ✅ Advanced risk metrics render
- ✅ Stress test results visible
- ✅ Risk center controls functional

**Pass/Fail:**
- ✅ **Pass:** Professional risk view operational
- ❌ **Fail:** Features not working, errors

---

#### 14. Backtest View

**Path:** `/backtest`

**What to Check:**
- ✅ Backtest configuration form renders
- ✅ Historical data controls visible
- ✅ Results section loads

**Pass/Fail:**
- ✅ **Pass:** Backtest UI functional
- ❌ **Fail:** Form broken, cannot initiate backtest

---

#### 15. Training View (AI/ML)

**Path:** `/training`

**What to Check:**
- ✅ Training dashboard renders
- ✅ Model status indicators visible
- ✅ Training controls functional

**Pass/Fail:**
- ✅ **Pass:** Training view loads
- ❌ **Fail:** AI features crash, blank page

---

#### 16. Strategy Insights View

**Path:** `/insights`

**What to Check:**
- ✅ Insights panel renders
- ✅ Performance metrics visible
- ✅ Strategy comparison tools functional

**Pass/Fail:**
- ✅ **Pass:** Insights view operational
- ❌ **Fail:** Data not loading, errors

---

#### 17. Settings View

**Path:** `/settings`

**What to Check:**
- ✅ Settings form renders
- ✅ Configuration options visible
- ✅ Save/Reset buttons functional

**Pass/Fail:**
- ✅ **Pass:** Settings view loads and saves
- ❌ **Fail:** Form not working, settings not persisting

---

#### 18. Exchange Settings View

**Path:** `/settings/exchange`

**What to Check:**
- ✅ Exchange configuration form renders
- ✅ API key input fields visible
- ✅ Credential save functionality works
- ✅ **Security:** API keys are masked in UI

**Pass/Fail:**
- ✅ **Pass:** Exchange settings fully functional
- ❌ **Fail:** Cannot save credentials, keys visible in plain text

---

#### 19. Health View

**Path:** `/health`

**What to Check:**
- ✅ System health dashboard renders
- ✅ Service status indicators visible
- ✅ Health metrics update

**Expected Indicators:**
- HF Engine status
- WebSocket connection status
- KuCoin Futures API status

**Pass/Fail:**
- ✅ **Pass:** Health view shows accurate status
- ❌ **Fail:** All services show "unknown", no real checks

---

#### 20. Diagnostics View

**Path:** `/diagnostics`

**What to Check:**
- ✅ Diagnostics panel renders
- ✅ System diagnostics data visible
- ✅ Network check tools functional

**Pass/Fail:**
- ✅ **Pass:** Diagnostics view operational
- ❌ **Fail:** Diagnostic tools not working

---

#### 21. Monitoring View

**Path:** `/monitoring`

**What to Check:**
- ✅ Monitoring dashboard renders
- ✅ Metrics charts load
- ✅ Real-time data updates (if available)

**Pass/Fail:**
- ✅ **Pass:** Monitoring view displays metrics
- ❌ **Fail:** Charts not rendering, no data

---

### Summary Checklist: All Views

After navigating through all views, confirm:

- [ ] All 21 views are accessible via Sidebar
- [ ] No blank pages or crash screens
- [ ] No unhandled JavaScript errors in console
- [ ] Loading states are appropriate (spinners, skeletons)
- [ ] Error states are user-friendly (not raw stack traces)

---

## Futures Trading Smoke Tests

**⚠️ WARNING:** These tests should ONLY be performed on **TESTNET** mode. Never use production/mainnet credentials.

### Test 1: DRY_RUN Mode Order Placement

**Objective:** Verify simulated order placement works correctly.

**Prerequisites:**
- Set `VITE_TRADING_MODE=DRY_RUN`

**Steps:**

1. Navigate to Futures Trading View (`/trading/futures`)
2. Select a symbol (e.g., `BTCUSDT`)
3. Set order parameters:
   - Side: BUY
   - Type: MARKET
   - Quantity: 0.001 BTC
   - Leverage: 5x
4. Click "Place Order"

**Expected Result:**
- ✅ Order is simulated (no real API call)
- ✅ Success message appears: "Simulated order placed successfully"
- ✅ No actual position created on exchange

**Pass/Fail:**
- ✅ **Pass:** Simulated order feedback shown, no errors
- ❌ **Fail:** Error message, no feedback, or real API call made

---

### Test 2: TESTNET Mode Order Placement

**Objective:** Verify real testnet order placement (if credentials configured).

**Prerequisites:**
- Set `VITE_TRADING_MODE=TESTNET`
- Valid KuCoin testnet credentials configured
- Testnet account has sufficient balance

**Steps:**

1. Navigate to Futures Trading View
2. Select a symbol (e.g., `BTCUSDT`)
3. Set order parameters:
   - Side: BUY
   - Type: MARKET
   - Quantity: 0.001 BTC (small test size)
   - Leverage: 5x
4. Click "Place Order"

**Expected Result:**
- ✅ Order is sent to KuCoin testnet
- ✅ Success message with order ID appears
- ✅ Position appears in Positions View
- ✅ Order appears in open orders (if limit order)

**Pass/Fail:**
- ✅ **Pass:** Real testnet order placed, position created
- ❌ **Fail:** Order rejected, credentials invalid, no feedback

**Failure Response:**
- If order fails, check:
  - Testnet credentials are correct
  - Testnet account has balance
  - Symbol is valid for futures trading
  - API permissions are correct

---

### Test 3: Position Management

**Objective:** Verify position data is fetched and displayed correctly.

**Steps:**

1. Place a small testnet order (from Test 2)
2. Navigate to Positions View (`/positions`)
3. Verify position appears with correct details:
   - Symbol
   - Side (long/short)
   - Size
   - Entry price
   - Current PnL
   - Liquidation price

**Expected Result:**
- ✅ Position details are accurate
- ✅ PnL updates (if live data available)
- ✅ Close position button is functional

**Pass/Fail:**
- ✅ **Pass:** Position data displayed correctly
- ❌ **Fail:** Position not found, data missing, errors

---

### Test 4: Leverage Adjustment

**Objective:** Verify leverage can be set correctly.

**Steps:**

1. Navigate to Futures Trading View
2. Select a symbol
3. Adjust leverage slider (e.g., from 10x to 20x)
4. Attempt to place an order

**Expected Result:**
- ✅ Leverage setting is reflected in order preview
- ✅ Risk warnings appear for high leverage
- ✅ Order respects leverage setting

**Pass/Fail:**
- ✅ **Pass:** Leverage controls work correctly
- ❌ **Fail:** Leverage not applied, warnings missing

---

## WebSocket Smoke Tests

### Test 1: WebSocket Connection Status

**Objective:** Verify WebSocket connection indicators are accurate.

**Steps:**

1. Open application with backend running
2. Check WebSocket status indicator (e.g., in Health View or Status Ribbon)
3. Expected: "Connected" or green indicator

**Pass/Fail:**
- ✅ **Pass:** Status shows "Connected" when backend is up
- ❌ **Fail:** Always shows "Disconnected" or "Unknown"

---

### Test 2: Futures Position Updates (WebSocket)

**Objective:** Verify real-time position updates via WebSocket.

**Prerequisites:**
- Active futures position
- WebSocket connected

**Steps:**

1. Navigate to Positions View
2. Observe position PnL updating in real-time
3. Check browser DevTools Network tab for WebSocket frames

**Expected Result:**
- ✅ Position data updates periodically (e.g., every 1-5 seconds)
- ✅ WebSocket frames visible in DevTools

**Pass/Fail:**
- ✅ **Pass:** Real-time updates working
- ❌ **Fail:** Data stale, no WebSocket activity

---

### Test 3: Score Stream (Live Scoring Channel)

**Objective:** Verify live scoring updates (if implemented).

**Steps:**

1. Navigate to a view that shows live scores (e.g., Scanner, Dashboard)
2. Check if scores update in real-time

**Expected Result:**
- ✅ Scores update periodically
- ✅ WebSocket connection for "scores" or "signals" topic active

**Pass/Fail:**
- ✅ **Pass:** Live scoring functional
- ❌ **Fail:** Scores never update, WebSocket not subscribing

---

### Test 4: WebSocket Reconnection

**Objective:** Verify automatic reconnection when WebSocket drops.

**Steps:**

1. With application running and WebSocket connected:
2. **Stop the backend server** (Ctrl+C)
3. Observe WebSocket status indicator
   - Should show "Disconnected" or "Reconnecting"
4. **Restart the backend server**
5. Observe WebSocket status
   - Should automatically reconnect and show "Connected"

**Expected Result:**
- ✅ Status indicator reflects disconnection
- ✅ Application does not crash
- ✅ Automatic reconnection occurs (within ~10-30 seconds)
- ✅ User sees "Reconnecting..." message

**Pass/Fail:**
- ✅ **Pass:** Graceful reconnection, no app crash
- ❌ **Fail:** App hangs, infinite reconnect loop, no status update

---

## Failure Response Tests

**Objective:** Verify the application handles upstream service failures gracefully.

### Test 1: HF Data Engine Unavailable

**Scenario:** HF Data Engine is down or unreachable.

**Steps:**

1. **Misconfigure HF Engine URL** in environment:
   ```bash
   export VITE_HF_ENGINE_URL=http://invalid-url-that-does-not-exist.com
   ```
2. Restart application
3. Navigate to Dashboard and Market View

**Expected Behavior:**
- ✅ Application loads (does not crash)
- ✅ Views render with clear error message:
  - "Primary data source unavailable"
  - "Cannot connect to HF Data Engine"
  - "Market data temporarily unavailable"
- ✅ **No** fallback to fake/mock data (if `STRICT_REAL_DATA=true`)
- ✅ Retry button available (if implemented)

**Pass/Fail:**
- ✅ **Pass:** Graceful error state, user-friendly message
- ❌ **Fail:** App crashes, blank screen, shows mock data despite `STRICT_REAL_DATA=true`

---

### Test 2: KuCoin Futures API Failure

**Scenario:** KuCoin Futures API is down or credentials are invalid.

**Steps:**

1. **Misconfigure KuCoin credentials**:
   - Set `VITE_KUCOIN_API_KEY=invalid_key`
2. Restart application
3. Navigate to Futures Trading View
4. Attempt to fetch positions or place an order

**Expected Behavior:**
- ✅ Application does not crash
- ✅ Clear error message displayed:
  - "Exchange credentials invalid or missing"
  - "Futures service temporarily unavailable"
  - "Cannot connect to KuCoin Futures API"
- ✅ Trading form remains visible (not hidden)
- ✅ User can navigate to Exchange Settings to fix credentials

**Pass/Fail:**
- ✅ **Pass:** Error handled gracefully, helpful message shown
- ❌ **Fail:** Cryptic stack trace, app crash, infinite loading

---

### Test 3: WebSocket Connection Failure

**Scenario:** Backend WebSocket server is not running.

**Steps:**

1. Stop backend server
2. Open application (frontend only)
3. Navigate through views

**Expected Behavior:**
- ✅ Application loads and is usable (read-only mode)
- ✅ WebSocket status shows "Disconnected" or "Connection failed"
- ✅ No infinite spinners waiting for WebSocket data
- ✅ Static data (if cached) is still displayed

**Pass/Fail:**
- ✅ **Pass:** App remains functional, clear disconnected state
- ❌ **Fail:** App hangs, unhandled errors, blank pages

---

### Test 4: Configuration Errors

**Scenario:** Missing or conflicting environment variables.

**Steps:**

1. **Remove critical variable**:
   ```bash
   unset VITE_APP_MODE
   ```
2. Restart application

**Expected Behavior:**
- ✅ Application fails to start **OR** shows prominent warning:
  - "Configuration error: VITE_APP_MODE is required"
- ✅ Instructions on how to fix (e.g., "Set VITE_APP_MODE=online in .env")

**Pass/Fail:**
- ✅ **Pass:** Clear error message, app does not proceed with invalid config
- ❌ **Fail:** App runs with undefined behavior, no warning

---

## Test Results Template

Use this template to record smoke test results:

```markdown
# Smoke Test Results

**Date:** YYYY-MM-DD  
**Tester:** [Your Name]  
**Environment:** [Dev / Staging / Production]  
**Backend URL:** http://localhost:8001  
**Frontend URL:** http://localhost:5173  
**Configuration Profile:** [dev:real / dev:mock]

---

## Pre-Deployment Checks

| Check | Pass/Fail | Notes |
|-------|-----------|-------|
| HF Engine Health | ✅/❌ | |
| KuCoin Credentials | ✅/❌ | |
| Environment Variables | ✅/❌ | |

---

## Frontend View Navigation

| View | Path | Pass/Fail | Notes |
|------|------|-----------|-------|
| Dashboard | `/` | ✅/❌ | |
| Scanner | `/scanner` | ✅/❌ | |
| Strategy Builder | `/strategy-builder` | ✅/❌ | |
| Enhanced Strategy Lab | `/strategy-lab` | ✅/❌ | |
| Futures Trading | `/trading/futures` | ✅/❌ | |
| Unified Trading | `/trading/unified` | ✅/❌ | |
| Enhanced Trading | `/trading/enhanced` | ✅/❌ | |
| Positions | `/positions` | ✅/❌ | |
| Portfolio | `/portfolio` | ✅/❌ | |
| Market | `/market` | ✅/❌ | |
| Charting | `/charting` | ✅/❌ | |
| Risk | `/risk` | ✅/❌ | |
| Professional Risk | `/risk/professional` | ✅/❌ | |
| Backtest | `/backtest` | ✅/❌ | |
| Training | `/training` | ✅/❌ | |
| Strategy Insights | `/insights` | ✅/❌ | |
| Settings | `/settings` | ✅/❌ | |
| Exchange Settings | `/settings/exchange` | ✅/❌ | |
| Health | `/health` | ✅/❌ | |
| Diagnostics | `/diagnostics` | ✅/❌ | |
| Monitoring | `/monitoring` | ✅/❌ | |

**Summary:** ___/21 views passed

---

## Futures Trading Tests

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| DRY_RUN Order | ✅/❌ | |
| TESTNET Order | ✅/❌ | |
| Position Management | ✅/❌ | |
| Leverage Adjustment | ✅/❌ | |

---

## WebSocket Tests

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| Connection Status | ✅/❌ | |
| Position Updates | ✅/❌ | |
| Score Stream | ✅/❌ | |
| Reconnection | ✅/❌ | |

---

## Failure Response Tests

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| HF Engine Down | ✅/❌ | |
| KuCoin API Failure | ✅/❌ | |
| WebSocket Failure | ✅/❌ | |
| Config Errors | ✅/❌ | |

---

## Overall Result

**PASS** ✅ / **FAIL** ❌

**Critical Issues Found:** [List any blockers]

**Recommendations:** [Any follow-up actions needed]

**Sign-Off:** Ready for deployment: YES / NO
```

---

## Conclusion

This smoke test plan ensures that:

1. All critical paths are functional
2. Error states are handled gracefully
3. Real data integrity is maintained
4. Trading safety mechanisms work correctly
5. WebSocket connectivity is reliable

**Run these tests:**
- Before every production deployment
- After any major changes to trading or data layers
- When changing environment configurations

**Automate where possible:**
- Pre-deployment checks can be scripted
- Frontend navigation can be automated with Playwright
- API health checks can run in CI/CD

---

**Related Documentation:**
- [Production Environment Config](./production-env-config.md)
- [Data Flow](./data-flow.md)
- [HF Engine Scope](./hf-engine-scope.md)
- [Routes Inventory](./routes.md)
