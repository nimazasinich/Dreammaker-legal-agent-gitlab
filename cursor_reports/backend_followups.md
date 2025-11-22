# Backend Follow-ups

**Generated:** 2025-11-22  
**Context:** Shared files reassessment identified several frontend guards needed for missing backend envelope support

---

## Overview

During the frontend shared files assessment, several API endpoints were identified that either:
1. Don't return the standard envelope format `{ status, code?, message?, data? }`
2. Return raw data without error handling
3. Need additional guard logic on the backend

This document tracks **frontend workarounds** and **backend follow-up tasks** to ensure proper envelope support.

---

## Critical Backend Issues Requiring Frontend Guards

### 1. OHLCV Endpoint - No Envelope Format

**Endpoint:** `GET /api/market/history` (used by `marketData.ts`)  
**Current Behavior:** Returns raw array or throws 500 on error  
**Expected Behavior:** Return `{ status: 'ok', data: [...] }` or `{ status: 'error', code: 'DATA_UNAVAILABLE', message: '...' }`

**Frontend Guard Added:**
```typescript
// src/services/marketData.ts
const envelope = await backoffRetry(async () => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return normalizeApiResult(raw); // Wraps raw data in envelope if needed
});
```

**Backend Task:** Modify OHLCV endpoint to return envelope
```python
# backend/routes/market.py
@app.get("/api/market/history")
async def get_ohlcv(symbol: str, timeframe: str, limit: int = 100):
    try:
        bars = await fetch_ohlcv(symbol, timeframe, limit)
        return {
            "status": "ok",
            "data": bars
        }
    except DataUnavailableError:
        return {
            "status": "error",
            "code": "DATA_UNAVAILABLE",
            "message": f"No OHLCV data for {symbol}",
            "data": None
        }
    except Exception as e:
        logger.error(f"OHLCV fetch failed: {e}")
        return {
            "status": "error",
            "code": "UNKNOWN_ERROR",
            "message": str(e),
            "data": None
        }
```

---

### 2. DatasourceClient Endpoints - Mixed Response Formats

**Endpoints:**
- `GET /api/market` - Returns array directly
- `GET /api/stats` - Returns object directly
- `GET /api/news/latest` - Returns `{ success: boolean, news: [] }` (non-standard)

**Current Behavior:** Inconsistent response shapes across endpoints  
**Expected Behavior:** All endpoints return `{ status, code?, message?, data }`

**Frontend Guard Added:**
```typescript
// src/services/DatasourceClient.ts - fetchJSON method
const data = await response.json();
const envelope = normalizeApiResult(data);
if (envelope.status === 'error') {
  throw new Error(envelope.message || 'API returned error');
}
return envelope.data as T;
```

**Backend Tasks:**

#### 2.1 Standardize `/api/market`
```python
# BEFORE
return [{"symbol": "BTC", "price": 50000, ...}, ...]

# AFTER
return {
    "status": "ok",
    "data": [{"symbol": "BTC", "price": 50000, ...}, ...]
}
```

#### 2.2 Standardize `/api/stats`
```python
# BEFORE
return {"totalMarketCap": 1000000, ...}

# AFTER
return {
    "status": "ok",
    "data": {"totalMarketCap": 1000000, ...}
}
```

#### 2.3 Standardize `/api/news/latest`
```python
# BEFORE
return {"success": True, "news": [...]}

# AFTER
return {
    "status": "ok",
    "data": [...]
}
```

---

### 3. AI Prediction Endpoint - No Error Codes

**Endpoint:** `POST /api/ai/predict`  
**Current Behavior:** Returns `null` on error, no structured error  
**Expected Behavior:** Return error envelope with specific codes

**Frontend Guard Added:**
```typescript
// src/services/DatasourceClient.ts
async getAIPrediction(symbol: string, timeframe = '1h'): Promise<AIPrediction | null> {
  try {
    const response = await this.fetchJSON<AIPrediction>(url, {
      method: 'POST',
      body: JSON.stringify({ symbol, timeframe })
    });
    return response;
  } catch (error) {
    console.error('getAIPrediction error:', error);
    return null; // Frontend handles null gracefully
  }
}
```

**Backend Task:** Add error codes
```python
# backend/routes/ai.py
@app.post("/api/ai/predict")
async def predict(request: PredictionRequest):
    try:
        if not is_model_loaded():
            return {
                "status": "error",
                "code": "AI_MODEL_NOT_LOADED",
                "message": "AI model not yet loaded, please wait",
                "data": None
            }
        
        if insufficient_data(request.symbol):
            return {
                "status": "error",
                "code": "AI_DATA_TOO_SMALL",
                "message": f"Insufficient historical data for {request.symbol}",
                "data": None
            }
        
        prediction = await generate_prediction(request.symbol, request.timeframe)
        return {
            "status": "ok",
            "data": prediction
        }
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        return {
            "status": "error",
            "code": "PREDICTION_FAILED",
            "message": str(e),
            "data": None
        }
```

---

### 4. WebSocket Messages - No Envelope Structure

**Endpoint:** `WS /ws`  
**Current Behavior:** Sends raw objects `{ type: 'signal_update', data: {...} }`  
**Expected Behavior:** Wrap in envelope for consistency

**Frontend Guard Added:**
```typescript
// src/hooks/useSignalWebSocket.ts
ws.onmessage = (event) => {
  const parsed = JSON.parse(event.data);
  
  // Validate message structure
  if (!parsed?.data?.stages?.stage1) {
    logger.warn('Invalid signal message structure', parsed);
    return; // Skip invalid messages
  }
  
  // Continue processing...
};
```

**Backend Task:** Add envelope to WebSocket messages
```python
# backend/websocket/signal_handler.py
async def send_signal_update(symbol: str, stages: dict):
    try:
        message = {
            "status": "ok",
            "type": "signal_update",
            "data": {
                "symbol": symbol,
                "stages": stages,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        await broadcast(json.dumps(message))
    except Exception as e:
        error_message = {
            "status": "error",
            "type": "signal_update",
            "code": "SIGNAL_GENERATION_FAILED",
            "message": str(e),
            "data": None
        }
        await broadcast(json.dumps(error_message))
```

---

### 5. Trading Endpoints - KuCoin Error Pass-through

**Endpoints:** 
- `POST /api/trading/order`
- `GET /api/trading/positions`

**Current Behavior:** KuCoin errors passed through with different structure  
**Expected Behavior:** Normalized error codes

**Frontend Guard Added:**
```typescript
// src/contexts/TradingContext.tsx
try {
  const accountData = await kucoinService.getAccountBalance();
  setBalance(accountData.availableBalance);
} catch (error) {
  logger.error('Failed to refresh trading data', {}, error as Error);
  // Fallback to virtual data on error
  const data = virtualService.getAccountData();
  setBalance(data.balance);
}
```

**Backend Task:** Normalize KuCoin errors
```python
# backend/services/kucoin_service.py
async def place_order(order_params: dict):
    try:
        response = await kucoin_api.post('/orders', order_params)
        return {
            "status": "ok",
            "data": response.json()
        }
    except KuCoinAPIError as e:
        if e.code == "400100":  # Invalid parameters
            return {
                "status": "error",
                "code": "INVALID_ORDER_PARAMS",
                "message": "Invalid order parameters",
                "data": {"kucoin_code": e.code}
            }
        elif e.code == "200004":  # Insufficient balance
            return {
                "status": "error",
                "code": "INSUFFICIENT_BALANCE",
                "message": "Insufficient account balance",
                "data": {"kucoin_code": e.code}
            }
        else:
            return {
                "status": "error",
                "code": "EXCHANGE_ERROR",
                "message": f"KuCoin error: {e.message}",
                "data": {"kucoin_code": e.code}
            }
```

---

## Standard Error Codes to Implement

Backend should use these standardized error codes:

### Data Availability
- `DATA_UNAVAILABLE` - Requested data not available (temporary)
- `DATA_NOT_FOUND` - Resource not found (permanent)
- `AI_DATA_TOO_SMALL` - Insufficient data for AI prediction
- `HISTORICAL_DATA_MISSING` - Historical data gaps

### Configuration
- `DISABLED_BY_CONFIG` - Feature disabled in config
- `API_KEY_MISSING` - Required API key not configured
- `PROVIDER_NOT_CONFIGURED` - Data provider not set up

### Service Status
- `PROVIDER_DOWN` - External provider unavailable
- `AI_MODEL_NOT_LOADED` - AI model still loading
- `RATE_LIMITED` - Rate limit exceeded

### Exchange/Trading
- `INSUFFICIENT_BALANCE` - Not enough funds
- `INVALID_ORDER_PARAMS` - Order parameters invalid
- `EXCHANGE_ERROR` - External exchange error
- `POSITION_NOT_FOUND` - Position doesn't exist

### Generic
- `NETWORK_ERROR` - Network/connection failure
- `TIMEOUT` - Request timeout
- `UNKNOWN_ERROR` - Unexpected error

---

## Backend Envelope Middleware Suggestion

To ensure ALL endpoints return the standard envelope, implement a middleware:

```python
# backend/middleware/envelope_middleware.py
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import json

async def envelope_middleware(request: Request, call_next):
    response = await call_next(request)
    
    # Only process JSON responses
    if response.headers.get("content-type") != "application/json":
        return response
    
    # Read response body
    body = b""
    async for chunk in response.body_iterator:
        body += chunk
    
    try:
        data = json.loads(body)
        
        # If already has envelope format, return as-is
        if "status" in data and data["status"] in ["ok", "error"]:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers)
            )
        
        # Wrap in envelope
        if response.status_code >= 400:
            envelope = {
                "status": "error",
                "code": "HTTP_ERROR",
                "message": data.get("detail", "An error occurred"),
                "data": None
            }
        else:
            envelope = {
                "status": "ok",
                "data": data
            }
        
        return JSONResponse(
            content=envelope,
            status_code=response.status_code
        )
    except:
        # Non-JSON or already processed
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers)
        )

# Add to FastAPI app
app.middleware("http")(envelope_middleware)
```

---

## Testing Checklist for Backend

When implementing envelope support, test:

- [ ] All endpoints return `{ status, code?, message?, data }` structure
- [ ] Error codes are consistent and documented
- [ ] `status` is always "ok" or "error" (not true/false or success/fail)
- [ ] `data` is always present (null if no data)
- [ ] `code` is present for all error responses
- [ ] `message` is human-readable for all errors
- [ ] WebSocket messages follow same envelope structure
- [ ] HTTP status codes align with envelope status (200 for ok, 4xx/5xx for error)

---

## Rollout Plan

### Phase 1: Add Envelope Middleware (Week 1)
- Implement envelope middleware
- Test with existing endpoints
- Ensure backward compatibility

### Phase 2: Standardize Core Endpoints (Week 2)
- Market data endpoints
- News endpoints
- Stats endpoints

### Phase 3: Standardize AI/ML Endpoints (Week 3)
- AI prediction
- Training status
- Model metrics

### Phase 4: Standardize Trading Endpoints (Week 4)
- Order placement
- Position management
- Balance queries

### Phase 5: WebSocket Envelope Support (Week 5)
- Signal updates
- Price updates
- Position updates

---

## Frontend Impact

Once backend implements envelopes:

1. **Remove frontend guards** from:
   - `DatasourceClient.ts` - Remove `normalizeApiResult` wrapper
   - `marketData.ts` - Simplify to expect envelope
   - `useSignalWebSocket.ts` - Remove message validation

2. **Simplify error handling** in:
   - `DataContext.tsx` - Direct envelope status check
   - `TradingContext.tsx` - Consistent error codes

3. **Update tests** to expect envelope format

---

**Last Updated:** 2025-11-22  
**Owner:** Backend Team  
**Reviewer:** Frontend/Architecture Team
