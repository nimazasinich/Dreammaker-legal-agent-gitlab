# Provider Diagnostics System

This document describes the Provider Diagnostics System implemented as part of the HuggingFace Integration Completion phase.

## Overview

The Provider Diagnostics System provides comprehensive monitoring and diagnostic capabilities for all data providers in the system (HuggingFace, Binance, and KuCoin). It tracks:

- **Latency**: Response times and performance metrics
- **Recovery**: Success/failure rates and uptime statistics
- **Errors**: Error logging and tracking

## Architecture

### Core Components

#### 1. Diagnostics Tracking Utilities

Located in `src/core/`, these utilities track provider performance:

##### `providerLatencyTracker.ts`
- Tracks response times for each provider
- Maintains last 100 samples per provider
- Calculates avg, min, max, and last latency
- Provides `measure()` utility for automatic latency tracking

##### `providerRecoveryTracker.ts`
- Tracks success/failure rates
- Monitors consecutive failures
- Determines provider health status (healthy after 3+ consecutive failures)
- Records last success/failure timestamps

##### `providerErrorLog.ts`
- Stores last 20 errors per provider
- Logs error details (message, endpoint, status code)
- Tracks recent errors (last 5 minutes)
- Provides error statistics

#### 2. HuggingFace Adapters

Located in `src/services/hf/`, these adapters wrap the HF Data Engine Client and provide:

- Consistent error handling format
- Automatic diagnostics tracking
- Fallback support for mixed mode

**Available Adapters:**

- **HFMarketAdapter**: Market data (prices, OHLCV, candlesticks)
- **HFAnalysisAdapter**: Analysis services (sentiment)
- **HFSignalsAdapter**: Trading signals (placeholder)
- **HFProxyAdapter**: External data proxies (placeholder)
- **HFHealthAdapter**: System health checks

##### Error Response Format

All adapters return a consistent error format:

```typescript
{
  ok: false,
  provider: string,
  status: number,
  reason: string,
  message: string,
  endpoint?: string
}
```

##### Success Response Format

```typescript
{
  ok: true,
  provider: string,
  data: T,
  timestamp: string
}
```

#### 3. Diagnostics Route

**Endpoint:** `GET /diagnostics`

Returns comprehensive diagnostics for all providers:

```json
{
  "timestamp": "2025-11-14T18:30:00.000Z",
  "primarySource": "huggingface",
  "providers": {
    "huggingface": {
      "provider": "huggingface",
      "latency": {
        "avg": 245,
        "min": 120,
        "max": 580,
        "last": 230
      },
      "recovery": {
        "uptime": 98.5,
        "successRate": 98.5,
        "failureRate": 1.5,
        "isHealthy": true,
        "consecutiveFailures": 0,
        "lastStatus": "success"
      },
      "errors": {
        "totalErrors": 3,
        "lastError": {
          "timestamp": "2025-11-14T18:25:00.000Z",
          "message": "Timeout",
          "endpoint": "/api/crypto/prices/top",
          "statusCode": 503
        },
        "recentErrors": 1
      },
      "lastSuccessTime": "2025-11-14T18:29:45.000Z",
      "lastFailureTime": "2025-11-14T18:25:00.000Z"
    },
    "binance": { /* ... */ },
    "kucoin": { /* ... */ }
  },
  "summary": {
    "totalRequests": 1250,
    "healthyProviders": 2,
    "degradedProviders": 0,
    "unhealthyProviders": 1
  }
}
```

**Additional Endpoints:**

- `GET /diagnostics/:provider` - Get diagnostics for a specific provider
- `POST /diagnostics/clear` - Clear all diagnostics data
- `POST /diagnostics/clear/:provider` - Clear diagnostics for a specific provider

#### 4. DiagnosticsView Component

Located in `src/views/DiagnosticsView.tsx`

**Features:**
- Real-time provider status display
- Latency metrics visualization
- Recovery statistics
- Error history
- Manual refresh button
- Health badges (Healthy, Degraded, Unhealthy)

**Access:** Navigate to the 'diagnostics' view in the application.

## How Adapters Work

### Request Flow

1. **Route receives request** (e.g., `/market/candlestick/BTCUSDT`)
2. **Check PRIMARY_DATA_SOURCE** configuration
3. **If HuggingFace or mixed:**
   - Call appropriate HF adapter method
   - Adapter wraps request with `providerLatencyTracker.measure()`
   - On success: Record success with `providerRecoveryTracker`
   - On failure: Log error with `providerErrorLog` and record failure
4. **If mixed mode and HF fails:** Fall back to Binance/KuCoin
5. **Return response** to client

### Example: Market Candlestick Request

```typescript
// Route handler
app.get('/market/candlestick/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const { interval = '1h', limit = '200' } = req.query;

  const { getPrimarySource } = await import('./config/dataSource.js');
  const { hfMarketAdapter } = await import('./services/hf/HFMarketAdapter.js');
  const primarySource = getPrimarySource();

  if (primarySource === 'huggingface' || primarySource === 'mixed') {
    const hfResult = await hfMarketAdapter.getCandlestick(
      symbol,
      String(interval),
      Number(limit)
    );

    if (hfResult.ok) {
      // Return HF data
      return res.json(hfResult.data);
    } else if (primarySource === 'huggingface') {
      // Return error if HF is the only source
      return res.status(hfResult.status).json({
        ok: false,
        provider: hfResult.provider,
        reason: hfResult.reason,
        error: hfResult.message
      });
    }
    // Fall through to fallback in mixed mode
  }

  // Fallback: database cache or mock data
  // ...
});
```

## Backend Fallback Logic

The system supports three data source modes:

### 1. HuggingFace Mode (`PRIMARY_DATA_SOURCE=huggingface`)

- **ALL** requests go through HF adapters
- Failures return error responses immediately
- No fallback to other providers

### 2. Mixed Mode (`PRIMARY_DATA_SOURCE=mixed`)

- Try HuggingFace first
- On failure, fall back to Binance/KuCoin or database cache
- Provides best reliability

### 3. Binance/KuCoin Mode (`PRIMARY_DATA_SOURCE=binance|kucoin`)

- Uses exchange APIs directly
- HF adapters are bypassed
- Legacy behavior maintained

## Configuration

### Environment Variables

```bash
# Primary data source
PRIMARY_DATA_SOURCE=huggingface  # or: binance, kucoin, mixed

# HuggingFace Data Engine settings
HF_ENGINE_ENABLED=true
HF_ENGINE_BASE_URL=http://localhost:8000
HF_ENGINE_TIMEOUT=30000
```

### Runtime Configuration

```typescript
import { setPrimarySource } from './config/dataSource.js';

// Switch to mixed mode at runtime
setPrimarySource('mixed');
```

## Diagnostics Endpoint Structure

### GET /diagnostics

Returns full diagnostics for all providers.

**Response Schema:**

```typescript
interface DiagnosticsResponse {
  timestamp: string;
  primarySource: string;
  providers: {
    [provider: string]: ProviderDiagnostics;
  };
  summary: {
    totalRequests: number;
    healthyProviders: number;
    degradedProviders: number;
    unhealthyProviders: number;
  };
}

interface ProviderDiagnostics {
  provider: string;
  latency: {
    avg: number;
    min: number;
    max: number;
    last: number;
  };
  recovery: {
    uptime: number;
    successRate: number;
    failureRate: number;
    isHealthy: boolean;
    consecutiveFailures: number;
    lastStatus: string;
  };
  errors: {
    totalErrors: number;
    lastError?: ProviderError;
    recentErrors: number;
  };
  lastSuccessTime?: string;
  lastFailureTime?: string;
}
```

## Provider Health Determination

A provider is considered:

- **Healthy**: `consecutiveFailures < 3`
- **Degraded**: `3 <= consecutiveFailures < 10`
- **Unhealthy**: `consecutiveFailures >= 10`

## Integration Points

### Adding HF Support to New Routes

1. Import the appropriate adapter:
   ```typescript
   import { hfMarketAdapter } from './services/hf/HFMarketAdapter.js';
   ```

2. Check primary source and call adapter:
   ```typescript
   const primarySource = getPrimarySource();
   if (primarySource === 'huggingface' || primarySource === 'mixed') {
     const result = await hfMarketAdapter.someMethod(...);
     if (result.ok) {
       return res.json(result.data);
     }
   }
   ```

3. Implement fallback logic for mixed mode

### Creating New Adapters

Follow the pattern in existing adapters:

```typescript
export class HFNewAdapter {
  private static instance: HFNewAdapter;
  private logger = Logger.getInstance();
  private hfClient: HFDataEngineClient;

  private constructor() {
    this.hfClient = HFDataEngineClient.getInstance();
  }

  static getInstance(): HFNewAdapter {
    if (!HFNewAdapter.instance) {
      HFNewAdapter.instance = new HFNewAdapter();
    }
    return HFNewAdapter.instance;
  }

  async someMethod(): Promise<AdapterResponse<T>> {
    const endpoint = '/api/some/endpoint';

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.someMethod();
      });

      if (HFDataEngineClient.isError(result)) {
        providerRecoveryTracker.recordFailure('huggingface');
        providerErrorLog.logError('huggingface', result.message, endpoint, result.status);
        return this.createError(endpoint, result.message, result.status);
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      providerErrorLog.logError('huggingface', error.message, endpoint);
      return this.createError(endpoint, error.message);
    }
  }
}
```

## Monitoring and Debugging

### Viewing Diagnostics

1. **Frontend**: Navigate to the Diagnostics view in the application UI
2. **API**: Query `GET /diagnostics` endpoint directly

### Clearing Diagnostics

```bash
# Clear all diagnostics
curl -X POST http://localhost:8000/diagnostics/clear

# Clear specific provider
curl -X POST http://localhost:8000/diagnostics/clear/huggingface
```

### Logs

All adapter operations are logged using the Logger service:

```typescript
logger.info('HF Market Adapter initialized');
logger.debug('HF failed in mixed mode, falling back', { symbol });
logger.error('Failed to fetch candlestick data', { symbol, interval }, error);
```

## Performance Considerations

- **Memory**: Each provider stores last 100 latency samples and 20 errors
- **CPU**: Minimal overhead from tracking (< 1ms per request)
- **Network**: Diagnostics endpoint is lightweight (< 5KB typical response)

## Future Enhancements

Potential improvements to the diagnostics system:

1. **Persistent Storage**: Save diagnostics to database for historical analysis
2. **Alerting**: Automatic alerts when providers become unhealthy
3. **Metrics Dashboard**: Enhanced visualization with charts and graphs
4. **Export**: Export diagnostics data to CSV/JSON
5. **Comparison**: Side-by-side provider comparison
6. **Thresholds**: Configurable health thresholds per provider
7. **Auto-Recovery**: Automatic provider switching on failure

## Troubleshooting

### Provider Showing as Unhealthy

1. Check if the provider service is running
2. Review error logs in DiagnosticsView
3. Verify network connectivity
4. Check provider API rate limits
5. Clear diagnostics and re-test: `POST /diagnostics/clear/:provider`

### High Latency

1. Check network conditions
2. Verify provider API status
3. Review OHLCV cache settings
4. Consider using mixed mode for redundancy

### Missing Diagnostics Data

1. Ensure routes are using the adapters
2. Verify PRIMARY_DATA_SOURCE configuration
3. Check that requests are being made to the provider
4. Review server logs for errors

## Related Files

### Core Utilities
- `src/core/providerLatencyTracker.ts`
- `src/core/providerRecoveryTracker.ts`
- `src/core/providerErrorLog.ts`

### Adapters
- `src/services/hf/HFMarketAdapter.ts`
- `src/services/hf/HFAnalysisAdapter.ts`
- `src/services/hf/HFSignalsAdapter.ts`
- `src/services/hf/HFProxyAdapter.ts`
- `src/services/hf/HFHealthAdapter.ts`

### Routes
- `src/routes/diagnosticsRoute.ts`
- `src/server.ts` (route registration)

### Frontend
- `src/views/DiagnosticsView.tsx`
- `src/App.tsx` (route configuration)

### Configuration
- `src/config/dataSource.ts`

## Support

For issues or questions about the Provider Diagnostics System:

1. Check this documentation
2. Review the source code comments
3. Check application logs
4. Open an issue in the project repository
