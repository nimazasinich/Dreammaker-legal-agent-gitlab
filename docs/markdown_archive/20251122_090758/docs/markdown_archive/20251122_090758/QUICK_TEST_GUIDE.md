# 🚀 Quick Test Guide - Data Fetch & WebSocket Fixes

**After applying fixes, follow this quick test guide to verify everything works.**

---

## ⚡ 5-Minute Quick Test

### Step 1: Verify Environment (30 seconds)

```bash
cd /workspace
cat env | grep -E "VITE_API_BASE|VITE_WS_BASE"
```

**Expected Output**:
```
VITE_API_BASE=http://localhost:8001
VITE_WS_BASE=ws://localhost:8001
```

✅ **PASS** if you see port 8001  
❌ **FAIL** if you see port 3001

---

### Step 2: Start Backend (1 minute)

```bash
npm run dev:server
```

**Expected Output**:
```
✅ Server running on http://localhost:8001
✅ WebSocket: ws://localhost:8001/ws
```

**Wait for**: "Server started successfully" message

---

### Step 3: Start Frontend (1 minute)

Open a **new terminal**:

```bash
npm run dev:client
```

**Expected Output**:
```
VITE v7.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
```

---

### Step 4: Open Browser (30 seconds)

Open: **http://localhost:5173**

**What to check**:

1. **Page loads** - Dashboard appears ✅
2. **No errors** - Console is clean ✅
3. **Console messages**:
   ```
   🔧 Development Mode
      API Base: http://localhost:8001
      WS Base: ws://localhost:8001
   ✅ Data policy validated successfully
   Attempting WebSocket connection to: ws://localhost:8001/ws
   ✅ WebSocket connected successfully
   ```

---

### Step 5: Check Network Tab (2 minutes)

**Open DevTools** → **Network Tab**

#### Check API Calls:
1. Look for requests to `/api/health` or `/api/market/prices`
2. **Status should be**: 200 OK
3. **Request URL**: `http://localhost:5173/api/...` (proxied)

✅ **PASS** if you see 200 responses  
❌ **FAIL** if you see 404 or Connection Refused

#### Check WebSocket:
1. Filter by "WS" in Network tab
2. Look for connection to `/ws`
3. **Status should be**: 101 Switching Protocols
4. **Messages**: Should see frames being sent/received

✅ **PASS** if WebSocket shows 101 and messages  
❌ **FAIL** if WebSocket shows failed or no connection

---

## 🔍 Detailed Verification (Optional)

### Test 1: Manual API Call

In browser console:

```javascript
fetch('/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ API Response:', data))
  .catch(err => console.error('❌ API Error:', err));
```

**Expected**: 
```json
{
  "status": "ok",
  "timestamp": 1700000000000,
  ...
}
```

---

### Test 2: Manual WebSocket Test

In browser console:

```javascript
const ws = new WebSocket('ws://localhost:8001/ws');
ws.onopen = () => console.log('✅ WebSocket Connected');
ws.onerror = (e) => console.error('❌ WebSocket Error:', e);
ws.onmessage = (msg) => console.log('📨 Message:', msg.data);
```

**Expected**:
- `✅ WebSocket Connected` within 1-2 seconds
- `📨 Message: ...` receiving data

---

### Test 3: Dashboard Data Load

**Check Dashboard Elements**:

1. **Top Signals Panel** - Should show signal data or "Loading..."
2. **Price Chart** - Should show candlestick chart
3. **Market Ticker** - Should show BTC/ETH prices updating

**If you see**:
- ✅ Real data → Perfect!
- ⏳ Loading forever → Check backend logs
- ❌ Error message → Check console for details

---

## 🐛 Common Issues & Quick Fixes

### Issue: "Failed to fetch" or "Connection Refused"

**Symptom**: Console shows network errors, API calls fail

**Quick Fix**:
```bash
# Check if backend is running
curl http://localhost:8001/api/health

# If not running:
npm run dev:server
```

---

### Issue: "WebSocket connection failed"

**Symptom**: Console shows WebSocket error, no real-time updates

**Quick Fix**:
```bash
# Test WebSocket endpoint directly
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:8001/ws

# Should see: HTTP/1.1 101 Switching Protocols
```

If fails, check backend server logs for errors.

---

### Issue: Port 8001 already in use

**Symptom**: Backend won't start, says "EADDRINUSE"

**Quick Fix**:
```bash
# Find and kill process using port 8001
# On Mac/Linux:
lsof -ti:8001 | xargs kill -9

# On Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 8001).OwningProcess | Stop-Process -Force

# Then restart:
npm run dev:server
```

---

### Issue: Vite proxy not working

**Symptom**: API calls to `/api/*` return 404 from Vite, not backend

**Quick Fix**:
```bash
# Restart Vite dev server
# Ctrl+C to stop, then:
npm run dev:client
```

Check `vite.config.ts` has:
```typescript
proxy: {
  '^/api($|/)': {
    target: 'http://localhost:8001',
    changeOrigin: true,
    ws: true,
  }
}
```

---

## ✅ Success Criteria

Your test passes if ALL of these are true:

- [ ] Environment file has port 8001 (not 3001)
- [ ] Backend starts on http://localhost:8001
- [ ] Frontend starts on http://localhost:5173
- [ ] Dashboard page loads
- [ ] Console shows: "✅ WebSocket connected successfully"
- [ ] Network tab shows: `/api/*` requests return 200
- [ ] Network tab shows: WebSocket status is 101
- [ ] No errors in console
- [ ] Dashboard shows data (even if mock/sample data)

---

## 📊 Expected vs Actual Behavior

### Before Fixes:
```
❌ Port mismatch (3001 vs 8001)
❌ WebSocket uses wrong URL
❌ Dashboard stuck loading
❌ API calls return 404
❌ Console full of errors
```

### After Fixes:
```
✅ Correct port (8001)
✅ WebSocket URL correct
✅ Dashboard loads with data
✅ API calls return 200
✅ Console clean (only info logs)
```

---

## 🚨 If Tests Fail

**Don't panic!** Check these in order:

1. **Environment file**: Did you save the changes?
   ```bash
   cat env | grep VITE_API_BASE
   ```

2. **Backend running**: Is it on port 8001?
   ```bash
   curl http://localhost:8001/api/health
   ```

3. **Frontend running**: Is Vite on port 5173?
   ```bash
   curl http://localhost:5173
   ```

4. **Cache**: Clear browser cache and reload
   - Chrome: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Firefox: Ctrl+F5

5. **Dependencies**: Re-install if needed
   ```bash
   npm ci
   ```

---

## 📝 Reporting Results

If you want to share results or report issues, include:

```bash
# System info
node --version
npm --version

# Environment
cat env | grep -E "VITE_API_BASE|VITE_WS_BASE|PORT"

# Backend status
curl -s http://localhost:8001/api/health | head -n 5

# Frontend status  
curl -s http://localhost:5173 | head -n 1

# Console logs (copy from browser DevTools)
```

---

## ⏱️ Time Estimates

- **Environment check**: 30 seconds
- **Start backend**: 1 minute
- **Start frontend**: 1 minute
- **Browser test**: 2 minutes
- **Total**: **~5 minutes**

---

## 🎓 Understanding the Fixes

**What changed**:
1. Port number corrected (3001 → 8001)
2. WebSocket protocol fixed (http → ws)
3. Production mode auto-detection added
4. HuggingFace compatibility ensured
5. Error handling improved

**Why it matters**:
- Correct port = Backend reachable
- Correct protocol = WebSocket connects
- Auto-detection = Works in production
- Error handling = Better UX when things fail

---

## 🚀 Next Steps

After passing all tests:

1. ✅ Commit changes
2. ✅ Push to repository
3. ✅ Deploy to staging/production
4. ✅ Test in production environment
5. ✅ Monitor for issues

---

**Need Help?** 

Check the detailed reports:
- Full audit: `/workspace/DATA_FETCH_WEBSOCKET_AUDIT_REPORT.md`
- Fixes summary: `/workspace/FIXES_SUMMARY.md`

---

**Version**: 1.0  
**Last Updated**: 2025-11-16  
**Status**: ✅ READY FOR TESTING
