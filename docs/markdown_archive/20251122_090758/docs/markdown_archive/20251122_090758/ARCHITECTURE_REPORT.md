# Complete Architecture Report
## DreammakerCryptoSignalAndTrader

**Generated:** Based on direct code inspection (no assumptions)  
**Date:** 2025-11-16  
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
11. [Summary](#summary)

---

## Executive Summary

**DreammakerCryptoSignalAndTrader** is an advanced cryptocurrency trading signal analysis platform with AI-powered insights and automated trading capabilities. The project combines technical analysis, Smart Money Concepts (SMC), pattern recognition, sentiment analysis, and machine learning to generate actionable trading signals.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Lucide React for icons
- Custom navigation provider (no React Router)

**Backend:**
- Node.js (>=18.0.0) with Express
- WebSocket (ws) for real-time communication
- Better-SQLite3 for local database
- TypeScript for type safety

**Database:**
- SQLite (Better-SQLite3) for configuration and caching
- Optional Redis support for distributed caching (IORedis)

### Trading Capabilities

**Implemented:**
- **FUTURES Trading:** Fully operational via KuCoin Futures Testnet API
  - Real order placement, position tracking, account balance queries
  - Leverage management (configurable via risk config)
  - Multiple trading modes: OFF, DRY_RUN, TESTNET
  - Market order execution with risk guards

**Partially Implemented:**
- **SPOT Trading:** Structure in place but KuCoin SPOT testnet API not integrated
  - ExchangeClient explicitly returns `NOT_IMPLEMENTED` errors for SPOT orders
  - UI component (`SpotNotAvailable.tsx`) explicitly informs users SPOT is unavailable
  - Risk guard blocks SPOT balance verification with safety fallback

### Main External Providers

**Primary Data Source:** HuggingFace Data Engine
- Base URL: `https://really-amin-datasourceforcryptocurrency.hf.space`
- Used for cryptocurrency prices, market overview, OHLCV data
- Configured as primary source in `PRIMARY_DATA_SOURCE=huggingface`

**Exchange Integrations:**
- **Binance Service:** HTTP client for Binance Testnet (market data only)
- **KuCoin Service:** HTTP client for KuCoin Futures Testnet (trading + market data)
- **Exchange Client:** Unified interface wrapping KuCoin Futures Service

**Optional Providers (via HF Data Engine):**
- CoinGecko, CoinMarketCap, CryptoCompare (proxied through HF Engine)
- News APIs, sentiment providers (integrated but marked as optional)

### Partial Integrations

Several HuggingFace adapters (`HFSignalsAdapter`, `HFAnalysisAdapter`, `HFProxyAdapter`) explicitly return `NOT_IMPLEMENTED` errors for certain operations:
- Signal history storage (signals are stored locally, not in HF)
- SMC analysis via HF (uses local `SMCAnalyzer` instead)
- Elliott Wave analysis via HF (uses local `ElliottWaveAnalyzer` instead)
- Proxy endpoints for Binance/KuCoin (direct integrations used instead)

---

## Frontend Architecture

### Entry Points

**src/main.tsx:**
- Application bootstrap with strict data policy enforcement
- Validates `APP_MODE` (online/demo/test) before rendering
- Checks `VITE_API_BASE` and `VITE_WS_BASE` for backend connectivity
- Mounts `<App />` inside `<ErrorBoundary>`
- Enforces data policy via `assertPolicy()` from `src/config/dataPolicy.ts`

**src/App.tsx:**
- Root component with provider nesting:
  - `ModeProvider` → `ThemeProvider` → `AccessibilityProvider` → `DataProvider` → `LiveDataProvider` → `TradingProvider` → `BacktestProvider` → `NavigationProvider`
- Lazy-loads all view components with `lazyLoad()` utility
- Renders `<AppContent>` which switches views based on `NavigationProvider` state
- Includes `<Sidebar>` for navigation and `<StatusRibbon>` for system status
- Initial loading screen shows for 1.5 seconds while providers initialize

### Component Structure

**Core UI Components (src/components/):**

| Folder | Responsibility | Key Files |
|--------|---------------|-----------|
| `ui/` | Base UI components | `Button.tsx`, `Card.tsx`, `Form.tsx`, `LoadingSpinner.tsx`, `ErrorBoundary.tsx`, `Toast.tsx`, `StatusRibbon.tsx`, `DataSourceBadge.tsx` |
| `Navigation/` | Custom navigation system | `NavigationProvider.tsx` (context-based routing), `Sidebar.tsx` |
| `Theme/` | Theme management | `ThemeProvider.tsx` (dark/light mode) |
| `Accessibility/` | A11y features | `AccessibilityProvider.tsx` |

**Feature Components:**

| Folder | Responsibility | Key Files |
|--------|---------------|-----------|
| `trading/` | Trading interfaces | `TradingDashboard.tsx`, `SpotNotAvailable.tsx` |
| `market/` | Market data display | `MarketTicker.tsx`, `PriceChart.tsx` |
| `scanner/` | Signal scanners | `SmartMoneyScanner.tsx`, `AISignalsScanner.tsx`, `WhaleActivityScanner.tsx`, `NewsSentimentScanner.tsx`, `TechnicalPatternsScanner.tsx` |
| `signal/` | Signal visualization | `SignalStagePipeline.tsx`, `SignalVisualizationSection.tsx`, `ControlsPanel.tsx`, `BreakoutAnimation.tsx`, `ParticleEffect.tsx` |
| `portfolio/` | Portfolio tracking | `Portfolio.tsx`, `RiskCenterPro.tsx` |
| `risk/` | Risk management | `RiskGauge.tsx`, `RiskAlertCard.tsx`, `LiquidationBar.tsx`, `StressTestCard.tsx` |
| `backtesting/` | Backtest tools | `BacktestButton.tsx`, `BacktestPanel.tsx` |
| `ai/` | AI training UI | `AIPredictor.tsx`, `TrainingDashboard.tsx` |
| `ml/` | ML training panel | `MLTrainingPanel.tsx` |
| `strategy/` | Strategy builder | `PerformanceChart.tsx`, `StrategyTemplateEditor.tsx`, `ScoreGauge.tsx` |
| `scoring/` | Scoring editor | `ScoringEditor.tsx` |
| `settings/` | Configuration UI | `ExchangeSettings.tsx`, `DataSourceSelector.tsx`, `IntegrationSettings.tsx`, `TelegramSettingsCard.tsx` |
| `connectors/` | Real data connectors | `RealDataConnector.tsx`, `RealChartDataConnector.tsx`, `RealSignalFeedConnector.tsx`, `RealPortfolioConnector.tsx`, `RealPriceChartConnector.tsx` |
| `news/` | News feed | `NewsPanel.tsx`, `NewsFeed.tsx`, `NewsCard.tsx` |
| `charts/` | Chart overlays | `ChartOverlay.tsx`, `PatternOverlay.tsx` |
| `enhanced/` | Enhanced dashboards | `EnhancedSymbolDashboard.tsx` |

### Views / Pages (src/views/)

**Active Views:**
- `DashboardView.tsx` - Main dashboard with signal overview
- `ChartingView.tsx` - Advanced charting with technical indicators
- `MarketView.tsx` - Market overview and ticker
- `ScannerView.tsx` - Multi-scanner interface (SMC, Whales, Sentiment)
- `TrainingView.tsx` - AI model training interface
- `RiskView.tsx` - Basic risk management
- `ProfessionalRiskView.tsx` - Advanced risk metrics (VaR, ES, liquidation alerts)
- `BacktestView.tsx` - Strategy backtesting
- `StrategyBuilderView.tsx` - Strategy configuration
- `StrategyInsightsView.tsx` - Strategy performance insights
- `EnhancedStrategyLabView.tsx` - Advanced strategy lab
- `HealthView.tsx` - System health monitoring
- `SettingsView.tsx` - Application settings
- `FuturesTradingView.tsx` - Futures trading interface
- `UnifiedTradingView.tsx` - Unified trading dashboard
- `EnhancedTradingView.tsx` - Enhanced trading interface
- `TradingView.tsx` - Basic trading view (disabled due to SPOT not implemented)
- `PositionsView.tsx` - Open positions tracking
- `PortfolioPage.tsx` - Portfolio analysis
- `ExchangeSettingsView.tsx` - Exchange configuration
- `MonitoringView.tsx` - System monitoring
- `DiagnosticsView.tsx` - System diagnostics

**Legacy/Backup Views:**
- `views/__legacy__/` - Old components preserved for reference
- `views/__backup__/` - Timestamped backups of modified views

### Context & State Management

**React Contexts (src/contexts/):**

1. **ModeContext.tsx:**
   - Manages data mode (offline/online), trading mode (OFF/DRY_RUN/TESTNET), and data source
   - Persists state to localStorage via `src/lib/storage.ts`
   - Types defined in `src/types/modes.ts`

2. **DataContext.tsx:**
   - Provides portfolio, positions, prices, signals, statistics, metrics
   - Manages OHLCV bar data for charting
   - Tracks data source (real/mock/synthetic/unknown) via data policy
   - Auto-refresh disabled to reduce unnecessary queries
   - Uses `RealDataManager-old.ts` for data fetching

3. **TradingContext.tsx:**
   - Manages trading mode (virtual/real), balance, positions, orders
   - Integrates with `KuCoinFuturesService` for real trading
   - Uses `VirtualTradingService` for simulated trades
   - Auto-refresh on mount disabled to reduce initial queries

4. **BacktestContext.tsx:**
   - Stores symbol and timeframe parameters for backtesting
   - Simple state container with setter/clearer functions

5. **LiveDataContext.tsx (component):**
   - Provides live data context for real-time updates
   - Not a traditional context, implemented as component

**No Redux/Zustand:** All state management is via React Context API and local component state.

### Hooks (src/hooks/)

- `useWebSocket.ts` - WebSocket connection management with reconnection logic
- `useSignalWebSocket.ts` - WebSocket hook specific to signal streaming
- `useSafeAsync.ts` - Safe async operation wrapper with abort support
- `useForm.ts` - Form state management with validation
- `useStrategyPipeline.ts` - Hook for strategy pipeline execution
- `useOHLC.ts` - OHLCV data fetching hook
- `useOnlineStatus.ts` - Browser online/offline status detection
- `useDebouncedEffect.ts` - Debounced effect hook for performance

### Routing

**Custom Navigation System:**
- NO React Router dependency
- `NavigationProvider.tsx` manages current view state
- Views are lazy-loaded based on `currentView` string
- Sidebar navigation triggers view changes via context

**Supported Routes (as view strings):**
- dashboard, charting, market, scanner, training, risk, professional-risk
- backtest, strategyBuilder, strategy-insights, strategylab
- health, settings, diagnostics, monitoring
- futures, trading, enhanced-trading, positions, portfolio, exchange-settings

---

## Backend Architecture

### Server Entry Point

**src/server.ts (4064 lines):**
- Initializes Express app with middleware: helmet, CORS, JSON parser
- Creates HTTP server and WebSocket server (`ws` on `/ws` endpoint)
- Attaches heartbeat to WebSocket for connection health
- Initializes all singleton services (Database, Binance, KuCoin, etc.)
- Mounts controllers as middleware
- Sets up WebSocket channels (Futures, Score Stream)
- Configures proxy routes for CORS bypass
- Metrics collection via `observability/metrics.ts`
- Port management with auto-fallback via `utils/port.ts`

**Middleware Stack:**
1. `helmet` - Security headers
2. `cors` - CORS configuration
3. `express.json()` - JSON body parsing
4. `metricsMiddleware` - Prometheus metrics collection
5. Rate limiting via `express-rate-limit` (batched requests)

**Service Initialization:**
- Database (SQLite) - `src/data/Database.ts`
- BinanceService - Market data from Binance Testnet
- KuCoinService - KuCoin market data
- KuCoinFuturesService - KuCoin Futures trading
- MarketDataIngestionService - Data ingestion pipeline
- RedisService - Optional caching layer
- DataValidationService - Data quality checks
- EmergencyDataFallbackService - Fallback data when providers fail
- AlertService - Alert generation and management
- NotificationService - Multi-channel notifications
- TelegramService - Telegram bot integration
- 20+ analysis services (SMC, Elliott Wave, Harmonics, Sentiment, etc.)

### Controllers (src/controllers/)

**TradingController.ts:**
- `analyzeMarket(symbol)` - Market analysis for a symbol
- `getPortfolio()` - Portfolio analysis
- `createOrder()` - Create trading order
- `getOrders()` - Fetch orders with filters
- `getPositions()` - Fetch open positions
- `cancelOrder(id)` - Cancel an order
- `executeTrade()` - Execute manual trade via TradeEngine
- `getOpenPositions()` - Get open positions (FUTURES only, SPOT returns empty with message)

**StrategyPipelineController.ts:**
- `runPipeline()` - Execute Strategy 1 → 2 → 3 pipeline
- `getStatus()` - Pipeline health check
- Supports auto-trade hook if enabled in config
- Returns structured results with category scores (Core, SMC, Patterns, Sentiment, ML)

**FuturesController.ts:**
- `getPositions()` - Fetch futures positions
- `placeOrder()` - Place futures order
- `cancelOrder(id)` - Cancel order
- `cancelAllOrders()` - Cancel all orders for symbol
- `getOpenOrders()` - Fetch open orders
- `setLeverage()` - Set leverage and margin mode
- `getAccountBalance()` - Get account balance
- `getOrderbook(symbol)` - Get orderbook depth
- `getFundingRate(symbol)` - Get current funding rate
- `getFundingRateHistory(symbol)` - Get funding rate history
- `closePosition(symbol)` - Close a position
- Feature gated by `FEATURE_FUTURES` flag

**AIController.ts:**
- AI model training and prediction endpoints

**AnalysisController.ts:**
- Technical analysis endpoints (SMC, Elliott Wave, Harmonics, etc.)

**MarketDataController.ts:**
- Market data endpoints (prices, OHLCV, market overview)

**SystemController.ts:**
- System health, configuration, diagnostics

**SystemStatusController.ts:**
- Comprehensive system status (environment, features, trading, scoring, tuning)

**ScoringController.ts:**
- Scoring configuration management
- Live scoring endpoints

**TuningController.ts:**
- Strategy tuning endpoints (grid search, genetic algorithm)

**HFDataEngineController.ts:**
- HuggingFace Data Engine integration endpoints

**DataSourceController.ts:**
- Data source selection and configuration

### Routes (src/routes/)

**Explicitly Present:**
- `dataSource.ts` - Data source management routes
- `diagnosticsRoute.ts` - System diagnostics routes

**Referenced but Commented Out (not present):**
- futuresRoutes, offlineRoutes, systemDiagnosticsRoutes, systemMetricsRoutes
- marketUniverseRoutes, marketReadinessRoutes, mlRoutes, newsRoutes
- strategyTemplatesRoutes, strategyApplyRoutes, backtestRoutes
- hfRouter, resourceMonitorRouter, diagnosticsMarketRoutes, serverInfoRoutes
- optionalPublicRouter, optionalNewsRouter, optionalMarketRouter, optionalOnchainRouter

### API Endpoints

Based on controller inspection and server mounting:

**Health & System:**
- `GET /api/health` - Basic health check
- `GET /api/system/status` - Comprehensive system status
- `GET /api/system/config` - System configuration
- `GET /api/system/diagnostics/*` - Various diagnostic endpoints
- `GET /api/system/metrics` - Prometheus metrics

**Market Data:**
- `GET /api/market/prices` - Cryptocurrency prices
- `GET /api/market/ohlcv/:symbol` - OHLCV data for symbol
- `GET /api/market/overview` - Market overview
- `GET /api/market/ticker/:symbol` - Ticker for symbol

**Trading:**
- `POST /api/trade/execute` - Execute manual trade (SPOT or FUTURES)
- `GET /api/trade/open-positions` - Get open positions (query param: market=spot|futures)
- `POST /api/trading/orders` - Create order
- `GET /api/trading/orders` - Get orders
- `DELETE /api/trading/orders/:id` - Cancel order
- `GET /api/trading/positions` - Get positions
- `GET /api/trading/portfolio` - Get portfolio analysis
- `POST /api/trading/analyze/:symbol` - Analyze market for symbol

**Futures Trading:**
- `GET /api/futures/positions` - Get futures positions
- `POST /api/futures/orders` - Place futures order
- `DELETE /api/futures/orders/:id` - Cancel futures order
- `DELETE /api/futures/orders` - Cancel all orders
- `GET /api/futures/orders/open` - Get open orders
- `POST /api/futures/leverage` - Set leverage
- `GET /api/futures/balance` - Get account balance
- `GET /api/futures/orderbook/:symbol` - Get orderbook
- `GET /api/futures/funding/:symbol` - Get funding rate
- `GET /api/futures/funding/:symbol/history` - Get funding rate history
- `POST /api/futures/positions/:symbol/close` - Close position

**Scoring:**
- `GET /api/scoring/config` - Get scoring configuration
- `POST /api/scoring/config` - Update scoring configuration
- `POST /api/scoring/live/:symbol` - Generate live score for symbol

**Strategy Pipeline:**
- `POST /api/strategies/pipeline/run` - Run Strategy 1 → 2 → 3 pipeline
- `GET /api/strategies/pipeline/status` - Get pipeline status

**Tuning:**
- `POST /api/tuning/start` - Start tuning run
- `GET /api/tuning/status` - Get tuning status
- `GET /api/tuning/runs` - Get tuning runs history

**HuggingFace Data Engine:**
- `GET /api/hf/*` - Proxied HF Data Engine endpoints

**Analysis:**
- `POST /api/analysis/smc/:symbol` - SMC analysis
- `POST /api/analysis/elliott/:symbol` - Elliott Wave analysis
- `POST /api/analysis/harmonics/:symbol` - Harmonic patterns

**Data Sources:**
- `GET /api/data-source/config` - Get data source config
- `POST /api/data-source/select` - Select primary data source
- `GET /api/data-source/health` - Data source health

### Services (src/services/)

**106 service files identified.** Key services:

**Exchange Services:**
- `BinanceService.ts` - Binance Testnet HTTP client (market data, WebSocket)
- `KuCoinService.ts` - KuCoin HTTP client (market data)
- `KuCoinFuturesService.ts` - KuCoin Futures trading client (orders, positions, leverage)
- `ExchangeClient.ts` - Unified interface for SPOT + FUTURES (wraps KuCoin Futures)

**Data Providers:**
- `HFDataEngineClient.ts` - HuggingFace Data Engine HTTP client
- `HFDataEngineAdapter.ts` - Adapter to match backend format expectations
- `HFOHLCVService.ts` - OHLCV data from HF
- `HFSentimentService.ts` - Sentiment data from HF
- `MultiProviderMarketDataService.ts` - Multi-provider cascade
- `RealMarketDataService.ts` - Real market data aggregation
- `RealDataManager.ts` / `RealDataManager-old.ts` - Data manager singletons

**HF Adapters (with NOT_IMPLEMENTED methods):**
- `hf/HFSignalsAdapter.ts` - Signal history marked as NOT_IMPLEMENTED
- `hf/HFAnalysisAdapter.ts` - SMC/Elliott analysis marked as NOT_IMPLEMENTED
- `hf/HFMarketAdapter.ts` - Some market endpoints implemented
- `hf/HFHealthAdapter.ts` - Health checks implemented
- `hf/HFProxyAdapter.ts` - Proxy endpoints marked as NOT_IMPLEMENTED

**Analysis Services:**
- `SMCAnalyzer.ts` - Smart Money Concepts analysis
- `ElliottWaveAnalyzer.ts` - Elliott Wave detection
- `HarmonicPatternDetector.ts` - Harmonic pattern detection
- `FibonacciDetector.ts` - Fibonacci levels
- `ParabolicSARDetector.ts` - Parabolic SAR indicator
- `TechnicalAnalysisService.ts` - General technical analysis
- `RegimeDetector.ts` - Market regime detection

**Sentiment & Social:**
- `SentimentAnalysisService.ts` - Sentiment aggregation
- `SentimentNewsService.ts` - News sentiment
- `SocialAggregationService.ts` - Social media sentiment
- `WhaleTrackerService.ts` - Whale activity tracking
- `FearGreedService.ts` - Fear & Greed Index

**Optional Providers (src/services/optional/):**
- `BinancePublicService.ts`, `KrakenPublicService.ts`, `BitfinexPublicService.ts` - Public exchange APIs
- `CoinMarketCapService.ts`, `CryptoCompareService.ts` - Market data providers
- `NewsApiService.ts`, `NewsRssService.ts` - News providers
- `SantimentService.ts`, `AltFearGreedService.ts` - Sentiment providers
- `WhaleAlertService.ts` - Whale tracking

**Trading Services:**
- `RealTradingService.ts` - Real trading orchestration
- `VirtualTradingService.ts` - Simulated trading
- `OrderManagementService.ts` - Order lifecycle management
- `FuturesService.ts` - Futures trading abstraction

**AI & ML Services:**
- `aiService.ts` - AI model integration
- `aiPredictionService.ts` - Prediction generation
- `ContinuousLearningService.ts` - Online learning

**System Services:**
- `SignalGeneratorService.ts` - Signal generation orchestration
- `AlertService.ts` - Alert management
- `NotificationService.ts` - Multi-channel notifications
- `TelegramService.ts` - Telegram bot
- `ServiceOrchestrator.ts` - Service lifecycle management
- `ResourceMonitorService.ts` - Resource monitoring
- `DynamicWeightingService.ts` - Adaptive weight adjustment
- `StrategyPipelineService.ts` - Strategy pipeline execution

**Data Management:**
- `MarketDataIngestionService.ts` - Data ingestion pipeline
- `DataValidationService.ts` - Data quality validation
- `EmergencyDataFallbackService.ts` - Fallback when providers fail
- `FallbackDataManager.ts` - Fallback coordination
- `HistoricalDataService.ts` - Historical data management
- `UnifiedDataService.ts` - Unified data access
- `BlockchainDataService.ts` - On-chain data

**Caching & Storage:**
- `RedisService.ts` - Redis caching (optional)
- `Database.ts` (in src/data/) - SQLite database

**WebSocket:**
- `WebSocketManager.ts` - WebSocket connection management
- `SignalVisualizationWebSocketService.ts` - Signal streaming

**Proxy & Routing:**
- `UnifiedProxyService.ts` - Unified proxy service
- `CORSProxyService.ts` - CORS proxy
- `ProxyRoutes.ts` - Proxy route setup

**Configuration & Management:**
- `CentralizedAPIManager.ts` - API configuration management
- `FrontendBackendIntegration.ts` - Frontend/backend integration layer

---

## Trading System

### Trade Engine (src/engine/trading/TradeEngine.ts)

**Core Functionality:**
- Singleton pattern for single trade engine instance
- Accepts trade signals from: Strategy Pipeline, Live Scoring, Manual API
- Supports multiple trading modes: OFF, DRY_RUN, TESTNET
- Supports multiple markets: SPOT, FUTURES, BOTH
- Default trade size: 100 USDT (configurable)

**Execution Flow:**
1. Check trading mode (OFF blocks all trades)
2. Check if signal action is HOLD (skip execution)
3. Run risk guard check (market-aware)
4. Fetch current market price from database
5. Calculate quantity in base currency
6. Get leverage from risk config (FUTURES only)
7. Place order via ExchangeClient
8. Save order to database
9. Return execution result

**Trading Modes:**
- **OFF:** Trading disabled at system level, all trades blocked
- **DRY_RUN:** Simulate orders without calling exchange, generate fake order IDs
- **TESTNET:** Place real orders on exchange testnet (KuCoin Futures)

**Market Support:**
- **FUTURES:** Fully implemented via KuCoinFuturesService
- **SPOT:** Returns NOT_IMPLEMENTED error from ExchangeClient
- **BOTH:** Currently routes to SPOT behavior (falls back to NOT_IMPLEMENTED)

**NO FAKE FILLS:** DRY_RUN mode generates fake order IDs but clearly marks them as simulated. Real execution failures return structured errors, not fake successes.

### Risk Guard (src/engine/trading/RiskGuard.ts)

**Configuration Structure:**
- Supports dual-mode config: separate `spot` and `futures` risk parameters
- Loads from `config/risk.config.json`
- Falls back to sensible defaults if config missing

**Risk Checks (Market-Aware):**

1. **Position Size Limit:**
   - FUTURES default: 300 USDT max
   - SPOT default: 500 USDT max
   - Configurable via `maxPositionSizeUSDT`

2. **Open Positions Limit:**
   - FUTURES default: 3 positions max
   - SPOT default: 5 positions max
   - Configurable via `maxOpenPositions`

3. **Daily Loss Limit:**
   - FUTURES default: -100 USDT max daily loss
   - SPOT default: -150 USDT max daily loss
   - Configurable via `maxDailyLossUSDT`

4. **Minimum Account Balance:**
   - FUTURES default: 50 USDT minimum
   - SPOT default: 100 USDT minimum
   - Configurable via `minAccountBalanceUSDT`

5. **Risk Per Trade Percentage:**
   - FUTURES default: 2.0% of account equity
   - SPOT default: 2.5% of account equity
   - Configurable via `maxRiskPerTradePercent`

6. **Market Data Availability:**
   - Blocks trades if market data unavailable (if `requireMarketData: true`)
   - Safety-first approach: fail closed, not open

**SPOT Limitation:**
- Risk guard explicitly blocks SPOT balance verification with error: "SPOT balance verification not available"
- This is intentional because SPOT API is not fully integrated

**Leverage (FUTURES only):**
- Default: 3x leverage
- Configurable via `risk.config.json` → `futures.leverage`

### Exchange Client (src/services/exchange/ExchangeClient.ts)

**Unified Interface for SPOT + FUTURES:**

**Methods:**
- `placeOrder(params)` - Routes to SPOT or FUTURES based on `params.market`
- `placeSpotOrder(params)` - Returns NOT_IMPLEMENTED error
- `placeFuturesOrder(params)` - Places order via KuCoinFuturesService
- `getOpenPositions()` - Returns FUTURES positions (SPOT N/A)
- `getAccountInfo()` - Returns FUTURES account info

**FUTURES Implementation:**
- Wraps `KuCoinFuturesService.placeOrder()`
- Validates credentials before API calls
- Returns structured errors on failure (NO FAKE DATA)
- Maps KuCoin responses to internal format

**SPOT Implementation:**
- Explicitly returns: `{ status: 'REJECTED', error: 'SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete' }`
- NO FAKE DATA - honest about unavailability

### Futures Trading (src/services/KuCoinFuturesService.ts)

**Fully Implemented Methods:**
- `placeOrder(order)` - Place market/limit order with leverage
- `getPositions()` - Fetch all open positions
- `getAccountBalance()` - Get account balance and margin info
- `getOpenOrders(symbol?)` - Get open orders
- `cancelOrder(orderId)` - Cancel specific order
- `cancelAllOrders(symbol?)` - Cancel all orders for symbol
- `setLeverage(symbol, leverage, marginMode)` - Set leverage (1-100x)
- `getFundingRate(symbol)` - Get current funding rate
- `getFundingRateHistory(symbol)` - Get funding rate history
- `getOrderbook(symbol, depth)` - Get orderbook
- `closePosition(symbol)` - Close position by placing reduce-only order

**Authentication:**
- Uses HMAC-SHA256 signature with API key/secret/passphrase
- KC-API-KEY-VERSION: 2
- Validates credentials before any authenticated request
- Throws error if credentials not configured

**Base URL:**
- `https://api-futures.kucoin.com` (testnet or production based on config)

**Credentials Storage:**
- In-memory Map (not persistent across restarts)
- Loaded from localStorage in browser context
- Can be saved via `saveCredentials(exchange, credentials)`

### Spot Trading

**Current State:**

**ExchangeClient.placeSpotOrder():**
```typescript
// Returns structured error - NOT fake data
return {
  orderId: '',
  symbol: params.symbol,
  side: params.side,
  quantity: params.quantity,
  status: 'REJECTED',
  timestamp: Date.now(),
  error: 'SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete'
};
```

**UI Component (SpotNotAvailable.tsx):**
- Displays warning: "Spot trading is not fully integrated yet"
- Shows "KuCoin SPOT testnet API integration is currently in development"
- Suggests Futures trading as alternative
- Lists what's available vs. in development

**Views:**
- `UnifiedTradingView.tsx` line 81: "SPOT trading is not implemented in this build"
- `TradingView.tsx` line 125: "This interface is currently disabled because SPOT trading is not implemented"

**Risk Guard:**
- Blocks SPOT balance verification with: "SPOT balance verification not available"

---

## Data Providers & Integration

### Primary Data Source

**HuggingFace Data Engine:**
- Base URL: `https://really-amin-datasourceforcryptocurrency.hf.space`
- Configured via: `PRIMARY_DATA_SOURCE=huggingface` in `.env`
- Client: `src/services/HFDataEngineClient.ts`
- Adapter: `src/services/HFDataEngineAdapter.ts` (converts HF responses to backend format)

**Implemented HF Engine Endpoints:**
- `GET /health` - Health check
- `GET /info` - System information
- `GET /prices` - Cryptocurrency prices
- `GET /prices/{symbol}` - Single symbol price
- `GET /market/overview` - Market overview
- `GET /ohlcv/{symbol}` - OHLCV data
- Additional endpoints for categories, providers, alerts

**HF Adapter Limitations:**
- Some methods explicitly return NOT_IMPLEMENTED for Binance/KuCoin sources
- These are handled gracefully with error responses, not fake data

### Adapter Layers

**HF Signal Adapter (src/services/hf/HFSignalsAdapter.ts):**
- **NOT_IMPLEMENTED:**
  - `getSignalHistory()` - Signals stored locally, not in HF
  - `generateSignal()` - Signal generation via local services
  - `streamSignals()` - Streaming via local WebSocket

**HF Analysis Adapter (src/services/hf/HFAnalysisAdapter.ts):**
- **NOT_IMPLEMENTED:**
  - `analyzeSMC()` - Uses local `SMCAnalyzer` instead
  - `analyzeElliottWave()` - Uses local `ElliottWaveAnalyzer` instead
- Placeholder methods return structured error responses

**HF Proxy Adapter (src/services/hf/HFProxyAdapter.ts):**
- **NOT_IMPLEMENTED:**
  - `proxyBinance()` - Direct Binance integration used instead
  - `proxyKuCoin()` - Direct KuCoin integration used instead
  - `proxyCoingecko()` - HF Engine handles this

**HF Market Adapter (src/services/hf/HFMarketAdapter.ts):**
- Implements market data fetching via HF Engine
- Used as primary source for prices, OHLCV, market overview

**HF Health Adapter (src/services/hf/HFHealthAdapter.ts):**
- Implements health checks
- Returns system status and provider information

### Exchange Providers

**Binance Service (src/services/BinanceService.ts):**
- **Purpose:** Market data only (not for trading in this project)
- **Testnet Mode:** Uses `testnet.binance.vision` by default
- **Capabilities:**
  - HTTP client for REST API
  - WebSocket client for real-time streams
  - Rate limiting enforcement
  - Clock skew detection
  - Connection health monitoring
- **NOT used for trading** - Only market data

**KuCoin Service (src/services/KuCoinService.ts):**
- **Purpose:** Market data from KuCoin
- General KuCoin HTTP client
- NOT the futures trading service (that's KuCoinFuturesService)

**KuCoin Futures Service (src/services/KuCoinFuturesService.ts):**
- **Purpose:** FUTURES TRADING
- Fully implemented for order placement, position management
- See "Futures Trading" section above for details

### Fallback Logic

**Multi-Provider Cascade (src/services/MultiProviderMarketDataService.ts):**
- Primary → Fallback cascade pattern
- If HF Engine fails, can fall back to direct exchange APIs
- Controlled via `PRIMARY_DATA_SOURCE` config

**Emergency Fallback Service (src/services/EmergencyDataFallbackService.ts):**
- Activated when all providers fail
- Uses cached data if available
- Last resort: synthetic data (only if `ALLOW_FAKE_DATA=true` and `APP_MODE=test`)

**Data Policy Enforcement (src/config/dataPolicy.ts):**
- **APP_MODE=online:** Only real data allowed, no mock, no synthetic
- **APP_MODE=demo:** Mock fixtures only (recorded datasets)
- **APP_MODE=test:** Mock or synthetic if explicitly allowed
- **STRICT_REAL_DATA=true:** Fail fast on errors, no fallbacks
- Enforced at application startup via `assertPolicy()`

### Emergency or Synthetic Modes

**Data Policy Modes:**

1. **Online Mode (Production):**
   - `APP_MODE=online`
   - `STRICT_REAL_DATA=true` (automatic)
   - NO mock data allowed
   - NO synthetic data allowed
   - Fail fast if data unavailable

2. **Demo Mode:**
   - `APP_MODE=demo`
   - `USE_MOCK_DATA=true` (automatic)
   - Uses recorded mock fixtures
   - No synthetic generation

3. **Test Mode:**
   - `APP_MODE=test`
   - `ALLOW_FAKE_DATA=true` (if explicitly set)
   - Can generate synthetic data for testing
   - Not for production use

**Synthetic Data Generation:**
- `src/services/SyntheticOHLCV.ts` - Generates synthetic OHLCV data
- ONLY used if `canUseSyntheticData()` returns true (test mode + explicit flag)
- NOT used in production or demo modes

---

## Data Flow Analysis

### Frontend Component → Backend API Flow

```
[User Action in UI Component]
    ↓
[React Context (e.g., TradingContext)]
    ↓
[API Client Hook (e.g., useSafeAsync)]
    ↓
[HTTP Request to Backend] (axios via src/lib/apiClient.ts)
    ↓
[Express Route Handler] (src/server.ts)
    ↓
[Controller Method] (e.g., TradingController.executeTrade)
    ↓
[Service Layer] (e.g., TradeEngine)
    ↓
[Exchange Client or Data Provider] (e.g., KuCoinFuturesService)
    ↓
[External API] (KuCoin Futures Testnet)
    ↓
[Response flows back through same path]
```

**Example: Execute Futures Trade**

1. User clicks "Buy" in `FuturesTradingView.tsx`
2. `TradingContext.placeOrder()` called
3. Context calls `KuCoinFuturesService.placeOrder()`
4. Service sends HTTP POST to backend `/api/trade/execute`
5. Backend `TradingController.executeTrade()` receives request
6. Controller calls `TradeEngine.executeSignal()`
7. TradeEngine runs `RiskGuard.checkTradeRisk()`
8. If risk check passes, TradeEngine calls `ExchangeClient.placeOrder()`
9. ExchangeClient routes to `placeFuturesOrder()`
10. Futures order placed via `KuCoinFuturesService.placeOrder()`
11. KuCoin API called with signed request
12. Response returns through chain: KuCoin → ExchangeClient → TradeEngine → Controller → Frontend
13. UI updates with order result

### Signal Generation Flow

```
[API Request: POST /api/strategies/pipeline/run]
    ↓
[StrategyPipelineController.runPipeline()]
    ↓
[Strategy 1: Wide Universe Scanning]
    ↓ (src/strategies/strategy1.ts)
[getOHLCV() for each symbol]
    ↓ (src/services/marketData.ts)
[HFOHLCVService or fallback provider]
    ↓
[runStrategyPipeline() on OHLCV data]
    ↓ (src/engine/pipeline.ts)
[All Detectors Run in Sequence:]
    - heuristicCore (RSI, MACD, MA, Bollinger, Volume, ADX, ROC)
    - detectSMC (Order Blocks, FVG, BoS, Structure)
    - detectElliott (Elliott Wave)
    - detectHarmonics (Gartley, Bat, Butterfly, Crab)
    - detectClassical (Head & Shoulders, Triangles, Flags)
    - detectFibonacci (Retracement levels)
    - detectSAR (Parabolic SAR)
    - detectRPercent (Williams %R)
    - sentimentLayer (Fear & Greed, Social) - ASYNC
    - newsLayer (News sentiment) - ASYNC
    - whalesLayer (Whale tracking) - ASYNC
    - mlPredict (ML model prediction)
    ↓
[aggregateScores() - Category-based scoring]
    ↓ (src/engine/scoreAggregator.ts)
[Build FinalDecision with category breakdown]
    ↓
[Return to Strategy 1]
    ↓
[Results sorted by finalStrategyScore]
    ↓
[Top 10 passed to Strategy 2]
    ↓ (src/strategies/strategy2.ts)
[Similar scoring + ETA calculation]
    ↓
[Top 5 passed to Strategy 3]
    ↓ (src/strategies/strategy3.ts)
[Final picks with entry levels (Fibonacci-based)]
    ↓
[If autoTrade enabled: TradeEngine.executeSignal()]
    ↓
[Return full pipeline result to frontend]
```

**Key Points:**
- Strategy 1 → 2 → 3 cascade filters symbols from 50+ → 10 → 5 → 3
- All detectors are synchronous except sentiment/news/whales (async with external APIs)
- Failures in async detectors gracefully degrade to neutral scores
- Category scores (Core, SMC, Patterns, Sentiment, ML) tracked throughout
- Adaptive weighting can adjust category weights based on performance (if enabled)

### Trading Flow

```
[Manual Trade Request or Auto-Trade Trigger]
    ↓
[TradeEngine.executeSignal(signal)]
    ↓ (src/engine/trading/TradeEngine.ts)
[Check 1: Trading Mode]
    - OFF → Block trade
    - DRY_RUN → Simulate
    - TESTNET → Execute real
    ↓
[Check 2: Signal Action]
    - HOLD → Skip execution
    - BUY/SELL → Continue
    ↓
[Check 3: RiskGuard.checkTradeRisk()]
    ↓ (src/engine/trading/RiskGuard.ts)
    [Risk Checks:]
    - Position size limit
    - Open positions limit
    - Daily loss limit
    - Min account balance
    - Risk per trade percentage
    - Market data availability
    ↓ (if any check fails → Block trade)
[Check 4: Get Market Price]
    ↓ (Database.getMarketData())
[Check 5: Calculate Quantity]
    - quantityUSDT / currentPrice = quantity in base currency
    ↓
[Check 6: Get Leverage (FUTURES only)]
    - From risk.config.json → futures.leverage
    ↓
[Check 7: Place Order]
    - DRY_RUN: Generate fake order ID
    - TESTNET: ExchangeClient.placeOrder()
        ↓
        [FUTURES: KuCoinFuturesService.placeOrder()]
            ↓
            [KuCoin API with HMAC signature]
            ↓
            [Order Response]
        ↓
        [SPOT: Return NOT_IMPLEMENTED error]
    ↓
[Check 8: Save Order to Database]
    ↓
[Return TradeExecutionResult]
```

**Partially Wired Flows:**

- **SPOT Order Placement:** TradeEngine routes to ExchangeClient, but ExchangeClient returns NOT_IMPLEMENTED for SPOT
- **Auto-Trade from Strategy 3:** Logic exists in StrategyPipelineController but disabled by default (`autoTrade.enabled: false` in config)

---

## WebSocket Architecture

### WebSocket Server

**Location:** `src/server.ts` (lines 151-154)

**Creation:**
```typescript
const server = createServer(app);
const wsServer = new WebSocketServer({
  server,
  path: '/ws'
});
```

**Heartbeat Logic:**
- Attached via `attachHeartbeat(wsServer)` from `src/server/wsHeartbeat.ts`
- Sends ping every 30 seconds
- Disconnects dead connections after 2 missed pongs
- Tracked via `wsConnections` counter in `src/observability/metrics.ts`

**Broadcast Utility:**
- `initBroadcast(wsServer)` from `src/server/wsBroadcast.ts`
- Provides global broadcast function for pushing updates to all clients

### WS Channels / Logical Streams

**1. Futures Channel (src/ws/futuresChannel.ts):**

**Purpose:** Real-time futures trading updates (positions, orders, funding rates)

**Message Types:**
- `futures_connected` - Welcome message on connection
- `position_update` - Position updates (broadcast every 5 seconds)
- `order_update` - Order updates
- `funding_tick` - Funding rate updates
- `error` - Error messages

**Client-to-Server Messages:**
- `subscribe_positions` - Request position updates
- `subscribe_orders` - Request order updates
- `get_positions` - One-time position fetch
- `get_orders` - One-time order fetch

**Auto-Monitoring:**
- Polls KuCoin Futures API every 5 seconds for position/order updates
- Broadcasts to all connected clients
- Feature gated by `FEATURE_FUTURES` flag

**2. Score Stream Gateway (src/ws/ScoreStreamGateway.ts):**

**Purpose:** Real-time live scoring updates for multiple symbols

**Configuration:**
```typescript
{
  symbols: ['BTCUSDT', 'ETHUSDT'],
  timeframe: '1h',
  broadcastIntervalMs: 30000 // 30 seconds
}
```

**Message Types:**
- `score_stream_connected` - Welcome message with config
- `score_update` - Live score updates for symbols
- `stream_status` - Stream health status
- `subscribed` - Subscription confirmation
- `configured` - Configuration update confirmation
- `error` - Error messages

**Client-to-Server Messages:**
- `subscribe` - Subscribe to specific symbols
- `configure` - Update stream configuration (symbols, timeframe, interval)
- `get_latest` - Request latest cached scores
- `get_status` - Request stream status

**Streaming Behavior:**
- Starts when first client connects
- Stops when last client disconnects
- Fetches scores via `ScoringLiveService.generateLiveScore()`
- Caches latest scores in memory
- Configurable broadcast interval (default 30s)
- Feature gated by `isFeatureEnabled('liveScoring')`

**3. Signal Visualization WebSocket (src/services/SignalVisualizationWebSocketService.ts):**
- Service exists but implementation not fully examined
- Likely handles real-time signal visualization updates

### Frontend WebSocket Hooks

**useWebSocket.ts (src/hooks/useWebSocket.ts):**
- Generic WebSocket connection hook
- Features:
  - Automatic reconnection with exponential backoff
  - Connection state tracking (connecting, connected, disconnected, error)
  - Message queue for offline messages
  - Heartbeat/ping-pong support
  - onMessage, onError, onConnect, onDisconnect callbacks
- Usage: `const { send, state, lastMessage } = useWebSocket(url, options)`

**useSignalWebSocket.ts (src/hooks/useSignalWebSocket.ts):**
- Specialized hook for signal streaming
- Wraps `useWebSocket` with signal-specific logic
- Parses signal messages and updates state

**LiveDataContext.tsx (src/components/LiveDataContext.tsx):**
- React context component that manages WebSocket connection
- Provides live data to child components
- Handles connection lifecycle and message distribution

---

## Missing Features & Incomplete Implementations

### Explicitly Marked as NOT_IMPLEMENTED

**1. SPOT Trading (Multiple Files):**

**File:** `src/services/exchange/ExchangeClient.ts:185`
```typescript
error: 'SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete'
```

**File:** `src/views/UnifiedTradingView.tsx:81`
```typescript
// SPOT trading is not implemented in this build. KuCoin SPOT testnet API integration is not complete.
```

**File:** `src/views/TradingView.tsx:125`
```typescript
// This interface is currently disabled because SPOT trading is not implemented.
```

**Component:** `src/components/trading/SpotNotAvailable.tsx`
- Entire component dedicated to informing users SPOT is unavailable

**Risk Guard:** `src/engine/trading/RiskGuard.ts:172-177`
```typescript
if (market === 'SPOT') {
  this.logger.warn('SPOT balance check not fully implemented, blocking for safety');
  return { allowed: false, reason: 'SPOT balance verification not available' };
}
```

**2. HF Signal Adapter (src/services/hf/HFSignalsAdapter.ts):**

Line 89-91:
```typescript
'Signal history via HuggingFace is not implemented. Signals are stored locally.',
NOT_IMPLEMENTED
```

Line 104-106:
```typescript
'Signal generation via HuggingFace is not implemented. Use local signal generation services.',
NOT_IMPLEMENTED
```

Line 124:
```typescript
NOT_IMPLEMENTED // streamSignals()
```

**3. HF Analysis Adapter (src/services/hf/HFAnalysisAdapter.ts):**

Line 119-121:
```typescript
'SMC analysis via HuggingFace is not implemented. Use local technical analysis services.',
NOT_IMPLEMENTED
```

Line 135-137:
```typescript
'Elliott Wave analysis via HuggingFace is not implemented. Use local technical analysis services.',
NOT_IMPLEMENTED
```

**4. HF Proxy Adapter (src/services/hf/HFProxyAdapter.ts):**

Lines 87, 102, 117:
```typescript
NOT_IMPLEMENTED // proxyBinance(), proxyKuCoin(), proxyCoingecko()
```

**5. HF Data Engine Adapter (src/services/HFDataEngineAdapter.ts):**

Line 531:
```typescript
code: 'NOT_IMPLEMENTED' // For Binance/KuCoin sources in certain contexts
```

Line 583:
```typescript
code: 'NOT_IMPLEMENTED' // For Binance/KuCoin sources in certain contexts
```

**6. Data Source Selector (src/components/settings/DataSourceSelector.tsx:233):**
```typescript
Note: Only HuggingFace is fully implemented in this phase. This source may return NOT_IMPLEMENTED errors.
```

### Route Files Referenced but Not Present

**Commented Out in src/server.ts (lines 109-128):**
- `futuresRoutes` - Referenced but file doesn't exist
- `offlineRoutes` - Referenced but file doesn't exist
- `systemDiagnosticsRoutes` - Referenced but file doesn't exist
- `systemMetricsRoutes` - Referenced but file doesn't exist
- `marketUniverseRoutes` - Referenced but file doesn't exist
- `marketReadinessRoutes` - Referenced but file doesn't exist
- `mlRoutes` - Referenced but file doesn't exist
- `newsRoutes` - Referenced but file doesn't exist
- `strategyTemplatesRoutes` - Referenced but file doesn't exist
- `strategyApplyRoutes` - Referenced but file doesn't exist
- `backtestRoutes` - Referenced but file doesn't exist
- `hfRouter` - Referenced but file doesn't exist
- `resourceMonitorRouter` - Referenced but file doesn't exist
- `diagnosticsMarketRoutes` - Referenced but file doesn't exist
- `serverInfoRoutes` - Referenced but file doesn't exist
- `optionalPublicRouter` - Referenced but file doesn't exist
- `optionalNewsRouter` - Referenced but file doesn't exist
- `optionalMarketRouter` - Referenced but file doesn't exist
- `optionalOnchainRouter` - Referenced but file doesn't exist

**Note:** These routes were likely planned but not yet implemented. The server runs without them.

### Adapter Methods Returning Placeholders

**HF Adapters Overview:**
- Purpose: Abstract HuggingFace Data Engine as if it were a full-featured backend
- Reality: Many operations not suitable for HF (signal storage, proxy routing)
- Solution: Return explicit NOT_IMPLEMENTED errors rather than fake data
- This is INTENTIONAL DESIGN - honest about limitations

### UI Components Showing "Not Available"

**SpotNotAvailable.tsx:**
- Shows: "Spot Trading Not Available"
- Message: "KuCoin SPOT testnet API integration is currently in development"
- Suggests: "Futures trading is fully operational"
- Lists what's available vs. in development

### Legacy / Backup Files

**views/__backup__/:**
- `EnhancedStrategyLabView_20251109_0058.tsx`
- `Dashboard_main_20251109_0012.tsx`
- `DashboardView_20251109_0042.tsx`
- `DashboardView_20251109_0031.tsx`
- `StrategyLabView_20251109_0058.tsx`

**views/__legacy__/:**
- `SVG_Icons.tsx`
- `StrategyLabView.tsx`

**services/:**
- `RealDataManager-old.ts` - Old version, `RealDataManager.ts` is current

**These are NOT the main code paths** - preserved for reference or rollback purposes.

### TODO Markers

**Search Results:** Minimal explicit TODO markers found in code inspection.

Most "unfinished" work is explicitly marked as NOT_IMPLEMENTED or blocked with clear error messages rather than TODO comments. This is a design choice for honest error reporting.

---

## Type System & Interfaces

### Core Types (src/types/index.ts - 899 lines)

**Market Data:**
- `MarketData` - OHLCV with symbol, timestamp, volume, price changes
- `CandlestickData` - Basic OHLC structure
- `TechnicalIndicators` - RSI, MACD, Bollinger Bands, ATR, OBV

**AI Signals:**
- `AISignal` - Full signal with confidence, probability (bull/bear/neutral), reasoning
- `TechnicalIndicators` - Technical analysis results
- `SmartMoneyFeatures` - Liquidity zones, order blocks, FVGs, BoS
- `ElliottWaveAnalysis` - Wave structure and completion probability
- `HarmonicPattern` - Gartley, Bat, Butterfly, Crab patterns with PRZ
- `SentimentData` - Aggregated sentiment from multiple sources
- `WhaleActivity` - Large transactions, exchange flows, on-chain metrics
- `Opportunity` - Detected trading opportunities with historical context

**Training & Prediction:**
- `TrainingMetrics` - Epoch metrics (loss, accuracy, stability, exploration)
- `PredictionData` - ML prediction with bull/bear/neutral probabilities
- `TradingDecision` - Action recommendation with confidence and reasoning

**Backtest Types:**
- `BacktestTrade` - Individual trade in backtest
- `BacktestResult` - Full backtest results with metrics (win rate, Sharpe, Sortino, max DD)

**Tuning Types:**
- `TuningMetrics` - Sharpe, win rate, PnL
- `ScoringConfig` - Scoring weights and thresholds
- `TuningRunResult` - Tuning run metadata and best candidate
- `TuningConfig` - Tuning parameters (mode, max candidates, metric)

**System Health:**
- `SystemHealth` - Performance, connectivity, data quality, AI model status
- `Alert` - Alert configuration and trigger state

**Trading Engine Types:**
- `TradeSignal` - Signal to be executed (source, symbol, action, confidence, market)
- `TradeExecutionResult` - Execution result (executed, reason, order, market)
- `PlaceOrderParams` - Order parameters (symbol, side, quantity, type, leverage, market)
- `PlaceOrderResult` - Order result (orderId, status, price, error)
- `PositionResult` - Position info (side, size, entry, PnL, liquidation, margin)
- `AccountInfo` - Account balance and equity

**Risk Types:**
- `MarketRiskConfig` - Risk limits for SPOT or FUTURES
- `RiskGuardConfig` - Dual-mode risk config (spot + futures)
- `RiskCheckInput` - Trade parameters to check
- `RiskCheckResult` - Risk check result (allowed, reason)

**System Control:**
- `TradingMode` - OFF | DRY_RUN | TESTNET
- `TradingMarket` - SPOT | FUTURES | BOTH
- `SystemConfig` - Feature flags and modes
- `SystemStatusResponse` - Comprehensive system status

**Strategy & Scoring:**
- `Direction` - BULLISH | BEARISH | NEUTRAL
- `Action` - BUY | SELL | HOLD
- `DetectorOutput` - Detector score with metadata
- `Component` - Component contribution in scoring
- `TFResult` - Timeframe result with components
- `ConfluenceInfo` - AI + Tech + Context agreement
- `EntryPlan` - Entry/exit plan with SL/TP/ladder/trailing
- `ContextSnapshot` - Sentiment/news/whales context
- `ScoringSnapshot` - Full scoring result with confluence and entry plan

**Exchange & Credentials:**
- `ExchangeCredential` - API credentials for exchanges
- `StrategyTemplate` - Strategy configuration template

**API Configuration:**
- `ApiConfig` - Comprehensive API configuration (Binance, KuCoin, Telegram, database, Redis, HuggingFace, etc.)

### Futures-Specific Types (src/types/futures.ts)

- `FuturesSide` - long | short | buy | sell
- `FuturesOrderType` - limit | market
- `MarginMode` - cross | isolated
- `OrderStatus` - pending | active | filled | cancelled | rejected
- `FuturesPosition` - Full position info with leverage, PnL, liquidation
- `FuturesOrder` - Order with leverage, SL/TP, reduce-only flag
- `LeverageSettings` - Leverage and margin mode configuration
- `FundingRate` - Funding rate info with mark/index prices
- `FuturesAccountBalance` - Available balance, equity, unrealized PnL, margins
- `FuturesOrderbook` - Bids/asks with timestamp

### Signal/Scoring Types (src/types/signals.ts)

- `Action` - BUY | SELL | HOLD
- `Bar` - OHLCV bar structure
- `CoreSignal` - Core signal with strength, confidence, reasons
- `LayerScore` - Detector score with reasons
- `PatternScores` - Elliott, harmonic, classical pattern scores
- `AuxScores` - Fibonacci, SAR, R% scores
- `SentimentScores` - Sentiment, news, whales scores
- `MLScore` - ML prediction score
- `CategoryScore` - Category-level score (Core/SMC/Patterns/Sentiment/ML)
- `EffectiveWeights` - Current weights (static or adaptive)
- `TelemetrySummary` - Performance summary (total signals, win rate, best category)
- `FinalDecision` - Final aggregated decision with category breakdown

### Strategy Pipeline Types (src/types/strategyPipeline.ts)

- `StrategySymbolView` - Symbol with scoring details
- `Strategy1Result` - Wide universe result
- `Strategy2Result` - Refined result with ETA
- `Strategy3Result` - Final pick with entry levels and risk plan
- `StageMetadata` - Processing metadata per stage
- `ScoringOverview` - Adaptive scoring overview
- `AutoTradeResult` - Auto-trade execution result
- `StrategyPipelineResult` - Complete pipeline result
- `StrategyPipelineParams` - Pipeline run parameters
- `StrategyPipelineResponse` - API response wrapper

### Type System Strengths

1. **Comprehensive:** 899 lines of types cover all major domains
2. **Strongly Typed:** No `any` types in critical paths
3. **Backwards Compatible:** Optional fields for gradual migration
4. **Market-Aware:** Separate SPOT and FUTURES types where needed
5. **Documented:** Comments explain purpose and constraints

---

## Configuration System

### Environment Variables

**Key Variables (from .env.example and code inspection):**

**Backend:**
- `PORT=8001` - Backend server port
- `PORT_AUTO=false` - Auto-increment port if busy
- `NODE_ENV=development` - Node environment

**Frontend:**
- `VITE_API_BASE=http://localhost:8001` - Backend API base URL
- `VITE_WS_BASE=ws://localhost:8001` - WebSocket base URL

**Data Policy:**
- `VITE_APP_MODE=online` - Application mode (online/demo/test)
- `VITE_STRICT_REAL_DATA=true` - Enforce real data only
- `VITE_USE_MOCK_DATA=false` - Use mock fixtures
- `VITE_ALLOW_FAKE_DATA=false` - Allow synthetic data (test mode only)

**Primary Data Source:**
- `PRIMARY_DATA_SOURCE=huggingface` - Primary data source
- `HF_ENGINE_BASE_URL=https://really-amin-datasourceforcryptocurrency.hf.space`
- `HF_ENGINE_ENABLED=true` - Enable HF Data Engine
- `HF_ENGINE_TIMEOUT=30000` - Request timeout (ms)

**Exchange APIs (Optional):**
- Binance, KuCoin, CoinGecko, CoinMarketCap, CryptoCompare, etc.
- Most proxied through HF Data Engine or marked optional

**Feature Flags:**
- `FEATURE_FUTURES=true` - Enable futures trading
- Loaded from environment or `src/config/flags.ts`

### JSON Config Files (config/)

**system.config.json:**
```json
{
  "features": {
    "liveScoring": true,
    "backtest": true,
    "autoTuning": false,
    "autoTrade": false,
    "manualTrade": true
  },
  "modes": {
    "environment": "DEV",
    "trading": "DRY_RUN"
  },
  "trading": {
    "environment": "DEV",
    "mode": "DRY_RUN",
    "market": "FUTURES"
  }
}
```

**Loaded by:** `src/config/systemConfig.ts`

**scoring.config.json (125 lines):**
- `version: "3.0"` - HTS Smart Scoring System
- `weights` - Detector weights (ml_ai: 0.15, rsi: 0.09, etc.)
- `thresholds` - Buy/sell score thresholds (buyScore: 0.70, sellScore: 0.30)
- `categories` - Category weights (core: 0.40, smc: 0.25, patterns: 0.20, sentiment: 0.10, ml: 0.05)
- `adaptive` - Adaptive weighting configuration (enabled: false by default)
- `regimeDetection` - Market regime detection settings
- `multiTimeframe` - Multi-timeframe aggregation
- `tuning` - Tuning parameters (grid/GA, max candidates, metric)
- `autoTrade` - Auto-trade configuration (enabled: false, minScore: 0.80, quantityUSDT: 100)

**Loaded by:** `src/controllers/StrategyPipelineController.ts` and scoring services

**risk.config.json:**
- Dual-mode risk configuration (spot + futures)
- Loaded by `src/engine/trading/RiskGuard.ts`
- See "Risk Guard" section for details

**Other Configs:**
- `api.json` - API configuration
- `exchanges.json` - Exchange configurations
- `feature-flags.json` - Feature flags
- `providers_config.json` - Data provider priorities
- `strategy.config.json` - Strategy parameters
- `testing.json` - Testing configuration

### Configuration Loading

**SystemConfigManager (src/config/systemConfig.ts):**
- Singleton pattern
- Loads `config/system.config.json` on first access
- Validates structure and types
- Falls back to defaults if file missing
- Provides:
  - `getSystemConfig()` - Full config
  - `isFeatureEnabled(feature)` - Feature flag check
  - `getEnvironment()` - DEV/STAGING/PROD
  - `getTradingMode()` - OFF/DRY_RUN/TESTNET
  - `getTradingMarket()` - SPOT/FUTURES/BOTH
  - `reload()` - Hot-reload config from disk

**Data Policy (src/config/dataPolicy.ts):**
- Single source of truth for data usage rules
- Enforces online/demo/test modes
- Validates at application startup via `assertPolicy()`
- Throws errors if policy violated (e.g., mock data in online mode)

**Risk Config (config/risk.config.json):**
- Loaded by `RiskGuard.getInstance()`
- Supports legacy single config and new dual-mode (spot/futures)
- Validated on load, falls back to defaults if invalid

**Scoring Config (config/scoring.config.json):**
- Loaded by `StrategyPipelineController` for pipeline runs
- Supports hot-reload if `hotReload: true` (every 30s)
- Adaptive weights updated at runtime if enabled

### Hot-Reload Behavior

**System Config:**
- Manual reload via `reloadSystemConfig()`
- No automatic hot-reload

**Scoring Config:**
- Automatic hot-reload if `hotReload: true`
- Reload interval: `reloadIntervalMs: 30000` (30 seconds)
- Implemented in scoring services

**Risk Config:**
- Manual reload via `RiskGuard.reloadConfig()`
- No automatic hot-reload

---

## Summary

### Architecture Strengths

**1. Strong Type Safety:**
- Comprehensive TypeScript types across frontend and backend
- 899 lines of core types plus domain-specific types
- Minimal `any` usage in critical paths
- Example: `src/types/index.ts` defines all major data structures

**2. Modular Service Architecture:**
- 106 service files with clear separation of concerns
- Singleton pattern for shared services (Database, Logger, ConfigManager)
- Example: `src/services/KuCoinFuturesService.ts` isolated from other exchange logic

**3. Honest Error Reporting:**
- NOT_IMPLEMENTED errors instead of fake data
- Explicit UI warnings for unavailable features (SpotNotAvailable.tsx)
- Data policy enforcement prevents mock data in production
- Example: `ExchangeClient.placeSpotOrder()` returns clear error, not fake success

**4. Multi-Provider Cascade:**
- HF Data Engine as primary source with fallbacks
- Emergency fallback service for resilience
- Graceful degradation when external APIs fail
- Example: `MultiProviderMarketDataService` chains providers

**5. Comprehensive Signal Analysis:**
- 11 detector types (Core, SMC, Patterns, Sentiment, ML)
- Category-based scoring with adaptive weighting
- Strategy 1 → 2 → 3 cascade for signal refinement
- Example: `src/engine/pipeline.ts` orchestrates all detectors

**6. Real Futures Trading:**
- Fully functional KuCoin Futures integration
- Risk guard with market-specific limits
- Multiple trading modes (OFF, DRY_RUN, TESTNET)
- Example: `src/engine/trading/TradeEngine.ts` with `RiskGuard`

**7. Configuration-Driven:**
- JSON configs for system, scoring, risk, strategy
- Environment variable support
- Hot-reload capability for scoring config
- Example: `config/system.config.json` controls all features

**8. Real-Time Capabilities:**
- WebSocket server with heartbeat
- Futures channel for position/order updates
- Score stream gateway for live scoring
- Example: `src/ws/futuresChannel.ts` broadcasts updates every 5 seconds

### Architecture Weaknesses

**1. SPOT Trading Not Implemented:**
- ExchangeClient explicitly returns NOT_IMPLEMENTED
- Risk guard blocks SPOT balance verification
- UI components warn users SPOT unavailable
- Impact: Only FUTURES trading functional
- **Files:** `src/services/exchange/ExchangeClient.ts:185`, `src/components/trading/SpotNotAvailable.tsx`

**2. HF Adapter Partial Implementation:**
- Signal history/generation marked NOT_IMPLEMENTED (stored locally instead)
- SMC/Elliott analysis not via HF (uses local services)
- Proxy endpoints not implemented (direct integrations used)
- Impact: HF Data Engine used only for market data, not advanced features
- **Files:** `src/services/hf/HFSignalsAdapter.ts`, `src/services/hf/HFAnalysisAdapter.ts`

**3. Missing Route Files:**
- 19 route files referenced but not present in codebase
- Includes: futures, offline, ml, news, backtest routes
- Impact: Features planned but not implemented
- **File:** `src/server.ts` lines 109-128 (commented out)

**4. Legacy Code Accumulation:**
- Backup views with timestamps in `views/__backup__/`
- Legacy components in `views/__legacy__/`
- `RealDataManager-old.ts` alongside current version
- Impact: Code maintenance burden, potential confusion
- **Locations:** `src/views/__backup__/`, `src/views/__legacy__/`, `src/services/`

**5. Complex Provider Architecture:**
- Multiple layers: HF Client → HF Adapter → Multi-Provider → Real Data Manager
- Emergency fallback adds another layer
- Impact: Difficult to trace data flow, debug issues
- **Files:** 106 service files with overlapping responsibilities

**6. Custom Navigation System:**
- No React Router, custom NavigationProvider
- View switching via string matching
- Impact: No URL routing, no browser history, harder to deep-link
- **File:** `src/components/Navigation/NavigationProvider.tsx`

**7. Auto-Refresh Disabled:**
- DataContext and TradingContext auto-refresh disabled
- Reduces query load but requires manual refreshes
- Impact: Stale data unless user manually refreshes
- **Files:** `src/contexts/DataContext.tsx:277-278`, `src/contexts/TradingContext.tsx:41-42`

**8. Test Coverage Unknown:**
- Some test files exist (`__tests__` folders) but coverage not assessed
- No CI/CD pipeline visible in codebase
- Impact: Unknown code quality and regression risk

### High-Level Recommendations

**Short Term (1-2 weeks):**

1. **Clean Up Legacy Code:**
   - Remove or archive `__backup__` and `__legacy__` folders
   - Delete `RealDataManager-old.ts` if no longer needed
   - Document which service files are primary vs. deprecated

2. **Document Missing Routes:**
   - Create README listing which route files were planned but not implemented
   - Decide: implement or remove from plan
   - Remove commented-out imports from `server.ts`

3. **Implement SPOT Trading OR Remove:**
   - Either: Complete KuCoin SPOT API integration
   - Or: Remove SPOT options from UI entirely (make FUTURES-only explicit)
   - Update documentation to reflect choice

4. **Enable Auto-Refresh with Optimization:**
   - Re-enable DataContext/TradingContext auto-refresh
   - Use longer intervals (60s+) to reduce load
   - Add user preference toggle for auto-refresh

**Medium Term (1-3 months):**

1. **Consolidate Provider Architecture:**
   - Create single unified provider interface
   - Reduce layers: HF Client → Unified Provider → Cache
   - Document data flow clearly

2. **Add URL Routing:**
   - Integrate React Router for proper URL routing
   - Enable browser history and deep-linking
   - Preserve custom navigation as backup

3. **HF Adapter Completion:**
   - Decide: Implement HF signal/analysis endpoints OR remove from design
   - If removing: Update HF Data Engine to clarify scope (market data only)
   - If implementing: Complete HFSignalsAdapter, HFAnalysisAdapter

4. **Test Coverage:**
   - Add unit tests for critical paths (TradeEngine, RiskGuard, ExchangeClient)
   - Add integration tests for Strategy Pipeline
   - Set up CI/CD with test automation

**Long Term (3-6 months):**

1. **Production Deployment:**
   - Deploy to Railway, Hugging Face Spaces, or cloud provider
   - Configure production environment variables
   - Set up monitoring and alerting (already has Prometheus metrics)

2. **Database Migration:**
   - Evaluate PostgreSQL for better concurrency vs. SQLite
   - Keep SQLite for local development
   - Implement database migrations

3. **Adaptive Scoring Tuning:**
   - Enable adaptive weighting (`adaptive.enabled: true`)
   - Run extensive backtests to validate performance
   - Monitor category weights over time

4. **Feature Expansion:**
   - Complete SPOT trading if prioritized
   - Implement missing route files if needed
   - Add more exchanges (Binance Futures, Bybit, OKX)

---

**End of Architecture Report**

Generated on: 2025-11-16  
Based on: Direct code inspection of /workspace  
Methodology: No assumptions, no external documentation, code-only analysis
