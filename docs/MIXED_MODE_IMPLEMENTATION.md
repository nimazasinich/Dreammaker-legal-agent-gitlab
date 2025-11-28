# Mixed Mode Data Fetching Implementation

## Overview

This document describes the implementation of the Mixed Mode data fetching architecture. The system operates without WebSocket connections, completely excludes Binance and KuCoin, and uses HuggingFace as the primary data source with fallback mechanisms.

## Architecture

### Key Principles

1. **NO WebSocket** - All data fetching uses HTTP(S) API calls
2. **NO Binance/KuCoin** - Completely removed from the system
3. **HuggingFace Primary** - HuggingFace is the primary data source
4. **Fallback Sources** - CoinGecko, CryptoCompare, CoinPaprika, CoinCap
5. **On-Demand Requests** - API calls only made when data is needed
6. **TTL-Based Caching** - Reduces unnecessary API calls

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  MixedModeDataService                         │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  1. Check Cache (TTL-based)                             ││
│  │  2. If miss → Try HuggingFace (Primary)                 ││
│  │  3. If HF fails → Try CoinGecko (Fallback 1)           ││
│  │  4. If CG fails → Try CryptoCompare (Fallback 2)       ││
│  │  5. If all fail → Return stale cache data              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      UI Components                            │
│  - DataSourceIndicator shows current source                  │
│  - Status shows fresh/cached/stale/fallback/error           │
└─────────────────────────────────────────────────────────────┘
```

## Files Changed/Created

### New Files

1. **`src/services/MixedModeDataService.ts`**
   - Main service implementing Mixed Mode data fetching
   - Handles primary + fallback source management
   - TTL-based caching
   - Health tracking per source
   - HTTP polling for real-time updates

2. **`src/hooks/useMixedModeData.ts`**
   - React hook for easy access to Mixed Mode data
   - `useMixedModeData` - fetch multiple symbols
   - `useMixedModeSymbol` - fetch single symbol
   - `useMixedModeHealth` - monitor source health

3. **`src/components/data-sources/DataSourceIndicator.tsx`**
   - UI component showing current data source
   - Displays source status (fresh/cached/stale)
   - Refresh button
   - Badge, compact, and detailed variants

4. **`src/services/__tests__/MixedModeDataService.test.ts`**
   - 22 tests covering all functionality
   - Tests for configuration, health tracking, caching
   - Tests confirming NO Binance/KuCoin/WebSocket

### Modified Files

1. **`src/config/dataSource.ts`**
   - Removed Binance/KuCoin from DataSourceType
   - Added fallback sources configuration
   - Added cache and polling configuration
   - New exports: `isFallbackSourceEnabled`, `isMixedMode`, etc.

2. **`src/config/ws.ts`**
   - WebSocket disabled by default
   - Added polling configuration
   - `USE_LASTCHANCE_WS = false`
   - `POLLING_ENABLED = true`

3. **`src/config/fallback.config.json`**
   - Removed binance from fallback order
   - Added cryptocompare, coinpaprika, coincap
   - Added mixedMode configuration section

4. **`src/components/LiveDataContext.tsx`**
   - Replaced WebSocket with HTTP polling
   - Uses MixedModeDataService
   - New context values: `currentDataSource`, `dataSourceStatus`, `refreshData`

5. **`src/services/UnifiedDataSourceManager.ts`**
   - Removed BinanceService import/usage
   - Updated fetchMarketData to use HuggingFace + fallbacks

6. **`src/controllers/MarketDataController.ts`**
   - Replaced BinanceService with MixedModeDataService
   - Updated price fetching endpoints

7. **`src/controllers/SystemController.ts`**
   - Removed Binance health checks
   - Added MixedMode fallback source health checks
   - Deprecated KuCoin health check

8. **`src/monitoring/HealthCheckService.ts`**
   - Renamed `binance` to `dataSource` in health status
   - Uses MixedModeDataService for health checks

9. **`src/views/HealthView.tsx`**
   - Updated to show `dataSource` instead of `binance`
   - Display "Data Source (HF + Fallbacks)"

10. **`src/services/BinanceService.ts`**
    - Marked as deprecated
    - Returns dummy data only
    - Documentation points to MixedModeDataService

11. **`config/exchanges.json`**
    - Marked as disabled
    - Documents that Binance/KuCoin are not supported

## Configuration

### Environment Variables

```env
# Primary data source (huggingface or mixed)
PRIMARY_DATA_SOURCE=mixed

# HuggingFace configuration
HF_ENGINE_ENABLED=true
HF_ENGINE_BASE_URL=/api/hf-engine
HF_ENGINE_TIMEOUT=30000

# Fallback sources (all enabled by default)
COINGECKO_ENABLED=true
CRYPTOCOMPARE_ENABLED=true
COINPAPRIKA_ENABLED=true
COINCAP_ENABLED=true

# Cache configuration
DATA_CACHE_ENABLED=true
DATA_CACHE_TTL_MS=60000

# Polling configuration (replaces WebSocket)
POLLING_ENABLED=true
POLLING_INTERVAL_MS=30000
```

### Cache TTL Settings

| Data Type | TTL |
|-----------|-----|
| Market Data | 60 seconds |
| Sentiment | 5 minutes |
| News | 10 minutes |
| Predictions | 3 minutes |

## Usage Examples

### Using the React Hook

```typescript
import { useMixedModeData, useMixedModeSymbol } from '../hooks/useMixedModeData';

// Fetch multiple symbols
function MarketOverview() {
  const { data, isLoading, source, status, refresh } = useMixedModeData({
    symbols: ['BTC', 'ETH', 'SOL'],
    enablePolling: true,
    pollingInterval: 30000
  });

  return (
    <div>
      <p>Data from: {source} ({status})</p>
      {data.map(price => (
        <div key={price.symbol}>
          {price.symbol}: ${price.price.toFixed(2)}
        </div>
      ))}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}

// Fetch single symbol
function BTCPrice() {
  const { price, source, status } = useMixedModeSymbol('BTC');
  
  return (
    <div>
      BTC: ${price?.price.toFixed(2)} from {source}
    </div>
  );
}
```

### Using the Service Directly

```typescript
import { mixedModeDataService } from '../services/MixedModeDataService';

// Fetch market data
const result = await mixedModeDataService.fetchMarketData('BTC');
if (result.success) {
  console.log(`Price: ${result.data.price} from ${result.source}`);
  console.log(`Status: ${result.status}, Fallback used: ${result.fallbackUsed}`);
}

// Start polling
const stopPolling = mixedModeDataService.startPolling(
  ['BTC', 'ETH'],
  (prices) => console.log('Updated:', prices),
  30000
);

// Stop polling later
stopPolling();
```

### Using the DataSourceIndicator Component

```tsx
import { DataSourceIndicator } from '../components/data-sources/DataSourceIndicator';

// Badge variant (minimal)
<DataSourceIndicator variant="badge" />

// Compact variant (with refresh button)
<DataSourceIndicator variant="compact" showRefreshButton />

// Detailed variant (full status)
<DataSourceIndicator variant="detailed" />
```

## Testing

Run the Mixed Mode tests:

```bash
npm test MixedMode
```

All 22 tests should pass, covering:
- Configuration with HuggingFace as primary
- Fallback sources configured
- NO Binance/KuCoin references
- NO WebSocket usage
- Cache management
- Source health tracking
- Polling functionality

## Error Handling

The system gracefully handles failures:

1. **Primary Source Fails** → Automatically tries fallback sources
2. **All Sources Fail** → Returns stale cached data if available
3. **Complete Failure** → Returns error with details
4. **Source Disabled** → Automatically re-enabled after cooldown (60s)

## Notifications

The system emits notifications for important events:

- `warning` - Primary source failed, using fallback
- `error` - All sources failed
- `success` - Source re-enabled after cooldown
- `info` - Mode/configuration changes

Subscribe to notifications:

```typescript
const unsubscribe = mixedModeDataService.onNotification((notification) => {
  console.log(`[${notification.type}] ${notification.message}`);
});
```

## Removed Features

The following features are **intentionally removed**:

1. **WebSocket connections** - Replaced with HTTP polling
2. **Binance API** - Completely excluded
3. **KuCoin API** - Completely excluded
4. **Real-time streaming** - Replaced with polling intervals

## Migration Notes

If migrating from the old architecture:

1. Replace `BinanceService` imports with `MixedModeDataService`
2. Replace WebSocket subscriptions with polling
3. Update health checks to use `dataSource` instead of `binance`
4. Use new `useMixedModeData` hook for React components
5. Update UI to show data source indicator

## Future Improvements

Potential enhancements:

1. Add more fallback sources (Kraken, Coinbase, etc.)
2. Implement request batching for efficiency
3. Add data quality scoring
4. Implement adaptive polling intervals
5. Add source preference learning
