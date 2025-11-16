# Complete Architecture Report
## DreammakerCryptoSignalAndTrader

**Generated:** Based on direct code inspection (no assumptions)  
**Date:** 2025-01-27  
**Repository:** `/workspace`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Trading System](#trading-system)
5. [Data Providers & Integration](#data-providers--integration)
6. [Data Flow Analysis](#data-flow-analysis)
7. [WebSocket Architecture](#websocket-architecture)
8. [Missing Features & Incomplete Implementations](#missing-features--incomplete-implementations)
9. [Type System & Interfaces](#type-system--interfaces)
10. [Configuration System](#configuration-system)

---

## Executive Summary

This is a **cryptocurrency signal analysis and trading platform** built with:
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + WebSocket (ws)
- **Database:** Better-SQLite3 (local) + optional Redis (caching)
- **Trading:** KuCoin Futures (testnet) + SPOT (structure only, not implemented)
- **Data Sources:** HuggingFace Data Engine (primary) + Binance/KuCoin (fallback)

**Key Finding:** SPOT trading is **NOT IMPLEMENTED** - only structure exists. Futures trading is fully functional on testnet.

---

## Frontend Architecture

### Entry Points

**File:** `src/main.tsx`
- Initializes React app with error boundary
- Enforces data policy validation at startup
- Configures API/WS base URLs for dev/production
- Handles HuggingFace deployment detection

**File:** `src/App.tsx`
- Root component with provider hierarchy
- Lazy-loads all views for code splitting
- Navigation provider manages view switching
- Theme and accessibility providers wrap entire app

### Component Structure

**Location:** `src/components/`

#### Core Components
- `Dashboard.tsx` - Main dashboard component
- `AdvancedChart.tsx` - Charting component
- `ExchangeSelector.tsx` - Exchange selection UI
- `TopSignalsPanel.tsx` - Signal display panel

#### Feature Components

**Trading (`src/components/trading/`)**
- `TradingDashboard.tsx` - Main trading interface
- `SpotNotAvailable.tsx` - **SPOT not implemented notice**

**Scanner (`src/components/scanner/`)**
- `ScannerFeedPanel.tsx` - Signal feed display
- `TechnicalPatternsScanner.tsx` - Pattern detection UI
- `WhaleActivityScanner.tsx` - Whale tracking UI
- `SmartMoneyScanner.tsx` - SMC analysis UI
- `AISignalsScanner.tsx` - AI signal display
- `NewsSentimentScanner.tsx` - News sentiment UI

**Risk (`src/components/risk/`)**
- `RiskGauge.tsx` - Risk visualization
- `RiskAlertCard.tsx` - Risk alerts
- `LiquidationBar.tsx` - Liquidation price display
- `StressTestCard.tsx` - Stress testing UI

**Portfolio (`src/components/portfolio/`)**
- `Portfolio.tsx` - Portfolio overview
- `RiskCenterPro.tsx` - Advanced risk management

**Settings (`src/components/settings/`)**
- `DataSourceSelector.tsx` - Data source configuration
- `ExchangeSettings.tsx` - Exchange API configuration
- `IntegrationSettings.tsx` - Third-party integrations
- `TelegramSettingsCard.tsx` - Telegram bot config

**Connectors (`src/components/connectors/`)**
- `RealDataConnector.tsx` - Real data integration
- `RealChartDataConnector.tsx` - Chart data connector
- `RealSignalFeedConnector.tsx` - Signal feed connector
- `RealPriceChartConnector.tsx` - Price chart connector
- `RealPortfolioConnector.tsx` - Portfolio connector

**AI (`src/components/ai/`)**
- `AIPredictor.tsx` - AI prediction UI
- `TrainingDashboard.tsx` - ML training interface

**Backtesting (`src/components/backtesting/`)**
- `BacktestButton.tsx` - Backtest trigger
- `BacktestPanel.tsx` - Backtest results display

**UI (`src/components/ui/`)**
- 20+ reusable UI components (buttons, cards, forms, badges, etc.)
- `ErrorBoundary.tsx` - Error handling wrapper
- `LoadingSpinner.tsx` - Loading states
- `Toast.tsx` - Notification system

### Views (Page-Level Components)

**Location:** `src/views/`

**Active Views:**
1. `DashboardView.tsx` - Main dashboard
2. `ChartingView.tsx` - Charting interface
3. `MarketView.tsx` - Market data display
4. `ScannerView.tsx` - Signal scanner
5. `TrainingView.tsx` - ML training interface
6. `RiskView.tsx` - Risk management
7. `ProfessionalRiskView.tsx` - Advanced risk tools
8. `BacktestView.tsx` - Backtesting interface
9. `HealthView.tsx` - System health monitoring
10. `SettingsView.tsx` - Application settings
11. `FuturesTradingView.tsx` - Futures trading (functional)
12. `TradingView.tsx` - **SPOT trading (disabled - not implemented)**
13. `UnifiedTradingView.tsx` - Unified trading interface
14. `EnhancedTradingView.tsx` - Enhanced trading UI
15. `PositionsView.tsx` - Position management
16. `PortfolioPage.tsx` - Portfolio overview
17. `EnhancedStrategyLabView.tsx` - Strategy builder
18. `StrategyBuilderView.tsx` - Strategy creation
19. `StrategyInsightsView.tsx` - Strategy analysis
20. `ExchangeSettingsView.tsx` - Exchange configuration
21. `MonitoringView.tsx` - System monitoring
22. `DiagnosticsView.tsx` - Diagnostic tools

**Backup Views:** `src/views/__backup__/` contains archived versions

**Legacy Views:** `src/views/__legacy__/` contains deprecated components

### Contexts (State Management)

**Location:** `src/contexts/`

1. **DataContext** (`DataContext.tsx`)
   - Manages market data, prices, signals, portfolio
   - Uses `RealDataManager-old.ts` for data fetching
   - Handles data source switching (real/mock/synthetic)
   - Implements data policy enforcement

2. **TradingContext** (`TradingContext.tsx`)
   - Manages trading state (balance, positions, orders)
   - Switches between virtual and real trading modes
   - Integrates with `KuCoinFuturesService` and `VirtualTradingService`
   - **Note:** SPOT mode falls back to virtual (not implemented)

3. **ModeContext** (`ModeContext.tsx`)
   - Manages application mode (online/offline/demo)
   - Controls data mode (real/mock)
   - Persists mode to localStorage

4. **BacktestContext** (`BacktestContext.tsx`)
   - Manages backtesting state and results

5. **LiveDataContext** (`components/LiveDataContext.tsx`)
   - Provides live data updates via WebSocket

### Hooks

**Location:** `src/hooks/`

1. `useWebSocket.ts` - WebSocket connection management
2. `useSignalWebSocket.ts` - Signal-specific WebSocket
3. `useOHLC.ts` - OHLC data fetching
4. `useStrategyPipeline.ts` - Strategy pipeline operations
5. `useDebouncedEffect.ts` - Debounced side effects
6. `useForm.ts` - Form state management
7. `useOnlineStatus.ts` - Online/offline detection
8. `useSafeAsync.ts` - Safe async operations

### Routing

**File:** `src/components/Navigation/NavigationProvider.tsx`
- Client-side routing via context (no React Router)
- View switching via `currentView` state
- Sidebar navigation integration

**Supported Routes:**
- `dashboard`, `charting`, `market`, `scanner`, `training`, `risk`, `professional-risk`
- `backtest`, `strategyBuilder`, `health`, `settings`, `futures`, `trading`
- `portfolio`, `enhanced-trading`, `positions`, `strategylab`, `strategy-insights`
- `exchange-settings`, `monitoring`, `diagnostics`

---

## Backend Architecture

### Server Entry Point

**File:** `src/server.ts` (4064 lines)

**Initialization Flow:**
1. Loads environment variables via `dotenv`
2. Configures proxy (optional, for Binance only)
3. Sets up axios defaults (timeout, redirects, validation)
4. Initializes Express app + HTTP server
5. Creates WebSocket server at `/ws`
6. Initializes all services (singletons)
7. Sets up middleware (helmet, CORS, JSON parsing, metrics)
8. Registers all API routes
9. Starts server on configured PORT

**Key Services Initialized:**
- `Database` (Better-SQLite3)
- `BinanceService` + `KuCoinService`
- `MarketDataIngestionService`
- `RedisService` (optional)
- `DataValidationService`
- `EmergencyDataFallbackService`
- `AlertService` + `NotificationService`
- Analysis services (SMC, Elliott Wave, Harmonic, Sentiment, Whale)
- Trading services (`RealTradingService`, `OrderManagementService`)
- Data services (`MultiProviderMarketDataService`, `HFDataEngineAdapter`)
- AI services (`TrainingEngine`, `BullBearAgent`, `BacktestEngine`)

### Controllers

**Location:** `src/controllers/`

1. **AIController** (`AIController.ts`)
   - AI model initialization, training, prediction
   - Feature extraction, backtesting

2. **AnalysisController** (`AnalysisController.ts`)
   - Signal analysis endpoints
   - SMC, Elliott Wave, Harmonic pattern analysis
   - Sentiment and whale activity analysis

3. **TradingController** (`TradingController.ts`)
   - Trade execution endpoints
   - Portfolio and position management
   - Market data endpoints

4. **MarketDataController** (`MarketDataController.ts`)
   - Market data fetching
   - Price aggregation from multiple providers

5. **SystemController** (`SystemController.ts`)
   - System configuration
   - Health checks
   - Cache management

6. **ScoringController** (`ScoringController.ts`)
   - Scoring snapshot generation
   - Weight management
   - Live scoring endpoints

7. **StrategyPipelineController** (`StrategyPipelineController.ts`)
   - Strategy pipeline execution
   - Pipeline status monitoring

8. **TuningController** (`TuningController.ts`)
   - Scoring weight tuning
   - Tuning result management

9. **SystemStatusController** (`SystemStatusController.ts`)
   - System status aggregation
   - Feature flag reporting

10. **HFDataEngineController** (`HFDataEngineController.ts`)
    - HuggingFace Data Engine integration
    - Provider health monitoring
    - Rate limit tracking

11. **DataSourceController** (`DataSourceController.ts`)
    - Data source configuration
    - Runtime source switching

12. **FuturesController** (`FuturesController.ts`)
    - Futures-specific endpoints

### Routes

**Location:** `src/routes/`

**Active Routes:**
1. `dataSource.ts` - Data source configuration routes
2. `diagnosticsRoute.ts` - Provider diagnostics

**Commented Out (Missing):**
- `futures.js` - Futures routes (commented in server.ts)
- `offline.js` - Offline mode routes
- `systemDiagnostics.js` - System diagnostics
- `system.metrics.js` - Metrics routes
- `market.universe.js` - Market universe
- `market.readiness.js` - Market readiness
- `ml.js` - ML routes
- `news.js` - News routes
- `strategyTemplates.js` - Strategy templates
- `strategy.apply.js` - Strategy application
- `backtest.js` - Backtest routes
- `hf.js` - HuggingFace routes
- `resource-monitor.js` - Resource monitoring
- `optional-public.js` - Optional public APIs
- `optional-news.js` - Optional news APIs
- `optional-market.js` - Optional market APIs
- `optional-onchain.js` - Optional onchain APIs

### API Endpoints (From server.ts)

**Health & Status:**
- `GET /status/health` - Simple health check
- `GET /api/health` - Comprehensive health check
- `GET /metrics` - Prometheus metrics
- `GET /api/system/status` - System status
- `GET /api/system/health` - System health
- `GET /api/system/config` - System configuration

**Data Pipeline:**
- `GET /api/data-pipeline/status` - Pipeline status
- `POST /api/data-pipeline/emergency-mode` - Emergency mode toggle
- `POST /api/data-pipeline/add-symbol` - Add symbol to pipeline

**AI:**
- `GET /api/ai/test-initialization` - Test AI initialization
- `GET /api/ai/test-activations` - Test activations
- `POST /api/ai/create-network` - Create neural network
- `POST /api/ai/train-step` - Training step
- `POST /api/ai/train-epoch` - Training epoch
- `POST /api/ai/predict` - Generate prediction
- `POST /api/ai/extract-features` - Extract features
- `POST /api/ai/backtest` - Run backtest

**Analysis:**
- `POST /api/analysis/signals` - Generate signals
- `POST /api/analysis/smc` - SMC analysis
- `POST /api/analysis/elliott` - Elliott Wave analysis
- `POST /api/analysis/harmonic` - Harmonic pattern analysis
- `POST /api/analysis/sentiment` - Sentiment analysis
- `POST /api/analysis/whale` - Whale activity analysis

**Trading:**
- `GET /api/trading/portfolio` - Get portfolio
- `GET /api/trading/market/:symbol` - Market data
- `POST /api/trade/execute` - Execute trade
- `GET /api/trade/open-positions` - Get positions
- `POST /api/orders/market` - Place market order
- `POST /api/orders/limit` - Place limit order
- `POST /api/orders/stop-loss` - Place stop-loss order
- `POST /api/orders/trailing-stop` - Place trailing stop
- `POST /api/orders/oco` - Place OCO order
- `DELETE /api/orders/:id` - Cancel order
- `GET /api/orders/:id` - Get order
- `GET /api/orders` - List orders
- `GET /api/positions` - Get positions
- `GET /api/orders/portfolio` - Portfolio orders

**Market Data:**
- `GET /api/market-data/prices` - Get prices
- `GET /api/market-data/:symbol` - Symbol data
- `GET /api/market/real-prices` - Real prices
- `GET /api/market/coingecko-prices` - CoinGecko prices
- `GET /api/market/cryptocompare-prices` - CryptoCompare prices
- `GET /api/market/prices` - Aggregated prices
- `GET /api/market/historical` - Historical data
- `GET /api/market/analysis/:symbol` - Market analysis
- `GET /api/price/:symbol` - Price for symbol
- `GET /api/ticker/:symbol?` - Ticker data
- `GET /market/ohlcv` - OHLCV data
- `GET /market/prices` - Market prices
- `GET /market/candlestick/:symbol` - Candlestick data
- `GET /providers/binance/ohlcv` - Binance OHLCV

**Scoring:**
- `GET /api/scoring/snapshot` - Scoring snapshot
- `GET /api/scoring/verdict` - Scoring verdict
- `GET /api/scoring/weights` - Get weights
- `POST /api/scoring/weights` - Update weights
- `POST /api/scoring/weights/reset` - Reset weights
- `GET /api/scoring/weights/history` - Weight history
- `GET /api/scoring/live/:symbol` - Live scoring
- `GET /api/scoring/stream-status` - Stream status
- `POST /api/scoring/config` - Update scoring config

**Strategy Pipeline:**
- `POST /api/strategies/pipeline/run` - Run pipeline
- `GET /api/strategies/pipeline/status` - Pipeline status

**Tuning:**
- `POST /api/tuning/run` - Run tuning
- `GET /api/tuning/result/:id` - Get tuning result
- `GET /api/tuning/latest` - Latest tuning
- `GET /api/tuning/all` - All tuning results
- `DELETE /api/tuning/result/:id` - Delete tuning result

**HuggingFace Data Engine:**
- `GET /api/hf-engine/health` - HF engine health
- `GET /api/hf-engine/status` - HF engine status
- `GET /api/hf-engine/providers` - Provider list
- `GET /api/hf-engine/prices` - HF prices
- `GET /api/hf-engine/market/overview` - Market overview
- `GET /api/hf-engine/categories` - Categories
- `GET /api/hf-engine/rate-limits` - Rate limits
- `GET /api/hf-engine/logs` - Logs
- `GET /api/hf-engine/alerts` - Alerts
- `GET /api/hf-engine/hf/health` - HF health
- `POST /api/hf-engine/hf/refresh` - Refresh HF
- `GET /api/hf-engine/hf/registry` - HF registry
- `POST /api/hf-engine/hf/sentiment` - HF sentiment

**Alerts:**
- `POST /api/alerts` - Create alert
- `GET /api/alerts` - List alerts
- `DELETE /api/alerts/:id` - Delete alert
- `GET /api/alerts/analytics` - Alert analytics
- `POST /api/alerts/:id/success` - Mark success
- `POST /api/alerts/:id/false-positive` - Mark false positive

**Telegram:**
- `GET /api/telegram/config` - Get config
- `POST /api/telegram/config` - Update config
- `POST /api/telegram/test` - Test connection
- `POST /api/telegram/webhook` - Webhook endpoint

**System:**
- `GET /api/system/cache/stats` - Cache statistics
- `POST /api/system/cache/clear` - Clear cache
- `GET /api/providers/status` - Provider status
- `POST /api/providers/reload` - Reload providers
- `GET /api/providers/categories` - Provider categories
- `GET /api/providers/:category` - Category providers

**Signals:**
- `POST /api/signals/analyze` - Analyze signals
- `POST /api/signals/start` - Start signal generation
- `POST /api/signals/stop` - Stop signal generation
- `GET /api/signals/history` - Signal history
- `GET /api/signals` - List signals
- `GET /api/signals/statistics` - Signal statistics
- `GET /api/signals/config` - Signal config
- `GET /api/signals/current` - Current signals

**Orchestrator:**
- `GET /api/orchestrator/status` - Orchestrator status
- `POST /api/orchestrator/configure` - Configure orchestrator
- `POST /api/orchestrator/start` - Start orchestrator
- `POST /api/orchestrator/stop` - Stop orchestrator

**Whale & Blockchain:**
- `GET /api/whale/transactions` - Whale transactions
- `POST /api/blockchain/balances` - Blockchain balances

**Portfolio & Risk:**
- `GET /api/portfolio` - Portfolio data
- `GET /api/risk/metrics` - Risk metrics

**News & Sentiment:**
- `GET /api/news/latest` - Latest news
- `GET /api/news/crypto` - Crypto news
- `GET /api/sentiment` - Sentiment data
- `GET /api/sentiment/fear-greed` - Fear & Greed Index
- `GET /api/social/aggregate` - Social aggregation

**Continuous Learning:**
- `POST /api/continuous-learning/start` - Start learning
- `POST /api/continuous-learning/stop` - Stop learning
- `GET /api/continuous-learning/stats` - Learning stats
- `GET /api/continuous-learning/config` - Learning config

**Proxy:**
- `GET /proxy/news` - News proxy
- `GET /proxy/fear-greed` - Fear & Greed proxy
- `GET /api/proxy/*` - Unified proxy (via UnifiedProxyService)

**Data Source Config:**
- `GET /api/config/data-source` - Get data source config
- `POST /api/config/data-source` - Update data source config

**Diagnostics:**
- `GET /diagnostics` - Full diagnostics
- `GET /diagnostics/:provider` - Provider diagnostics
- `POST /diagnostics/clear` - Clear diagnostics
- `POST /diagnostics/clear/:provider` - Clear provider diagnostics

### Services

**Location:** `src/services/`

**Exchange Services:**
- `BinanceService.ts` - Binance API integration
- `KuCoinService.ts` - KuCoin API integration
- `KuCoinFuturesService.ts` - KuCoin Futures API
- `ExchangeClient.ts` - **Unified exchange client (SPOT not implemented)**

**Data Services:**
- `RealDataManager.ts` - Real data management
- `RealDataManager-old.ts` - Legacy real data manager
- `MultiProviderMarketDataService.ts` - Multi-provider aggregation
- `EnhancedMarketDataService.ts` - Enhanced market data
- `MarketDataIngestionService.ts` - Data ingestion pipeline
- `HistoricalDataService.ts` - Historical data fetching
- `HFDataEngineClient.ts` - HuggingFace Data Engine client
- `HFDataEngineAdapter.ts` - HF adapter layer
- `HFOHLCVService.ts` - HF OHLCV service
- `HFSentimentService.ts` - HF sentiment service
- `FallbackDataManager.ts` - Fallback data management
- `EmergencyDataFallbackService.ts` - Emergency fallback
- `DataValidationService.ts` - Data validation
- `DataRefreshCoordinator.ts` - Data refresh coordination

**Analysis Services:**
- `SMCAnalyzer.ts` - Smart Money Concepts analysis
- `ElliottWaveAnalyzer.ts` - Elliott Wave analysis
- `HarmonicPatternDetector.ts` - Harmonic patterns
- `FibonacciDetector.ts` - Fibonacci retracements
- `ParabolicSARDetector.ts` - Parabolic SAR
- `RegimeDetector.ts` - Market regime detection
- `SentimentAnalysisService.ts` - Sentiment analysis
- `SentimentNewsService.ts` - News sentiment
- `WhaleTrackerService.ts` - Whale activity tracking
- `TechnicalAnalysisService.ts` - Technical indicators
- `SocialAggregationService.ts` - Social media aggregation
- `FearGreedService.ts` - Fear & Greed Index

**Trading Services:**
- `RealTradingService.ts` - Real trading execution
- `VirtualTradingService.ts` - Virtual trading simulation
- `OrderManagementService.ts` - Order management
- `FuturesService.ts` - Futures trading service
- `SignalGeneratorService.ts` - Signal generation
- `ServiceOrchestrator.ts` - Service orchestration

**AI Services:**
- `aiService.ts` - AI service wrapper
- `aiPredictionService.ts` - AI predictions
- `ContinuousLearningService.ts` - Continuous learning

**Other Services:**
- `AlertService.ts` - Alert management
- `NotificationService.ts` - Notifications
- `TelegramService.ts` - Telegram integration
- `RedisService.ts` - Redis caching (optional)
- `DynamicWeightingService.ts` - Dynamic weight adjustment
- `FrontendBackendIntegration.ts` - Frontend-backend integration
- `SignalVisualizationWebSocketService.ts` - Signal visualization WS
- `UnifiedProxyService.ts` - Unified proxy service
- `CORSProxyService.ts` - CORS proxy
- `CentralizedAPIManager.ts` - Centralized API management
- `APIHealthChecker.ts` - API health checking
- `ResourceMonitorService.ts` - Resource monitoring
- `ProfessionalRiskEngine.ts` - Professional risk engine

---

## Trading System

### Trade Engine

**File:** `src/engine/trading/TradeEngine.ts`

**Functionality:**
- Executes trade signals from multiple sources
- Supports SPOT and FUTURES markets (SPOT not implemented)
- Integrates with `RiskGuard` for risk checks
- Supports trading modes: `OFF`, `DRY_RUN`, `TESTNET`
- Uses `ExchangeClient` for order placement
- Saves orders to database

**Execution Flow:**
1. Check trading mode (OFF blocks all trades)
2. Check signal action (HOLD skips execution)
3. Run risk guard checks (market-aware)
4. Get current price from database
5. Calculate quantity in base currency
6. Get leverage from risk config (FUTURES only)
7. Place order (real or simulated based on mode)
8. Save order to database
9. Return execution result

**Key Methods:**
- `executeSignal(signal, quantityUSDT?)` - Execute trade signal
- `setDefaultTradeSize(sizeUSDT)` - Set default trade size
- `getDefaultTradeSize()` - Get default trade size

### Risk Guard

**File:** `src/engine/trading/RiskGuard.ts`

**Functionality:**
- Evaluates trade risk before execution
- Supports separate configs for SPOT and FUTURES
- Blocks trades when data unavailable (no fake data)

**Risk Checks:**
1. Position size limit (market-specific)
2. Max open positions (FUTURES only)
3. Minimum account balance
4. Daily loss limit
5. Market data availability
6. Risk per trade percentage

**Configuration:**
- Loads from `config/risk.config.json`
- Supports legacy single config or new dual config
- Default configs provided if file missing

**Key Methods:**
- `checkTradeRisk(input)` - Check if trade passes risk requirements
- `getConfig()` - Get current risk configuration
- `reloadConfig()` - Reload configuration from file

**Limitations:**
- SPOT balance check not fully implemented (blocks for safety)
- Uses FUTURES account info for SPOT checks (temporary)

### Exchange Client

**File:** `src/services/exchange/ExchangeClient.ts`

**Functionality:**
- Unified interface for SPOT and FUTURES trading
- Wraps `KuCoinFuturesService` for futures
- **SPOT trading: Structure exists but not implemented**

**Methods:**
- `placeOrder(params)` - Place order (routes to SPOT/FUTURES)
- `placeFuturesOrder(params)` - **Fully implemented**
- `placeSpotOrder(params)` - **Returns NOT_IMPLEMENTED error**
- `getOpenPositions()` - Get FUTURES positions
- `getSpotBalances()` - **Returns zero balances + notImplemented flag**
- `getAccountInfo()` - Get FUTURES account info

**SPOT Implementation Status:**
- Method signatures exist
- Returns structured error: "SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete"
- No fake data - honest error responses

### Futures Service

**File:** `src/services/KuCoinFuturesService.ts`

**Functionality:**
- Full KuCoin Futures testnet integration
- Order placement, position management, account info
- WebSocket support for real-time updates

**Key Features:**
- Place market/limit orders
- Get positions and orders
- Account balance and equity
- Leverage management
- Margin mode (CROSS/ISOLATED)

### Signal Engine

**File:** `src/engine/SignalEngine.ts`

**Functionality:**
- Multi-timeframe signal generation
- Aggregates signals from multiple timeframes
- Sends alerts for high-severity signals

**Flow:**
1. Analyze each timeframe independently
2. Score each timeframe using `AdaptiveScoringEngine`
3. Build final signal from all timeframes
4. Send alert if severity is high

**Key Function:**
- `generateSignal(symbol, timeframes, fetcher)` - Generate multi-TF signal

### Scoring Engine

**File:** `src/engine/AdaptiveScoringEngine.ts`

**Functionality:**
- Adaptive scoring with hot-reloadable config
- Multi-detector analysis (SMC, Elliott, Harmonic, Fibonacci, SAR)
- Regime detection integration
- Weight normalization

**Detectors:**
- SMC (Smart Money Concepts)
- Elliott Wave
- Harmonic Patterns
- Fibonacci Retracements
- Parabolic SAR
- Price Action
- Sentiment (external)
- News (external)
- Whales (external)

**Configuration:**
- Loads from `config/scoring.config.json`
- Hot-reload support (30s default interval)
- Default config if file missing

**Scoring Flow:**
1. Check minimum bars (50 required)
2. Calculate technical indicators (RSI, MACD, ATR)
3. Run pattern detectors
4. Aggregate scores with weights
5. Apply regime detection
6. Generate final signal (BUY/SELL/HOLD)

---

## Data Providers & Integration

### Primary Data Source: HuggingFace Data Engine

**Configuration:** `src/config/dataSource.ts`

**Supported Sources:**
1. **HuggingFace** (primary, fully implemented)
2. **Binance** (fallback, partial - returns NOT_IMPLEMENTED)
3. **KuCoin** (fallback, partial - returns NOT_IMPLEMENTED)
4. **Mixed** (HF with exchange fallback)

**HF Data Engine Integration:**
- `HFDataEngineClient.ts` - Direct client
- `HFDataEngineAdapter.ts` - Adapter layer with fallback
- `HFOHLCVService.ts` - OHLCV data service
- `HFSentimentService.ts` - Sentiment service

**Endpoints:**
- `/api/hf-engine/*` - HF engine endpoints
- Health, status, providers, prices, market overview
- Rate limits, logs, alerts

**Adapter Pattern:**
- `HFMarketAdapter.ts` - Market data adapter
- `HFSignalsAdapter.ts` - Signals adapter (NOT_IMPLEMENTED)
- `HFAnalysisAdapter.ts` - Analysis adapter (NOT_IMPLEMENTED)
- `HFHealthAdapter.ts` - Health adapter
- `HFProxyAdapter.ts` - Proxy adapter (NOT_IMPLEMENTED)

### Exchange Providers

**Binance:**
- `BinanceService.ts` - Full implementation
- WebSocket support for real-time data
- Rate limiting and connection health tracking

**KuCoin:**
- `KuCoinService.ts` - Full implementation
- `KuCoinFuturesService.ts` - Futures-specific
- WebSocket support
- Rate limiting

**Limitations:**
- Direct Binance/KuCoin usage returns NOT_IMPLEMENTED in Phase 2
- HuggingFace is recommended primary source

### Data Flow

**Primary Flow (HuggingFace):**
1. Frontend requests data via API
2. Backend routes to `HFDataEngineAdapter`
3. Adapter calls HuggingFace Data Engine
4. Data Engine aggregates from multiple providers
5. Response returned to frontend

**Fallback Flow (Mixed Mode):**
1. Try HuggingFace first
2. On failure, fall back to Binance/KuCoin
3. Return error if all fail

**Emergency Mode:**
- `EmergencyDataFallbackService` activates on persistent failures
- Uses cached data or synthetic data (if allowed)

---

## Data Flow Analysis

### Frontend → Backend → Provider Flow

**Price Data Request:**
```
Frontend Component
  ↓ (useOHLC hook or DataContext)
API Client (lib/apiClient.ts)
  ↓ (GET /api/market/prices)
Backend Express Route (server.ts)
  ↓ (MarketDataController or direct handler)
MultiProviderMarketDataService
  ↓ (or HFDataEngineAdapter)
HFDataEngineClient
  ↓ (HTTP request)
HuggingFace Data Engine
  ↓ (aggregates from CoinGecko/CMC/etc)
Response
  ↓ (back through chain)
Frontend Component (updates state)
```

**Signal Generation Flow:**
```
Frontend ScannerView
  ↓ (user action or auto-refresh)
API Request (POST /api/signals/analyze)
Backend SignalGeneratorService
  ↓ (orchestrates)
Analysis Services:
  - SMCAnalyzer
  - ElliottWaveAnalyzer
  - HarmonicPatternDetector
  - SentimentAnalysisService
  - WhaleTrackerService
  ↓ (each fetches data)
Data Providers (HF/Binance/KuCoin)
  ↓ (returns data)
Analysis Services (process data)
  ↓ (returns scores)
SignalGeneratorService (aggregates)
  ↓ (generates final signal)
Response to Frontend
  ↓ (displays in UI)
```

**Trading Execution Flow:**
```
Frontend TradingView
  ↓ (user clicks "Place Order")
API Request (POST /api/trade/execute)
Backend TradingController
  ↓ (creates TradeSignal)
TradeEngine.executeSignal()
  ↓ (checks mode, risk)
RiskGuard.checkTradeRisk()
  ↓ (validates risk)
ExchangeClient.placeOrder()
  ↓ (routes to market)
KuCoinFuturesService.placeOrder()
  ↓ (HTTP request)
KuCoin Futures Testnet API
  ↓ (returns order result)
TradeEngine (saves to database)
  ↓ (returns result)
Frontend (updates UI)
```

**WebSocket Data Flow:**
```
Backend WebSocket Server (/ws)
  ↓ (broadcasts)
Connected Clients (Set<WebSocket>)
  ↓ (sends message)
Frontend useWebSocket hook
  ↓ (receives message)
Context/Component State Update
  ↓ (triggers re-render)
UI Updates
```

---

## WebSocket Architecture

### WebSocket Server

**File:** `src/server.ts` (lines 150-154)

**Setup:**
- Created via `ws` library
- Path: `/ws`
- Attached to HTTP server
- Heartbeat mechanism for dead connection detection

**Heartbeat:**
- `src/server/wsHeartbeat.ts`
- Pings clients every 30 seconds
- Closes dead connections

### WebSocket Channels

**1. Main Channel (`/ws`)**
- General market data and signals
- Broadcasts to all connected clients
- Signal updates from `SignalGeneratorService`

**2. Futures Channel (`/ws/futures`)**
- **File:** `src/ws/futuresChannel.ts`
- Futures-specific updates (positions, orders, funding rates)
- Only active if `FEATURE_FUTURES=true`
- Updates every 5 seconds

**3. Score Stream Gateway**
- **File:** `src/ws/ScoreStreamGateway.ts`
- Live scoring updates
- Configurable broadcast interval (default 30s)
- Symbol subscription support
- Only active if `liveScoring` feature enabled

**4. Signal Visualization WebSocket**
- `SignalVisualizationWebSocketService.ts`
- Signal visualization updates

### WebSocket Message Types

**Main Channel:**
- `signal` - New signal generated
- `price_update` - Price update
- `market_data` - Market data update

**Futures Channel:**
- `futures_connected` - Connection confirmation
- `position_update` - Position update
- `order_update` - Order update
- `funding_tick` - Funding rate update
- `error` - Error message

**Score Stream:**
- `score_stream_connected` - Connection confirmation
- `score_update` - Score update
- `stream_status` - Stream status
- `subscribed` - Subscription confirmation
- `configured` - Configuration update
- `error` - Error message

**Client Messages:**
- `subscribe` - Subscribe to symbols
- `configure` - Update stream configuration
- `get_latest` - Get latest scores
- `get_status` - Get stream status
- `subscribe_positions` - Subscribe to positions
- `subscribe_orders` - Subscribe to orders
- `get_positions` - Get positions
- `get_orders` - Get orders

### Frontend WebSocket Hooks

**useWebSocket** (`src/hooks/useWebSocket.ts`):
- General WebSocket connection
- Auto-reconnect logic
- Message handling

**useSignalWebSocket** (`src/hooks/useSignalWebSocket.ts`):
- Signal-specific WebSocket
- Signal message parsing
- State updates

---

## Missing Features & Incomplete Implementations

### Critical Missing Features

**1. SPOT Trading**
- **Status:** Structure exists, NOT IMPLEMENTED
- **Files:**
  - `src/services/exchange/ExchangeClient.ts` (lines 169-187)
  - `src/engine/trading/RiskGuard.ts` (lines 171-177)
- **Evidence:**
  - `placeSpotOrder()` returns error: "SPOT trading not implemented"
  - `getSpotBalances()` returns zero + `notImplemented: true`
  - RiskGuard blocks SPOT trades: "SPOT balance check not fully implemented"
- **UI Impact:**
  - `src/components/trading/SpotNotAvailable.tsx` - Shows "SPOT not available"
  - `src/views/TradingView.tsx` - Disabled with notice
  - `src/views/UnifiedTradingView.tsx` - Shows warning

**2. Missing Route Files**
- **Status:** Referenced in server.ts but commented out
- **Files:**
  - `routes/futures.js` - Futures routes
  - `routes/offline.js` - Offline mode
  - `routes/systemDiagnostics.js` - System diagnostics
  - `routes/system.metrics.js` - Metrics
  - `routes/market.universe.js` - Market universe
  - `routes/market.readiness.js` - Market readiness
  - `routes/ml.js` - ML routes
  - `routes/news.js` - News routes
  - `routes/strategyTemplates.js` - Strategy templates
  - `routes/strategy.apply.js` - Strategy application
  - `routes/backtest.js` - Backtest routes
  - `routes/hf.js` - HuggingFace routes
  - `routes/resource-monitor.js` - Resource monitoring
  - `routes/optional-public.js` - Optional public APIs
  - `routes/optional-news.js` - Optional news APIs
  - `routes/optional-market.js` - Optional market APIs
  - `routes/optional-onchain.js` - Optional onchain APIs

**3. HuggingFace Adapters (Partial)**
- **HFSignalsAdapter:** Returns NOT_IMPLEMENTED
  - Signal history via HF not implemented
  - Signal generation via HF not implemented
- **HFAnalysisAdapter:** Returns NOT_IMPLEMENTED
  - SMC analysis via HF not implemented
  - Elliott Wave analysis via HF not implemented
- **HFProxyAdapter:** Returns NOT_IMPLEMENTED
  - News aggregation via HF not implemented
  - Fear & Greed via HF not implemented

**4. Direct Exchange Usage (Phase 2)**
- **Status:** Returns NOT_IMPLEMENTED errors
- **Evidence:** `src/controllers/DataSourceController.ts` (line 134)
  - "Only HuggingFace is fully implemented. Other sources may return NOT_IMPLEMENTED errors."

**5. ML Integration**
- **Status:** ML scoring not implemented in live scoring
- **Evidence:** `src/engine/live/ScoringLiveService.ts` (line 271)
  - Comment: "ML: Not implemented (would need ML model integration)"

### Incomplete Implementations

**1. SPOT Balance Check**
- **File:** `src/engine/trading/RiskGuard.ts` (lines 171-177)
- **Issue:** Blocks all SPOT trades for safety
- **Reason:** SPOT balance verification not available

**2. Daily PnL Calculation**
- **File:** `src/engine/trading/RiskGuard.ts` (lines 254-273)
- **Issue:** Uses unrealized PnL as proxy
- **Note:** Conservative approach - returns null if unavailable

**3. Excel/PDF Export**
- **File:** `src/services/backtestService.ts` (lines 646-650)
- **Issue:** Not implemented in browser environment
- **Throws:** Error if attempted

**4. Sentiment Data**
- **File:** `src/detectors/sentiment.ts` (line 36)
- **Issue:** May return incomplete data
- **Fallback:** Uses neutral baseline

**5. Portfolio Historical Tracking**
- **Files:** Multiple views reference this
- **Issue:** Requires historical portfolio data tracking (not implemented)
- **Evidence:** `src/views/DashboardView.tsx` (line 273)

### Deprecated/Unused Code

**1. Deprecated Fields**
- **File:** `src/types/signals.ts` (line 91)
  - `finalScore` - DEPRECATED, use `score` instead

**2. Legacy Data Managers**
- `src/services/RealDataManager-old.ts` - Legacy version
- `src/services/RealDataManager-new.ts.bak` - Backup file
- `src/services/RealDataManager-backup.ts.bak` - Backup file

**3. Backup Views**
- `src/views/__backup__/` - Archived view versions
- `src/views/__legacy__/` - Legacy components

**4. Commented Routes**
- Multiple route imports commented in `server.ts` (lines 109-129)

### TODO Markers Found

**1. Connector Refactoring**
- **File:** `src/components/connectors/index.ts` (line 12)
  - "TODO: Refactor these remaining connectors to use contexts"

**2. Signal Engine Migration**
- **File:** `src/lib/signalEngine.ts` (line 22)
  - "TODO: Migrate ScannerView to use the new engine/SignalEngine"

**3. Real Logic Placeholder**
- **File:** `src/server-real-data.ts` (line 1602)
  - "TODO: plug in your real logic here"

**4. GA Implementation**
- **File:** `src/engine/tuning/ScoringTuner.ts` (line 288)
  - "Note: Full GA implementation would require: [additional features]"

---

## Type System & Interfaces

### Core Types

**Location:** `src/types/index.ts`

**Key Types:**
- `MarketData` - OHLCV data structure
- `TradeSignal` - Trade signal from various sources
- `TradeExecutionResult` - Trade execution result
- `PlaceOrderParams` - Order placement parameters
- `PlaceOrderResult` - Order placement result
- `PositionResult` - Position information
- `AccountInfo` - Account information
- `RiskGuardConfig` - Risk guard configuration
- `MarketRiskConfig` - Market-specific risk config
- `TradingMode` - 'OFF' | 'DRY_RUN' | 'TESTNET'
- `TradingMarket` - 'SPOT' | 'FUTURES' | 'BOTH'
- `SystemConfig` - System configuration
- `SystemStatusResponse` - System status

### Signal Types

**Location:** `src/types/signals.ts`

**Key Types:**
- `Action` - 'BUY' | 'SELL' | 'HOLD'
- `CoreSignal` - Core signal structure
- `LayerScore` - Layer scoring
- `PatternScores` - Pattern detection scores
- `AuxScores` - Auxiliary scores
- `SentimentScores` - Sentiment scores
- `CategoryScore` - Category-level scoring
- `EffectiveWeights` - Effective weight configuration
- `TelemetrySummary` - Telemetry summary
- `FinalDecision` - Final trading decision

### Futures Types

**Location:** `src/types/futures.ts`

**Key Types:**
- `FuturesPosition` - Futures position
- `FuturesOrder` - Futures order
- `LeverageSettings` - Leverage configuration
- `FundingRate` - Funding rate data
- `FuturesAccountBalance` - Futures account balance
- `FuturesOrderbook` - Order book data

### Strategy Pipeline Types

**Location:** `src/types/strategyPipeline.ts`

**Key Types:**
- Strategy pipeline configuration
- Pipeline execution results
- Strategy template types

---

## Configuration System

### Environment Variables

**Key Variables:**
- `PORT` - Server port (default: 8001)
- `NODE_ENV` - Environment mode
- `PRIMARY_DATA_SOURCE` - Data source ('huggingface' | 'binance' | 'kucoin' | 'mixed')
- `HF_ENGINE_BASE_URL` - HuggingFace Data Engine URL
- `HF_ENGINE_ENABLED` - Enable/disable HF engine
- `HF_ENGINE_TIMEOUT` - Request timeout (ms)
- `BINANCE_ENABLED` - Enable Binance
- `KUCOIN_ENABLED` - Enable KuCoin
- `FEATURE_FUTURES` - Enable futures trading
- `DISABLE_REDIS` - Disable Redis caching
- `TRADING_MODE` - Trading mode ('OFF' | 'DRY_RUN' | 'TESTNET')
- `TRADING_MARKET` - Trading market ('SPOT' | 'FUTURES' | 'BOTH')

### Configuration Files

**1. System Config**
- **File:** `config/system.config.json`
- **Manager:** `src/config/systemConfig.ts`
- **Contains:** Feature flags, environment modes, trading config

**2. Risk Config**
- **File:** `config/risk.config.json`
- **Manager:** `src/engine/trading/RiskGuard.ts`
- **Contains:** Risk limits for SPOT and FUTURES

**3. Scoring Config**
- **File:** `config/scoring.config.json`
- **Manager:** `src/engine/AdaptiveScoringEngine.ts`
- **Contains:** Scoring weights, thresholds, detector configs

**4. API Config**
- **File:** `config/api.json`
- **Manager:** `src/core/ConfigManager.ts`
- **Contains:** API keys, provider configs, cache TTLs

**5. Data Source Config**
- **Manager:** `src/config/dataSource.ts`
- **Runtime:** Can be changed via API

**6. Feature Flags**
- **File:** `src/config/flags.ts`
- **Contains:** Feature flags (FUTURES, Redis, etc.)

**7. Data Policy**
- **File:** `src/config/dataPolicy.ts`
- **Contains:** Data policy enforcement (online/demo modes)

### Configuration Loading

**System Config:**
- Loads from `config/system.config.json`
- Falls back to defaults if missing
- Validates structure on load
- Supports hot-reload

**Risk Config:**
- Loads from `config/risk.config.json`
- Falls back to defaults if missing
- Supports legacy single config or new dual config

**Scoring Config:**
- Loads from `config/scoring.config.json`
- Falls back to defaults if missing
- Hot-reload support (30s default interval)

---

## Summary

### Architecture Strengths

1. **Modular Design:** Clear separation of concerns (controllers, services, engines)
2. **Type Safety:** Comprehensive TypeScript types throughout
3. **Error Handling:** Honest error responses (no fake data)
4. **WebSocket Support:** Real-time updates for multiple channels
5. **Multi-Provider:** HuggingFace Data Engine with exchange fallbacks
6. **Risk Management:** Comprehensive risk guard system
7. **Configuration:** Flexible config system with hot-reload

### Architecture Weaknesses

1. **SPOT Trading:** Not implemented (structure only)
2. **Missing Routes:** Many route files referenced but missing
3. **Incomplete Adapters:** Several HF adapters return NOT_IMPLEMENTED
4. **Legacy Code:** Multiple backup/legacy files present
5. **Direct Exchange Usage:** Returns NOT_IMPLEMENTED in Phase 2
6. **ML Integration:** Not implemented in live scoring

### Recommendations

1. **Implement SPOT Trading:** Complete KuCoin SPOT testnet integration
2. **Create Missing Routes:** Implement commented route files
3. **Complete HF Adapters:** Implement missing HF adapter methods
4. **Clean Up Legacy Code:** Remove backup/legacy files
5. **ML Integration:** Integrate ML scoring into live scoring service
6. **Documentation:** Update documentation to reflect actual implementation status

---

**End of Report**
