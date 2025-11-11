# Dreammaker Crypto Trader - Fixed Version

## Changes Made

1. Fixed `.env` configuration (PORT 3001, Redis disabled)
2. Created `UnifiedProxyService` - handles all API calls with caching
3. Fixed `RealDataManager` - uses proxy instead of direct API calls
4. Added `apiClient` for frontend
5. All services now use internal proxy to avoid CORS issues

## Quick Start

```bash
npm install
npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:5173

## Test Proxy

```bash
npm run test:proxy
```

Or manually:
```bash
curl http://localhost:3001/api/proxy/binance/price?symbol=BTCUSDT
```

## Key Files Changed

- `.env` - Fixed configuration
- `src/services/UnifiedProxyService.ts` - NEW: Main proxy service
- `src/services/RealDataManager.ts` - FIXED: Uses proxy
- `src/lib/apiClient.ts` - NEW: Frontend API client
- `src/server.ts` - Added proxy routes
- `package.json` - Added test:proxy script

## Available Proxy Endpoints

- `/api/proxy/binance/price` - Get price
- `/api/proxy/binance/klines` - Get OHLCV data
- `/api/proxy/coingecko/simple/price` - Get CoinGecko prices
- `/api/proxy/fear-greed` - Get Fear & Greed Index
- `/api/proxy/cryptopanic/posts` - Get crypto news

## Free APIs Used

- Binance Public API (no limits)
- CoinGecko (50 req/min)
- Kraken Public API
- CoinCap (200 req/min)
- CryptoPanic (free)
- Fear & Greed Index (unlimited)

## Notes

- All API calls are cached (60s for prices, 10s for charts)
- Automatic fallback to other providers if one fails
- No API keys required for basic functionality
- Redis is optional (disabled by default)

## Troubleshooting

### Port in use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### better-sqlite3 error
```bash
npm rebuild better-sqlite3
```

All external API calls now go through `/api/proxy/*` to avoid CORS and rate limiting issues.
