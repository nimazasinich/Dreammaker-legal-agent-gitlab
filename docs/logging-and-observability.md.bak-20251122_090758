# Logging and Observability

**Last Updated:** 2025-11-16  
**Purpose:** Document logging practices and observability guidelines for production

This document describes the logging infrastructure, what gets logged, and best practices for maintaining observability in production.

---

## Table of Contents

1. [Logging Infrastructure](#logging-infrastructure)
2. [Log Levels](#log-levels)
3. [What Gets Logged](#what-gets-logged)
4. [Security: What NOT to Log](#security-what-not-to-log)
5. [Log Categories](#log-categories)
6. [Observability Endpoints](#observability-endpoints)
7. [Production Guidelines](#production-guidelines)
8. [Troubleshooting with Logs](#troubleshooting-with-logs)

---

## Logging Infrastructure

### Logger Implementation

The application uses a centralized `Logger` class (`src/core/Logger.ts`) that:

- Works in both **browser** (frontend) and **Node.js** (backend) environments
- Outputs to console (always)
- Maintains an in-memory buffer for recent logs
- Supports structured logging with context objects
- Uses correlation IDs for request tracing

### Log Outputs

**Backend (Node.js):**
- `stdout` (captured by deployment platform or systemd)
- In-memory buffer (recent 1000 entries)
- Can be extended to file or external logging service

**Frontend (Browser):**
- Browser console
- In-memory buffer (recent 1000 entries)
- Accessible via `Logger.getInstance().getLogs()`

---

## Log Levels

The logger uses five levels (from least to most severe):

| Level | Value | Usage | Production? |
|-------|-------|-------|-------------|
| `DEBUG` | 0 | Detailed debugging information | ❌ No (too verbose) |
| `INFO` | 1 | General informational messages | ✅ Yes (sparingly) |
| `WARN` | 2 | Warning conditions that should be investigated | ✅ Yes |
| `ERROR` | 3 | Error conditions that affect functionality | ✅ Yes |
| `CRITICAL` | 4 | Critical failures requiring immediate attention | ✅ Yes |

### Setting Log Level

**Environment Variable:**
```bash
# In .env or environment
VITE_LOG_LEVEL=warn  # For production
VITE_LOG_LEVEL=info  # For staging
VITE_LOG_LEVEL=debug # For development only
```

**Programmatically:**
```typescript
import { Logger, LogLevel } from './core/Logger';

const logger = Logger.getInstance();
logger.setLevel(LogLevel.WARN); // Set to warn or higher in production
```

**Recommendation:**
- **Development:** `debug` or `info`
- **Staging:** `info`
- **Production:** `warn` (to reduce log volume and noise)

---

## What Gets Logged

### Application Startup

```
[INFO] Data policy validated successfully
[INFO] All exchange services initialized (Binance + KuCoin)
[INFO] HF Market Adapter initialized
[INFO] Server running on port 8001
```

### Data Fetching

```
[INFO] Fetching prices for symbols: BTC,ETH,SOL
[INFO] ✅ CoinGecko succeeded in 324ms
[WARN] ⚠️ HF Data Engine unavailable: Connection timeout
```

### Trading Operations

```
[INFO] Order placed: BUY 0.001 BTC @ MARKET (DRY_RUN)
[WARN] RiskGuard rejected order: Leverage exceeds limit
[ERROR] Failed to place order on KuCoin: Invalid API credentials
```

### WebSocket Events

```
[INFO] ✅ WebSocket connected successfully
[WARN] WebSocket connection lost (server may be down)
[INFO] Scheduling WebSocket reconnection attempt 2/5 in 2000ms
```

### Errors and Failures

```
[ERROR] Failed to get positions from KuCoin: { ... }
[ERROR] All price sources failed for symbols: BTC, ETH
[CRITICAL] Data policy violation: Mock data used in online mode
```

---

## Security: What NOT to Log

**CRITICAL:** Never log sensitive data to prevent leaks in production logs.

### ❌ NEVER Log

- **API Keys:** `VITE_KUCOIN_API_KEY`, `VITE_HF_ENGINE_API_KEY`, etc.
- **API Secrets:** `VITE_KUCOIN_API_SECRET`
- **Passphrases:** `VITE_KUCOIN_API_PASSPHRASE`
- **Passwords:** Any user or system passwords
- **Auth Tokens:** JWT tokens, OAuth tokens, session tokens
- **Private Keys:** Cryptographic keys of any kind
- **Credit Card Numbers:** PCI-DSS compliance requirement
- **Personal Identifiable Information (PII):** Email addresses, phone numbers, addresses

### ✅ Safe to Log

- **Masked Credentials:** `"API key configured (40 chars)"` instead of actual key
- **Request IDs / Correlation IDs:** For tracing
- **Symbol / Asset Names:** `BTC`, `ETHUSDT`
- **Order IDs:** Exchange-provided order identifiers (not secrets)
- **Status Codes:** HTTP response codes, error codes
- **Timestamps:** Always safe
- **Configuration Values (non-secret):** `APP_MODE=online`, `TRADING_MODE=TESTNET`

### Example: Safe Credential Logging

**❌ BAD:**
```typescript
logger.info('API key configured', { apiKey: process.env.KUCOIN_API_KEY });
// NEVER DO THIS - Exposes secret in logs
```

**✅ GOOD:**
```typescript
const hasKey = !!process.env.KUCOIN_API_KEY;
const keyLength = hasKey ? process.env.KUCOIN_API_KEY.length : 0;
logger.info('API key status', { configured: hasKey, length: keyLength });
// Safe - Only logs metadata, not the actual secret
```

---

## Log Categories

### 1. Data Fetching & Market Data

**Sources:**
- `MultiProviderMarketDataService.ts`
- `RealDataManager.ts`
- `HFMarketAdapter.ts`

**Typical Logs:**
- Provider failures and fallbacks
- Cache hits/misses
- Data source switches

**Example:**
```
[INFO] Fetching prices for symbols: BTC,ETH
[WARN] ❌ CoinGecko: 429 Too Many Requests
[INFO] ✅ CoinCap succeeded in 521ms
```

---

### 2. Trading Operations

**Sources:**
- `TradeEngine.ts`
- `RiskGuard.ts`
- `KuCoinFuturesService.ts`

**Typical Logs:**
- Order placement (success/failure)
- Risk guard checks
- Position updates

**Example:**
```
[INFO] RiskGuard: Order approved (risk score: 0.34)
[ERROR] KuCoin order placement error: Insufficient balance
```

---

### 3. WebSocket & Real-time

**Sources:**
- `WebSocketManager.ts`
- `LiveDataContext.tsx`
- `futuresChannel.ts`

**Typical Logs:**
- Connection/disconnection events
- Reconnection attempts
- Message processing errors

**Example:**
```
[INFO] ✅ WebSocket connected successfully
[WARN] WebSocket connection lost (server may be down)
[INFO] Scheduling WebSocket reconnection attempt 3/5 in 4000ms
```

---

### 4. Strategy Pipeline

**Sources:**
- `SignalGeneratorService.ts`
- `AdaptiveScoringEngine.ts`
- `StrategyPipelineController.ts`

**Typical Logs:**
- Signal generation
- Strategy evaluation
- Scoring updates

**Example:**
```
[INFO] Strategy pipeline generated 5 signals
[DEBUG] Signal score calculated: BTC=0.78, ETH=0.65
```

---

### 5. System Health

**Sources:**
- `HealthCheckService.ts`
- `SystemController.ts`
- `server/health.ts`

**Typical Logs:**
- Service health checks
- Dependency status
- System metrics

**Example:**
```
[INFO] Health check: All services operational
[WARN] HF Engine health check failed: Connection timeout
```

---

## Observability Endpoints

### Health Check

**Endpoint:** `GET /api/health`

**Purpose:** Quick health check for uptime monitoring

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T12:34:56.789Z",
  "uptime": 123456
}
```

---

### System Diagnostics

**Endpoint:** `GET /api/system/diagnostics`

**Purpose:** Detailed system status and diagnostics

**Response:**
```json
{
  "status": "healthy",
  "services": {
    "hfEngine": "connected",
    "kucoin": "connected",
    "websocket": "active"
  },
  "config": {
    "appMode": "online",
    "tradingMode": "TESTNET"
  }
}
```

---

### Metrics (Prometheus-compatible)

**Endpoint:** `GET /api/metrics`

**Purpose:** Prometheus-compatible metrics for monitoring

**Response:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/api/prices"} 1234

# HELP websocket_connections Active WebSocket connections
# TYPE websocket_connections gauge
websocket_connections 5
```

---

## Production Guidelines

### 1. Log Level Configuration

**Set appropriate log level:**

```bash
# Production
VITE_LOG_LEVEL=warn

# Staging
VITE_LOG_LEVEL=info

# Development
VITE_LOG_LEVEL=debug
```

**Why `warn` for production:**
- Reduces log volume (saves storage and costs)
- Focuses on actionable issues
- Still captures errors and warnings

---

### 2. Log Rotation

**If logging to files (backend):**

- Rotate logs daily or when reaching size limit (e.g., 100MB)
- Keep last 7-14 days of logs
- Compress older logs
- Use tools like `logrotate` or built-in platform features

**Example (logrotate config):**
```
/var/log/dreammaker/*.log {
  daily
  rotate 14
  compress
  delaycompress
  missingok
  notifempty
}
```

---

### 3. Log Aggregation

**For production deployments, consider:**

- **Cloud platforms:** Use built-in logging (Vercel Logs, Railway Logs, etc.)
- **Self-hosted:** Use tools like:
  - **ELK Stack** (Elasticsearch, Logstash, Kibana)
  - **Loki** (Grafana Loki)
  - **Datadog**, **New Relic**, **Sentry** (commercial)

**Benefits:**
- Centralized log viewing
- Search and filtering
- Alerts on error patterns
- Long-term retention

---

### 4. Performance Considerations

**Avoid logging in tight loops:**

❌ **BAD:**
```typescript
for (const price of prices) {
  logger.debug('Processing price', { symbol: price.symbol }); // Too verbose
}
```

✅ **GOOD:**
```typescript
logger.info('Processing prices', { count: prices.length });
// Log summary, not individual items
```

**Use appropriate log levels:**
- Don't use `info` for high-frequency events in production
- Reserve `debug` for development only

---

### 5. Monitoring and Alerts

**Set up alerts for:**

| Log Pattern | Alert Level | Action |
|-------------|-------------|--------|
| `[CRITICAL]` | Immediate | Page on-call engineer |
| `[ERROR]` rate spike | High | Investigate within 15 min |
| `[WARN]` sustained | Medium | Review within 1 hour |
| WebSocket reconnect loop | Medium | Check backend health |
| HF Engine unavailable | High | Verify data source |
| KuCoin API errors | High | Check credentials/quota |

---

## Troubleshooting with Logs

### Common Log Patterns and Solutions

#### Pattern: "Primary data source unavailable"

**Logs:**
```
[ERROR] Primary data source unavailable: Unable to fetch price data for BTC
[ERROR] All data providers failed
```

**Diagnosis:**
- HF Data Engine is down or unreachable
- All fallback providers also failed

**Solution:**
1. Check `VITE_HF_ENGINE_URL` configuration
2. Verify network connectivity to HF Engine
3. Test HF Engine health: `curl $HF_ENGINE_URL/health`
4. Check if HF Engine is running

---

#### Pattern: "KuCoin Futures API error: Invalid credentials"

**Logs:**
```
[ERROR] Failed to get positions from KuCoin: Invalid KuCoin API credentials
```

**Diagnosis:**
- API key, secret, or passphrase is incorrect or missing

**Solution:**
1. Navigate to Exchange Settings view
2. Re-enter KuCoin Futures credentials
3. Ensure credentials are for **testnet** if `VITE_KUCOIN_TESTNET=true`
4. Verify API key has "Futures Trading" permission

---

#### Pattern: "WebSocket connection lost"

**Logs:**
```
[WARN] WebSocket connection lost (server may be down)
[INFO] Scheduling WebSocket reconnection attempt 1/5 in 1000ms
```

**Diagnosis:**
- Backend WebSocket server is not running
- Network issue between frontend and backend

**Solution:**
1. Check if backend is running (`npm run dev:server`)
2. Verify backend port matches frontend config
3. Check firewall rules if deployed
4. If backend is up, wait for automatic reconnection

---

#### Pattern: "Rate limit exceeded"

**Logs:**
```
[WARN] KuCoin API error: Rate limit exceeded
```

**Diagnosis:**
- Too many API requests in short period

**Solution:**
1. Wait 1-2 minutes before retrying
2. Reduce polling frequency if applicable
3. Check if multiple instances are running (duplicate requests)

---

## Best Practices Summary

✅ **DO:**
- Use appropriate log levels (`warn` or higher in production)
- Log structured context (symbol, mode, market)
- Mask or omit sensitive data (keys, secrets, tokens)
- Log errors with enough context to diagnose
- Use correlation IDs for tracing requests
- Monitor critical error patterns

❌ **DON'T:**
- Log API keys, secrets, passwords, or tokens
- Log at `debug` level in production (too verbose)
- Log in tight loops (performance impact)
- Log PII (email, phone, address) without redaction
- Ignore log volume (can cause storage/cost issues)
- Log raw error objects with sensitive data

---

## Related Documentation

- [Production Environment Config](./production-env-config.md) - Environment variables
- [Production Smoke Test Plan](./PRODUCTION_SMOKE_TEST_PLAN.md) - Testing procedures
- [Data Flow](./data-flow.md) - System data flow
- [HF Engine Scope](./hf-engine-scope.md) - HF Engine integration

---

## Future Improvements

**Potential enhancements:**

1. **Structured Logging:** Use JSON format for all logs (easier to parse)
2. **Log Sampling:** Sample high-frequency logs (e.g., 1% of debug logs)
3. **Distributed Tracing:** Implement OpenTelemetry for full request tracing
4. **Error Tracking:** Integrate Sentry or similar for error aggregation
5. **Custom Dashboards:** Build Grafana dashboards for key metrics
6. **Log Retention Policies:** Implement tiered retention (7d hot, 30d warm, 90d archive)

---

**Key Takeaway:** Production logging must balance visibility (for debugging) with performance, security, and cost. Use `warn` level in production, never log secrets, and monitor critical error patterns.
