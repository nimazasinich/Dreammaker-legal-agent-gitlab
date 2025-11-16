# Logging and Observability Guide

**Last Updated:** 2025-11-16  
**Purpose:** Document logging practices, observability features, and guidelines for production

---

## Overview

The application uses a centralized logging system (`src/core/Logger.ts`) that works in both browser and Node.js environments. Logs are written to console (stdout) and stored in an in-memory buffer for retrieval.

---

## Logging Levels

The application uses the following log levels (from most verbose to least):

1. **DEBUG** (0) - Detailed diagnostic information
2. **INFO** (1) - General informational messages
3. **WARN** (2) - Warning messages for potentially harmful situations
4. **ERROR** (3) - Error messages for failures
5. **CRITICAL** (4) - Critical failures that may cause system instability

**Default Level:** `INFO` (debug logs are filtered out by default)

**Production Recommendation:** Set log level to `WARN` to reduce noise:
```bash
VITE_LOG_LEVEL=warn
```

---

## What Gets Logged

### Critical Events (Always Logged)

**HF Data Engine:**
- Connection failures
- API request failures
- Health check failures
- Error responses from HF Engine

**KuCoin Futures:**
- API request failures
- Authentication errors (401/403)
- Rate limit errors (429)
- Network errors (timeouts, connection refused)
- Order placement failures
- Position fetch failures

**WebSocket:**
- Connection failures
- Reconnection attempts
- Max reconnection attempts exceeded
- Message parsing errors

**Strategy Pipeline:**
- Pipeline execution failures
- Detector failures
- Scoring errors

**Risk Guard:**
- Trade rejections (with reason)
- Risk limit violations

**System:**
- Service initialization failures
- Database errors
- Configuration errors

---

## What Does NOT Get Logged

### Secrets and Sensitive Data

**Automatic Sanitization:**
The Logger automatically sanitizes context objects to prevent logging secrets:

- API keys (`apiKey`, `apiSecret`, `passphrase`)
- Passwords (`password`, `secret`, `token`)
- Credentials (`credential`, `key`)

**Example:**
```typescript
logger.error('API call failed', { apiKey: 'sk-123456' });
// Logs: { apiKey: '***REDACTED***' }
```

**Never Log:**
- Raw API keys or secrets
- Passphrases
- Authentication tokens
- User credentials
- Full request/response bodies containing secrets

---

## Log Format

### Standard Format

```
[timestamp] [LEVEL] [correlationId] message | Context: {...} | Error: error message
```

**Example:**
```
[2025-11-16T10:30:45.123Z] [ERROR] [abc123] Failed to get positions | Context: {"symbol":"all"} | Error: Exchange credentials invalid
```

### Log Entry Structure

```typescript
{
  timestamp: number,        // Unix timestamp (ms)
  level: LogLevel,         // 0-4 (DEBUG to CRITICAL)
  message: string,         // Log message
  context?: object,        // Additional context (sanitized)
  correlationId: string,   // Unique ID for tracing
  module: string,          // Source file/module
  error?: Error           // Error object (if applicable)
}
```

---

## Where Logs Appear

### Development

- **Browser:** Browser console (F12 → Console)
- **Backend:** Terminal/stdout where server is running
- **In-Memory Buffer:** Available via `Logger.getInstance().getLogs()`

### Production

- **Browser:** Browser console (for client-side errors)
- **Backend:** stdout/stderr (captured by deployment platform)
- **Deployment Platforms:**
  - Railway: View logs in Railway dashboard
  - Hugging Face Spaces: View logs in Space logs tab
  - Docker: `docker logs <container>`
  - Kubernetes: `kubectl logs <pod>`

---

## Logging Guidelines

### DO

✅ **Log errors with context:**
```typescript
logger.error('Failed to fetch positions', { symbol: 'BTCUSDT' }, error);
```

✅ **Log warnings for recoverable issues:**
```typescript
logger.warn('Rate limit exceeded, retrying in 60s', { endpoint: '/api/positions' });
```

✅ **Log info for important state changes:**
```typescript
logger.info('WebSocket connected successfully', { url: wsUrl });
```

✅ **Include correlation IDs for tracing:**
```typescript
logger.setCorrelationId('trade-12345');
logger.info('Trade executed', { orderId: 'ord-123' });
```

### DON'T

❌ **Don't log secrets:**
```typescript
// BAD
logger.info('API key configured', { apiKey: process.env.API_KEY });

// GOOD
logger.info('API key configured', { hasKey: !!process.env.API_KEY });
```

❌ **Don't log full request/response bodies:**
```typescript
// BAD
logger.debug('API response', { response: fullResponseBody });

// GOOD
logger.debug('API response', { status: response.status, symbol: response.data.symbol });
```

❌ **Don't log excessive debug information in production:**
```typescript
// BAD (in production)
logger.debug('Processing every single price update', { price: 50000 });

// GOOD
logger.debug('Price update received', { symbol: 'BTCUSDT' }); // Only if LOG_LEVEL=debug
```

❌ **Don't log user-identifiable information without consent:**
```typescript
// BAD
logger.info('User logged in', { email: user.email });

// GOOD
logger.info('User logged in', { userId: user.id });
```

---

## Observability Features

### Health Checks

**Endpoint:** `GET /api/health`

Returns system health status including:
- Overall status (healthy/degraded/down)
- Provider statuses (HF Engine, Binance, KuCoin)
- Primary data source
- Trading mode

**Logs:** Health check failures are logged at WARN level

---

### Metrics

**Endpoint:** `GET /api/system/metrics` (Prometheus format)

Exposed metrics:
- WebSocket connections count
- API request counts (by endpoint)
- Error rates
- Response times

**Logs:** Metrics collection errors are logged at ERROR level

---

### WebSocket Status

**Visible in UI:** Status Ribbon component shows WebSocket connection status

**Logs:**
- Connection failures: ERROR
- Reconnection attempts: INFO
- Max attempts exceeded: ERROR

---

## Production Logging Configuration

### Environment Variables

```bash
# Set log level (default: info)
VITE_LOG_LEVEL=warn  # Production: warn or error

# Backend log level (if using Node.js logger)
LOG_LEVEL=warn
```

### Recommended Production Settings

```bash
# Production .env
VITE_LOG_LEVEL=warn
LOG_LEVEL=warn
```

**Rationale:**
- Reduces log volume
- Focuses on warnings and errors
- Improves performance (less stringification)

---

## Debugging Production Issues

### Enable Debug Logging Temporarily

```bash
# Set log level to debug
VITE_LOG_LEVEL=debug

# Restart application
npm run dev:real
```

**⚠️ Warning:** Debug logging is verbose. Only enable temporarily for troubleshooting.

---

### Viewing Logs

**Browser Console:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by log level if needed

**Backend Logs:**
```bash
# If running locally
npm run dev:server:real

# If using Docker
docker logs -f <container-name>

# If using Railway
railway logs

# If using Hugging Face Spaces
# View logs in Space dashboard → Logs tab
```

---

## Log Retention

### In-Memory Buffer

- **Size:** 1000 entries max
- **Retention:** Until application restart
- **Access:** `Logger.getInstance().getLogs()`

### Production Logs

- **Platform-dependent:**
  - Railway: 7 days retention
  - Hugging Face Spaces: Varies by plan
  - Docker: Depends on logging driver
  - Kubernetes: Depends on cluster configuration

**Recommendation:** Set up log aggregation (e.g., Datadog, LogRocket, Sentry) for long-term retention and searchability.

---

## Common Log Patterns

### HF Engine Failure

```
[ERROR] HF Data Engine request failed | Context: {"endpoint":"/api/prices","status":503} | Error: Request failed with status 503
```

**Action:** Check HF Engine health, verify network connectivity

---

### KuCoin API Failure

```
[ERROR] Failed to get positions | Context: {"symbol":"all"} | Error: Exchange credentials invalid or missing
```

**Action:** Verify API credentials in Exchange Settings

---

### WebSocket Reconnection

```
[WARN] WebSocket closed | Context: {"code":1006,"reason":"","reconnectAttempt":3,"maxAttempts":5}
[INFO] Reconnecting to WebSocket in 4000ms...
```

**Action:** Check backend WebSocket server is running

---

## Future Enhancements

**Planned:**
- Structured logging (JSON format)
- Log aggregation integration
- Distributed tracing (correlation IDs across services)
- Performance metrics logging
- User action logging (for analytics)

---

## Related Documentation

- `docs/PRODUCTION_SMOKE_TEST_PLAN.md` - Testing and validation
- `docs/production-env-config.md` - Environment configuration
- `ARCHITECTURE_REPORT.md` - System architecture

---

**Key Takeaway:** Logs are essential for debugging production issues, but must never expose secrets or sensitive data. Use appropriate log levels and sanitize context objects.
