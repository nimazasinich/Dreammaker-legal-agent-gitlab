# API Routes Inventory

**Last Updated:** 2025-11-16  
**Status:** Accurate for current build

This document provides a clear inventory of which API routes are **active and functional** vs **planned but not implemented** in the current build.

---

## ✅ Active Routes (Functional)

These routes are implemented, tested, and available in the current build:

### Core Market Data
- `GET /api/market/data` - Multi-provider market data aggregation
- `GET /api/market/overview` - Market summary and health metrics
- `GET /api/market/health` - System health check

### Trading (Futures Only)
- `POST /api/trading/order` - Place futures order (KuCoin testnet)
- `GET /api/trading/positions` - Get open futures positions
- `GET /api/trading/balance` - Get futures account balance
- `DELETE /api/trading/order/:id` - Cancel futures order

### Signals & Analysis
- `GET /api/signals` - Get current trading signals
- `GET /api/signals/history` - Historical signals
- `POST /api/signals/analyze` - Trigger manual analysis

### Strategy
- `GET /api/strategy/config` - Get current strategy configuration
- `POST /api/strategy/update` - Update strategy parameters
- `GET /api/strategy/performance` - Strategy performance metrics

### System
- `GET /api/health` - Overall system health
- `GET /api/status` - System status and mode
- `POST /api/config/update` - Update system configuration

---

## 🚫 Planned Routes (Not Implemented)

These routes were referenced in `server.ts` but are **commented out** because the implementation is incomplete or not yet started. They are listed here for transparency and future planning.

### File Location
All commented route imports are in `src/server.ts` (lines 110-129):

```typescript
// import futuresRoutes from './routes/futures.js';
// import offlineRoutes from './routes/offline.js';
// import systemDiagnosticsRoutes from './routes/systemDiagnostics.js';
// import systemMetricsRoutes from './routes/system.metrics.js';
// import marketUniverseRoutes from './routes/market.universe.js';
// import marketReadinessRoutes from './routes/market.readiness.js';
// import mlRoutes from './routes/ml.js';
// import newsRoutes from './routes/news.js';
// import strategyTemplatesRoutes from './routes/strategyTemplates.js';
// import strategyApplyRoutes from './routes/strategy.apply.js';
// import backtestRoutes from './routes/backtest.js';
// import { hfRouter } from './routes/hf.js';
// import { resourceMonitorRouter } from './routes/resource-monitor.js';
// import diagnosticsMarketRoutes from './routes/diagnostics.market.js';
// import serverInfoRoutes from './routes/server-info.js';
// import { optionalPublicRouter } from './routes/optional-public.js';
// import { optionalNewsRouter } from './routes/optional-news.js';
// import { optionalMarketRouter } from './routes/optional-market.js';
// import { optionalOnchainRouter } from './routes/optional-onchain.js';
```

### Planned Route Categories

#### 1. Futures Routes (`/api/futures`)
**Status:** ⚠️ Partially redundant with existing trading routes  
**Notes:** Current trading routes already handle futures. This might be intended for additional futures-specific analytics or advanced order types.

#### 2. Offline Mode (`/api/offline`)
**Status:** 🔄 Design phase  
**Purpose:** Enable local/offline operation with cached data

#### 3. System Diagnostics & Metrics
**Routes:** `/api/system/diagnostics`, `/api/system/metrics`  
**Status:** 🔄 Basic health checks exist; advanced diagnostics not implemented  
**Purpose:** Detailed system performance monitoring and diagnostics

#### 4. Market Intelligence
**Routes:** `/api/market/universe`, `/api/market/readiness`  
**Status:** 🔄 Planned  
**Purpose:** Extended market analysis (universe scanning, market regime detection)

#### 5. Machine Learning (`/api/ml`)
**Status:** 🔄 ML models exist (`ml/` directory), API integration incomplete  
**Purpose:** Expose ML predictions and model management

#### 6. News Integration (`/api/news`)
**Status:** 🔄 Planned  
**Purpose:** News sentiment and impact analysis

#### 7. Strategy Templates (`/api/strategy-templates`, `/api/strategy/apply`)
**Status:** 🔄 Planned  
**Purpose:** Pre-built strategy templates and one-click strategy deployment

#### 8. Backtesting (`/api/backtest`)
**Status:** 🔄 Backtest engine exists in frontend, API wrapper incomplete  
**Purpose:** Server-side backtesting with full historical data

#### 9. HF Engine Proxy (`/api/hf`)
**Status:** ⚠️ HF adapters exist but not exposed as direct API  
**Purpose:** Direct access to HF Engine capabilities (if needed)

#### 10. Resource Monitoring (`/api/resources`)
**Status:** 🔄 Planned  
**Purpose:** Server resource usage, memory, CPU metrics

#### 11. Optional/Extended Data
**Routes:** `/api/optional/public`, `/api/optional/news`, `/api/optional/market`, `/api/optional/onchain`  
**Status:** 🔄 Planned  
**Purpose:** Optional data sources (can be disabled to reduce load)

#### 12. Server Info (`/.well-known`)
**Status:** 🔄 Planned  
**Purpose:** Server metadata, version info, capabilities

---

## 📋 Route Development Guidelines

When implementing a new route:

1. **Create route file** in `src/routes/[name].ts`
2. **Uncomment import** in `src/server.ts`
3. **Uncomment mount** in `src/server.ts` (near line 1839+)
4. **Add to "Active Routes"** section in this document
5. **Update API tests** if applicable

### Example: Implementing ML Routes

```typescript
// 1. Create src/routes/ml.ts
import express from 'express';
const router = express.Router();

router.get('/predict', (req, res) => {
  // Implementation
});

export default router;

// 2. In src/server.ts, uncomment:
// import mlRoutes from './routes/ml.js';

// 3. Uncomment mount:
// app.use('/api/ml', mlRoutes);

// 4. Update this document
```

---

## 🔍 Finding Active Routes in Code

### Method 1: Search for Active Mounts
```bash
grep -n "^app\.use" src/server.ts | grep -v "^//"
```

### Method 2: Check Route Files
```bash
find src/routes -name "*.ts" -o -name "*.js"
```

### Method 3: Test Endpoint Availability
```bash
curl http://localhost:5000/api/health
```

---

## ⚠️ Important Notes

1. **SPOT Trading Routes:** All SPOT trading endpoints are blocked at the `ExchangeClient` level. Even if routes exist, they will return `NOT_IMPLEMENTED` or `REJECTED` status.

2. **Testnet Only:** All trading operations currently use KuCoin Futures **testnet**. Production API keys are not used.

3. **Data Sources:** Most market data comes from HF Engine. Other providers (Binance, CryptoCompare, CMC) are fallbacks.

4. **Authentication:** Most routes do not require authentication in current build (development mode). This will change in production.

5. **Rate Limiting:** Currently disabled for development. Must be enabled before production.

---

## 📚 Related Documentation

- [Data Flow](./data-flow.md) - How data flows through the system
- [HF Engine Scope](./hf-engine-scope.md) - What HF Engine does and doesn't do
- [Production Environment Config](./production-env-config.md) - Required env vars for production

---

**Maintenance:** Update this document whenever routes are added, removed, or changed. Keep "Active" and "Planned" sections accurate.
