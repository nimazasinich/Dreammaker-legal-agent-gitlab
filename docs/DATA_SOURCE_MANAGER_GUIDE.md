# Unified Data Source Manager - Implementation Guide

## Overview

The Unified Data Source Manager is a comprehensive system for managing multiple data sources with automatic fallback, timeout handling, database caching, and real-time notifications. This guide covers setup, usage, and best practices.

## Features

✅ **Primary and Fallback Sources**: Automatically switches to fallback sources on failure  
✅ **Timeout-Based Switching**: 5-second default timeout with automatic source switching  
✅ **Database Caching**: All successful fetches are stored locally for resilience  
✅ **Failure Tracking**: Monitors source health and disables failing sources  
✅ **Mixed Mode**: Fetch from multiple sources simultaneously  
✅ **HuggingFace Integration**: Expanded AI features including sentiment analysis and predictions  
✅ **User Notifications**: Real-time notifications for source failures and fallbacks  
✅ **UI Components**: Complete UI for mode selection and monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend UI Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Mode Selector│  │Notifications │  │  Monitoring  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Controller Layer                      │
│              (DataSourceController)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Unified Data Source Manager                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Fetch Logic with Fallback & Timeout Handling       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Health Monitoring & Failure Tracking               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cache & Database Storage                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ Binance  │    │HuggingFace│   │ CoinGecko│
       │  (Direct)│    │   (AI)    │   │(Fallback)│
       └──────────┘    └──────────┘    └──────────┘
```

## Installation

### 1. Database Setup

Run the migration to create necessary tables:

```bash
# Apply the migration
sqlite3 ./data/trading.db < ./src/database/migrations/create_data_source_tables.sql
```

Or if using Node.js:

```javascript
import { Database } from './src/data/Database.js';

const db = Database.getInstance();
await db.runMigration('./src/database/migrations/create_data_source_tables.sql');
```

### 2. Configuration

The system automatically loads data sources from `config/providers_config.json`. You can customize:

```json
{
  "categories": {
    "market": {
      "timeout": 5000,
      "providers": [
        {
          "name": "coingecko",
          "priority": 1,
          "enabled": true
        }
      ]
    }
  }
}
```

### 3. Server Integration

Add the routes to your Express server:

```typescript
// src/server.ts
import dataSourceRoutes from './routes/dataSourceRoutes.js';

app.use('/api/data-sources', dataSourceRoutes);
```

### 4. Frontend Integration

Add the UI components to your React app:

```typescript
// src/App.tsx or relevant route
import { DataSourceManager } from './components/data-sources/DataSourceManager';

function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <DataSourceManager />
    </div>
  );
}
```

## Usage

### Basic Usage - Fetching Market Data

```typescript
import { unifiedDataSourceManager } from './services/UnifiedDataSourceManager';

// Fetch market data with automatic fallback
const result = await unifiedDataSourceManager.fetchMarketData(
  { symbol: 'BTC' },
  {
    timeout: 5000,
    fallbackEnabled: true,
    cacheEnabled: true
  }
);

if (result.success) {
  console.log('Price:', result.data);
  console.log('Source:', result.source);
  console.log('From cache:', result.fromCache);
  console.log('Fallback used:', result.fallbackUsed);
} else {
  console.error('Error:', result.error);
}
```

### Mode Selection

```typescript
// Change to HuggingFace mode
unifiedDataSourceManager.setMode('huggingface');

// Change to Mixed mode (best of both)
unifiedDataSourceManager.setMode('mixed');

// Change to Direct mode
unifiedDataSourceManager.setMode('direct');
```

### Health Monitoring

```typescript
// Get health of all sources
const health = unifiedDataSourceManager.getSourceHealth();

// Get health of specific source
const coingeckoHealth = unifiedDataSourceManager.getSourceHealth('coingecko');

// Get statistics
const stats = unifiedDataSourceManager.getStats();
console.log('Success rate:', stats.averageSuccessRate * 100 + '%');
```

### Manual Source Control

```typescript
// Disable a source temporarily (1 minute)
unifiedDataSourceManager.disableSource('coingecko', 60000);

// Re-enable a source
unifiedDataSourceManager.enableSource('coingecko');
```

### Notifications

```typescript
// Listen to notifications
unifiedDataSourceManager.on('notification', (notification) => {
  console.log(notification.type, notification.message);
  
  if (notification.type === 'error') {
    // Show error to user
  }
});
```

### HuggingFace Extended Features

```typescript
// Get comprehensive analysis (price, sentiment, prediction, signals)
const analysis = await unifiedDataSourceManager.fetchHuggingFaceExtended('BTC');

if (analysis.success) {
  console.log('Price:', analysis.data.price);
  console.log('Sentiment:', analysis.data.sentiment);
  console.log('Prediction:', analysis.data.prediction);
  console.log('Signals:', analysis.data.signals);
}
```

## API Endpoints

### GET `/api/data-sources/market`
Fetch market data with fallback support

**Query Parameters:**
- `symbol` (required): Trading symbol (e.g., "BTC")
- `timeframe` (optional): Timeframe for OHLCV data
- `limit` (optional): Number of data points
- `mode` (optional): Override mode (direct, huggingface, mixed)
- `timeout` (optional): Timeout in milliseconds

**Example:**
```bash
curl "http://localhost:3000/api/data-sources/market?symbol=BTC&timeout=5000"
```

### GET `/api/data-sources/sentiment`
Fetch sentiment data

**Query Parameters:**
- `symbol` (optional): Symbol to analyze
- `keyword` (optional): Keyword for sentiment analysis

### GET `/api/data-sources/news`
Fetch news data

**Query Parameters:**
- `limit` (optional): Number of articles
- `keyword` (optional): Filter by keyword

### GET `/api/data-sources/huggingface/extended`
Fetch extended HuggingFace analysis

**Query Parameters:**
- `symbol` (required): Symbol to analyze

### GET `/api/data-sources/health`
Get health status of data sources

**Query Parameters:**
- `source` (optional): Get health for specific source

### GET `/api/data-sources/stats`
Get comprehensive statistics

### GET `/api/data-sources/mode`
Get current mode

### POST `/api/data-sources/mode`
Set data source mode

**Body:**
```json
{
  "mode": "mixed"
}
```

### POST `/api/data-sources/:sourceName/disable`
Disable a specific source

**Body:**
```json
{
  "durationMs": 60000
}
```

### POST `/api/data-sources/:sourceName/enable`
Enable a specific source

### GET `/api/data-sources/test`
Test all modes

## Configuration Options

### Timeout Settings

Default timeout is 5 seconds. Customize per request:

```typescript
const result = await unifiedDataSourceManager.fetchMarketData(
  { symbol: 'BTC' },
  { timeout: 10000 } // 10 seconds
);
```

### Cache Settings

Control caching behavior:

```typescript
const result = await unifiedDataSourceManager.fetchMarketData(
  { symbol: 'BTC' },
  { 
    cacheEnabled: true,  // Enable cache
    fallbackEnabled: true // Use cache as last resort
  }
);
```

### Health Check Settings

Customize in `UnifiedDataSourceManager.ts`:

```typescript
private readonly MAX_CONSECUTIVE_FAILURES = 3;
private readonly FAILURE_COOLDOWN_MS = 60000; // 1 minute
private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
```

## Best Practices

### 1. Always Enable Fallback

```typescript
// ✅ Good
const result = await manager.fetchMarketData(
  { symbol: 'BTC' },
  { fallbackEnabled: true, cacheEnabled: true }
);

// ❌ Bad - no resilience
const result = await manager.fetchMarketData(
  { symbol: 'BTC' },
  { fallbackEnabled: false }
);
```

### 2. Use Mixed Mode for Critical Data

```typescript
// For critical operations, use mixed mode
manager.setMode('mixed');
const result = await manager.fetchMarketData({ symbol: 'BTC' });
```

### 3. Monitor Health Regularly

```typescript
// Check health periodically
setInterval(() => {
  const stats = manager.getStats();
  if (stats.healthySources < stats.totalSources * 0.5) {
    console.warn('More than 50% of sources are unhealthy!');
  }
}, 60000);
```

### 4. Handle Notifications

```typescript
manager.on('notification', (notification) => {
  // Log to monitoring system
  logger.warn('Data source event', notification);
  
  // Show to user if critical
  if (notification.type === 'error') {
    showToast(notification.message);
  }
});
```

### 5. Implement Retry Logic for Critical Operations

```typescript
async function fetchWithRetry(symbol: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await manager.fetchMarketData({ symbol });
    if (result.success) return result;
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
  }
  
  throw new Error('Failed after retries');
}
```

## Troubleshooting

### Issue: All sources failing

**Solution:**
1. Check network connectivity
2. Verify API keys in `config/providers_config.json`
3. Check if sources are temporarily disabled
4. Review health status: `GET /api/data-sources/health`

### Issue: Slow response times

**Solution:**
1. Use mixed mode for parallel fetching
2. Reduce timeout for faster failover
3. Enable caching
4. Check source response times in stats

### Issue: Cache not working

**Solution:**
1. Verify database tables are created
2. Check cache is enabled in requests
3. Review cache TTL settings

### Issue: Notifications not appearing

**Solution:**
1. Verify WebSocket/EventSource connection
2. Check notification component is mounted
3. Enable notifications in UI

## Performance Optimization

### 1. Batch Requests

```typescript
// Instead of sequential requests
const symbols = ['BTC', 'ETH', 'ADA'];
const results = await Promise.all(
  symbols.map(symbol => manager.fetchMarketData({ symbol }))
);
```

### 2. Use Cache Aggressively

```typescript
// For non-critical data, use cache with longer TTL
const result = await manager.fetchMarketData(
  { symbol: 'BTC' },
  { cacheEnabled: true }
);
```

### 3. Optimize Timeouts

```typescript
// Use shorter timeouts for non-critical data
const result = await manager.fetchMarketData(
  { symbol: 'BTC' },
  { timeout: 2000 } // Fail fast
);
```

## Security Considerations

1. **API Keys**: Store in environment variables or secure config
2. **Rate Limiting**: Respect provider rate limits
3. **Input Validation**: Sanitize all user inputs
4. **Error Messages**: Don't expose sensitive information

## Testing

Run the test suite:

```bash
npm test src/services/__tests__/UnifiedDataSourceManager.test.ts
```

## Support

For issues or questions:
1. Check the logs: `/api/data-sources/stats`
2. Review health status: `/api/data-sources/health`
3. Test individual modes: `/api/data-sources/test`

## Changelog

### Version 1.0.0
- Initial implementation
- Primary/fallback source management
- Timeout-based switching (5 seconds)
- Database caching
- Failure tracking
- Mixed mode support
- HuggingFace integration
- UI components
- Real-time notifications
