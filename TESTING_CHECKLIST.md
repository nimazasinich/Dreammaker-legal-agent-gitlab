# 🧪 Testing Checklist - UI Error States & Retry Logic

**Branch:** `claude/ui-error-states-retry-01WpBj7rQsRyB3m8VujSFfGw`
**Date:** 2025-11-14

---

## 📝 Quick Start

### Prerequisites
```bash
# 1. Install dependencies
npm install

# 2. Start backend (Terminal 1)
npm run dev:backend

# 3. Start frontend (Terminal 2)
npm run dev

# 4. Open browser
# http://localhost:5173
```

---

## ✅ Manual Testing Checklist

### 🟢 Scenario 1: Happy Path (Backend Running)

- [ ] **StatusRibbon shows healthy status**
  - Green badge
  - "Health: healthy"
  - Provider badges (HF: up, Binance: up)
  - No error messages

- [ ] **ChartingView loads successfully**
  - Navigate to charting page
  - Chart displays with candlesticks
  - Price information visible
  - No error cards
  - Loading spinner briefly appears then disappears

- [ ] **Dashboard loads successfully**
  - All panels load
  - No infinite loaders
  - Data displays correctly

---

### 🔴 Scenario 2: Error Handling (Backend Down)

**Setup:**
```bash
# Stop backend
pkill -f "tsx.*server"

# Refresh frontend
# Ctrl+Shift+R or Cmd+Shift+R in browser
```

- [ ] **StatusRibbon shows error state**
  - Red badge or "down" status
  - Error message: "Backend is not reachable..."
  - No silent failure

- [ ] **ChartingView shows ErrorStateCard**
  - Navigate to /charting
  - ErrorStateCard displays with:
    - ✅ Clear error title
    - ✅ Descriptive message
    - ✅ Retry button visible
  - No infinite loading spinner

- [ ] **Dashboard shows ErrorStateCard**
  - Error states visible where data failed
  - Retry buttons available
  - No blank/frozen UI

---

### 🔄 Scenario 3: Retry Functionality

**Setup:**
```bash
# Start with backend down, showing errors
# Then start backend:
npm run dev:backend
```

- [ ] **Click Retry on ChartingView**
  - Loading state appears
  - Data loads successfully after backend starts
  - Error card disappears
  - Chart renders with data

- [ ] **StatusRibbon auto-updates**
  - Status changes from "down" to "healthy"
  - Provider badges update
  - Error message disappears

- [ ] **Multiple retries work**
  - Can retry multiple times
  - No spam or excessive requests
  - Each retry attempts fresh fetch

---

### ⚠️ Scenario 4: Browser Console

- [ ] **No unhandled errors**
  - Open DevTools → Console
  - Should NOT see:
    - ❌ Uncaught TypeError
    - ❌ Unhandled Promise rejections
    - ❌ Infinite retry loops

- [ ] **Expected logs present**
  - Should see:
    - ✅ "Fetching OHLC data..."
    - ✅ "OHLC data loaded successfully"
    - ✅ Or error logs (if backend down)

---

### 📱 Scenario 5: Responsive Design

- [ ] **Mobile view (< 768px)**
  - ErrorStateCard layout works
  - Retry button accessible
  - Text readable

- [ ] **Tablet view (768px - 1024px)**
  - Components layout properly
  - No overflow issues

---

## 🚀 Quick Test Script

Run automated checks:
```bash
bash scripts/quick-test.sh
```

**Expected Output:**
- ✅ File existence checks pass
- ✅ TypeScript syntax checks pass
- ⚠️  Backend/Frontend warnings if not running
- 📊 Summary with pass/fail counts

---

## 🐛 Known Issues

1. **Pre-existing TypeScript build error** - ✅ FIXED
   - `SignalVisualizationSection.tsx` JSX syntax issue resolved

2. **Full npm build not tested**
   - Some unrelated build errors may exist
   - Runtime testing works correctly

---

## 📊 Sign-Off

### Tester Information
- **Name:** _________________
- **Date:** _________________
- **Browser:** _________________

### Test Results

| Test Category | Status | Notes |
|---------------|--------|-------|
| Happy Path | ⬜ Pass ⬜ Fail | _________ |
| Error Handling | ⬜ Pass ⬜ Fail | _________ |
| Retry Logic | ⬜ Pass ⬜ Fail | _________ |
| Console Checks | ⬜ Pass ⬜ Fail | _________ |
| Responsive | ⬜ Pass ⬜ Fail | _________ |

### Overall Assessment
⬜ **APPROVED** - Ready to merge
⬜ **CONDITIONAL** - Minor issues found
⬜ **REJECTED** - Major issues, needs fixes

### Comments
```
[Your comments here]
```

---

## 📚 Additional Resources

- **Full Test Plan:** `TEST_PLAN.md`
- **Implementation Details:** See commit history
- **Components:**
  - `src/types/loadState.ts`
  - `src/components/ui/ErrorStateCard.tsx`
  - `src/lib/useHealthCheck.ts`
  - `src/hooks/useOHLC.ts`

---

**Version:** 1.0
**Last Updated:** 2025-11-14
