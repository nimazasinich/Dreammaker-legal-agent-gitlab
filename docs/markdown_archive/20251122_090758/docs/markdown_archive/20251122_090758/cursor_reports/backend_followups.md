# Backend Integration Follow-ups

This document describes backend changes required to fully support the no-mock-data frontend implementation.

## Overview

The frontend now implements strict no-mock-data policy with proper fallback states. To complete the integration, the following backend endpoints must return data in the standard envelope format.

## Required Envelope Format

All API responses must follow this structure:

```typescript
{
  status: "ok" | "error",
  code?: string,        // Error code (when status === "error")
  message?: string,     // Error message (when status === "error")
  data?: any           // Response data (when status === "ok")
}
```

## Missing/Incomplete Endpoints

### 1. Portfolio Endpoint

**Endpoint:** `GET /api/portfolio`

**Current Status:** Not implemented

**Required Response:**
```json
{
  "status": "ok",
  "data": {
    "totalValue": 10000.50,
    "totalChangePercent": 5.2,
    "dayPnL": 520.25,
    "dayPnLPercent": 5.2,
    "activePositions": 3,
    "totalPositions": 5,
    "balances": {
      "USDT": 5000.0,
      "BTC": 0.5
    },
    "positions": [
      {
        "symbol": "BTCUSDT",
        "quantity": 0.5,
        "entryPrice": 50000,
        "currentPrice": 51000,
        "unrealizedPnL": 500
      }
    ]
  }
}
```

**Error Cases:**
- No exchange configured: `{ status: "error", code: "INTEGRATION_NOT_CONFIGURED", message: "Exchange API keys not configured" }`
- Exchange unavailable: `{ status: "error", code: "KUCOIN_UNAVAILABLE", message: "Unable to connect to KuCoin API" }`

### 2. Positions Endpoint

**Endpoint:** `GET /api/positions`

**Current Status:** Returns empty array

**Required Enhancement:**
- Return empty array when no positions (current behavior - OK)
- Return error envelope when exchange unavailable:
  ```json
  {
    "status": "error",
    "code": "KUCOIN_UNAVAILABLE",
    "message": "Unable to fetch positions from exchange"
  }
  ```

### 3. Market Data Endpoint

**Endpoint:** `GET /api/market-data`

**Current Status:** Partially implemented via DatasourceClient

**Required Enhancement:**
- Ensure all responses use envelope format
- Add health check endpoint: `GET /api/market-data/health`
  ```json
  {
    "status": "ok",
    "data": {
      "available": true,
      "providers": ["binance", "kucoin"],
      "lastUpdate": 1732233600000
    }
  }
  ```

### 4. AI Signals/Predictions Endpoint

**Endpoint:** `GET /api/signals` or `GET /api/predictions`

**Current Status:** Partially implemented

**Required Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "symbol": "BTCUSDT",
      "action": "BUY",
      "confidence": 0.85,
      "timeframe": "1h",
      "timestamp": 1732233600000
    }
  ]
}
```

**Error Cases:**
- Insufficient data: `{ status: "error", code: "AI_DATA_TOO_SMALL", message: "Insufficient data for AI analysis" }`

### 5. Trading Metrics Endpoint

**Endpoint:** `GET /api/training-metrics`

**Current Status:** Not implemented

**Required Response:**
```json
{
  "status": "ok",
  "data": [
    {
      "model": "lstm_v1",
      "accuracy": {
        "directional": 0.85
      },
      "timestamp": 1732233600000
    }
  ]
}
```

## Integration Health Checks

Add health check endpoints for monitoring:

### Exchange Health
**Endpoint:** `GET /api/health/exchange`
```json
{
  "status": "ok",
  "data": {
    "kucoin": { "available": true, "latency": 120 },
    "binance": { "available": true, "latency": 95 }
  }
}
```

### AI Service Health
**Endpoint:** `GET /api/health/ai`
```json
{
  "status": "ok",
  "data": {
    "available": true,
    "models_loaded": 2,
    "last_prediction": 1732233600000
  }
}
```

## Configuration Validation

Add endpoint to validate configuration without exposing secrets:

**Endpoint:** `GET /api/config/status`
```json
{
  "status": "ok",
  "data": {
    "kucoin_configured": true,
    "binance_configured": false,
    "ai_enabled": true,
    "telegram_configured": false
  }
}
```

## Error Handling Standards

All error responses must:
1. Use HTTP status codes appropriately (400, 404, 500, 503)
2. Include `status: "error"` in envelope
3. Provide meaningful `code` (from FallbackCode enum)
4. Include actionable `message`

Example error response:
```json
{
  "status": "error",
  "code": "INSUFFICIENT_PERMISSIONS",
  "message": "API key does not have required permissions for futures trading"
}
```

## Testing Requirements

For each endpoint:
1. Test successful response with valid data
2. Test error response with appropriate code
3. Test network timeout scenarios
4. Test malformed request handling
5. Validate envelope structure in all cases

## Priority

1. **CRITICAL (Implement First):**
   - Portfolio endpoint with envelope format
   - Configuration status endpoint
   - Exchange health checks

2. **HIGH (Implement Soon):**
   - AI signals error handling improvements
   - Training metrics endpoint
   - Positions error envelope handling

3. **MEDIUM (Can Wait):**
   - Historical data endpoints
   - Advanced analytics endpoints

## Implementation Notes

- All endpoints should log errors to structured JSON logs for monitoring
- Use consistent error codes from the FallbackCode enum
- Consider rate limiting for external API calls
- Cache responses where appropriate to reduce latency
- Document all envelope structures in OpenAPI/Swagger spec
