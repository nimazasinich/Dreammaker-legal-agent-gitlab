# HF Engine Scope & Boundaries

**Last Updated:** 2025-11-16  
**Purpose:** Clarify what HF (Hugging Face) Data Engine does and does NOT do

This document prevents future confusion and "fixing" of intentional non-implementations.

---

## ✅ What HF Engine PROVIDES

The HF Data Engine is the **primary external data source** for market information. It provides:

### 1. Market Prices
- **Endpoint:** `GET /api/market/prices`
- **Coverage:** Real-time prices for major cryptocurrencies
- **Format:** `{ symbol: string, price: number, timestamp: number }`
- **Used By:** Dashboard price displays, trading calculations

### 2. OHLCV (Candlestick) Data
- **Endpoint:** `GET /api/market/ohlcv`
- **Coverage:** Historical and recent candlestick data
- **Format:** `{ open, high, low, close, volume, timestamp }`
- **Used By:** Chart rendering, technical analysis inputs

### 3. Market Tickers
- **Endpoint:** `GET /api/market/tickers`
- **Coverage:** 24h volume, price changes, bid/ask spreads
- **Format:** Standard ticker format across exchanges
- **Used By:** Market scanner, top movers/losers

### 4. Market Overview
- **Endpoint:** `GET /api/market/overview`
- **Coverage:** Overall market health, trending coins, market cap distribution
- **Format:** Aggregated market statistics
- **Used By:** Dashboard market summary section

### 5. Health & Status
- **Endpoint:** `GET /health`
- **Coverage:** HF Engine availability, provider status
- **Format:** `{ status: 'healthy' | 'degraded' | 'down', providers: [...] }`
- **Used By:** System health checks, fallback triggering

### 6. Provider Aggregation
- **Feature:** HF Engine itself aggregates multiple data sources (Binance, KuCoin, CMC, etc.)
- **Benefit:** Single endpoint for multi-source data
- **Used By:** All market data requests

---

## 🚫 What HF Engine DOES NOT PROVIDE

The following features are **intentionally NOT sourced from HF Engine** and are kept **local**:

### 1. Smart Money Concepts (SMC) Analysis
**Why Local:**
- Proprietary algorithm
- Requires real-time tick-level data processing
- Competitive advantage

**Implementation:** `src/services/analysis/SMCAnalyzer.ts`

**Features:**
- Order block detection
- Fair value gap (FVG) identification
- Liquidity zones (buy-side/sell-side)
- Market structure breaks (BOS/CHoCH)

**Input:** OHLCV data from HF Engine  
**Output:** SMC analysis results (stored locally)

---

### 2. Elliott Wave Analysis
**Why Local:**
- Complex pattern recognition requiring iterative refinement
- Subjective interpretation (multiple valid counts)
- Proprietary scoring system

**Implementation:** `src/services/analysis/ElliottWaveAnalyzer.ts`

**Features:**
- Wave counting (impulse and corrective)
- Fibonacci extensions/retracements
- Wave degree classification
- Confidence scoring

**Input:** OHLCV data from HF Engine  
**Output:** Wave labels and projections

---

### 3. Signal Generation & Storage
**Why Local:**
- Real-time signal generation requires low latency
- Signal logic is proprietary
- Historical signal tracking needs local database

**Implementation:**
- `src/services/signals/SignalEngine.ts` - Signal generation
- `src/services/signals/SignalStorage.ts` - Signal persistence (planned)

**Features:**
- Multi-detector signal aggregation
- Scoring based on `scoring.config.json`
- Signal history and performance tracking

**Input:** Market data + local analysis  
**Output:** High-conviction trading signals

---

### 4. Strategy Execution Logic
**Why Local:**
- Trade entry/exit decisions must be immediate
- Risk management is exchange-specific
- No external service should control actual trades

**Implementation:**
- `src/services/strategy/StrategyEngine.ts` - 3-tier strategy pipeline
- `src/services/trading/TradeEngine.ts` - Order execution
- `src/services/trading/RiskGuard.ts` - Risk checks

**Features:**
- Strategy 1/2/3 scoring system
- Position sizing calculations
- Risk limit enforcement
- Order placement and management

**Input:** Signals + risk parameters  
**Output:** Executed trades (via KuCoin API)

---

### 5. Backtest Results & Performance
**Why Local:**
- Backtesting requires full historical data (large datasets)
- Performance metrics are strategy-specific
- Results need to be stored for comparison

**Implementation:**
- `src/services/backtest/BacktestEngine.ts` - Backtest execution
- Frontend-based backtesting (runs in browser)

**Features:**
- Historical strategy simulation
- Performance metrics (Sharpe, drawdown, win rate)
- Equity curve visualization

**Input:** Historical OHLCV + strategy params  
**Output:** Backtest results (stored in browser storage or local DB)

---

### 6. Machine Learning Predictions
**Why Local:**
- ML models are trained locally (`ml/` directory)
- Inference must be fast (no API round-trip)
- Models are proprietary

**Implementation:**
- `ml/train.py` - Model training
- `src/services/ml/MLPredictor.ts` - Inference wrapper

**Features:**
- Price direction prediction
- Volatility forecasting
- Pattern recognition

**Input:** Feature-engineered market data  
**Output:** Predictions with confidence scores

---

## 📋 HF Adapter Files & Their Status

The following adapter files exist in `src/services/hf/` but have **intentional limitations**:

### `HFSignalAdapter.ts`
**Status:** ⚠️ Returns `NOT_IMPLEMENTED` for most methods  
**Reason:** Signals are generated locally, not fetched from HF Engine  
**Do NOT "Fix":** This is intentional

### `HFAnalysisAdapter.ts`
**Status:** ⚠️ Returns `NOT_IMPLEMENTED` for SMC/Elliott Wave methods  
**Reason:** These analyses are proprietary and run locally  
**Do NOT "Fix":** This is intentional

### `HFMarketAdapter.ts`
**Status:** ✅ Fully functional  
**Purpose:** Transforms HF Engine market data into internal format  
**Use:** Primary adapter for market prices, OHLCV, tickers

### `HFDataEngineClient.ts`
**Status:** ✅ Fully functional  
**Purpose:** Core HTTP client for HF Engine API  
**Use:** All HF Engine communication goes through this client

---

## 🔄 Data Flow with HF Engine

```
External HF Engine (Hugging Face)
         │
         │ Provides: Prices, OHLCV, Tickers, Market Overview
         ▼
   HFDataEngineClient (HTTP wrapper)
         │
         │ Format transformation
         ▼
   HFMarketAdapter (data normalization)
         │
         │ Multi-provider abstraction
         ▼
   MultiProviderMarketDataService
         │
         │ Policy enforcement
         ▼
   RealDataManager
         │
         ▼
   DataContext (React state)
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
   UI Components        Local Analyzers
   (Display data)       (SMC, Elliott, Signals)
                              │
                              ▼
                        SignalEngine (local)
                              │
                              ▼
                        TradeEngine (local)
                              │
                              ▼
                        KuCoin Futures API (orders)
```

**Key Point:** HF Engine provides **raw market data**. All **analysis and trading logic** happens locally.

---

## 🛠️ When to Use vs NOT Use HF Engine

### ✅ Use HF Engine For:
- Getting current market prices
- Fetching historical OHLCV data
- Checking market-wide statistics (volume, market cap)
- Monitoring overall market health
- Aggregating multi-exchange data

### 🚫 Do NOT Use HF Engine For:
- Generating trading signals (use `SignalEngine`)
- Performing technical analysis (use local analyzers)
- Executing trades (use `TradeEngine` → KuCoin API)
- Storing signal history (use local storage)
- Running backtests (use `BacktestEngine`)

---

## 📝 Code Comments Reference

To prevent future "fixes," the following comments should be added to HF adapter files:

### In `HFSignalAdapter.ts`:
```typescript
/**
 * INTENTIONAL: This adapter returns NOT_IMPLEMENTED for most methods.
 * Signal generation is handled by local SignalEngine, not HF Engine.
 * See docs/hf-engine-scope.md for rationale.
 */
```

### In `HFAnalysisAdapter.ts`:
```typescript
/**
 * INTENTIONAL: SMC and Elliott Wave methods return NOT_IMPLEMENTED.
 * These analyses are proprietary and run locally via dedicated analyzers.
 * See docs/hf-engine-scope.md for rationale.
 */
```

### In `HFMarketAdapter.ts`:
```typescript
/**
 * This adapter is the PRIMARY data source for market prices, OHLCV, and tickers.
 * It transforms HF Engine responses into internal format.
 * See docs/hf-engine-scope.md for data flow details.
 */
```

---

## 📝 Inline Code References

The following adapters include inline comments that reflect this scope:

- `src/services/hf/HFMarketAdapter.ts` - Primary bridge for market data (prices, OHLCV, tickers, market overview)
- `src/services/hf/HFSignalsAdapter.ts` - Placeholder adapter; all signal operations return NOT_IMPLEMENTED
- `src/services/hf/HFAnalysisAdapter.ts` - Sentiment analysis only; SMC/Elliott Wave return NOT_IMPLEMENTED
- `src/services/hf/HFProxyAdapter.ts` - Placeholder adapter; proxy methods return NOT_IMPLEMENTED
- `src/services/hf/HFHealthAdapter.ts` - Read-only health and provider metadata

When modifying these files, keep the comments and this document in sync.

---

## 🔍 Verifying HF Engine Scope in Code

### Check if HF Engine is being misused:
```bash
# Search for direct HF Engine calls outside of HFMarketAdapter
rg "HFDataEngineClient" --type ts | grep -v "HFMarketAdapter"

# Search for attempts to fetch signals from HF Engine
rg "fetchSignals.*HF" --type ts

# Search for attempts to fetch analysis from HF Engine
rg "fetchAnalysis.*HF" --type ts
```

If any matches appear outside of expected adapter files, review for potential misuse.

---

## 📚 Related Documentation

- [Data Flow](./data-flow.md) - Complete data pipeline visualization
- [Routes Inventory](./routes.md) - Active API routes
- [Production Environment Config](./production-env-config.md) - Env var reference

---

## ⚠️ Important Reminders

1. **HF Engine is a data provider, not an analysis engine.**
2. **Proprietary algorithms (SMC, Elliott, Signals) stay local.**
3. **`NOT_IMPLEMENTED` in HF adapters is intentional, not a bug.**
4. **Trading execution NEVER goes through HF Engine (always direct to exchange).**

---

**When in Doubt:** If it's **analysis or trading logic**, it's **local**. If it's **raw market data**, it **might** come from HF Engine.
