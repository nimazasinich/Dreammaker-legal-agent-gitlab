# HuggingFace Data Engine Integration

## Overview

This document describes the integration of the HuggingFace Data Engine as the primary data source for the Dreammaker Crypto Dashboard.

## What Was Added

### 1. Configuration Layer (`src/config/dataSource.ts`)

A centralized configuration system for managing data sources:
- **Primary Data Source Selection**: Choose between `huggingface`, `binance`, `kucoin`, or `mixed`
- **HuggingFace Engine Settings**: Base URL, timeout, enable/disable
- **Exchange Controls**: Enable/disable individual exchanges

Environment variables:
```bash
PRIMARY_DATA_SOURCE=huggingface
HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space
HF_ENGINE_ENABLED=true
HF_ENGINE_TIMEOUT=30000
BINANCE_ENABLED=true
KUCOIN_ENABLED=true
```

### 2. HTTP Client (`src/services/HFDataEngineClient.ts`)

A robust HTTP client for communicating with the HuggingFace Data Engine Space:

**Available Methods:**
- `getHealth()` - Health check
- `getInfo()` - System information
- `getProviders()` - List of data providers
- `getTopPrices(limit)` - Top cryptocurrency prices
- `getMarketOverview()` - Market overview statistics
- `getCategories()` - Cryptocurrency categories
- `getRateLimits()` - Rate limit information
- `getLogs(limit)` - System logs
- `getAlerts()` - Active alerts
- `getHfHealth()` - HuggingFace integration health
- `refreshHfData()` - Refresh HF data
- `getHfRegistry()` - HF model registry
- `runHfSentiment(text)` - Run sentiment analysis

**Features:**
- Automatic error handling
- Standardized error responses
- Connection testing
- Type-safe responses

### 3. Adapter Service (`src/services/HFDataEngineAdapter.ts`)

Bridges HF Data Engine with the existing backend architecture:
- Converts HF responses to backend format
- Wraps responses in standard API format
- Handles errors gracefully
- Respects data source configuration

### 4. Backend Controller (`src/controllers/HFDataEngineController.ts`)

Express route handlers for HF Data Engine endpoints:
- Health and status endpoints
- Market data endpoints
- Observability endpoints
- HuggingFace integration endpoints

### 5. Backend Routes (`src/server.ts`)

New API routes added:

**Health & Status:**
- `GET /api/hf-engine/health` - Get system health
- `GET /api/hf-engine/status` - Get data source status
- `GET /api/hf-engine/providers` - Get available providers

**Market Data:**
- `GET /api/hf-engine/prices?limit=50` - Get top prices
- `GET /api/hf-engine/market/overview` - Market overview
- `GET /api/hf-engine/categories` - Categories

**Observability:**
- `GET /api/hf-engine/rate-limits` - Rate limit info
- `GET /api/hf-engine/logs?limit=100` - System logs
- `GET /api/hf-engine/alerts` - Active alerts

**HuggingFace Integration:**
- `GET /api/hf-engine/hf/health` - HF health
- `POST /api/hf-engine/hf/refresh` - Refresh data
- `GET /api/hf-engine/hf/registry` - Model registry
- `POST /api/hf-engine/hf/sentiment` - Sentiment analysis

### 6. UI Components

#### Data Source Selector (`src/components/ui/StatusRibbon.tsx`)
Added a new button group to the status ribbon for selecting data source:
- 🤗 **HF** (HuggingFace) - Primary data source
- 📊 **Exchanges** - Direct exchange APIs
- 🔀 **Mixed** - Both sources

#### Mode Context (`src/contexts/ModeContext.tsx`)
Extended to manage data source selection:
- Added `dataSource` state
- Added `setDataSource()` method
- Persists selection to local storage

#### Type Definitions (`src/types/modes.ts`)
Added new types:
```typescript
export type DataSourceType = 'huggingface' | 'exchanges' | 'mixed';
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           StatusRibbon (Data Source Selector)         │  │
│  │          [🤗 HF] [📊 Exchanges] [🔀 Mixed]           │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │ User Selection                       │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │              ModeContext (State Management)            │  │
│  └────────────────────┬──────────────────────────────────┘  │
└─────────────────────┬─┴──────────────────────────────────────┘
                      │ API Calls
                      │
┌─────────────────────▼──────────────────────────────────────┐
│                    Backend (Node/Express)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         HFDataEngineController (Route Handlers)       │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │        HFDataEngineAdapter (Format Conversion)        │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │      HFDataEngineClient (HTTP Communication)          │  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │                                      │
│  ┌────────────────────▼──────────────────────────────────┐  │
│  │       DataSourceConfig (Configuration Layer)          │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP Requests
                         │
┌────────────────────────▼─────────────────────────────────────┐
│              HuggingFace Data Engine (Space)                 │
│  https://huggingface.co/spaces/Really-amin/...               │
│                                                               │
│  Provides:                                                    │
│  - Real-time cryptocurrency prices                           │
│  - Market overview data                                      │
│  - Provider management                                       │
│  - Rate limiting                                             │
│  - Logging and alerts                                        │
│  - HuggingFace model integration                            │
└───────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure HuggingFace Data Engine:
```bash
# Primary data source
PRIMARY_DATA_SOURCE=huggingface

# HuggingFace Data Engine (Production)
HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space

# Or for local development:
# HF_ENGINE_BASE_URL=http://localhost:8000

# Enable/disable
HF_ENGINE_ENABLED=true
HF_ENGINE_TIMEOUT=30000
```

### Default Behavior

By default, the system is configured to use HuggingFace Data Engine as the primary data source:
- Frontend selector defaults to "🤗 HF"
- Backend routes use `/api/hf-engine/*` endpoints
- Falls back to exchanges if HF is unavailable (when using "Mixed" mode)

## Usage

### From the UI

1. Open the dashboard
2. Look at the top status ribbon
3. Click on the data source selector buttons:
   - **🤗 HF**: Use HuggingFace exclusively
   - **📊 Exchanges**: Use direct exchange APIs
   - **🔀 Mixed**: Use both sources

### From the API

Example API calls:

```bash
# Get health status
curl http://localhost:8001/api/hf-engine/health

# Get top 10 cryptocurrency prices
curl http://localhost:8001/api/hf-engine/prices?limit=10

# Get market overview
curl http://localhost:8001/api/hf-engine/market/overview

# Run sentiment analysis
curl -X POST http://localhost:8001/api/hf-engine/hf/sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "Bitcoin is looking bullish today!"}'
```

### From Code

#### Using the Adapter:
```typescript
import { hfDataEngineAdapter } from './services/HFDataEngineAdapter';

// Get market data
const response = await hfDataEngineAdapter.getTopPrices(50);
if (response.success) {
  console.log('Prices:', response.data);
} else {
  console.error('Error:', response.error);
}
```

#### Using the Client Directly:
```typescript
import { hfDataEngineClient } from './services/HFDataEngineClient';

// Test connection
const isConnected = await hfDataEngineClient.testConnection();

// Get health
const health = await hfDataEngineClient.getHealth();
```

## Error Handling

All HF Data Engine endpoints return standardized error responses:

```json
{
  "ok": false,
  "source": "hf_engine",
  "endpoint": "/api/crypto/prices/top",
  "message": "HuggingFace data engine is not reachable",
  "status": 503,
  "error": { /* additional error details */ }
}
```

The adapter converts these to API-compatible responses:

```json
{
  "success": false,
  "error": {
    "message": "Failed to retrieve cryptocurrency prices",
    "code": "HF_503",
    "details": { /* error details */ }
  },
  "source": "hf_engine",
  "timestamp": "2025-11-14T..."
}
```

## Testing

### Verify Installation

1. Start the backend server:
```bash
npm run dev
```

2. Test the health endpoint:
```bash
curl http://localhost:8001/api/hf-engine/health
```

3. Check the UI:
   - Open http://localhost:5173
   - Look for the data source selector in the top ribbon
   - Try switching between sources

### Test Data Flow

1. Select "🤗 HF" in the UI
2. Navigate to Market or Dashboard view
3. Open browser DevTools → Network tab
4. Verify requests go to `/api/hf-engine/*` endpoints
5. Check responses are properly formatted

## Troubleshooting

### HF Engine Not Reachable

**Symptoms:**
- Error: "HuggingFace data engine is not reachable"
- 503 status codes

**Solutions:**
1. Check `HF_ENGINE_BASE_URL` is correct
2. Verify the HuggingFace Space is running
3. Check firewall/network settings
4. Try using "Mixed" mode as fallback

### Data Not Updating

**Symptoms:**
- Stale data in dashboard
- No real-time updates

**Solutions:**
1. Check WebSocket connection (WS indicator in ribbon)
2. Verify HF engine is selected
3. Check browser console for errors
4. Refresh the page

### Configuration Not Applied

**Symptoms:**
- Settings don't persist
- Wrong data source used

**Solutions:**
1. Check `.env` file exists and is loaded
2. Clear browser local storage
3. Restart backend server
4. Verify environment variables: `node -e "console.log(process.env.HF_ENGINE_BASE_URL)"`

## Files Modified/Created

### Created Files:
- `src/config/dataSource.ts` - Data source configuration
- `src/services/HFDataEngineClient.ts` - HTTP client
- `src/services/HFDataEngineAdapter.ts` - Response adapter
- `src/controllers/HFDataEngineController.ts` - Route handlers
- `HF_DATA_ENGINE_INTEGRATION.md` - This documentation

### Modified Files:
- `.env.example` - Added HF configuration
- `src/server.ts` - Added routes and imports
- `src/types/modes.ts` - Added DataSourceType
- `src/contexts/ModeContext.tsx` - Added dataSource state
- `src/components/ui/StatusRibbon.tsx` - Added selector UI

## Future Enhancements

Potential improvements:
1. **Automatic Failover**: Switch to exchanges if HF is down
2. **Load Balancing**: Distribute requests across sources
3. **Caching Layer**: Cache HF responses for better performance
4. **Analytics**: Track which data source performs better
5. **Admin Panel**: Configure data sources from UI
6. **Health Dashboard**: Monitor all data source statuses

## Support

For issues or questions:
1. Check this documentation
2. Review the [HuggingFace Space](https://huggingface.co/spaces/Really-amin/Datasourceforcryptocurrency)
3. Check backend logs for error details
4. Open an issue on GitHub

## Credits

Integration developed for the Dreammaker Crypto Dashboard project.
HuggingFace Data Engine Space by Really-amin.
