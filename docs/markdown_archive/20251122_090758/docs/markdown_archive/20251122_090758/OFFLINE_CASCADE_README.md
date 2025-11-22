# Never-Stall Data Cascade + One-Click 15m Test

## Overview

This update adds a resilient data cascade system that ensures trading signals can be generated even when network is unavailable or external APIs fail. The cascade follows this priority order:

1. **Memory** - In-memory cache (fastest)
2. **SQLite** - Local database cache
3. **Local Files** - JSON/CSV files in `data/files/`
4. **Hugging Face** - HF datasets (offline-friendly)
5. **CoinGecko** - Free REST API
6. **Binance** - Direct exchange API
7. **Synthetic** - Deterministic generated data (never fails)

## Key Features

✅ **Never stalls** - Always returns data, even fully offline
✅ **Deterministic synthetic data** - Realistic OHLCV generation with volatility clustering
✅ **Non-breaking** - All existing routes and exports unchanged
✅ **Automatic caching** - Successful fetches are cached locally for future offline use
✅ **One-click testing** - Complete 15m signal test with single command

## New Files

### Configuration
- `.env.local` - Local environment configuration (git-ignored)
- `src/config/fallback.config.json` - Fallback cascade configuration

### Services
- `src/services/SyntheticOHLCV.ts` - Synthetic OHLCV generator
- `src/providers/FallbackDataProvider.ts` - Main cascade adapter
- `src/routes/offline.ts` - Offline data endpoints

### Scripts
- `scripts/oneclick-15m.sh` - One-click 15m signal test

## API Endpoints

### Seed Cache
```bash
GET /api/offline/seed?symbol=BTCUSDT&tf=15m&bars=1200
```
Pre-populates cache with data using full cascade.

### Get OHLCV
```bash
GET /api/offline/ohlcv?symbol=BTCUSDT&tf=15m&limit=500
```
Returns OHLCV data with cascade fallback.

### Clear Cache
```bash
DELETE /api/offline/cache?symbol=BTCUSDT&tf=15m
```
Clears cache for specific symbol/timeframe (or all if no params).

### Health Check
```bash
GET /api/offline/health
```
Returns offline mode status and configuration.

## Usage

### One-Click Test
```bash
npm run oneclick:15m
```

This will:
1. Start the server
2. Seed cache for 10 major crypto pairs
3. Generate 15m trading signals
4. Create summary report

**Works fully offline** - will use synthetic data if needed.

### Manual Testing

#### Start Server
```bash
npm run dev
```

#### Seed Cache
```bash
curl "http://localhost:3001/api/offline/seed?symbol=BTCUSDT&tf=15m&bars=1200"
```

#### Get Signals
```bash
curl "http://localhost:3001/api/scoring/snapshot?symbol=BTCUSDT&tfs=15m"
```

## Configuration

### Environment Variables (.env.local)

```bash
# Hugging Face tokens (for HF datasets)
HF_TOKEN=your_token_here
HUGGINGFACEHUB_API_TOKEN=your_token_here

# Feature flags
ENABLE_SMART_SYSTEM=1
ENABLE_HF=1
OFFLINE_ALLOW=1

# Fallback configuration
FALLBACK_ORDER=memory,sqlite,files,hf,coingecko,binance,synthetic
FALLBACK_TIMEOUT_MS=1800

# Server
PORT=3001
NODE_ENV=development
VITE_API_BASE=http://localhost:3001/api
```

### Fallback Configuration (src/config/fallback.config.json)

```json
{
  "order": ["memory","sqlite","files","hf","coingecko","binance","synthetic"],
  "timeouts": { "hf": 1800, "coingecko": 1500, "binance": 1500 },
  "ttlSec": { "market": 120, "hf": 180, "files": 3600, "synthetic": 60 },
  "offlineAllow": true,
  "minBars": 300,
  "defaultTF": "15m",
  "seed": 1337
}
```

## Integration with Existing Code

The cascade is integrated non-intrusively:

### MarketDataIngestionService
New method `getBarsCascade(symbol, tf, limit)` wraps existing logic with cascade fallback.

```typescript
const ingestionService = MarketDataIngestionService.getInstance();
const bars = await ingestionService.getBarsCascade('BTCUSDT', '15m', 500);
```

### Direct Usage
```typescript
import { FallbackDataProvider } from './providers/FallbackDataProvider';

const bars = await FallbackDataProvider.getOHLCV('BTCUSDT', '15m', 500);
```

## Output Files

After running `npm run oneclick:15m`, check `artifacts/`:

- `snapshot_*_15m.json` - Individual signal snapshots
- `summary_15m.json` - Aggregated analysis with valuable signals highlighted
- `server.log` - Full server output
- `seed_result.json` - Cache seeding results
- `offline_health.json` - Offline mode status

## Synthetic Data

When all real data sources fail (or in fully offline mode), deterministic synthetic data is generated:

- **Seeded PRNG** - Reproducible for testing
- **Volatility clustering** - Realistic market behavior
- **Proper OHLC relationships** - Valid candlestick structure
- **Configurable** - Adjust seed, starting price, volume

## Testing Offline Mode

To test fully offline:

```bash
# Disable network (example on Linux)
sudo iptables -A OUTPUT -p tcp --dport 443 -j DROP
sudo iptables -A OUTPUT -p tcp --dport 80 -j DROP

# Run test
npm run oneclick:15m

# Should still complete successfully with synthetic data

# Re-enable network
sudo iptables -F
```

## Acceptance Criteria

✅ With all networks blocked, `npm run oneclick:15m` produces:
- `artifacts/snapshot_BTCUSDT_15m.json` (no errors)
- `artifacts/summary_15m.json` (at least one row)

✅ With networks available, cascade prefers HF → free REST

✅ No changes to existing routes/exports (additive only)

✅ `.env.local` is git-ignored (secrets safe)

## Troubleshooting

### "All APIs failed and offline fallback is disabled"
Set `OFFLINE_ALLOW=1` in `.env.local`

### "HF token invalid"
Update `HF_TOKEN` in `.env.local` or disable HF with `ENABLE_HF=0`

### Synthetic data always used
Check that:
1. Server can reach external APIs
2. `ENABLE_HF=1` and token is valid
3. Network isn't blocked by firewall

### Server won't start
Check port 3001 isn't already in use:
```bash
lsof -i :3001
pkill -f "node.*3001"
```

## Architecture

```
Request for OHLCV
    ↓
MarketDataIngestionService.getBarsCascade()
    ↓
FallbackDataProvider.getOHLCV()
    ↓
Try: Memory → SQLite → Files → HF → APIs → Synthetic
    ↓
Return data (guaranteed, never null)
```

## Future Enhancements

- WebSocket streaming with cascade fallback
- ML model for detecting stale data
- Auto-refresh cache in background
- Peer-to-peer data sharing for offline resilience
- Historical data pre-loading on startup

---

**Safe, additive update** - No breaking changes, English-only code, no secrets in repo.
