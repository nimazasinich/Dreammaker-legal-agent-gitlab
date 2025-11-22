# 🚀 Next Phase: Performance, Monitoring & Advanced UI Features

**Branch:** `claude/ui-error-states-retry-01WpBj7rQsRyB3m8VujSFfGw`
**Current Phase:** UI Error States & Retry Logic ✅ COMPLETE
**Next Phase:** Performance Optimization + Monitoring + Enhanced UX

---

## 📋 Context: What's Been Done

### ✅ Completed in Previous Phase

1. **LoadState Pattern Implementation**
   - `src/types/loadState.ts` - Standardized async state management
   - Four states: idle, loading, success, error
   - Helper functions for state creation

2. **Error UI Components**
   - `src/components/ui/ErrorStateCard.tsx` - Reusable error display
   - Glassmorphism design, RTL-aware, accessible
   - Optional retry button functionality

3. **Updated Hooks with LoadState**
   - `src/lib/useHealthCheck.ts` - Health monitoring with refresh()
   - `src/hooks/useOHLC.ts` - OHLC data with reload()
   - Both check for structured error responses (ok: false)

4. **Updated Components**
   - `src/components/ui/StatusRibbon.tsx` - Shows provider health
   - `src/components/enhanced/EnhancedSymbolDashboard.tsx` - ErrorStateCard integration
   - `src/views/ChartingView.tsx` - Proper error handling

5. **Testing Infrastructure**
   - `TEST_PLAN.md` - Comprehensive test documentation
   - `TESTING_CHECKLIST.md` - Quick reference for testing
   - `scripts/quick-test.sh` - Automated sanity checks

### 🎯 Current State

**What Works:**
- ✅ No more silent failures
- ✅ No more infinite loaders
- ✅ Clear error messages with retry buttons
- ✅ Structured error handling from backend
- ✅ LoadState pattern for consistent state management

**What Needs Improvement:**
- ⚠️ Performance: No caching, repeated requests
- ⚠️ UX: Basic retry (no exponential backoff)
- ⚠️ Monitoring: No error tracking/analytics
- ⚠️ Offline: No offline detection
- ⚠️ Loading: Basic spinners (no skeletons)
- ⚠️ Network: No request deduplication

---

## 🎯 Next Phase Goals

### 1️⃣ **Performance Optimization**

#### A. Response Caching
**Goal:** Reduce unnecessary API calls, improve response times

**Tasks:**
- [ ] Create `src/lib/cache.ts` - Simple in-memory cache
  - Time-based expiration (TTL)
  - Size limits (LRU eviction)
  - Cache invalidation on retry

- [ ] Update `useOHLC` to use cache
  - Cache key: `${symbol}-${timeframe}-${limit}`
  - TTL: 30 seconds (configurable)
  - Invalidate on manual reload()

- [ ] Update `useHealthCheck` to use cache
  - Cache key: `health-status`
  - TTL: 10 seconds
  - Invalidate on manual refresh()

**Implementation Example:**
```typescript
// src/lib/cache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize = 100;

  set(key: string, data: T, ttl: number = 30000) {
    // Implement LRU eviction if size > maxSize
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}
```

#### B. Request Deduplication
**Goal:** Prevent duplicate simultaneous requests

**Tasks:**
- [ ] Create `src/lib/requestDeduplication.ts`
  - Track in-flight requests
  - Return same Promise for duplicate requests
  - Clean up after completion

- [ ] Integrate with `fetchWithRetry`
  - Wrap fetch calls with deduplication
  - Use request URL as dedup key

**Implementation Example:**
```typescript
// src/lib/requestDeduplication.ts
const inFlightRequests = new Map<string, Promise<any>>();

export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key);
  });

  inFlightRequests.set(key, promise);
  return promise;
}
```

#### C. Exponential Backoff for Retries
**Goal:** Prevent server hammering, improve retry success rate

**Tasks:**
- [ ] Create `src/lib/exponentialBackoff.ts`
  - Calculate delay: `baseDelay * 2^attempt`
  - Max delay cap (e.g., 30 seconds)
  - Jitter to prevent thundering herd

- [ ] Update retry logic in hooks
  - Use backoff between retry attempts
  - Show countdown to user ("Retrying in 4s...")

**Implementation Example:**
```typescript
// src/lib/exponentialBackoff.ts
export function calculateBackoff(
  attempt: number,
  baseDelay: number = 1000,
  maxDelay: number = 30000
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;

      const delay = calculateBackoff(attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('All retries failed');
}
```

---

### 2️⃣ **Monitoring & Observability**

#### A. Error Tracking
**Goal:** Track and analyze errors for better debugging

**Tasks:**
- [ ] Create `src/lib/errorTracking.ts`
  - Log errors with context (component, user action, timestamp)
  - Optional integration with Sentry/LogRocket
  - Error categorization (network, validation, server, client)

- [ ] Update hooks to report errors
  - Track error frequency
  - Track recovery success rate
  - Store in localStorage or send to backend

**Implementation Example:**
```typescript
// src/lib/errorTracking.ts
interface ErrorEvent {
  type: 'network' | 'validation' | 'server' | 'client';
  message: string;
  context: {
    component: string;
    action: string;
    timestamp: number;
    userAgent: string;
  };
  stack?: string;
}

class ErrorTracker {
  private errors: ErrorEvent[] = [];
  private maxErrors = 100;

  track(event: ErrorEvent) {
    this.errors.push(event);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in dev
    if (import.meta.env.DEV) {
      console.warn('[ErrorTracker]', event);
    }

    // Optional: Send to analytics
    // this.sendToBackend(event);
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  getErrorsByType(type: ErrorEvent['type']) {
    return this.errors.filter(e => e.type === type);
  }
}

export const errorTracker = new ErrorTracker();
```

#### B. Performance Metrics
**Goal:** Track and optimize performance bottlenecks

**Tasks:**
- [ ] Create `src/lib/performanceMonitor.ts`
  - Track hook execution time
  - Track component render time
  - Track API response time

- [ ] Add performance marks
  - `performance.mark()` for key operations
  - `performance.measure()` for durations
  - Export metrics to console/backend

**Implementation Example:**
```typescript
// src/lib/performanceMonitor.ts
export function measurePerformance(
  name: string,
  fn: () => void | Promise<void>
) {
  const startMark = `${name}-start`;
  const endMark = `${name}-end`;

  performance.mark(startMark);

  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      performance.mark(endMark);
      performance.measure(name, startMark, endMark);

      const measure = performance.getEntriesByName(name)[0];
      console.log(`[Perf] ${name}: ${measure.duration.toFixed(2)}ms`);
    });
  } else {
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    return result;
  }
}
```

#### C. Real-time Dashboard
**Goal:** Visualize system health and errors

**Tasks:**
- [ ] Create `src/views/MonitoringView.tsx`
  - Error log viewer (recent errors, grouped by type)
  - Performance metrics (API response times, render times)
  - Health status history (uptime chart)
  - Cache hit rate

- [ ] Add route `/monitoring` to view dashboard
- [ ] Only show in development or admin mode

---

### 3️⃣ **Enhanced UX Features**

#### A. Offline Detection
**Goal:** Detect and handle offline state gracefully

**Tasks:**
- [ ] Create `src/hooks/useOnlineStatus.ts`
  - Listen to `navigator.onLine`
  - Listen to `online`/`offline` events
  - Return `isOnline` boolean

- [ ] Update StatusRibbon
  - Show "Offline" banner when disconnected
  - Pause polling when offline
  - Auto-retry when back online

- [ ] Update error messages
  - Special message for offline state
  - Hide retry button when offline
  - Show "Waiting for connection..." message

**Implementation Example:**
```typescript
// src/hooks/useOnlineStatus.ts
import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
```

#### B. Loading Skeletons
**Goal:** Better perceived performance with skeleton screens

**Tasks:**
- [ ] Create `src/components/ui/Skeleton.tsx`
  - Generic skeleton component
  - Variants: text, card, chart
  - Animated shimmer effect

- [ ] Create specific skeletons
  - `ChartSkeleton` for ChartingView
  - `DashboardSkeleton` for Dashboard
  - `TableSkeleton` for data tables

- [ ] Replace loading spinners with skeletons
  - Better visual feedback
  - Maintain layout during loading
  - No layout shift (CLS improvement)

**Implementation Example:**
```typescript
// src/components/ui/Skeleton.tsx
export function Skeleton({
  variant = 'text',
  width = '100%',
  height = '20px',
  className = ''
}) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 bg-[length:200%_100%] rounded ${className}`}
      style={{ width, height }}
    />
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton width="200px" height="24px" />
      <Skeleton width="100%" height="400px" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <Skeleton key={i} width="100%" height="80px" />
        ))}
      </div>
    </div>
  );
}
```

#### C. Toast Notifications
**Goal:** Non-blocking notifications for errors and success

**Tasks:**
- [ ] Enhance existing Toast component
  - Auto-dismiss (configurable timeout)
  - Action buttons (Retry, Dismiss)
  - Stack multiple toasts
  - Position (top-right, bottom-right, etc.)

- [ ] Integrate with error states
  - Show toast on error (optional, configurable)
  - Success toast on retry success
  - Warning toast on degraded performance

#### D. Auto-reconnection with Visual Feedback
**Goal:** Seamless reconnection after network issues

**Tasks:**
- [ ] Create `src/hooks/useAutoReconnect.ts`
  - Detect disconnection
  - Attempt reconnection with backoff
  - Track reconnection attempts
  - Emit reconnection events

- [ ] Add reconnection UI
  - Banner: "Connection lost. Reconnecting..."
  - Progress indicator (attempt 1/5)
  - Countdown to next attempt
  - Manual retry button

---

## 📝 Implementation Checklist

### Phase 3A: Performance Optimization
- [ ] Implement SimpleCache
- [ ] Add caching to useOHLC
- [ ] Add caching to useHealthCheck
- [ ] Implement request deduplication
- [ ] Implement exponential backoff
- [ ] Update retry logic in hooks
- [ ] Add cache invalidation on manual refresh
- [ ] Test cache hit rates
- [ ] Document cache configuration

### Phase 3B: Monitoring
- [ ] Create ErrorTracker
- [ ] Integrate error tracking in hooks
- [ ] Create PerformanceMonitor
- [ ] Add performance marks to critical paths
- [ ] Create MonitoringView dashboard
- [ ] Add error log viewer
- [ ] Add performance metrics view
- [ ] Add health history chart
- [ ] Test in development mode

### Phase 3C: Enhanced UX
- [ ] Create useOnlineStatus hook
- [ ] Add offline detection to StatusRibbon
- [ ] Create Skeleton components
- [ ] Replace spinners with skeletons
- [ ] Enhance Toast component
- [ ] Integrate toasts with error handling
- [ ] Create useAutoReconnect hook
- [ ] Add reconnection UI
- [ ] Add countdown timers for retries
- [ ] Test all UX improvements

---

## 🎨 Design Considerations

### Caching Strategy
- **OHLC Data:** 30s TTL (market data changes frequently)
- **Health Status:** 10s TTL (status changes less often)
- **News:** 5 minutes TTL (rarely changes)
- **Sentiment:** 1 minute TTL (updates periodically)

### Retry Strategy
- **Initial delay:** 1 second
- **Max delay:** 30 seconds
- **Max attempts:** 5 (increased from 3)
- **Backoff multiplier:** 2x
- **Jitter:** 10% random

### Performance Targets
- **API Response:** < 500ms (p95)
- **Component Render:** < 100ms
- **Cache Hit Rate:** > 60%
- **Error Recovery:** > 90%

---

## 🧪 Testing Strategy

### Performance Tests
1. **Cache Effectiveness**
   - Measure cache hit rate
   - Verify TTL expiration
   - Test invalidation

2. **Request Deduplication**
   - Concurrent requests → single fetch
   - Different requests → separate fetches

3. **Backoff Strategy**
   - Verify exponential delays
   - Check max delay cap
   - Validate jitter randomness

### UX Tests
1. **Offline Mode**
   - Disconnect network → offline banner
   - Reconnect → banner disappears
   - Auto-retry works

2. **Loading States**
   - Skeletons show during load
   - No layout shift (CLS = 0)
   - Smooth transitions

3. **Toasts**
   - Auto-dismiss after timeout
   - Stack multiple toasts
   - Action buttons work

---

## 🚀 Quick Start for Next Session

```bash
# 1. Checkout the branch
git checkout claude/ui-error-states-retry-01WpBj7rQsRyB3m8VujSFfGw

# 2. Review current implementation
cat TEST_PLAN.md
cat TESTING_CHECKLIST.md

# 3. Start with performance optimization
# Create src/lib/cache.ts
# Update src/hooks/useOHLC.ts to use cache
# Test cache with quick-test.sh

# 4. Then monitoring
# Create src/lib/errorTracking.ts
# Integrate with hooks
# Create MonitoringView

# 5. Finally UX enhancements
# Create useOnlineStatus
# Create Skeleton components
# Update UI components
```

---

## 📚 Key Files to Reference

**Current Implementation:**
- `src/types/loadState.ts` - LoadState pattern
- `src/components/ui/ErrorStateCard.tsx` - Error UI
- `src/lib/useHealthCheck.ts` - Health monitoring
- `src/hooks/useOHLC.ts` - OHLC data fetching

**Utilities (may exist):**
- `src/utils/exponentialBackoff.ts` - May already exist
- `src/utils/cache.ts` - May already exist
- Check for existing implementations before creating new ones

**Testing:**
- `TEST_PLAN.md` - Comprehensive test guide
- `TESTING_CHECKLIST.md` - Quick reference
- `scripts/quick-test.sh` - Automated tests

---

## 💡 Additional Ideas (Future)

- **WebSocket reconnection logic** with exponential backoff
- **Optimistic UI updates** (show change before server confirms)
- **Request prioritization** (critical vs. non-critical)
- **Service Worker** for offline functionality
- **IndexedDB** for persistent cache
- **Performance budgets** with automated alerts
- **Error replay** for debugging
- **A/B testing** framework for UX improvements

---

**Phase Priority:**
1. 🔥 **High:** Caching + Backoff (immediate performance wins)
2. 📊 **Medium:** Monitoring (visibility into issues)
3. 🎨 **Low:** UX enhancements (nice-to-have improvements)

**Estimated Time:**
- Phase 3A (Performance): 4-6 hours
- Phase 3B (Monitoring): 3-4 hours
- Phase 3C (UX): 5-7 hours
- **Total:** 12-17 hours of focused work

---

**Last Updated:** 2025-11-14
**Version:** 1.0
**Status:** Ready for Implementation
