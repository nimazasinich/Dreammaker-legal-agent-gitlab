# 🔍 FULL DATA PATH DIAGNOSTIC REPORT

**Date**: 2025-11-16  
**Scope**: Complete audit of REST API + WebSocket data paths  
**Objective**: Find and fix all 404 errors, WSS failures, and data loading issues

---

## 📋 EXECUTIVE SUMMARY

### ✅ What Works
- ✅ Backend server (Node.js/Express) routes are properly configured at `/api/*`
- ✅ WebSocket server is properly mounted at `/ws` endpoint
- ✅ CORS middleware is configured correctly
- ✅ Vite proxy configuration is set up for local development
- ✅ HuggingFace Dockerfile with nginx reverse proxy is configured

### ❌ Critical Issues Found

#### **ISSUE #1: Multiple Conflicting API Base URL Definitions**
**Severity**: 🔴 HIGH  
**Files Affected**:
- `/workspace/env` (Line 1): `VITE_API_BASE=http://localhost:3001/api` ⚠️ **WRONG PORT**
- `/workspace/env` (Line 2): `VITE_WS_BASE=http://localhost:3001` ⚠️ **WRONG PORT**
- Backend server runs on port **8001** (package.json line 10: `dev:server`)
- Frontend expects port **3001** but backend is on **8001**

**Root Cause**: Environment file has stale configuration pointing to wrong port (3001 instead of 8001)

**Impact**: 
- All API calls from frontend fail with **Connection Refused** or **404**
- WebSocket connections fail to establish
- Dashboard shows no data because it can't reach backend

---

#### **ISSUE #2: API_BASE Includes `/api` Suffix in env but gets stripped**
**Severity**: 🟡 MEDIUM  
**Files Affected**:
- `/workspace/src/config/env.ts` (Line 20): Strips `/api` from `API_BASE`
- `/workspace/src/lib/api.ts` (Line 14): Adds `/api` prefix again
- Multiple service files construct URLs inconsistently

**Root Cause**: Double `/api` prevention logic causes confusion

**Example Problem**:
```typescript
// In env file:
VITE_API_BASE=http://localhost:3001/api

// After env.ts processing:
API_BASE = 'http://localhost:3001'  // /api stripped

// In api.ts:
const withApi = p.startsWith('/api/') ? p : `/api${p}`;
return `${base}${withApi}`;  // Re-adds /api

// Result: Works, but confusing
```

**Impact**: Developers get confused, inconsistent URL construction patterns

---

#### **ISSUE #3: WebSocket URL Construction Has Multiple Patterns**
**Severity**: 🟠 MEDIUM-HIGH  
**Files Affected**:
- `/workspace/src/config/env.ts` (Line 58-64): `buildWebSocketUrl()` function
- `/workspace/src/lib/ws.ts` (Line 10-14): `wsUrl()` function
- `/workspace/src/services/dataManager.ts` (Line 106-108): Custom WS URL construction
- `/workspace/src/views/PositionsView.tsx` (Line 50): Uses `buildWebSocketUrl()`
- `/workspace/src/views/ScannerView.tsx` (Line 220): Uses `buildWebSocketUrl()`
- `/workspace/src/components/scanner/ScannerFeedPanel.tsx` (Line 38): Custom `ws://` construction

**Root Cause**: Three different methods to build WebSocket URLs:
1. `buildWebSocketUrl()` from config/env.ts
2. `wsUrl()` from lib/ws.ts
3. Manual construction with `location.origin.replace('http', 'ws')`

**Impact**: Inconsistent WebSocket connections, some work, some fail

---

#### **ISSUE #4: HuggingFace Deployment Uses Absolute URLs**
**Severity**: 🔴 HIGH (for production)  
**Files Affected**:
- `/workspace/env` (Lines 1-2): Hardcoded `localhost` URLs
- Multiple components using `API_BASE` from env

**Root Cause**: Environment variables point to localhost instead of relative paths

**HuggingFace Requirement**:
- Must use **relative paths** for API calls: `/api/*`
- Must use **wss://** protocol for WebSocket: `wss://username-space.hf.space/ws`
- Cannot use absolute URLs with localhost

**Impact**: 
- Deployment to HuggingFace Spaces will fail
- API calls return 404 because nginx can't proxy localhost URLs
- WebSocket fails with mixed content errors

---

#### **ISSUE #5: WebSocket Base URL Has Wrong Protocol in env**
**Severity**: 🔴 HIGH  
**File**: `/workspace/env` (Line 2)

**Current**:
```
VITE_WS_BASE=http://localhost:3001
```

**Problem**: Should be `ws://` not `http://`

**Root Cause**: Copy-paste error, WS_BASE should use WebSocket protocol

**Impact**: 
- `env.ts` tries to fix it with `.replace(/^http/, 'ws')` but this is fragile
- Better to have correct value from the start

---

#### **ISSUE #6: dataManager.ts Doesn't Handle Connection Failures Gracefully**
**Severity**: 🟡 MEDIUM  
**File**: `/workspace/src/services/dataManager.ts` (Lines 81-221)

**Issues**:
1. Connection timeout is 5 seconds (Line 185) - too short for slow networks
2. No exponential backoff for reconnection attempts
3. No user-visible error state when WebSocket fails
4. `reconnectDelay` doubles on each attempt but not capped properly

**Impact**: 
- WebSocket disconnects on slow networks
- User doesn't know why data isn't loading
- Excessive reconnection attempts can overwhelm server

---

#### **ISSUE #7: Mixed Usage of apiUrl() vs Direct Fetch**
**Severity**: 🟡 MEDIUM  
**Files Affected**: Multiple service files

**Examples**:
- Some use: `apiUrl('/market/prices')` ✅ Consistent
- Some use: `fetch(`${API_BASE}/api/market/prices`)` ⚠️ Direct construction
- Some use: `axios.get(apiUrl(endpoint))` ✅ Consistent
- Some use: `fetch(`${API_BASE}/market/prices`)` ⚠️ Missing /api

**Root Cause**: No enforced pattern, developers use different approaches

**Impact**: Some API calls work, some return 404 depending on path construction

---

## 🎯 ROOT CAUSE ANALYSIS

### Primary Root Cause: **Environment Configuration Mismatch**

The main issue is that the environment file (`/workspace/env`) has outdated configuration:

```diff
- VITE_API_BASE=http://localhost:3001/api
- VITE_WS_BASE=http://localhost:3001
+ VITE_API_BASE=http://localhost:8001
+ VITE_WS_BASE=ws://localhost:8001
```

### Secondary Root Cause: **Lack of Production-Ready Configuration**

The codebase has:
- ✅ Good abstraction with `API_BASE` and `WS_BASE`
- ✅ Helper functions for URL construction
- ❌ But no production mode that switches to relative paths
- ❌ No automatic detection of HuggingFace environment

### Tertiary Root Cause: **Inconsistent WebSocket Patterns**

Three different WebSocket URL builders exist, causing confusion:
1. `buildWebSocketUrl()` in `config/env.ts`
2. `wsUrl()` in `lib/ws.ts`
3. Manual construction in components

---

## 🔧 COMPREHENSIVE FIX PLAN

### Fix #1: Update Environment File ✅ CRITICAL
**File**: `/workspace/env`

```diff
- VITE_API_BASE=http://localhost:3001/api
- VITE_WS_BASE=http://localhost:3001
+ VITE_API_BASE=http://localhost:8001
+ VITE_WS_BASE=ws://localhost:8001
```

**Why**: Backend runs on port 8001, not 3001

---

### Fix #2: Add Production Mode to env.ts ✅ CRITICAL
**File**: `/workspace/src/config/env.ts`

Add automatic detection of production environment:

```typescript
// Detect if running in HuggingFace or production
const isProduction = import.meta.env.PROD;
const isHuggingFace = typeof location !== 'undefined' && location.hostname.includes('.hf.space');

// In production or HuggingFace, use relative paths
const rawApiBase = (isProduction || isHuggingFace)
  ? '' // Empty base for relative paths
  : (getEnv('VITE_API_BASE') || 'http://localhost:8001');

// For WebSocket, derive from location in production
const rawWsBase = (isProduction || isHuggingFace)
  ? (typeof location !== 'undefined' ? location.origin.replace(/^http/, 'ws') : '')
  : (getEnv('VITE_WS_BASE') || 'ws://localhost:8001');
```

**Why**: HuggingFace Spaces require relative paths due to nginx reverse proxy

---

### Fix #3: Simplify WebSocket URL Construction ✅ HIGH
**Action**: Remove duplicate `wsUrl()` from `/workspace/src/lib/ws.ts`

**Standardize** on `buildWebSocketUrl()` from `config/env.ts`:

```typescript
// ❌ REMOVE lib/ws.ts entirely OR merge with config/env.ts
// ✅ USE ONLY: import { buildWebSocketUrl } from '../config/env';
```

**Update all files** using WebSocket to use consistent pattern:
- PositionsView.tsx ✅ Already uses `buildWebSocketUrl()`
- ScannerView.tsx ✅ Already uses `buildWebSocketUrl()`
- dataManager.ts ✅ Should use `buildWebSocketUrl()`
- ScannerFeedPanel.tsx ❌ Uses custom construction

---

### Fix #4: Improve dataManager WebSocket Logic ✅ MEDIUM
**File**: `/workspace/src/services/dataManager.ts`

```diff
+ import { buildWebSocketUrl } from '../config/env.js';

- const wsUrl = import.meta.env.DEV
-     ? `${location.origin.replace(/^http/, 'ws')}${WS_PATH}`
-     : `${WS_BASE_NORMALIZED}${WS_PATH}`;
+ const wsUrl = buildWebSocketUrl('/ws');
```

**Add better error handling**:

```typescript
this.ws.onerror = (error) => {
    logger.error('WebSocket connection failed', { wsUrl });
    this.connectionStatus = ConnectionStatus.FAILED;
    
    // Emit error event for UI to show
    this.emit('connection_error', { 
        message: 'Failed to connect to real-time data stream',
        retryable: true
    });
};
```

---

### Fix #5: Add Graceful Fallback UI ✅ MEDIUM
**Files**: Dashboard.tsx, TopSignalsPanel.tsx, etc.

Add visible error states when data fails to load:

```typescript
const [connectionError, setConnectionError] = useState<string | null>(null);

useEffect(() => {
  const errorHandler = (error: any) => {
    setConnectionError(error.message);
  };
  
  dataManager.on('connection_error', errorHandler);
  return () => dataManager.off('connection_error', errorHandler);
}, []);

// In JSX:
{connectionError && (
  <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
    <p className="text-red-400">{connectionError}</p>
    <button onClick={retry}>Retry Connection</button>
  </div>
)}
```

---

### Fix #6: Add HuggingFace Detection and Auto-Config ✅ HIGH
**File**: `/workspace/src/main.tsx`

Add startup detection:

```typescript
// Detect environment
const isHuggingFace = location.hostname.includes('.hf.space');
const apiBase = import.meta.env.VITE_API_BASE;

if (isHuggingFace && apiBase?.includes('localhost')) {
  console.error('❌ HuggingFace deployment detected but VITE_API_BASE points to localhost');
  console.error('📝 Set VITE_API_BASE to empty string or relative path in repository secrets');
}

// Test backend connection
try {
  const healthCheck = await fetch('/api/health', { timeout: 5000 });
  if (!healthCheck.ok) {
    console.error('❌ Backend health check failed:', healthCheck.status);
  }
} catch (error) {
  console.error('❌ Cannot reach backend API:', error);
}
```

---

### Fix #7: Update HuggingFace Dockerfile nginx config ✅ LOW
**File**: `/workspace/Dockerfile.huggingface`

Current nginx config is good but add WebSocket timeout:

```diff
  location /ws { 
    proxy_pass http://127.0.0.1:8000/ws; 
    proxy_http_version 1.1; 
    proxy_set_header Upgrade $http_upgrade; 
    proxy_set_header Connection "upgrade"; 
+   proxy_read_timeout 86400s;
+   proxy_send_timeout 86400s;
  }
```

---

## 📊 VALIDATION PLAN

### Test #1: Local Development
```bash
# 1. Update env file with correct port
sed -i 's/3001/8001/g' env

# 2. Start backend
npm run dev:server

# 3. Start frontend
npm run dev:client

# 4. Open browser to http://localhost:5173
# 5. Check console for:
#    ✅ "WebSocket connected successfully"
#    ✅ API calls to http://localhost:8001/api/*
#    ✅ No 404 errors
#    ✅ Dashboard shows data
```

### Test #2: WebSocket Connection
```bash
# In browser console:
const ws = new WebSocket('ws://localhost:8001/ws');
ws.onopen = () => console.log('✅ Connected');
ws.onerror = (e) => console.error('❌ Failed', e);
ws.onmessage = (msg) => console.log('📨 Message:', msg.data);

# Expected: Connection opens, receives messages
```

### Test #3: HuggingFace Simulation
```bash
# Build with production config
VITE_API_BASE= VITE_WS_BASE= npm run build

# Run with nginx locally
docker build -f Dockerfile.huggingface -t test-hf .
docker run -p 7860:7860 test-hf

# Open browser to http://localhost:7860
# Check:
#   ✅ API calls go to /api/* (relative)
#   ✅ WebSocket connects to ws://localhost:7860/ws
#   ✅ No mixed content errors
```

---

## 🎯 ACCEPTANCE CRITERIA

### ✅ Success Metrics
1. ✅ Dashboard loads without 404 errors
2. ✅ WebSocket connection establishes on page load
3. ✅ Real-time data updates appear in UI
4. ✅ No console errors related to API/WebSocket
5. ✅ Works in both development and production modes
6. ✅ HuggingFace deployment works with relative paths
7. ✅ Error states are visible to users when connection fails
8. ✅ Automatic reconnection works after network interruption

### ❌ Failure Indicators
- ❌ Any 404 errors in network tab
- ❌ WebSocket showing "failed to connect"
- ❌ Dashboard stuck on loading state
- ❌ Console showing "Invalid frame header"
- ❌ Mixed content warnings in production

---

## 📝 IMPLEMENTATION PRIORITY

### Phase 1: CRITICAL FIXES (15 minutes)
1. ✅ Fix env file port numbers (3001 → 8001)
2. ✅ Add production mode detection to env.ts
3. ✅ Test local development

### Phase 2: HIGH PRIORITY (30 minutes)
4. ✅ Standardize WebSocket URL construction
5. ✅ Update dataManager.ts to use buildWebSocketUrl()
6. ✅ Add connection error handling
7. ✅ Test WebSocket connections

### Phase 3: MEDIUM PRIORITY (30 minutes)
8. ✅ Add UI error states for connection failures
9. ✅ Update all components using WebSocket
10. ✅ Test end-to-end data flow

### Phase 4: POLISH (20 minutes)
11. ✅ Add HuggingFace auto-detection
12. ✅ Improve nginx config
13. ✅ Document configuration in README
14. ✅ Final validation tests

**Total Time Estimate**: ~90 minutes

---

## 📚 RELATED FILES

### Configuration Files
- `/workspace/env` - Environment variables ⚠️ NEEDS FIX
- `/workspace/src/config/env.ts` - Runtime config ⚠️ NEEDS UPDATE
- `/workspace/vite.config.ts` - Vite proxy ✅ Good
- `/workspace/Dockerfile.huggingface` - Production build ✅ Good

### API Layer
- `/workspace/src/lib/api.ts` - API helper ✅ Good
- `/workspace/src/lib/apiClient.ts` - Axios client ✅ Good
- `/workspace/src/services/apiService.ts` - Generic service ✅ Good

### WebSocket Layer
- `/workspace/src/services/dataManager.ts` - Main WS manager ⚠️ NEEDS UPDATE
- `/workspace/src/lib/ws.ts` - WS helper ⚠️ DUPLICATE, consider removing
- `/workspace/src/config/env.ts` - buildWebSocketUrl() ✅ Good

### Backend
- `/workspace/src/server.ts` - Express server ✅ Good
- Package.json scripts ✅ Good

---

## 🎉 EXPECTED OUTCOME

After implementing all fixes:

### Development Mode
```
✅ Frontend: http://localhost:5173
✅ Backend: http://localhost:8001
✅ API calls: http://localhost:5173/api/* → proxied to → http://localhost:8001/api/*
✅ WebSocket: ws://localhost:8001/ws
✅ Data loads immediately on dashboard
✅ Real-time updates via WebSocket
```

### Production Mode (HuggingFace)
```
✅ Frontend: https://username-space.hf.space
✅ Backend: https://username-space.hf.space (nginx proxy)
✅ API calls: /api/* → nginx → http://127.0.0.1:8000/api/*
✅ WebSocket: wss://username-space.hf.space/ws → nginx → http://127.0.0.1:8000/ws
✅ No mixed content errors
✅ No absolute URL issues
```

---

## 🚀 NEXT STEPS

1. **Review this report** with team
2. **Apply Phase 1 fixes** immediately
3. **Test each phase** before proceeding
4. **Document changes** in CHANGELOG
5. **Update README** with correct configuration
6. **Create deployment guide** for HuggingFace

---

**Report Generated**: 2025-11-16  
**Agent**: Cursor/Claude Code  
**Status**: ✅ READY FOR IMPLEMENTATION
