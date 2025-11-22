# HuggingFace Data Engine - Enhancement Requirements

## Executive Summary

This document outlines requirements for enhancing the **HuggingFace Cryptocurrency Data Engine** (Space: `Really-amin/Datasourceforcryptocurrency`) to serve as a reliable, comprehensive data provider for the Dreammaker Crypto Signal & Trader application.

**Current Space URL:** https://huggingface.co/spaces/Really-amin/Datasourceforcryptocurrency
**Target Deployment:** Local (`http://localhost:8000`) and HuggingFace Space
**Client Application:** Dreammaker Crypto Signal & Trader (AI-powered trading signal platform)

---

## 🎯 Purpose & Goals

### Primary Objective
Transform the HuggingFace Data Engine into a **production-ready cryptocurrency data aggregator** that:
- Consolidates multiple data sources into unified APIs
- Provides reliable OHLCV (candlestick) data for technical analysis
- Delivers real-time price feeds for 20+ cryptocurrencies
- Offers market sentiment and news data
- Operates without authentication requirements (public access)
- Handles high request volumes with caching and rate limiting

### Use Case
The client application (Dreammaker) performs **AI-driven technical analysis** to generate trading signals. It requires:
- Minimum 50-200 historical OHLCV candles per symbol
- Real-time price updates every 5-30 seconds
- Market sentiment indicators (Fear & Greed Index)
- News feeds for sentiment analysis
- Support for 14+ cryptocurrency pairs

---

## 📊 Data Requirements

### 1. OHLCV Data (Critical - Priority 1)

**Endpoint:** `GET /api/ohlcv`

**Query Parameters:**
```javascript
{
  symbol: string,        // e.g., "BTCUSDT", "BTC", "BTC/USDT"
  interval: string,      // "1m", "5m", "15m", "1h", "4h", "1d", "1w"
  limit: number,         // 50-1000 (default: 100)
  startTime?: number,    // Unix timestamp (optional)
  endTime?: number       // Unix timestamp (optional)
}
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": 1699920000000,
      "open": 43250.50,
      "high": 43500.00,
      "low": 43100.25,
      "close": 43420.75,
      "volume": 125.45
    }
  ],
  "symbol": "BTCUSDT",
  "interval": "1h",
  "count": 100,
  "source": "binance"
}
```

**Data Sources (in priority order):**
1. **Binance Public API** - Most liquid, reliable
   - Endpoint: `https://api.binance.com/api/v3/klines`
   - No auth required for public endpoints
   - Rate limit: 1200 requests/minute (weight-based)

2. **Kraken Public API** - Backup source
   - Endpoint: `https://api.kraken.com/0/public/OHLC`
   - No auth required
   - Reliable uptime

3. **Bybit Public API** - Alternative
   - Endpoint: `https://api.bybit.com/v5/market/kline`
   - No auth required
   - Good for perpetuals

4. **CoinGecko OHLC** - Long-term historical
   - Endpoint: `/api/v3/coins/{id}/ohlc`
   - Limited to 1-90 days
   - 10-50 calls/minute free tier

**Required Symbols:**
- BTC/USDT, ETH/USDT, SOL/USDT, XRP/USDT, BNB/USDT
- ADA/USDT, DOT/USDT, LINK/USDT, LTC/USDT, BCH/USDT
- MATIC/USDT, AVAX/USDT, XLM/USDT, TRX/USDT

**Required Intervals:**
- `1m`, `5m`, `15m`, `1h`, `4h`, `1d`

**Performance Requirements:**
- Response time: <3 seconds for 100 candles
- Response time: <10 seconds for 1000 candles
- Minimum data points: 50 candles per symbol
- Maximum data points: 1000 candles per request
- Cache: 5-15 minutes for intervals >1h

---

### 2. Real-time Prices (Critical - Priority 2)

**Endpoint:** `GET /api/prices`

**Query Parameters:**
```javascript
{
  symbols?: string[],    // ["BTC", "ETH", "SOL"] or empty for all
  convert?: string       // "USD", "USDT" (default: "USDT")
}
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "price": 43420.75,
      "priceUsd": 43420.75,
      "change1h": 0.25,
      "change24h": 2.15,
      "change7d": -1.50,
      "volume24h": 28500000000,
      "marketCap": 850000000000,
      "rank": 1,
      "lastUpdate": "2024-01-15T10:30:00Z"
    }
  ],
  "timestamp": 1699920000,
  "source": "multi-provider"
}
```

**Data Sources (use all, aggregate):**
1. **CoinGecko** - `/api/v3/simple/price`
   - Include: price, 24h_change, 24h_volume, market_cap
   - Batch request: up to 100 coins
   - Free tier: 10-50 calls/minute

2. **CoinCap API** - `https://api.coincap.io/v2/assets`
   - Real-time prices
   - No auth required
   - Rate limit: ~200 requests/minute

3. **CryptoCompare** - `/data/pricemultifull`
   - Comprehensive data
   - Free tier: 100,000 calls/month
   - Optional API key for higher limits

4. **Binance Ticker** - `/api/v3/ticker/24hr`
   - Most accurate for USDT pairs
   - No auth required

**Aggregation Strategy:**
- Use median price from multiple sources
- Flag outliers (>2% deviation)
- Prefer Binance for USDT pairs
- Fallback to single provider if others fail

**Performance Requirements:**
- Response time: <2 seconds for 20 symbols
- Update frequency: Every 30-60 seconds
- Cache: 30 seconds
- Reliability: 99% uptime

---

### 3. Market Sentiment (High Priority)

**Endpoint:** `GET /api/sentiment`

**Response Format:**
```json
{
  "success": true,
  "data": {
    "fearGreed": {
      "value": 65,
      "classification": "Greed",
      "timestamp": "2024-01-15T10:00:00Z"
    },
    "news": {
      "bullish": 45,
      "bearish": 25,
      "neutral": 30,
      "total": 100
    },
    "overall": {
      "sentiment": "bullish",
      "score": 62,
      "confidence": 0.85
    }
  },
  "timestamp": 1699920000
}
```

**Data Sources:**
1. **Fear & Greed Index** - `https://api.alternative.me/fng/`
   - Crypto Fear & Greed Index (0-100)
   - No auth required
   - Update: Daily

2. **CryptoPanic News** - `https://cryptopanic.com/api/v1/posts/`
   - Requires free API key
   - Filter by sentiment
   - Rate limit: ~1 request/second

3. **NewsAPI** (Optional) - News headlines
   - Requires API key (free tier: 100 requests/day)
   - Filter crypto-related news

**Performance Requirements:**
- Response time: <3 seconds
- Update frequency: Every 5-15 minutes
- Cache: 10 minutes

---

### 4. Market Overview (Medium Priority)

**Endpoint:** `GET /api/market/overview`

**Response Format:**
```json
{
  "success": true,
  "data": {
    "totalMarketCap": 1650000000000,
    "totalVolume24h": 95000000000,
    "btcDominance": 51.5,
    "ethDominance": 17.2,
    "activeCoins": 12500,
    "topGainers": [...],
    "topLosers": [...],
    "trending": [...]
  },
  "timestamp": 1699920000
}
```

**Data Sources:**
- CoinGecko `/api/v3/global`
- CoinMarketCap (optional, requires API key)

---

### 5. Health & Status (Required)

**Endpoint:** `GET /api/health`

**Response Format:**
```json
{
  "status": "healthy",
  "uptime": 3600,
  "version": "1.0.0",
  "providers": [
    {
      "name": "binance",
      "status": "online",
      "latency": 120,
      "lastCheck": "2024-01-15T10:30:00Z"
    },
    {
      "name": "coingecko",
      "status": "online",
      "latency": 450,
      "lastCheck": "2024-01-15T10:30:00Z"
    }
  ],
  "cache": {
    "size": 1250,
    "hitRate": 0.78
  }
}
```

---

## 🏗️ Architecture Requirements

### Technology Stack

**Framework:** FastAPI (Python) or Express.js (Node.js)
- FastAPI recommended for async performance
- Built-in OpenAPI documentation
- Easy deployment to HuggingFace Spaces

**Caching:** Redis or In-Memory Cache
- Redis for distributed caching (production)
- In-memory for HuggingFace Space deployment
- TTL-based cache invalidation

**Rate Limiting:**
- Per-endpoint rate limits
- IP-based throttling
- Graceful degradation

**Error Handling:**
- Retry logic with exponential backoff
- Circuit breaker for failing providers
- Comprehensive error responses

### Deployment Options

**Option 1: HuggingFace Space (Recommended)**
```yaml
title: Cryptocurrency Data Engine
emoji: 📊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 8000
```

**Option 2: Local Development**
```bash
docker run -p 8000:8000 crypto-data-engine
```

**Option 3: Cloud Deployment**
- AWS Lambda / ECS
- Google Cloud Run
- Vercel / Netlify Functions

---

## 🔧 Technical Specifications

### 1. Provider Integration

**Multi-Provider Pattern:**
```python
class DataProvider:
    async def fetch_ohlcv(symbol, interval, limit) -> List[OHLCV]
    async def fetch_prices(symbols) -> List[Price]
    async def get_health() -> HealthStatus

class BinanceProvider(DataProvider):
    # Implementation

class KrakenProvider(DataProvider):
    # Implementation

class DataAggregator:
    def __init__(self, providers: List[DataProvider]):
        self.providers = providers

    async def get_ohlcv(symbol, interval, limit):
        # Try providers in order until success
        for provider in self.providers:
            try:
                return await provider.fetch_ohlcv(symbol, interval, limit)
            except:
                continue
        raise AllProvidersFailedError()
```

**Fallback Logic:**
1. Try primary provider (Binance)
2. If fails (403, timeout, error), try secondary (Kraken)
3. If fails, try tertiary (Bybit)
4. If all fail, return cached data (if available)
5. If no cache, return 503 with retry-after header

### 2. Caching Strategy

**Cache Layers:**
```
Request → Memory Cache (1-5 min) → Provider API → Response
```

**Cache Keys:**
```
ohlcv:{symbol}:{interval}:{limit} → TTL: 5-15 min
price:{symbol} → TTL: 30 sec
sentiment:global → TTL: 10 min
```

**Cache Warming:**
- Pre-fetch popular symbols (BTC, ETH, SOL)
- Background task every 5 minutes
- Reduce cold-start latency

### 3. Rate Limiting

**Limits:**
```
/api/ohlcv → 60 requests/minute per IP
/api/prices → 120 requests/minute per IP
/api/sentiment → 30 requests/minute per IP
/api/health → Unlimited
```

**Response Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1699920000
Retry-After: 60 (if rate limited)
```

### 4. Error Handling

**Error Response Format:**
```json
{
  "success": false,
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "All data providers are currently unavailable",
    "details": {
      "binance": "HTTP 403",
      "kraken": "Timeout",
      "bybit": "Rate limited"
    },
    "retryAfter": 60
  },
  "timestamp": 1699920000
}
```

**Error Codes:**
- `INVALID_SYMBOL` - Unknown cryptocurrency symbol
- `INVALID_INTERVAL` - Unsupported timeframe
- `PROVIDER_ERROR` - All providers failed
- `RATE_LIMITED` - Too many requests
- `INSUFFICIENT_DATA` - Less than minimum candles available

---

## 📈 Performance Requirements

### Response Time SLA

| Endpoint | Target | Maximum | Cache |
|----------|--------|---------|-------|
| `/api/prices` | <1s | 3s | 30s |
| `/api/ohlcv` (50 bars) | <2s | 5s | 5min |
| `/api/ohlcv` (200 bars) | <5s | 15s | 15min |
| `/api/sentiment` | <3s | 10s | 10min |
| `/api/health` | <100ms | 500ms | None |

### Throughput

- Minimum: 100 requests/minute sustained
- Target: 500 requests/minute sustained
- Peak: 1000 requests/minute (5 minute burst)

### Reliability

- Uptime: 99.5% (excluding provider outages)
- Error rate: <1% (excluding client errors)
- Cache hit rate: >70%

---

## 🔐 Security & Compliance

### Authentication

**Public Endpoints:** No auth required
- `/api/prices`
- `/api/ohlcv`
- `/api/health`

**Optional API Key:** For higher rate limits
```
Authorization: Bearer <token>
```

### Rate Limiting

- IP-based throttling
- Optional API key for increased limits
- CORS enabled for web clients

### Data Privacy

- No user data collection
- No PII storage
- GDPR compliant

---

## 🧪 Testing Requirements

### Unit Tests

**Coverage:** >80%
- Provider integration tests
- Cache functionality
- Error handling
- Rate limiting

### Integration Tests

**Scenarios:**
1. Primary provider fails → Fallback succeeds
2. All providers fail → Return cached data
3. Cache expired → Fetch fresh data
4. Rate limit exceeded → Return 429
5. Invalid parameters → Return 400 with details

### Load Tests

**Tool:** k6, Artillery, or Locust

**Scenarios:**
```
Scenario 1: Normal Load
- 10 concurrent users
- 100 requests/minute
- Duration: 10 minutes
- Success rate: >99%

Scenario 2: Peak Load
- 50 concurrent users
- 500 requests/minute
- Duration: 5 minutes
- Success rate: >95%

Scenario 3: Stress Test
- 100 concurrent users
- 1000 requests/minute
- Duration: 2 minutes
- Graceful degradation (no crashes)
```

---

## 📚 Documentation Requirements

### API Documentation

**Format:** OpenAPI 3.0 (Swagger)

**Include:**
- Endpoint descriptions
- Request/response schemas
- Example requests (curl, Python, JavaScript)
- Error codes and meanings
- Rate limit information

**Interactive Docs:** Available at `/docs` (Swagger UI)

### README

**Sections:**
1. Overview & Features
2. Quick Start (Docker, Local)
3. API Endpoints Reference
4. Configuration (environment variables)
5. Deployment Guide
6. Contributing Guidelines
7. License

### Configuration Guide

**Environment Variables:**
```bash
# Server
PORT=8000
HOST=0.0.0.0
ENV=production

# Cache
CACHE_TYPE=memory  # or 'redis'
CACHE_TTL_PRICES=30
CACHE_TTL_OHLCV=300
REDIS_URL=redis://localhost:6379

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PRICES=120
RATE_LIMIT_OHLCV=60

# Data Providers (Optional API Keys)
BINANCE_API_KEY=
COINGECKO_API_KEY=
CRYPTOCOMPARE_API_KEY=
CRYPTOPANIC_API_KEY=

# Features
ENABLE_SENTIMENT=true
ENABLE_NEWS=false
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Load tests completed
- [ ] API documentation complete
- [ ] README up to date
- [ ] Error handling comprehensive
- [ ] Logging configured
- [ ] Monitoring set up

### HuggingFace Space Setup

1. Create `Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

2. Create `README.md` (HF Space card)
3. Configure Space settings
4. Deploy and test

### Post-Deployment

- [ ] Health check responding
- [ ] All endpoints functional
- [ ] Cache warming working
- [ ] Rate limiting effective
- [ ] Error tracking active
- [ ] Performance monitoring

---

## 📊 Success Metrics

### KPIs

**Performance:**
- Average response time: <2 seconds
- 95th percentile: <5 seconds
- 99th percentile: <10 seconds

**Reliability:**
- Uptime: >99.5%
- Error rate: <1%
- Cache hit rate: >70%

**Adoption:**
- Requests per day: >10,000
- Active users: >10
- API endpoints called: All

### Monitoring

**Metrics to Track:**
- Request count by endpoint
- Response time distribution
- Error rate by type
- Provider health status
- Cache performance
- Rate limit hits

**Tools:**
- Application logs
- Prometheus + Grafana (optional)
- HuggingFace Space analytics
- Custom dashboard

---

## 🗺️ Roadmap

### Phase 1: Core Functionality (Week 1-2)
- [x] OHLCV endpoint with Binance integration
- [x] Prices endpoint with multi-provider aggregation
- [x] Health check endpoint
- [x] Basic caching
- [x] Error handling

### Phase 2: Enhanced Features (Week 3-4)
- [ ] Sentiment endpoint
- [ ] Market overview endpoint
- [ ] Kraken + Bybit providers
- [ ] Redis caching
- [ ] Rate limiting

### Phase 3: Production Ready (Week 5-6)
- [ ] Comprehensive testing
- [ ] API documentation
- [ ] HuggingFace Space deployment
- [ ] Monitoring & alerts
- [ ] Performance optimization

### Phase 4: Advanced Features (Future)
- [ ] WebSocket support for real-time updates
- [ ] Historical data exports
- [ ] Custom indicators (RSI, MACD, etc.)
- [ ] Alert system
- [ ] Premium features with API keys

---

## 🤝 Integration with Dreammaker

### Client Configuration

**Backend (.env):**
```bash
HF_ENGINE_BASE_URL=http://localhost:8000
# or
HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space

HF_ENGINE_ENABLED=true
HF_ENGINE_TIMEOUT=30000
PRIMARY_DATA_SOURCE=huggingface
```

**API Client (TypeScript):**
```typescript
import axios from 'axios';

const hfClient = axios.create({
  baseURL: process.env.HF_ENGINE_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

// Fetch OHLCV
const ohlcv = await hfClient.get('/api/ohlcv', {
  params: { symbol: 'BTCUSDT', interval: '1h', limit: 200 }
});

// Fetch Prices
const prices = await hfClient.get('/api/prices', {
  params: { symbols: ['BTC', 'ETH', 'SOL'] }
});
```

### Data Flow

```
Dreammaker Backend → HF Data Engine → Multiple Providers → Aggregated Response
                                    ↓
                                  Cache
```

### Fallback Strategy

```
1. Try HF Data Engine
2. If fails (403, timeout), try Binance directly
3. If fails, try Kraken directly
4. If fails, use cached data
5. If no cache, return error to frontend
```

---

## 📝 Example Implementation

### Minimal FastAPI Implementation

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Crypto Data Engine", version="1.0.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class OHLCV(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: float

class OHLCVResponse(BaseModel):
    success: bool
    data: List[OHLCV]
    symbol: str
    interval: str
    count: int
    source: str

@app.get("/api/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/ohlcv", response_model=OHLCVResponse)
async def get_ohlcv(
    symbol: str,
    interval: str = "1h",
    limit: int = 100
):
    try:
        # Normalize symbol
        if not symbol.endswith("USDT"):
            symbol = f"{symbol}USDT"

        # Fetch from Binance
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.binance.com/api/v3/klines",
                params={
                    "symbol": symbol,
                    "interval": interval,
                    "limit": limit
                },
                timeout=10.0
            )
            response.raise_for_status()

            # Parse response
            data = response.json()
            ohlcv_data = [
                OHLCV(
                    timestamp=int(candle[0]),
                    open=float(candle[1]),
                    high=float(candle[2]),
                    low=float(candle[3]),
                    close=float(candle[4]),
                    volume=float(candle[5])
                )
                for candle in data
            ]

            return OHLCVResponse(
                success=True,
                data=ohlcv_data,
                symbol=symbol,
                interval=interval,
                count=len(ohlcv_data),
                source="binance"
            )

    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Provider error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

## 💡 Additional Notes

### Why This Architecture?

**Multi-Provider Approach:**
- Single provider can fail (403, rate limits, downtime)
- Aggregation increases reliability from 95% → 99.9%
- Geographic restrictions handled by fallbacks

**Caching:**
- Reduces load on upstream providers
- Improves response time 10-100x
- Essential for rate limit compliance

**Separation of Concerns:**
- HF Data Engine = Data aggregation layer
- Dreammaker = Signal generation & trading logic
- Clean separation allows independent scaling

### Common Pitfalls to Avoid

❌ **Don't:**
- Hard-code provider URLs without fallbacks
- Skip error handling for provider failures
- Ignore rate limits
- Return raw provider responses (normalize first)
- Deploy without caching

✅ **Do:**
- Implement circuit breakers for failing providers
- Use exponential backoff for retries
- Normalize all data formats
- Add comprehensive logging
- Monitor provider health

---

## 🎯 Acceptance Criteria

The HuggingFace Data Engine is considered **production-ready** when:

1. ✅ All required endpoints implemented and documented
2. ✅ Minimum 2 working providers for OHLCV data
3. ✅ Response times meet SLA (<5s for 200 candles)
4. ✅ Cache hit rate >70%
5. ✅ Error handling comprehensive (no crashes)
6. ✅ Unit test coverage >80%
7. ✅ Integration tests passing
8. ✅ Deployed to HuggingFace Space (or local setup instructions)
9. ✅ Dreammaker successfully integrates and generates signals
10. ✅ Documentation complete (API docs, README, setup guide)

---

## 📞 Support & Contact

**Dreammaker Application:**
- Repository: `nimazasinich/Dreammaker-legal-agent-gitlab`
- Branch: `claude/optimize-initial-queries-014BR66kCjkxXLnPaiVBTn1Q`
- Backend: Port 8001
- Frontend: Port 5173

**HuggingFace Space:**
- Space: `Really-amin/Datasourceforcryptocurrency`
- Target Port: 8000

**For Questions:**
- Refer to IMPLEMENTATION_PROMPT.md for client-side implementation
- Refer to DATA_REQUIREMENTS_REPORT.md for detailed data needs

---

## 📄 License

This specification is provided for the development of the HuggingFace Cryptocurrency Data Engine to support the Dreammaker trading platform.

---

**Document Version:** 1.0
**Last Updated:** 2024-01-15
**Status:** Ready for Implementation
