# Performance Monitoring & UX Enhancements

## Overview

This document describes the performance monitoring, caching, and UX enhancements added to the Dreammaker Legal Agent application.

## Features Implemented

### 1. 🚀 Performance Optimization

#### Request Deduplication (`src/lib/requestDeduplication.ts`)
- **Purpose**: Prevents duplicate simultaneous requests to the same endpoint
- **Benefit**: Reduces server load and improves response time
- **Stats Tracked**: Total requests, deduped requests, deduplication rate

**Usage:**
```typescript
import { dedupedFetch } from '../lib/requestDeduplication';

const data = await dedupedFetch('cache-key', async () => {
  return await fetch('/api/data');
});
```

#### Caching System (Using existing `AdvancedCache`)
- **OHLC Data**: 30-second TTL, up to 50 entries
- **Health Checks**: 10-second TTL, up to 10 entries
- **Stale-While-Revalidate**: Returns stale data while fetching fresh data

**Cache Configuration:**
- OHLC: `30000ms` TTL (market data changes frequently)
- Health: `10000ms` TTL (status changes less often)
- Automatic invalidation on manual reload/refresh

### 2. 📊 Monitoring & Observability

#### Error Tracking (`src/lib/errorTracking.ts`)
- **Categorization**: Network, validation, server, client, unknown
- **Context Tracking**: Component, action, timestamp, stack traces
- **Recovery Tracking**: Monitors retry success rates
- **Export**: JSON export for analysis

**Error Stats:**
- Total errors
- Errors by type
- Errors by component
- Recovery rate
- Recent errors (last 10)

**Usage:**
```typescript
import { errorTracker, classifyError } from '../lib/errorTracking';

try {
  await fetchData();
} catch (err) {
  errorTracker.track({
    type: classifyError(err),
    message: err.message,
    context: {
      component: 'MyComponent',
      action: 'fetchData',
      customField: 'value'
    },
    stack: err.stack
  });
}

// Track recovery
errorTracker.trackRecovery('MyComponent', 'fetchData');
```

#### Performance Monitor (`src/lib/performanceMonitor.ts`)
- **Metrics**: Duration, min, max, avg, median, p95, p99
- **Automatic Logging**: Logs slow operations in development
- **Export**: JSON export for analysis

**Usage:**
```typescript
import { performanceMonitor } from '../lib/performanceMonitor';

const result = await performanceMonitor.measure(
  'operationName',
  async () => {
    return await expensiveOperation();
  },
  { tag1: 'value1', tag2: 'value2' }
);

// Get stats
const stats = performanceMonitor.getStats('operationName');
console.log(`Average: ${stats.avg}ms, P95: ${stats.p95}ms`);
```

#### Monitoring Dashboard (`src/views/MonitoringView.tsx`)
- **Access**: Navigate to `/monitoring` or set `currentView` to `'monitoring'`
- **Features**:
  - Real-time error tracking
  - Performance metrics visualization
  - Request deduplication statistics
  - Auto-refresh (toggleable)
  - Export errors and metrics as JSON

**Dashboard Sections:**
1. **Summary Cards**: Total errors, recovery rate, metrics count, dedup rate
2. **Error Tracking**: Errors by type, recent errors with expandable details
3. **Performance Metrics**: Operation timings with percentiles
4. **Request Deduplication**: Stats on request optimization

### 3. 🎨 Enhanced UX

#### Offline Detection (`src/hooks/useOnlineStatus.ts`)
- **Detection**: Monitors `navigator.onLine` and network events
- **UI Feedback**: Red banner in StatusRibbon when offline
- **Auto-Recovery**: Tracks when connection is restored

**Usage:**
```typescript
import { useOnlineStatus } from '../hooks/useOnlineStatus';

function MyComponent() {
  const isOnline = useOnlineStatus();

  if (!isOnline) {
    return <div>You are offline</div>;
  }

  return <div>Online content</div>;
}
```

#### Skeleton Loading (`src/components/ui/Skeleton.tsx`)
- **Better Perceived Performance**: Shows layout preview during loading
- **No Layout Shift**: Maintains layout stability (CLS improvement)
- **Variants**: Text, card, chart, circle, table

**Components:**
- `Skeleton`: Base skeleton component
- `ChartSkeleton`: For ChartingView
- `DashboardSkeleton`: For Dashboard
- `TableSkeleton`: For data tables
- `CardSkeleton`: For card layouts

**Usage:**
```typescript
import { ChartSkeleton } from '../components/ui/Skeleton';

{loading ? <ChartSkeleton /> : <Chart data={data} />}
```

### 4. 🔧 Hook Enhancements

#### useOHLC Hook
- ✅ Request deduplication
- ✅ 30-second caching
- ✅ Performance monitoring
- ✅ Error tracking
- ✅ Recovery tracking
- ✅ Cache invalidation on reload

#### useHealthCheck Hook
- ✅ 10-second caching
- ✅ Performance monitoring
- ✅ Error tracking
- ✅ Recovery tracking
- ✅ Cache invalidation on refresh

#### StatusRibbon Component
- ✅ Offline detection banner
- ✅ Visual offline state indicator

#### ChartingView
- ✅ Skeleton loading instead of spinner
- ✅ Better perceived performance

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| API Response (p95) | < 500ms | With caching |
| Component Render | < 100ms | Average |
| Cache Hit Rate | > 60% | For OHLC data |
| Error Recovery | > 90% | Successful retries |
| Deduplication Rate | > 20% | Prevented duplicate requests |

## How to Access Monitoring Dashboard

1. **Development Mode**: Navigate to monitoring view
2. **Access**: Set navigation view to `'monitoring'`
3. **Features**:
   - Auto-refresh every 2 seconds (toggleable)
   - Export errors as JSON
   - Export performance metrics as JSON
   - Clear data for fresh analysis

## Statistics Available

### Error Tracking
- Total errors recorded
- Errors by type (network, validation, server, client, unknown)
- Errors by component
- Recovery rate (successful retries / total attempts)
- Recent errors with full context and stack traces

### Performance Metrics
- Count: Number of measurements
- Min/Max: Fastest and slowest execution
- Average: Mean execution time
- Median: 50th percentile
- P95: 95th percentile (slower than 95% of requests)
- P99: 99th percentile (slower than 99% of requests)

### Request Deduplication
- Total requests
- Deduped requests (prevented duplicates)
- In-flight requests (currently pending)
- Deduplication rate percentage

## Best Practices

### Using Error Tracking
```typescript
// Track errors with context
errorTracker.track({
  type: classifyError(error),
  message: error.message,
  context: {
    component: 'ComponentName',
    action: 'actionName',
    symbol: 'BTC/USDT',
    timeframe: '1h'
  },
  stack: error.stack
});

// Track retry attempts
errorTracker.trackRecoveryAttempt('ComponentName', 'actionName');

// Track successful recovery
errorTracker.trackRecovery('ComponentName', 'actionName');
```

### Using Performance Monitor
```typescript
// Measure async operations
const result = await performanceMonitor.measure(
  'fetchOHLC',
  async () => await fetchOHLC(symbol, timeframe),
  { symbol, timeframe }
);

// Measure sync operations
const result = performanceMonitor.measureSync(
  'parseData',
  () => parseData(rawData),
  { recordCount: rawData.length }
);
```

### Using Cache
```typescript
// Check cache first
const cachedData = cache.get(cacheKey);
if (cachedData) {
  setState({ status: 'success', data: cachedData });
  return;
}

// Fetch and cache
const freshData = await fetchData();
cache.set(cacheKey, freshData);

// Invalidate on manual refresh
cache.delete(cacheKey);
```

## Development Logging

In development mode, all monitoring features log to console:

- **Error Tracker**: `⚠️ [ErrorTracker]` with emoji indicators by type
- **Performance Monitor**: `⚡ [Performance]` with timing and tags
- **Request Dedup**: Stats available via `getDeduplicationStats()`

## Export Formats

### Error Export
```json
{
  "errors": [...],
  "stats": {
    "totalErrors": 42,
    "byType": { "network": 20, "server": 10, ... },
    "byComponent": { "useOHLC": 15, ... },
    "recoveryRate": 85.5,
    "recentErrors": [...]
  },
  "exportedAt": "2025-11-14T12:00:00.000Z"
}
```

### Performance Export
```json
{
  "metrics": {
    "fetchOHLC": [...],
    "healthCheck": [...]
  },
  "stats": {
    "fetchOHLC": {
      "name": "fetchOHLC",
      "count": 100,
      "min": 45.2,
      "max": 892.1,
      "avg": 234.5,
      "median": 210.3,
      "p95": 456.7,
      "p99": 678.9
    }
  },
  "exportedAt": "2025-11-14T12:00:00.000Z"
}
```

## Future Enhancements

- [ ] WebSocket reconnection with exponential backoff
- [ ] Optimistic UI updates
- [ ] Request prioritization
- [ ] Service Worker for offline functionality
- [ ] IndexedDB for persistent cache
- [ ] Performance budgets with alerts
- [ ] Error replay for debugging
- [ ] A/B testing framework

## Testing

To test the monitoring features:

1. **Error Tracking**: Trigger errors and check MonitoringView
2. **Performance**: Check metrics after API calls
3. **Deduplication**: Make concurrent requests, verify only one fetch
4. **Offline**: Disconnect network, check offline banner
5. **Skeletons**: Navigate to ChartingView while loading
6. **Cache**: Navigate away and back, check for instant load

## Summary

These enhancements provide:
- ✅ **Better Performance**: Caching and deduplication reduce API calls
- ✅ **Better UX**: Skeletons and offline detection improve user experience
- ✅ **Better Observability**: Error tracking and performance monitoring
- ✅ **Better Reliability**: Automatic retry with recovery tracking
- ✅ **Better Developer Experience**: Comprehensive monitoring dashboard

All features are production-ready and include proper error handling, TypeScript types, and documentation.
