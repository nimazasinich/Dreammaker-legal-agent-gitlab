# Complete Architecture Report
## DreammakerCryptoSignalAndTrader

**Generated:** Based on direct code inspection (no assumptions)  
**Date:** 2025-11-16T11:09:19+00:00  
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

**DreammakerCryptoSignalAndTrader** is a full-stack cryptocurrency trading platform built with React (frontend) and Node.js/Express (backend). The project focuses on signal analysis, automated trading, and real-time market data processing.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite as build tool
- Tailwind CSS for styling
- React Context API for state management
- Custom hooks for WebSocket and data fetching

**Backend:**
- Node.js (>=18.0.0)
- Express.js web framework
- WebSocket (ws library) for real-time communication
- Better-SQLite3 for local database
- IORedis (optional) for distributed caching

**Key Capabilities:**
- **Signal Analysis**: Multi-strategy signal generation (SMC, Elliott Wave, Harmonic Patterns, sentiment analysis)
- **Trading**: Futures trading via KuCoin testnet (fully implemented), SPOT trading (structure exists but not implemented)
- **Data Sources**: Primary integration with HuggingFace Data Engine; Binance/KuCoin adapters exist but return `NOT_IMPLEMENTED` errors
- **Real-time Updates**: WebSocket channels for futures positions, live scoring, and signal visualization
- **Risk Management**: Dual-mode risk guard (SPOT/FUTURES) with position size limits, daily loss limits, and market data validation
- **Backtesting**: Engine exists for strategy testing against historical data
- **AI/ML**: TensorFlow-based neural networks for prediction (training engine present)

### Current State

- **Fully Functional**: Futures trading (KuCoin testnet), WebSocket real-time updates, signal generation pipeline, risk management
- **Partially Implemented**: SPOT trading (structure exists, returns `NOT_IMPLEMENTED`), Binance/KuCoin direct data providers (adapters return errors)
- **Primary Data Source**: HuggingFace Data Engine (recommended and fully integrated)
- **Architecture**: Well-structured with clear separation between frontend/backend, services, controllers, and engines

---

## Frontend Architecture

### Entry Points

**`src/main.tsx`** (Frontend Bootstrap):
- Validates data policy at startup (`config/dataPolicy.ts`)
- Enforces environment variable checks (API_BASE, WS_BASE)
- Detects HuggingFace deployment environment
- Renders `App.tsx` wrapped in `ErrorBoundary`
- **File Reference**: `src/main.tsx:1-89`

**`src/App.tsx`** (Main Application Component):
- Provider hierarchy:
  - `ModeProvider` → `ThemeProvider` → `AccessibilityProvider` → `DataProvider` → `LiveDataProvider` → `TradingProvider` → `BacktestProvider` → `NavigationProvider`
- Lazy-loaded views (code splitting)
- View routing via `NavigationProvider` (custom navigation, not React Router)
- **File Reference**: `src/App.tsx:1-197`

### Component Structure

**Main Component Folders** (`src/components/`):

1. **`components/ai/`** (3 files):
   - `AIPredictor.tsx`, `TrainingDashboard.tsx`
   - AI prediction and training UI components

2. **`components/backtesting/`** (3 files):
   - `BacktestButton.tsx`, `BacktestPanel.tsx`
   - Backtesting interface components

3. **`components/connectors/`** (6 files):
   - `RealChartDataConnector.tsx`, `RealDataConnector.tsx`, `RealPortfolioConnector.tsx`, `RealPriceChartConnector.tsx`, `RealSignalFeedConnector.tsx`
   - Data connector components for real-time data integration
   - **Note**: Contains TODO comment: "Refactor these remaining connectors to use contexts" (`src/components/connectors/index.ts:12`)

4. **`components/market/`** (3 files):
   - `MarketTicker.tsx`, `PriceChart.tsx`
   - Market data display components

5. **`components/news/`** (4 files):
   - `NewsCard.tsx`, `NewsFeed.tsx`, `NewsPanel.tsx`
   - News aggregation and display

6. **`components/portfolio/`** (3 files):
   - `Portfolio.tsx`, `RiskCenterPro.tsx`
   - Portfolio management and risk visualization

7. **`components/risk/`** (4 files):
   - `LiquidationBar.tsx`, `RiskAlertCard.tsx`, `RiskGauge.tsx`, `StressTestCard.tsx`
   - Risk management visualization

8. **`components/scanner/`** (7 files):
   - `AISignalsScanner.tsx`, `NewsSentimentScanner.tsx`, `SmartMoneyScanner.tsx`, `TechnicalPatternsScanner.tsx`, `WhaleActivityScanner.tsx`, `ScannerFeedPanel.tsx`
   - Multi-strategy signal scanning components

9. **`components/scoring/`** (2 files):
   - `ScoringEditor.tsx`
   - Scoring configuration UI

10. **`components/settings/`** (5 files):
    - `DataSourceSelector.tsx`, `ExchangeSettings.tsx`, `IntegrationSettings.tsx`, `IntegrationsTelegram.tsx`, `TelegramSettingsCard.tsx`
    - Configuration and settings UI

11. **`components/signal/`** (6 files):
    - `BreakoutAnimation.tsx`, `ControlsPanel.tsx`, `ParticleEffect.tsx`, `SignalExamplesPanel.tsx`, `SignalStagePipeline.tsx`, `SignalVisualizationSection.tsx`
    - Signal visualization and pipeline UI

12. **`components/strategy/`** (3 files):
    - `PerformanceChart.tsx`, `ScoreGauge.tsx`, `StrategyTemplateEditor.tsx`
    - Strategy management UI

13. **`components/trading/`** (3 files):
    - `TradingDashboard.tsx`, `SpotNotAvailable.tsx` (explicitly shows SPOT not available)
    - Trading interface components

14. **`components/ui/`** (20 files):
    - Base components: `Button.tsx`, `Card.tsx`
    - UI utilities: `ErrorBoundary.tsx`, `LoadingSpinner.tsx`, `Toast.tsx`, `Form.tsx`, etc.

### Views / Pages

**Active Views** (`src/views/`):
- `DashboardView.tsx` - Main dashboard
- `ChartingView.tsx` - Charting interface
- `MarketView.tsx` - Market data view
- `ScannerView.tsx` - Signal scanner
- `TrainingView.tsx` - AI training interface
- `RiskView.tsx` - Risk management view
- `ProfessionalRiskView.tsx` - Advanced risk view
- `BacktestView.tsx` - Backtesting interface
- `HealthView.tsx` - System health monitoring
- `SettingsView.tsx` - Settings configuration
- `FuturesTradingView.tsx` - Futures trading interface
- `TradingView.tsx` - General trading view (shows SPOT not available message)
- `UnifiedTradingView.tsx` - Unified trading interface
- `EnhancedTradingView.tsx` - Enhanced trading features
- `PositionsView.tsx` - Position management
- `PortfolioPage.tsx` - Portfolio overview
- `EnhancedStrategyLabView.tsx` - Strategy lab
- `StrategyBuilderView.tsx` - Strategy builder
- `StrategyInsightsView.tsx` - Strategy insights
- `ExchangeSettingsView.tsx` - Exchange configuration
- `MonitoringView.tsx` - System monitoring
- `DiagnosticsView.tsx` - Diagnostics interface

**Archived Views** (`src/views/__backup__/`):
- Contains backup versions of views dated 2025-11-09
- `DashboardView_20251109_0042.tsx`, `EnhancedStrategyLabView_20251109_0058.tsx`, etc.

**Legacy Views** (`src/views/__legacy__/`):
- `StrategyLabView.tsx`, `SVG_Icons.tsx` (marked as legacy)

### Context & State Management

**React Contexts** (`src/contexts/`):

1. **`DataContext.tsx`**:
   - Manages market data, prices, signals, portfolio, positions
   - Uses `RealDataManager-old.ts` for data fetching
   - Handles OHLCV data loading with preflight checks
   - **File Reference**: `src/contexts/DataContext.tsx:1-342`

2. **`TradingContext.tsx`**:
   - Manages trading mode (virtual/real), balance, positions, orders
   - Integrates with `KuCoinFuturesService` and `VirtualTradingService`
   - **File Reference**: `src/contexts/TradingContext.tsx:1-148`

3. **`ModeContext.tsx`**:
   - Manages application mode (demo/real data), trading mode
   - **File Reference**: `src/contexts/ModeContext.tsx` (exists, not fully read)

4. **`BacktestContext.tsx`**:
   - Manages backtesting state and results
   - **File Reference**: `src/contexts/BacktestContext.tsx` (exists)

**Additional Providers**:
- `LiveDataProvider` (`src/components/LiveDataContext.tsx`) - Real-time data updates
- `NavigationProvider` (`src/components/Navigation/NavigationProvider.tsx`) - Custom navigation system
- `ThemeProvider` (`src/components/Theme/ThemeProvider.tsx`) - Theme management
- `AccessibilityProvider` (`src/components/Accessibility/AccessibilityProvider.tsx`) - Accessibility features

**State Management Approach**:
- **Primary**: React Context API (no Redux/Zustand found)
- **Local State**: useState hooks in components
- **Data Fetching**: Custom hooks (`useOHLC`, `useWebSocket`, `useSignalWebSocket`)

### Hooks

**Custom Hooks** (`src/hooks/`):

1. **`useWebSocket.ts`**:
   - Generic WebSocket hook for subscribing to topics
   - Uses `WebSocketManager` service
   - Auto-reconnect with exponential backoff
   - **File Reference**: `src/hooks/useWebSocket.ts:1-137`

2. **`useSignalWebSocket.ts`**:
   - Specialized hook for signal pipeline WebSocket updates
   - Handles 8-stage signal pipeline visualization
   - Fallback to REST API polling if WebSocket fails
   - **File Reference**: `src/hooks/useSignalWebSocket.ts:1-337`

3. **`useOHLC.ts`**:
   - OHLCV data fetching hook
   - **File Reference**: `src/hooks/useOHLC.ts` (exists)

4. **`useStrategyPipeline.ts`**:
   - Strategy pipeline execution hook
   - **File Reference**: `src/hooks/useStrategyPipeline.ts` (exists)

5. **`useForm.ts`**:
   - Form handling hook
   - **File Reference**: `src/hooks/useForm.ts` (exists)

6. **`useDebouncedEffect.ts`**:
   - Debounced effect hook
   - **File Reference**: `src/hooks/useDebouncedEffect.ts` (exists)

7. **`useSafeAsync.ts`**:
   - Safe async operation hook
   - **File Reference**: `src/hooks/useSafeAsync.ts` (exists)

8. **`useOnlineStatus.ts`**:
   - Online/offline status hook
   - **File Reference**: `src/hooks/useOnlineStatus.ts` (exists)

### Routing

**Navigation System**:
- **Custom Navigation**: Uses `NavigationProvider` (not React Router)
- **View Switching**: `currentView` state determines which view component renders
- **Supported Views**: dashboard, charting, market, scanner, training, risk, professional-risk, backtest, strategyBuilder, health, settings, futures, trading, portfolio, enhanced-trading, positions, strategylab, strategy-insights, exchange-settings, monitoring, diagnostics
- **File Reference**: `src/components/Navigation/NavigationProvider.tsx` and `src/App.tsx:85-111`

---

## Backend Architecture

### Server Entry Point

**`src/server.ts`** (Main Backend Server):
- **Express Setup**: Express app with HTTP server
- **WebSocket Server**: Created at `/ws` endpoint (`src/server.ts:151-154`)
- **Middleware Stack**:
  - Helmet for security (`src/server.ts:300`)
  - CORS configuration (`src/server.ts:323`)
  - Express JSON parser (`src/server.ts:329`)
  - Metrics middleware (`src/server.ts:330`)
  - Request logging (`src/server.ts:333`)
- **Service Initialization**: Singleton pattern for services (Database, BinanceService, KuCoinService, MarketDataIngestionService, RedisService, etc.)
- **File Reference**: `src/server.ts:1-4064` (large file, 4000+ lines)

**Alternative Server Files** (exist but not primary):
- `src/server-real-data.ts` - Real data server variant
- `src/server-simple.ts` - Simplified server variant

### Controllers

**Controller Files** (`src/controllers/`):

1. **`AIController.ts`**:
   - AI model creation, training, prediction endpoints
   - **File Reference**: `src/controllers/AIController.ts` (exists)

2. **`AnalysisController.ts`**:
   - Technical analysis endpoints (SMC, Elliott Wave, Harmonic, Sentiment, Whale)
   - **File Reference**: `src/controllers/AnalysisController.ts` (exists)

3. **`DataSourceController.ts`**:
   - Data source configuration management
   - GET/POST `/api/config/data-source`
   - **File Reference**: `src/controllers/DataSourceController.ts` (exists)

4. **`FuturesController.ts`**:
   - Futures trading operations
   - **File Reference**: `src/controllers/FuturesController.ts` (exists)

5. **`HFDataEngineController.ts`**:
   - HuggingFace Data Engine integration endpoints
   - **File Reference**: `src/controllers/HFDataEngineController.ts` (exists)

6. **`MarketDataController.ts`**:
   - Market data endpoints
   - **File Reference**: `src/controllers/MarketDataController.ts` (exists)

7. **`ScoringController.ts`**:
   - Scoring configuration and live scoring endpoints
   - **File Reference**: `src/controllers/ScoringController.ts` (exists)

8. **`StrategyPipelineController.ts`**:
   - Strategy pipeline execution
   - **File Reference**: `src/controllers/StrategyPipelineController.ts` (exists)

9. **`SystemController.ts`**:
   - System health, configuration, cache management
   - **File Reference**: `src/controllers/SystemController.ts` (exists)

10. **`SystemStatusController.ts`**:
    - System status aggregation
    - **File Reference**: `src/controllers/SystemStatusController.ts` (exists)

11. **`TradingController.ts`**:
    - Trading operations (portfolio, market data, trade execution)
    - **File Reference**: `src/controllers/TradingController.ts` (exists)

12. **`TuningController.ts`**:
    - Scoring weight tuning endpoints
    - **File Reference**: `src/controllers/TuningController.ts` (exists)

### Routes

**Route Files** (`src/routes/`):

1. **`dataSource.ts`**:
   - Data source configuration routes
   - GET/POST `/api/config/data-source`
   - **File Reference**: `src/routes/dataSource.ts:1-25`

2. **`diagnosticsRoute.ts`**:
   - Provider diagnostics routes
   - GET `/diagnostics`, GET `/diagnostics/:provider`, POST `/diagnostics/clear`
   - **File Reference**: `src/routes/diagnosticsRoute.ts:1-260`

**Commented Out Routes** (referenced but not present):
- `futuresRoutes` (`src/server.ts:1839`)
- `offlineRoutes` (`src/server.ts:1842`)
- `systemDiagnosticsRoutes` (`src/server.ts:1845`)
- `systemMetricsRoutes` (`src/server.ts:1848`)
- `marketUniverseRoutes` (`src/server.ts:1851`)
- `marketReadinessRoutes` (`src/server.ts:1852`)
- `mlRoutes` (`src/server.ts:1855`)
- `newsRoutes` (`src/server.ts:1858`)
- `diagnosticsMarketRoutes` (`src/server.ts:1861`)
- `strategyTemplatesRoutes` (`src/server.ts:1864`)
- `strategyApplyRoutes` (`src/server.ts:1865`)
- `backtestRoutes` (`src/server.ts:1866`)
- `hfRouter` (`src/server.ts:1869`)
- `resourceMonitorRouter` (`src/server.ts:1870`)
- `optionalPublicRouter` (`src/server.ts:1873`)
- `optionalNewsRouter` (`src/server.ts:1874`)
- `optionalMarketRouter` (`src/server.ts:1875`)
- `optionalOnchainRouter` (`src/server.ts:1876`)

**File Reference**: `src/server.ts:109-129` (commented imports)

### API Endpoints

**Key REST Endpoints** (extracted from `src/server.ts`):

**Health & System:**
- `GET /status/health` - Simple health check (`src/server.ts:350`)
- `GET /api/health` - Comprehensive health check (`src/server.ts:360`)
- `GET /api/system/health` - System health (`src/server.ts:835`)
- `GET /api/system/status` - System status (`src/server.ts:1185`)
- `GET /api/system/config` - System configuration (`src/server.ts:839`)
- `GET /api/system/cache/stats` - Cache statistics (`src/server.ts:1190`)
- `POST /api/system/cache/clear` - Clear cache (`src/server.ts:1211`)
- `GET /metrics` - Prometheus metrics (`src/server.ts:357`)

**Data Source Configuration:**
- `GET /api/config/data-source` - Get data source config (`src/routes/dataSource.ts:16`)
- `POST /api/config/data-source` - Update data source (`src/routes/dataSource.ts:22`)

**HuggingFace Data Engine:**
- `GET /api/hf-engine/health` - HF engine health (`src/server.ts:854`)
- `GET /api/hf-engine/status` - HF engine status (`src/server.ts:858`)
- `GET /api/hf-engine/providers` - Provider list (`src/server.ts:862`)
- `GET /api/hf-engine/prices` - Price data (`src/server.ts:867`)
- `GET /api/hf-engine/market/overview` - Market overview (`src/server.ts:871`)
- `GET /api/hf-engine/categories` - Categories (`src/server.ts:875`)
- `GET /api/hf-engine/rate-limits` - Rate limits (`src/server.ts:880`)
- `GET /api/hf-engine/logs` - Logs (`src/server.ts:884`)
- `GET /api/hf-engine/alerts` - Alerts (`src/server.ts:888`)
- `GET /api/hf-engine/hf/health` - HF Space health (`src/server.ts:893`)
- `POST /api/hf-engine/hf/refresh` - Refresh HF registry (`src/server.ts:897`)
- `GET /api/hf-engine/hf/registry` - HF registry (`src/server.ts:901`)
- `POST /api/hf-engine/hf/sentiment` - Sentiment analysis (`src/server.ts:905`)

**Market Data:**
- `GET /api/market-data/prices` - Market prices (`src/server.ts:830`)
- `GET /api/market/real-prices` - Real prices (`src/server.ts:1319`)
- `GET /api/market/coingecko-prices` - CoinGecko prices (`src/server.ts:1398`)
- `GET /api/market/cryptocompare-prices` - CryptoCompare prices (`src/server.ts:1493`)
- `GET /api/market/prices` - General prices (`src/server.ts:1543`)
- `GET /api/market/historical` - Historical data (`src/server.ts:2348`)
- `GET /api/market/analysis/:symbol` - Market analysis (`src/server.ts:2523`)
- `GET /api/price/:symbol` - Single price (`src/server.ts:2603`)
- `GET /api/ticker/:symbol?` - Ticker data (`src/server.ts:2623`)

**Trading:**
- `GET /api/trading/portfolio` - Portfolio data (`src/server.ts:812`)
- `GET /api/trading/market/:symbol` - Market info (`src/server.ts:816`)
- `POST /api/trade/execute` - Execute trade (`src/server.ts:821`)
- `GET /api/trade/open-positions` - Open positions (`src/server.ts:825`)
- `GET /api/positions` - Positions (`src/server.ts:3263`)
- `GET /api/orders` - Orders (`src/server.ts:3235`)
- `GET /api/orders/:id` - Order details (`src/server.ts:3211`)
- `POST /api/orders/market` - Place market order (`src/server.ts:3064`)
- `POST /api/orders/limit` - Place limit order (`src/server.ts:3087`)
- `POST /api/orders/stop-loss` - Place stop-loss order (`src/server.ts:3113`)
- `POST /api/orders/trailing-stop` - Place trailing stop (`src/server.ts:3137`)
- `POST /api/orders/oco` - Place OCO order (`src/server.ts:3161`)
- `DELETE /api/orders/:id` - Cancel order (`src/server.ts:3187`)

**Signals:**
- `POST /api/signals/analyze` - Analyze signals (`src/server.ts:1670`)
- `POST /api/signals/start` - Start signal generation (`src/server.ts:2922`)
- `POST /api/signals/stop` - Stop signal generation (`src/server.ts:2942`)
- `GET /api/signals/history` - Signal history (`src/server.ts:2958`)
- `GET /api/signals` - Current signals (`src/server.ts:2978`)
- `GET /api/signals/statistics` - Signal statistics (`src/server.ts:2998`)
- `GET /api/signals/config` - Signal configuration (`src/server.ts:3016`)
- `GET /api/signals/current` - Current signal (`src/server.ts:3033`)

**Scoring:**
- `GET /api/scoring/snapshot` - Scoring snapshot (`src/server.ts:1718`)
- `GET /api/scoring/verdict` - Scoring verdict (`src/server.ts:1722`)
- `GET /api/scoring/weights` - Scoring weights (`src/server.ts:1726`)
- `POST /api/scoring/weights` - Update weights (`src/server.ts:1730`)
- `POST /api/scoring/weights/reset` - Reset weights (`src/server.ts:1734`)
- `GET /api/scoring/weights/history` - Weight history (`src/server.ts:1738`)
- `GET /api/scoring/live/:symbol` - Live scoring (`src/server.ts:1743`)
- `GET /api/scoring/stream-status` - Stream status (`src/server.ts:1747`)
- `POST /api/scoring/config` - Scoring configuration (`src/server.ts:1752`)

**Strategy Pipeline:**
- `POST /api/strategies/pipeline/run` - Run pipeline (`src/server.ts:1800`)
- `GET /api/strategies/pipeline/status` - Pipeline status (`src/server.ts:1805`)

**Tuning:**
- `POST /api/tuning/run` - Run tuning (`src/server.ts:1813`)
- `GET /api/tuning/result/:id` - Tuning result (`src/server.ts:1818`)
- `GET /api/tuning/latest` - Latest tuning (`src/server.ts:1823`)
- `GET /api/tuning/all` - All tuning results (`src/server.ts:1828`)
- `DELETE /api/tuning/result/:id` - Delete tuning (`src/server.ts:1833`)

**AI:**
- `GET /api/ai/test-initialization` - Test AI init (`src/server.ts:579`)
- `GET /api/ai/test-activations` - Test activations (`src/server.ts:606`)
- `POST /api/ai/create-network` - Create network (`src/server.ts:624`)
- `POST /api/ai/train-step` - Train step (`src/server.ts:686`)
- `POST /api/ai/train-epoch` - Train epoch (`src/server.ts:718`)
- `POST /api/ai/predict` - Predict (`src/server.ts:738`)
- `POST /api/ai/extract-features` - Extract features (`src/server.ts:777`)
- `POST /api/ai/backtest` - AI backtest (`src/server.ts:782`)

**Analysis:**
- `POST /api/analysis/signals` - Signal analysis (`src/server.ts:787`)
- `POST /api/analysis/smc` - SMC analysis (`src/server.ts:791`)
- `POST /api/analysis/elliott` - Elliott Wave (`src/server.ts:795`)
- `POST /api/analysis/harmonic` - Harmonic patterns (`src/server.ts:799`)
- `POST /api/analysis/sentiment` - Sentiment analysis (`src/server.ts:803`)
- `POST /api/analysis/whale` - Whale analysis (`src/server.ts:807`)

**Alerts:**
- `POST /api/alerts` - Create alert (`src/server.ts:950`)
- `GET /api/alerts` - List alerts (`src/server.ts:969`)
- `DELETE /api/alerts/:id` - Delete alert (`src/server.ts:988`)
- `GET /api/alerts/analytics` - Alert analytics (`src/server.ts:1013`)
- `POST /api/alerts/:id/success` - Mark success (`src/server.ts:1031`)
- `POST /api/alerts/:id/false-positive` - Mark false positive (`src/server.ts:1046`)

**Telegram:**
- `GET /api/telegram/config` - Get config (`src/server.ts:1061`)
- `POST /api/telegram/config` - Update config (`src/server.ts:1093`)
- `POST /api/telegram/test` - Test message (`src/server.ts:1125`)
- `POST /api/telegram/webhook` - Webhook (`src/server.ts:1151`)

**Providers:**
- `GET /api/providers/status` - Provider status (`src/server.ts:1236`)
- `POST /api/providers/reload` - Reload providers (`src/server.ts:1256`)
- `GET /api/providers/categories` - Provider categories (`src/server.ts:1276`)
- `GET /api/providers/:category` - Category providers (`src/server.ts:1296`)

**Orchestrator:**
- `GET /api/orchestrator/status` - Orchestrator status (`src/server.ts:3307`)
- `POST /api/orchestrator/configure` - Configure (`src/server.ts:3324`)
- `POST /api/orchestrator/start` - Start (`src/server.ts:3343`)
- `POST /api/orchestrator/stop` - Stop (`src/server.ts:3361`)

**Proxy:**
- `app.use('/api/proxy', unifiedProxyService.getRouter())` - Unified proxy routes (`src/server.ts:1879`)

**Diagnostics:**
- `GET /diagnostics` - Full diagnostics (`src/routes/diagnosticsRoute.ts:114`)
- `GET /diagnostics/:provider` - Provider diagnostics (`src/routes/diagnosticsRoute.ts:170`)
- `POST /diagnostics/clear` - Clear diagnostics (`src/routes/diagnosticsRoute.ts:200`)
- `POST /diagnostics/clear/:provider` - Clear provider (`src/routes/diagnosticsRoute.ts:226`)

### Services

**Service Files** (`src/services/` - 108 files total):

**Exchange Services:**
- `BinanceService.ts` - Binance API client
- `KuCoinService.ts` - KuCoin API client
- `KuCoinFuturesService.ts` - KuCoin Futures API client (fully implemented)
- `exchange/ExchangeClient.ts` - Unified exchange client (SPOT returns NOT_IMPLEMENTED)

**Data Services:**
- `RealMarketDataService.ts` - Real market data service
- `MultiProviderMarketDataService.ts` - Multi-provider aggregation
- `MarketDataIngestionService.ts` - Data ingestion orchestration
- `EnhancedMarketDataService.ts` - Enhanced market data
- `HistoricalDataService.ts` - Historical data fetching
- `HFDataEngineClient.ts` - HuggingFace Data Engine HTTP client
- `HFDataEngineAdapter.ts` - HF adapter (returns NOT_IMPLEMENTED for Binance/KuCoin)
- `HFOHLCVService.ts` - HF OHLCV data service
- `HFSentimentService.ts` - HF sentiment service
- `RealDataManager.ts` - Real data manager
- `FallbackDataManager.ts` - Fallback data manager
- `EmergencyDataFallbackService.ts` - Emergency fallback
- `SyntheticOHLCV.ts` - Synthetic data generation

**Analysis Services:**
- `SMCAnalyzer.ts` - Smart Money Concepts analyzer
- `ElliottWaveAnalyzer.ts` - Elliott Wave analyzer
- `HarmonicPatternDetector.ts` - Harmonic pattern detector
- `FibonacciDetector.ts` - Fibonacci retracement detector
- `ParabolicSARDetector.ts` - Parabolic SAR detector
- `RegimeDetector.ts` - Market regime detection
- `TechnicalAnalysisService.ts` - Technical analysis service
- `SentimentAnalysisService.ts` - Sentiment analysis
- `SentimentNewsService.ts` - News sentiment
- `WhaleTrackerService.ts` - Whale activity tracking
- `BlockchainDataService.ts` - Blockchain data service

**Trading Services:**
- `RealTradingService.ts` - Real trading service
- `VirtualTradingService.ts` - Virtual trading simulation
- `FuturesService.ts` - Futures trading service
- `OrderManagementService.ts` - Order management
- `ProfessionalRiskEngine.ts` - Professional risk engine

**AI/ML Services:**
- `aiService.ts` - AI service
- `aiPredictionService.ts` - AI prediction service
- `ContinuousLearningService.ts` - Continuous learning
- `SignalGeneratorService.ts` - Signal generation

**Scoring Services:**
- `DynamicWeightingService.ts` - Dynamic weight adjustment
- `ServiceOrchestrator.ts` - Service orchestration

**Notification Services:**
- `AlertService.ts` - Alert management
- `NotificationService.ts` - Notification service
- `TelegramService.ts` - Telegram integration

**Other Services:**
- `RedisService.ts` - Redis caching (optional)
- `DataValidationService.ts` - Data validation
- `WebSocketManager.ts` - WebSocket management
- `SignalVisualizationWebSocketService.ts` - Signal visualization WS
- `UnifiedProxyService.ts` - Unified proxy service
- `CORSProxyService.ts` - CORS proxy
- `ResourceMonitorService.ts` - Resource monitoring
- `SocialAggregationService.ts` - Social media aggregation
- `FearGreedService.ts` - Fear & Greed Index
- `BacktestService.ts` - Backtesting service
- `RealBacktestEngine.ts` - Real backtest engine

**HF Adapters** (`src/services/hf/`):
- `HFMarketAdapter.ts` - Market data adapter
- `HFHealthAdapter.ts` - Health check adapter
- `HFSignalsAdapter.ts` - Signals adapter (returns NOT_IMPLEMENTED)
- `HFAnalysisAdapter.ts` - Analysis adapter (returns NOT_IMPLEMENTED for SMC/Elliott)
- `HFProxyAdapter.ts` - Proxy adapter (returns NOT_IMPLEMENTED)

**Optional Services** (`src/services/optional/` - 10 files):
- Optional API integrations

---

## Trading System

### Trade Engine

**`src/engine/trading/TradeEngine.ts`**:
- **Purpose**: Core trade execution engine for SPOT + FUTURES
- **Signal Sources**: Strategy Pipeline, Live Scoring, Manual API requests
- **Trading Modes**: OFF, DRY_RUN, TESTNET (from `systemConfig.ts`)
- **Market Awareness**: Supports SPOT, FUTURES, BOTH
- **Risk Integration**: All trades pass through `RiskGuard` before execution
- **Order Construction**: Calculates quantity from USDT amount, gets leverage from risk config (FUTURES only)
- **Execution**: Routes to `ExchangeClient.placeOrder()` with market type
- **File Reference**: `src/engine/trading/TradeEngine.ts:1-274`

**Key Methods**:
- `executeSignal(signal: TradeSignal, quantityUSDT?: number): Promise<TradeExecutionResult>`
- Checks trading mode (blocks if OFF)
- Validates HOLD signals
- Runs risk guard check (market-aware)
- Gets current price from database
- Calculates quantity
- Places order via ExchangeClient
- Returns execution result with market type

### Risk Guard

**`src/engine/trading/RiskGuard.ts`**:
- **Purpose**: Trade risk evaluation layer (SPOT + FUTURES)
- **Dual-Mode Config**: Separate risk configs for SPOT and FUTURES
- **Risk Checks**:
  1. Position size limits (market-specific)
  2. Daily loss limits (market-specific)
  3. Open position limits (market-specific, FUTURES only)
  4. Account balance checks
  5. Market data availability (blocks if unavailable)
- **Config Loading**: Loads from `config/risk.config.json` (supports legacy and dual-mode)
- **File Reference**: `src/engine/trading/RiskGuard.ts:1-306`

**Key Methods**:
- `checkTradeRisk(input: RiskCheckInput): Promise<RiskCheckResult>`
- Gets market-specific config (SPOT/FUTURES)
- Validates position size against max limit
- Gets open positions (FUTURES only)
- Checks daily loss limits
- Validates account balance
- Checks market data availability
- Returns allowed/reason

**Default Config** (if file not found):
- FUTURES: maxPositionSizeUSDT: 300, maxDailyLossUSDT: 100, maxOpenPositions: 3, leverage: 3
- SPOT: maxPositionSizeUSDT: 500, maxDailyLossUSDT: 150, maxOpenPositions: 5

### Exchange Client

**`src/services/exchange/ExchangeClient.ts`**:
- **Purpose**: Unified interface for testnet trading (SPOT + FUTURES)
- **FUTURES**: Fully functional via `KuCoinFuturesService`
- **SPOT**: Structure exists but returns `NOT_IMPLEMENTED` error
- **File Reference**: `src/services/exchange/ExchangeClient.ts:1-276`

**Key Methods**:
- `placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult>`
  - Routes to `placeSpotOrder()` or `placeFuturesOrder()` based on market type
- `placeFuturesOrder()`: Calls `KuCoinFuturesService.placeOrder()` (real API)
- `placeSpotOrder()`: Returns `NOT_IMPLEMENTED` error (`src/services/exchange/ExchangeClient.ts:169-187`)
- `getOpenPositions()`: FUTURES only (SPOT doesn't have positions)
- `getAccountInfo()`: FUTURES account balance

**SPOT Implementation Status**:
- **File Reference**: `src/services/exchange/ExchangeClient.ts:169-187`
- Returns error: "SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete"

### Futures Trading

**`src/services/KuCoinFuturesService.ts`**:
- **Purpose**: KuCoin Futures API client (testnet)
- **Base URL**: `https://api-futures.kucoin.com`
- **Credentials**: Loaded from localStorage (frontend) or environment (backend)
- **File Reference**: `src/services/KuCoinFuturesService.ts:1-351`

**Implemented Operations**:
- `getPositions()` - Get open positions
- `placeOrder()` - Place futures order (market/limit)
- `getAccountBalance()` - Get account balance
- `getOpenOrders()` - Get open orders
- `cancelOrder()` - Cancel order
- `setLeverage()` - Set leverage
- `getLeverage()` - Get leverage
- `getFundingRate()` - Get funding rate

**Authentication**:
- Uses HMAC-SHA256 signature
- Headers: KC-API-KEY, KC-API-SIGN, KC-API-TIMESTAMP, KC-API-PASSPHRASE, KC-API-KEY-VERSION: 2

### Spot Trading

**Status**: **NOT IMPLEMENTED**

**Evidence**:
1. `ExchangeClient.placeSpotOrder()` returns `NOT_IMPLEMENTED` error (`src/services/exchange/ExchangeClient.ts:185`)
2. UI component `SpotNotAvailable.tsx` explicitly shows "SPOT trading is not implemented" (`src/components/trading/SpotNotAvailable.tsx`)
3. `TradingView.tsx` shows message: "SPOT trading is not implemented in this build" (`src/views/TradingView.tsx:125`)
4. `UnifiedTradingView.tsx` shows: "SPOT trading is not implemented" (`src/views/UnifiedTradingView.tsx:81`)

**Structure Exists**:
- `ExchangeClient` has `placeSpotOrder()` method (returns error)
- Risk guard supports SPOT config
- Trade engine routes SPOT orders correctly
- **Missing**: Actual KuCoin SPOT testnet API integration

---

## Data Providers & Integration

### Primary Data Source

**HuggingFace Data Engine** (Recommended):
- **Base URL**: Configurable via `HF_ENGINE_BASE_URL` (default: `https://really-amin-datasourceforcryptocurrency.hf.space`)
- **Client**: `HFDataEngineClient.ts` (`src/services/HFDataEngineClient.ts`)
- **Adapter**: `HFDataEngineAdapter.ts` (`src/services/HFDataEngineAdapter.ts`)
- **Status**: **FULLY IMPLEMENTED**
- **Configuration**: `src/config/dataSource.ts`
- **File Reference**: `src/config/dataSource.ts:1-167`

**HF Data Engine Features**:
- Multi-provider aggregation (CoinGecko, CoinMarketCap, CryptoCompare)
- Rate limit management
- Health monitoring
- Sentiment analysis (CryptoBERT)
- OHLCV data
- Market overview
- Provider status tracking

### Adapter Layers

**`HFDataEngineAdapter.ts`**:
- **Purpose**: Adapter for HuggingFace Data Engine
- **Status**: Fully implemented for HF, returns `NOT_IMPLEMENTED` for Binance/KuCoin direct sources
- **File Reference**: `src/services/HFDataEngineAdapter.ts:526-583`

**NOT_IMPLEMENTED Responses**:
- Binance/KuCoin direct sources return `NOT_IMPLEMENTED` error code
- **File Reference**: `src/services/HFDataEngineAdapter.ts:531, 559, 583`

**HF Adapters** (`src/services/hf/`):
- `HFMarketAdapter.ts` - Market data adapter (implemented)
- `HFHealthAdapter.ts` - Health adapter (implemented)
- `HFSignalsAdapter.ts` - Signals adapter (returns NOT_IMPLEMENTED) (`src/services/hf/HFSignalsAdapter.ts:89-124`)
- `HFAnalysisAdapter.ts` - Analysis adapter (SMC/Elliott return NOT_IMPLEMENTED) (`src/services/hf/HFAnalysisAdapter.ts:112-137`)
- `HFProxyAdapter.ts` - Proxy adapter (returns NOT_IMPLEMENTED) (`src/services/hf/HFProxyAdapter.ts:87-117`)

### Exchange Providers

**Binance**:
- **Service**: `BinanceService.ts` (`src/services/BinanceService.ts`)
- **Status**: Service exists, but direct data provider integration returns `NOT_IMPLEMENTED`
- **Configuration**: `BINANCE_ENABLED` environment variable
- **Note**: Used primarily for proxy routes, not direct data fetching

**KuCoin**:
- **Service**: `KuCoinService.ts` (`src/services/KuCoinService.ts`)
- **Status**: Service exists, but direct data provider integration returns `NOT_IMPLEMENTED`
- **Configuration**: `KUCOIN_ENABLED` environment variable
- **Note**: Futures trading fully implemented, but market data provider returns `NOT_IMPLEMENTED`

### Fallback Logic

**Data Source Cascade** (from `dataSource.ts`):
1. **Primary Source**: HuggingFace (if enabled)
2. **Fallback**: Binance/KuCoin (if enabled, but returns `NOT_IMPLEMENTED`)
3. **Emergency Fallback**: `EmergencyDataFallbackService` (`src/services/EmergencyDataFallbackService.ts`)

**Configuration**:
- `PRIMARY_DATA_SOURCE`: `huggingface` | `binance` | `kucoin` | `mixed`
- `HF_ENGINE_ENABLED`: boolean (default: true)
- `BINANCE_ENABLED`: boolean (default: true)
- `KUCOIN_ENABLED`: boolean (default: true)

**File Reference**: `src/config/dataSource.ts:40-63`

### Emergency or Synthetic Modes

**Emergency Fallback**:
- `EmergencyDataFallbackService.ts` (`src/services/EmergencyDataFallbackService.ts`)
- Activated when primary data sources fail
- **File Reference**: `src/services/EmergencyDataFallbackService.ts` (exists)

**Synthetic Data**:
- `SyntheticOHLCV.ts` (`src/services/SyntheticOHLCV.ts`)
- Generates synthetic OHLCV data
- **File Reference**: `src/services/SyntheticOHLCV.ts` (exists)

**TODO Marker**:
- `MarketDataIngestionService.ts` contains TODO: "Implement FallbackDataProvider for synthetic data" (`src/services/MarketDataIngestionService.ts:585`)

---

## Data Flow Analysis

### Frontend Component → Hook/Context → API Client → Backend Route → Service → Provider Flow

**Example: OHLCV Data Flow**

1. **Frontend Component**: `ChartingView.tsx` or component using `useOHLC` hook
2. **Hook**: `useOHLC.ts` (`src/hooks/useOHLC.ts`) - Fetches OHLCV data
3. **Context**: `DataContext.tsx` (`src/contexts/DataContext.tsx`) - Manages data state
4. **API Call**: `fetch(`${API_BASE}/api/market/ohlcv?symbol=${symbol}&timeframe=${timeframe}`)`
5. **Backend Route**: `GET /market/ohlcv` (`src/server.ts:1997`)
6. **Service**: `MarketDataIngestionService` or `HFOHLCVService`
7. **Provider**: `HFDataEngineClient.getPrices()` → HuggingFace Data Engine API
8. **Response**: Returns to frontend via REST API or WebSocket

**File References**:
- Hook: `src/hooks/useOHLC.ts`
- Context: `src/contexts/DataContext.tsx:79-342`
- Backend route: `src/server.ts:1997-2087`
- Service: `src/services/HFOHLCVService.ts`
- Client: `src/services/HFDataEngineClient.ts`

### Signal Generation Flow

**From API Request → Orchestrator → Engines → Detectors → Scoring → Signal**

1. **API Request**: `POST /api/signals/analyze` (`src/server.ts:1670`)
2. **Controller**: `SignalGeneratorService` (`src/services/SignalGeneratorService.ts`)
3. **Orchestrator**: `ServiceOrchestrator` (`src/services/ServiceOrchestrator.ts`)
4. **Engines**:
   - `SignalEngine.ts` (`src/engine/SignalEngine.ts`)
   - `AdaptiveScoringEngine.ts` (`src/engine/AdaptiveScoringEngine.ts`)
5. **Detectors** (`src/detectors/`):
   - `smc.ts` - Smart Money Concepts
   - `elliott.ts` - Elliott Wave
   - `harmonics.ts` - Harmonic Patterns
   - `sentiment.ts` - Sentiment Analysis
   - `whales.ts` - Whale Activity
   - `classical.ts` - Classical Patterns
   - `fibonacci.ts` - Fibonacci
   - `sar.ts` - Parabolic SAR
   - `rpercent.ts` - R-Percent
   - `ml.ts` - ML Detector
   - `news.ts` - News Detector
6. **Scoring**: `scoreAggregator.ts` (`src/engine/scoreAggregator.ts`)
7. **Response**: Signal with action (BUY/SELL/HOLD), confidence, score

**File References**:
- API: `src/server.ts:1670-1717`
- Service: `src/services/SignalGeneratorService.ts`
- Engine: `src/engine/SignalEngine.ts`
- Detectors: `src/detectors/*.ts`
- Scoring: `src/engine/scoreAggregator.ts`

### Trading Flow

**From UI Click → Controller → Trade Engine → Exchange Client → External API → Execution Result**

1. **UI**: `UnifiedTradingView.tsx` or `FuturesTradingView.tsx` - User clicks "Place Order"
2. **API Call**: `POST /api/trade/execute` (`src/server.ts:821`)
3. **Controller**: `TradingController.executeTrade()` (`src/controllers/TradingController.ts`)
4. **Trade Engine**: `TradeEngine.executeSignal()` (`src/engine/trading/TradeEngine.ts:56`)
5. **Risk Guard**: `RiskGuard.checkTradeRisk()` (`src/engine/trading/RiskGuard.ts:122`)
6. **Exchange Client**: `ExchangeClient.placeOrder()` (`src/services/exchange/ExchangeClient.ts:83`)
7. **Futures Service**: `KuCoinFuturesService.placeOrder()` (`src/services/KuCoinFuturesService.ts`)
8. **External API**: KuCoin Futures Testnet API (`https://api-futures.kucoin.com`)
9. **Response**: Order result → Trade Engine → Controller → Frontend

**File References**:
- UI: `src/views/UnifiedTradingView.tsx`
- API: `src/server.ts:821-824`
- Controller: `src/controllers/TradingController.ts`
- Engine: `src/engine/trading/TradeEngine.ts:56-274`
- Risk: `src/engine/trading/RiskGuard.ts:122-306`
- Exchange: `src/services/exchange/ExchangeClient.ts:83-187`
- Futures: `src/services/KuCoinFuturesService.ts`

**Note**: SPOT flow exists but stops at `ExchangeClient.placeSpotOrder()` which returns `NOT_IMPLEMENTED`

---

## WebSocket Architecture

### WebSocket Server

**Server Setup** (`src/server.ts:151-154`):
- **Path**: `/ws`
- **Library**: `ws` (WebSocketServer)
- **HTTP Server**: Created from Express app
- **Heartbeat**: Attached via `attachHeartbeat()` (`src/server/wsHeartbeat.ts`)
- **File Reference**: `src/server.ts:151-154`

**Heartbeat Mechanism**:
- File: `src/server/wsHeartbeat.ts`
- Detects and terminates dead connections
- Ping/pong every 30 seconds
- **File Reference**: `src/server.ts:133, 157`

### WS Channels / Logical Streams

**1. Main WebSocket Channel** (`/ws`):
- General WebSocket endpoint
- Handles various message types
- **File Reference**: `src/server.ts:151-154`

**2. Futures Channel** (`FuturesWebSocketChannel`):
- **File**: `src/ws/futuresChannel.ts`
- **Purpose**: Futures trading updates (positions, orders, funding rates)
- **Status**: Active when `FEATURE_FUTURES=true`
- **Message Types**:
  - `futures_connected` - Connection confirmation
  - `position_update` - Position updates
  - `order_update` - Order updates
  - `funding_tick` - Funding rate updates
- **Client Messages**:
  - `subscribe_positions` - Subscribe to positions
  - `subscribe_orders` - Subscribe to orders
  - `get_positions` - Get current positions
  - `get_orders` - Get current orders
- **Broadcast Interval**: 5 seconds for position/order updates
- **File Reference**: `src/ws/futuresChannel.ts:1-262`

**3. Score Stream Gateway** (`ScoreStreamGateway`):
- **File**: `src/ws/ScoreStreamGateway.ts`
- **Purpose**: Live scoring updates broadcast
- **Status**: Active when `liveScoring` feature enabled
- **Message Types**:
  - `score_stream_connected` - Connection confirmation
  - `score_update` - Score updates (array of LiveScoreResult)
  - `stream_status` - Stream status
  - `subscribed` - Subscription confirmation
  - `configured` - Configuration confirmation
- **Client Messages**:
  - `subscribe` - Subscribe to symbols
  - `configure` - Update stream configuration
  - `get_latest` - Get latest scores
  - `get_status` - Get stream status
- **Broadcast Interval**: Configurable (default: 30 seconds)
- **Symbols**: Configurable (default: ['BTCUSDT', 'ETHUSDT'])
- **File Reference**: `src/ws/ScoreStreamGateway.ts:1-429`

**4. Signal Visualization WebSocket**:
- **Service**: `SignalVisualizationWebSocketService.ts` (`src/services/SignalVisualizationWebSocketService.ts`)
- **Purpose**: Signal pipeline visualization (8-stage pipeline)
- **Message Types**: `signal_update` with stage data
- **File Reference**: `src/services/SignalVisualizationWebSocketService.ts` (exists)

### Message Types

**Futures Channel Messages**:
- `futures_connected` - Welcome message
- `position_update` - Position data array
- `order_update` - Order data array
- `funding_tick` - Funding rate data
- `error` - Error messages

**Score Stream Messages**:
- `score_stream_connected` - Welcome message with config
- `score_update` - Array of LiveScoreResult objects
- `stream_status` - Stream status object
- `subscribed` - Subscription confirmation
- `configured` - Configuration confirmation
- `error` - Error messages

**Signal Visualization Messages**:
- `signal_update` - Signal pipeline data with 8 stages
- Stages: Market Data, Feature Engineering, Detector Analysis, Technical Gate, AI Scoring, Timeframe Consensus, Risk Management, Final Decision

**File References**:
- Futures: `src/ws/futuresChannel.ts:45-248`
- Score Stream: `src/ws/ScoreStreamGateway.ts:73-360`
- Signal: `src/hooks/useSignalWebSocket.ts:101-189`

### Frontend WebSocket Hooks

**`useWebSocket.ts`**:
- Generic WebSocket hook
- Uses `WebSocketManager` service
- Topic-based subscription
- Auto-reconnect
- **File Reference**: `src/hooks/useWebSocket.ts:1-137`

**`useSignalWebSocket.ts`**:
- Specialized hook for signal pipeline
- Connects to `/ws` endpoint
- Subscribes to symbol-specific updates
- Transforms WebSocket messages to StageData format
- Fallback to REST API polling if WebSocket fails
- **File Reference**: `src/hooks/useSignalWebSocket.ts:1-337`

**WebSocket Manager**:
- `WebSocketManager.ts` (`src/services/WebSocketManager.ts`)
- Centralized WebSocket connection management
- Topic-based pub/sub
- Connection state management

---

## Missing Features & Incomplete Implementations

### Explicitly NOT_IMPLEMENTED

**1. SPOT Trading**:
- **File**: `src/services/exchange/ExchangeClient.ts:169-187`
- **Error Message**: "SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete"
- **UI Indicators**:
  - `src/components/trading/SpotNotAvailable.tsx` - Component showing SPOT not available
  - `src/views/TradingView.tsx:125` - Message: "SPOT trading is not implemented"
  - `src/views/UnifiedTradingView.tsx:81` - Message: "SPOT trading is not implemented"
- **Status**: Structure exists (method, risk config, routing), but API integration missing

**2. Binance/KuCoin Direct Data Providers**:
- **File**: `src/services/HFDataEngineAdapter.ts:526-583`
- **Error Code**: `NOT_IMPLEMENTED`
- **Methods**: `getPrices()`, `getHealth()`, `getMarketOverview()` return NOT_IMPLEMENTED for Binance/KuCoin sources
- **Status**: Adapters exist but return errors

**3. HuggingFace Signals Adapter**:
- **File**: `src/services/hf/HFSignalsAdapter.ts:89-124`
- **Methods**: `getSignalHistory()`, `generateSignal()` return NOT_IMPLEMENTED
- **Error Message**: "Signal history via HuggingFace is not implemented. Signals are stored locally."
- **Status**: Placeholder exists, functionality not implemented

**4. HuggingFace Analysis Adapter (SMC/Elliott)**:
- **File**: `src/services/hf/HFAnalysisAdapter.ts:112-137`
- **Methods**: `analyzeSMC()`, `analyzeElliottWave()` return NOT_IMPLEMENTED
- **Error Message**: "SMC analysis via HuggingFace is not implemented. Use local technical analysis services."
- **Status**: Placeholders exist, use local analyzers instead

**5. HuggingFace Proxy Adapter**:
- **File**: `src/services/hf/HFProxyAdapter.ts:87-117`
- **Methods**: Return NOT_IMPLEMENTED
- **Status**: Proxy functionality not implemented via HF

**6. ML Detector Integration**:
- **File**: `src/engine/live/ScoringLiveService.ts:271`
- **Comment**: "ML: Not implemented (would need ML model integration)"
- **Status**: ML detector exists but not integrated into live scoring

### Commented Out / Missing Routes

**Commented Routes** (`src/server.ts:109-129, 1839-1876`):
- `futuresRoutes` - Futures routes (commented)
- `offlineRoutes` - Offline mode routes (commented)
- `systemDiagnosticsRoutes` - System diagnostics routes (commented)
- `systemMetricsRoutes` - System metrics routes (commented)
- `marketUniverseRoutes` - Market universe routes (commented)
- `marketReadinessRoutes` - Market readiness routes (commented)
- `mlRoutes` - ML routes (commented)
- `newsRoutes` - News routes (commented)
- `diagnosticsMarketRoutes` - Market diagnostics routes (commented)
- `strategyTemplatesRoutes` - Strategy templates routes (commented)
- `strategyApplyRoutes` - Strategy apply routes (commented)
- `backtestRoutes` - Backtest routes (commented)
- `hfRouter` - HF router (commented)
- `resourceMonitorRouter` - Resource monitor router (commented)
- `optionalPublicRouter` - Optional public routes (commented)
- `optionalNewsRouter` - Optional news routes (commented)
- `optionalMarketRouter` - Optional market routes (commented)
- `optionalOnchainRouter` - Optional onchain routes (commented)

**Status**: Route files referenced but not present or commented out

### TODO Markers

**1. Connector Refactoring**:
- **File**: `src/components/connectors/index.ts:12`
- **TODO**: "Refactor these remaining connectors to use contexts"
- **Status**: Connectors exist but should be refactored

**2. Signal Engine Migration**:
- **File**: `src/lib/signalEngine.ts:22`
- **TODO**: "Migrate ScannerView to use the new engine/SignalEngine"
- **Status**: Legacy signal engine exists, migration pending

**3. Fallback Data Provider**:
- **File**: `src/services/MarketDataIngestionService.ts:585`
- **TODO**: "Implement FallbackDataProvider for synthetic data"
- **Status**: Synthetic data service exists but not integrated

**4. Real Data Logic**:
- **File**: `src/server-real-data.ts:1602`
- **TODO**: "plug in your real logic here"
- **Status**: Placeholder in real data server

### Legacy / Backup Files

**Backup Views** (`src/views/__backup__/`):
- `Dashboard_main_20251109_0012.tsx`
- `DashboardView_20251109_0031.tsx`
- `DashboardView_20251109_0042.tsx`
- `EnhancedStrategyLabView_20251109_0058.tsx`
- `StrategyLabView_20251109_0058.tsx`
- **Status**: Backup files from 2025-11-09, not active

**Legacy Views** (`src/views/__legacy__/`):
- `StrategyLabView.tsx`
- `SVG_Icons.tsx`
- **Status**: Marked as legacy, not used

**Backup Services**:
- `RealDataManager-backup.ts.bak` (`src/services/RealDataManager-backup.ts.bak`)
- `RealDataManager-new.ts.bak` (`src/services/RealDataManager-new.ts.bak`)
- `RealDataManager-old.ts` (`src/services/RealDataManager-old.ts`) - Used by DataContext
- **Status**: Backup files, old version still referenced

### UI Components Showing "Not Available"

**1. SpotNotAvailable Component**:
- **File**: `src/components/trading/SpotNotAvailable.tsx`
- **Purpose**: Explicitly shows SPOT trading not available
- **Status**: Active component used in trading views

**2. DataSourceSelector Warning**:
- **File**: `src/components/settings/DataSourceSelector.tsx:233`
- **Message**: "Note: Only HuggingFace is fully implemented in this phase. This source may return NOT_IMPLEMENTED errors."
- **Status**: UI warning for users

---

## Type System & Interfaces

### Core Types

**`src/types/index.ts`** (Main Type Definitions):

**Market Data**:
- `MarketData` - OHLCV data with timestamp, open, high, low, close, volume
- `CandlestickData` - Candlestick structure
- **File Reference**: `src/types/index.ts:3-18, 309-316`

**Signals**:
- `AISignal` - AI-generated signal with confidence, probability, reasoning
- `TradeSignal` - Trade signal from pipeline/live/manual
- `CoreSignal` - Core signal structure (action, strength, confidence, score, reasons)
- **File Reference**: `src/types/index.ts:45-64, 729-738`, `src/types/signals.ts:12-18`

**Trading**:
- `PlaceOrderParams` - Order placement parameters
- `PlaceOrderResult` - Order placement result
- `PositionResult` - Position data from exchange
- `AccountInfo` - Account information
- `TradingMode` - 'OFF' | 'DRY_RUN' | 'TESTNET'
- `TradingMarket` - 'SPOT' | 'FUTURES' | 'BOTH'
- **File Reference**: `src/types/index.ts:748-791, 841-845`

**Risk**:
- `RiskGuardConfig` - Risk guard configuration (legacy + dual-mode)
- `MarketRiskConfig` - Market-specific risk config (SPOT/FUTURES)
- `RiskCheckInput` - Risk check input parameters
- `RiskCheckResult` - Risk check result (allowed/reason)
- **File Reference**: `src/types/index.ts:792-835`

**Scoring**:
- `ScoringSnapshot` - Enhanced scoring snapshot with confluence, entry plan, context
- `TFResult` - Timeframe result with components
- `Component` - Component contribution in scoring
- `CategoryScore` - Category-level score (core/smc/patterns/sentiment/ml)
- `EffectiveWeights` - Effective weights used in scoring
- **File Reference**: `src/types/index.ts:550-562`, `src/types/signals.ts:20-107`

**Futures**:
- `FuturesPosition` - Futures position data
- `FuturesOrder` - Futures order data
- `LeverageSettings` - Leverage configuration
- `FundingRate` - Funding rate data
- `FuturesAccountBalance` - Futures account balance
- **File Reference**: `src/types/futures.ts:11-79`

**Analysis**:
- `SmartMoneyFeatures` - SMC features (liquidity zones, order blocks, fair value gaps, BOS)
- `ElliottWaveAnalysis` - Elliott Wave analysis result
- `HarmonicPattern` - Harmonic pattern detection result
- `SentimentData` - Sentiment analysis data
- `WhaleActivity` - Whale activity data
- **File Reference**: `src/types/index.ts:89-219`

**System**:
- `SystemConfig` - System configuration with feature flags
- `SystemStatusResponse` - System status aggregation
- `SystemHealth` - System health metrics
- **File Reference**: `src/types/index.ts:845-894`

**Backtesting**:
- `BacktestTrade` - Individual backtest trade
- `BacktestResult` - Backtest result with metrics
- `TuningRunResult` - Tuning run result
- `TuningConfig` - Tuning configuration
- **File Reference**: `src/types/index.ts:352-443`

**File Reference**: `src/types/index.ts:1-899`

### Strategy Pipeline Types

**`src/types/strategyPipeline.ts`**:
- Strategy pipeline type definitions
- **File Reference**: `src/types/strategyPipeline.ts` (exists, not fully read)

### Mode Types

**`src/types/modes.ts`**:
- Trading mode type definitions
- **File Reference**: `src/types/modes.ts` (exists)

### Load State Types

**`src/types/loadState.ts`**:
- Load state type definitions
- **File Reference**: `src/types/loadState.ts` (exists)

---

## Configuration System

### Environment Variables

**Data Source Configuration** (`src/config/dataSource.ts`):
- `PRIMARY_DATA_SOURCE` - 'huggingface' | 'binance' | 'kucoin' | 'mixed' (default: 'huggingface')
- `HF_ENGINE_BASE_URL` - HuggingFace Data Engine URL (default: relative path or localhost:8000)
- `HF_ENGINE_ENABLED` - Enable/disable HF engine (default: true)
- `HF_ENGINE_TIMEOUT` - Request timeout in ms (default: 30000)
- `BINANCE_ENABLED` - Enable Binance API (default: true)
- `KUCOIN_ENABLED` - Enable KuCoin API (default: true)
- **File Reference**: `src/config/dataSource.ts:40-63`

**System Configuration** (`src/config/systemConfig.ts`):
- Loaded from `config/system.config.json`
- **Features**:
  - `liveScoring` - boolean
  - `backtest` - boolean
  - `autoTuning` - boolean
  - `autoTrade` - boolean
  - `manualTrade` - boolean
- **Modes**:
  - `environment` - 'DEV' | 'STAGING' | 'PROD'
  - `trading` - 'OFF' | 'DRY_RUN' | 'TESTNET'
- **Trading** (optional):
  - `environment` - 'DEV' | 'STAGING' | 'PROD'
  - `mode` - TradingMode
  - `market` - 'SPOT' | 'FUTURES' | 'BOTH'
- **File Reference**: `src/config/systemConfig.ts:15-32, 89-102`

**Feature Flags** (`src/config/flags.ts`):
- `FEATURE_FUTURES` - Enable futures trading feature
- **File Reference**: `src/config/flags.ts` (exists)

**API Configuration** (`src/config/apiConfig.ts`, `src/config/apiSources.ts`):
- API keys and endpoints configuration
- **File Reference**: `src/config/apiConfig.ts`, `src/config/apiSources.ts` (exist)

**Risk Configuration** (`config/risk.config.json`):
- Risk guard configuration
- Supports legacy single config or dual-mode (SPOT/FUTURES)
- **File Reference**: `src/engine/trading/RiskGuard.ts:47-82`

**Scoring Configuration** (`config/scoring.config.json`):
- Scoring weights and thresholds
- **File Reference**: `config/scoring.config.json` (exists)

**Strategy Configuration** (`config/strategy.config.json`):
- Strategy templates and configuration
- **File Reference**: `config/strategy.config.json` (exists)

### Configuration Files

**`config/` Directory**:
- `api.json` - API configuration
- `exchanges.json` - Exchange configuration
- `feature-flags.json` - Feature flags
- `providers_config.json` - Provider configuration
- `risk.config.json` - Risk configuration
- `scoring.config.json` - Scoring configuration
- `strategy.config.json` - Strategy configuration
- `system.config.json` - System configuration
- `testing.json` - Testing configuration
- `models/manifest.json` - Model manifest

**File Reference**: `config/` directory listing

### Configuration Loading

**System Config Manager** (`src/config/systemConfig.ts`):
- Singleton pattern
- Loads from `config/system.config.json`
- Validates structure
- Falls back to defaults if file missing
- Supports hot-reload via `reload()` method
- **File Reference**: `src/config/systemConfig.ts:34-210`

**Data Source Config Manager** (`src/config/dataSource.ts`):
- Singleton pattern
- Loads from environment variables
- Runtime override support (`setPrimarySource()`, `setHuggingFaceEnabled()`)
- **File Reference**: `src/config/dataSource.ts:34-167`

**Risk Config Loading** (`src/engine/trading/RiskGuard.ts:47-82`):
- Loads from `config/risk.config.json`
- Supports legacy single config or dual-mode config
- Falls back to defaults if file missing
- **File Reference**: `src/engine/trading/RiskGuard.ts:47-82`

### Hot-Reload Behavior

**System Config**:
- `reloadSystemConfig()` function available (`src/config/systemConfig.ts:209`)
- Reloads configuration from disk
- **File Reference**: `src/config/systemConfig.ts:184-188`

**Data Source Config**:
- Runtime override methods available (`setPrimarySource()`, `setHuggingFaceEnabled()`)
- Changes take effect immediately
- **File Reference**: `src/config/dataSource.ts:124-135`

---

## Summary

### Architecture Strengths

1. **Clear Separation of Concerns**:
   - Frontend (React) and Backend (Express) are well-separated
   - Services, controllers, engines, and detectors are organized in dedicated folders
   - Type system is comprehensive and well-defined

2. **Modular Service Architecture**:
   - Singleton pattern used consistently for services
   - Services are loosely coupled and can be easily replaced
   - Clear interfaces between layers (controllers → services → providers)

3. **Type Safety**:
   - Comprehensive TypeScript type definitions
   - Strong typing throughout the codebase
   - Type definitions cover all major domains (trading, signals, risk, scoring, futures)

4. **Real-time Capabilities**:
   - WebSocket infrastructure is well-designed
   - Multiple WebSocket channels (futures, scoring, signals)
   - Frontend hooks for easy WebSocket integration

5. **Risk Management**:
   - Dual-mode risk guard (SPOT/FUTURES) with separate configs
   - Market data validation before trade execution
   - No fake data - honest error responses

6. **Configuration Management**:
   - Centralized configuration system
   - Environment variable support
   - JSON config files with validation
   - Hot-reload capability for system config

7. **Data Source Abstraction**:
   - Adapter pattern for data providers
   - Primary data source (HuggingFace) fully implemented
   - Fallback mechanisms in place

### Architecture Weaknesses

1. **Incomplete SPOT Trading**:
   - Structure exists but API integration missing
   - Returns `NOT_IMPLEMENTED` errors
   - UI components explicitly show "not available"
   - **Impact**: SPOT trading cannot be used

2. **Missing Route Files**:
   - Many routes commented out in `server.ts` but route files not present
   - Features may be partially implemented but not accessible via API
   - **Impact**: Some features may not be fully accessible

3. **Legacy Code**:
   - Backup files in `__backup__/` and `__legacy__/` folders
   - Old `RealDataManager-old.ts` still referenced by `DataContext`
   - **Impact**: Code maintenance complexity

4. **Incomplete Data Provider Integration**:
   - Binance/KuCoin direct providers return `NOT_IMPLEMENTED`
   - HuggingFace is the only fully functional data source
   - **Impact**: Limited data source options

5. **ML Integration Gap**:
   - ML detector exists but not integrated into live scoring
   - Comment indicates "would need ML model integration"
   - **Impact**: ML features not fully utilized

6. **Connector Refactoring Needed**:
   - TODO marker indicates connectors should use contexts
   - Current implementation may be inconsistent
   - **Impact**: Potential state management issues

### High-Level Recommendations

1. **Complete SPOT Trading Integration**:
   - Implement KuCoin SPOT testnet API integration in `ExchangeClient.placeSpotOrder()`
   - Remove "not available" UI components
   - Test SPOT trading flow end-to-end

2. **Implement Missing Routes**:
   - Create missing route files or remove commented references
   - Ensure all features are accessible via API
   - Document route availability

3. **Clean Up Legacy Code**:
   - Remove or archive backup files
   - Migrate `DataContext` from `RealDataManager-old.ts` to current version
   - Remove legacy views or document their status

4. **Complete Data Provider Integration**:
   - Implement Binance/KuCoin direct data providers (or remove adapters)
   - Ensure fallback cascade works correctly
   - Document data source capabilities

5. **Integrate ML Detector**:
   - Complete ML model integration for live scoring
   - Remove "not implemented" comments
   - Test ML detector in production flow

6. **Refactor Connectors**:
   - Migrate connectors to use React contexts
   - Ensure consistent state management
   - Remove TODO markers

7. **Documentation**:
   - Document which features are fully implemented vs. partial
   - Create API documentation for all endpoints
   - Document WebSocket message formats

8. **Testing**:
   - Add integration tests for trading flows
   - Test WebSocket channels under load
   - Validate risk guard with various scenarios

---

**Report Generated**: 2025-11-16T11:09:19+00:00  
**Based On**: Direct code inspection of `/workspace` repository  
**Methodology**: File-by-file analysis, grep searches for patterns, type system inspection, route enumeration
