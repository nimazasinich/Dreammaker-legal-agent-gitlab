# UI Error States & Retry Logic - Comprehensive Test Plan

## 🎯 Test Overview
This document provides a comprehensive test plan for validating the UI error states and retry functionality implemented in the frontend.

**Branch:** `claude/ui-error-states-retry-01WpBj7rQsRyB3m8VujSFfGw`

**Components Under Test:**
- ✅ `LoadState<T>` type system
- ✅ `ErrorStateCard` component
- ✅ `useHealthCheck` hook
- ✅ `useOHLC` hook
- ✅ `StatusRibbon` component
- ✅ `EnhancedSymbolDashboard` view
- ✅ `ChartingView` view

---

## 📋 Pre-Test Setup

### 1. Environment Preparation
```bash
# Ensure all dependencies are installed
npm install

# Start backend server (required for full testing)
npm run dev:backend

# In another terminal, start frontend
npm run dev

# Verify backend is running
curl http://localhost:8001/api/system/health
```

### 2. Environment Variables Check
```bash
# Check critical env vars
echo "API_BASE: $VITE_API_BASE"
echo "HF_ENGINE_BASE_URL: $HF_ENGINE_BASE_URL"
```

---

## 🧪 Test Scenarios

### Scenario 1: Happy Path - All Services Running

**Preconditions:**
- ✅ Backend running on port 8001
- ✅ HuggingFace Data Engine accessible
- ✅ Frontend running on port 5173

**Test Steps:**

1. **Open Dashboard**
   ```
   Navigate to: http://localhost:5173
   ```

   **Expected Results:**
   - ✅ StatusRibbon shows "healthy" status
   - ✅ Primary data source displayed (e.g., "huggingface")
   - ✅ Provider badges show "up" status (HF: up, Binance: up)
   - ✅ WebSocket indicator shows connected
   - ✅ No error messages visible

2. **Navigate to ChartingView**
   ```
   Navigate to: http://localhost:5173/charting
   ```

   **Expected Results:**
   - ✅ Chart loads with OHLC data
   - ✅ Price information displays correctly
   - ✅ No error cards visible
   - ✅ Loading spinner appears briefly, then disappears

3. **Navigate to EnhancedSymbolDashboard**
   ```
   Navigate to: http://localhost:5173/dashboard (or wherever it's mounted)
   ```

   **Expected Results:**
   - ✅ Price chart renders
   - ✅ News panel loads
   - ✅ Sentiment data displays
   - ✅ Signals show if available
   - ✅ No error states visible

---

### Scenario 2: Backend Unreachable - All Services Down

**Preconditions:**
- ❌ Backend NOT running
- ✅ Frontend running

**Test Steps:**

1. **Stop Backend**
   ```bash
   # Kill backend process
   pkill -f "tsx.*server"
   ```

2. **Refresh Frontend**
   ```
   Hard reload: Ctrl+Shift+R or Cmd+Shift+R
   ```

3. **Observe StatusRibbon**

   **Expected Results:**
   - ✅ Status changes to "down" (red)
   - ✅ Error message: "Backend is not reachable – please ensure the server is running."
   - ✅ Provider status badges disappear or show "down"

4. **Navigate to ChartingView**

   **Expected Results:**
   - ✅ `ErrorStateCard` displays with:
     - Title: "Failed to load chart data"
     - Message: Contains connection error
     - Retry button visible
   - ✅ No infinite loading spinner
   - ✅ No silent failure

5. **Navigate to EnhancedSymbolDashboard**

   **Expected Results:**
   - ✅ `ErrorStateCard` displays for chart section
   - ✅ Error message is clear and actionable
   - ✅ Retry button present

---

### Scenario 3: Retry Functionality

**Preconditions:**
- Start with backend down
- Frontend showing error states

**Test Steps:**

1. **Start Backend While Frontend Shows Errors**
   ```bash
   npm run dev:backend
   ```

2. **Click Retry Button on ChartingView**

   **Expected Results:**
   - ✅ Loading state appears
   - ✅ Data loads successfully
   - ✅ Error card disappears
   - ✅ Chart renders with data

3. **Test Manual Refresh on StatusRibbon**

   **Expected Results:**
   - ✅ Status updates to "healthy"
   - ✅ Provider badges show correct status
   - ✅ Primary data source displays

---

### Scenario 4: Partial Failure - HF Engine Down

**Preconditions:**
- ✅ Backend running
- ❌ HuggingFace Data Engine unreachable (invalid URL)

**Test Steps:**

1. **Configure Invalid HF Engine URL**
   ```bash
   # In .env
   HF_ENGINE_BASE_URL=http://localhost:9999
   ```

2. **Restart Backend**
   ```bash
   npm run dev:backend
   ```

3. **Check StatusRibbon**

   **Expected Results:**
   - ✅ Overall status may be "degraded"
   - ✅ HF engine badge shows "down" or "degraded"
   - ✅ Binance badge may show "up"

4. **Try to Load OHLC Data**

   **Expected Results:**
   - ✅ Error message indicates data source issue
   - ✅ Structured error from backend (if backend returns `ok: false`)
   - ✅ Retry button available

---

### Scenario 5: Network Timeout

**Preconditions:**
- Backend running but slow to respond

**Test Steps:**

1. **Simulate Slow Network**
   ```bash
   # In browser DevTools:
   # Network tab → Throttling → Slow 3G
   ```

2. **Load ChartingView**

   **Expected Results:**
   - ✅ Loading state persists during network delay
   - ✅ Eventually either loads or shows timeout error
   - ✅ No infinite loading state

---

### Scenario 6: Malformed Response

**Preconditions:**
- Backend returns invalid data

**Test Steps:**

1. **Trigger Invalid Response**
   ```
   (This would require backend modification or mock)
   ```

2. **Observe Error Handling**

   **Expected Results:**
   - ✅ Error card shows "Invalid response" message
   - ✅ No app crash
   - ✅ Error is caught and displayed gracefully

---

## 🔍 Component-Specific Tests

### `useHealthCheck` Hook

**Test Cases:**

1. ✅ Initial state is `{ status: 'loading' }`
2. ✅ Successful health check updates to `{ status: 'success', data: {...} }`
3. ✅ Failed health check updates to `{ status: 'error', error: '...' }`
4. ✅ `refresh()` function triggers new health check
5. ✅ Periodic polling works (every 15s by default)
6. ✅ Multiple endpoints tried in sequence
7. ✅ First successful endpoint stops further checks

### `useOHLC` Hook

**Test Cases:**

1. ✅ Initial state is `{ status: 'loading' }`
2. ✅ Successful fetch updates to `{ status: 'success', data: { bars, updatedAt } }`
3. ✅ HTTP error updates to `{ status: 'error', error: '...' }`
4. ✅ Backend `ok: false` response treated as error
5. ✅ Invalid JSON array shows error
6. ✅ `reload()` function triggers refetch
7. ✅ Request cancellation on component unmount

### `ErrorStateCard` Component

**Test Cases:**

1. ✅ Renders with title and message
2. ✅ Shows retry button when `onRetry` provided
3. ✅ Hides retry button when `onRetry` not provided
4. ✅ Calls `onRetry` when button clicked
5. ✅ Proper styling (glassmorphism, consistent with design)
6. ✅ RTL support (doesn't break layout)
7. ✅ Accessible (ARIA labels, roles)

### `StatusRibbon` Component

**Test Cases:**

1. ✅ Shows loading state during initial health check
2. ✅ Updates to success state with provider info
3. ✅ Shows error state with message
4. ✅ Displays primary data source
5. ✅ Provider badges render correctly
6. ✅ Periodic updates work (30s interval)

---

## 📊 Browser Console Checks

### Expected Console Logs (No Errors)

**Good Indicators:**
```
✅ "Fetching OHLC data: { symbol: 'BTCUSDT', timeframe: '1h', limit: 500 }"
✅ "OHLC data loaded successfully: { symbol: 'BTCUSDT', bars: 500 }"
✅ Health check success logs
```

**Should NOT See:**
```
❌ Uncaught TypeError
❌ Failed to fetch (without being handled)
❌ Infinite retry loops
❌ Network errors spamming console
```

---

## 🐛 Known Issues / Limitations

1. **TypeScript Build Error** (Pre-existing):
   - `SignalVisualizationSection.tsx` had JSX syntax error
   - ✅ **FIXED** in this PR

2. **Full Build Not Tested**:
   - `npm run build` not executed due to pre-existing issues
   - Runtime testing recommended

3. **No Automated Tests**:
   - Manual testing required
   - Future: Add Jest/Vitest tests for hooks
   - Future: Add Playwright/Cypress E2E tests

---

## ✅ Test Sign-Off Checklist

### Manual Testing Completed

- [ ] Scenario 1: All services running ✅
- [ ] Scenario 2: Backend down ✅
- [ ] Scenario 3: Retry functionality ✅
- [ ] Scenario 4: Partial failures ✅
- [ ] Scenario 5: Network timeout ✅
- [ ] Scenario 6: Malformed responses ✅

### Component Tests Verified

- [ ] `useHealthCheck` hook ✅
- [ ] `useOHLC` hook ✅
- [ ] `ErrorStateCard` component ✅
- [ ] `StatusRibbon` updates ✅
- [ ] `ChartingView` error handling ✅
- [ ] `EnhancedSymbolDashboard` error handling ✅

### Browser Testing

- [ ] Chrome/Chromium ✅
- [ ] Firefox ✅
- [ ] Safari (if available) ⚠️
- [ ] Mobile responsive ⚠️

### Performance Checks

- [ ] No memory leaks (React DevTools Profiler)
- [ ] No excessive re-renders
- [ ] Retry logic doesn't spam network
- [ ] WebSocket reconnection reasonable

---

## 📝 Test Results Template

```markdown
## Test Execution Report

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Local/Staging/Production]
**Browser:** [Chrome 120 / Firefox 121 / etc.]

### Scenario Results

| Scenario | Status | Notes |
|----------|--------|-------|
| 1. Happy Path | ✅ PASS | All data loads correctly |
| 2. Backend Down | ✅ PASS | Errors shown, retry works |
| 3. Retry Functionality | ✅ PASS | Successful recovery |
| 4. Partial Failure | ⚠️ PARTIAL | HF down, fallback unclear |
| 5. Network Timeout | ✅ PASS | Timeout handled |
| 6. Malformed Response | ✅ PASS | Error caught |

### Issues Found

1. [Issue description]
   - **Severity:** High/Medium/Low
   - **Steps to reproduce:**
   - **Expected:**
   - **Actual:**

### Screenshots

[Attach screenshots of error states, retry functionality, etc.]

### Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
```

---

## 🚀 Next Steps After Testing

1. **If Tests Pass:**
   - Create Pull Request
   - Request code review
   - Merge to main

2. **If Tests Fail:**
   - Document failures
   - Create bug tickets
   - Fix issues
   - Re-test

3. **Future Enhancements:**
   - Add unit tests (Jest/Vitest)
   - Add E2E tests (Playwright)
   - Add Storybook stories for `ErrorStateCard`
   - Performance monitoring
   - Error analytics/tracking

---

## 📚 Additional Resources

- **LoadState Pattern:** `src/types/loadState.ts`
- **ErrorStateCard:** `src/components/ui/ErrorStateCard.tsx`
- **Hook Examples:** `src/hooks/useOHLC.ts`, `src/lib/useHealthCheck.ts`
- **Commit:** See git log for detailed changes

---

**Test Plan Version:** 1.0
**Last Updated:** 2025-11-14
