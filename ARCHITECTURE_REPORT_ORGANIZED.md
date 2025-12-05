# 🏗️ ARCHITECTURE REPORT - ORGANIZED PAGE INVENTORY

**Generated:** 1764949018.785131
**Total Pages Analyzed:** 18

---

## 📊 SUMMARY BY CATEGORY

- **Trading:** 6 pages
- **Market Analysis:** 4 pages
- **AI/ML:** 2 pages
- **Risk Management:** 2 pages
- **Admin:** 2 pages
- **Settings:** 1 pages
- **Dashboard:** 1 pages
- **Other:** 0 pages

---

## 🔀 UNIFIED HUBS TO CREATE

### UnifiedTradingHubView

- **Route:** `/trading`
- **Priority:** HIGH
- **Status:** PLANNED
- **Source Pages:** TradingViewDashboard, EnhancedTradingView, FuturesTradingView, TradingHubView
- **Tabs:**
  - Charts: `charts` - from TradingViewDashboard
  - Spot: `spot` - from EnhancedTradingView
  - Futures: `futures` - from FuturesTradingView (Default)
  - Positions: `positions` - from PositionsView
  - Portfolio: `portfolio` - from PortfolioPage


### UnifiedAILabView

- **Route:** `/ai-lab`
- **Priority:** MEDIUM
- **Status:** PLANNED
- **Source Pages:** TrainingView, EnhancedStrategyLabView, ScannerView
- **Tabs:**
  - Scanner: `scanner` - from ScannerView (Default)
  - Training: `training` - from TrainingView
  - Backtest: `backtest` - from EnhancedStrategyLabView
  - Builder: `builder` - from EnhancedStrategyLabView
  - Insights: `insights` - from EnhancedStrategyLabView


### UnifiedAdminView

- **Route:** `/admin`
- **Priority:** LOW
- **Status:** PLANNED
- **Source Pages:** HealthView, MonitoringView
- **Tabs:**
  - Health: `health` - from HealthView (Default)
  - Monitoring: `monitoring` - from MonitoringView
  - Diagnostics: `diagnostics` - from HealthView


---

## 📁 TRADING

### 🔄 PAGE 2: TradingViewDashboard

- **Route:** `/tradingview-dashboard`
- **File:** `src/views/TradingViewDashboard.tsx`
- **Status:** Merge into Hub
- **Priority:** HIGH
- **Merge Target:** UnifiedTradingHubView
- **Tab Name:** charts
- **Purpose:** Premium charting interface with TradingView widgets, screener, calendar, and news. Focus on professi...
- **Complexity:** - ✅ Very High (External widget integration, complex state management, multiple tabs)


### 🔄 PAGE 6: EnhancedTradingView

- **Route:** `/enhanced-trading`
- **File:** `src/views/EnhancedTradingView.tsx`
- **Status:** Merge into Hub
- **Priority:** HIGH
- **Merge Target:** UnifiedTradingHubView
- **Tab Name:** spot
- **Purpose:** Scoring-based trading interface with spot/futures tabs, multi-timeframe analysis, and confluence sco...
- **Complexity:** - ✅ High (Real-time WS, complex scoring display, order management)


### 🔄 PAGE 7: FuturesTradingView

- **Route:** `/futures`
- **File:** `src/views/FuturesTradingView.tsx`
- **Status:** Merge into Hub
- **Priority:** HIGH
- **Merge Target:** UnifiedTradingHubView
- **Tab Name:** futures
- **Purpose:** Full-featured futures trading interface with positions management, order book, balance display, and ...
- **Complexity:** - ✅ Very High (Real-time WS, complex order management, position tracking)


### 🔄 PAGE 9: PositionsView

- **Route:** `/positions` (redirects to `/trading-hub?tab=positions`)  
**Component Name:** `PositionsView`

**Primary Purpose:**
Display and manage open positions, pending orders, and trade history.

**API Dependencies:**
- Fetches: `/api/positions`, `/api/orders`
- WebSocket: `positions_update` (via useWebSocket hook)

**Key Features:**
1. Open positions table with PnL
2. Pending orders display
3. Trade history
4. Position closing interface
5. Real-time position updates
6. Tab interface (Positions, Orders, History)

**User Intent:**
Monitor and manage open trading positions. Review trade history.

**Data Display Type:**
- ✅ Real-time streaming data (positions)
- ✅ Historical/static data (trade history)

**Interaction Model:**
- ✅ Interactive controls (close position, cancel order)
- ✅ Form submission (position management)
- ✅ WebSocket live updates

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Medium (Real-time WS, position management)

**Current Issues/Pain Points:**
- Already integrated into TradingHubView as a tab
- Still accessible as standalone (redundant)
- Good as tab within trading hub

---

#### PAGE 10: PortfolioPage

**File Location:** `src/views/PortfolioPage.tsx`  
**Route:** `/portfolio` (redirects to `/trading-hub?tab=portfolio`)  
**Component Name:** `PortfolioPage`

**Primary Purpose:**
Portfolio overview with holdings, risk center, and market data integration.

**API Dependencies:**
- Fetches: `/api/positions/open`, market data via DatasourceClient
- WebSocket: None

**Key Features:**
1. Portfolio value and PnL
2. Holdings display
3. Risk center integration
4. Market data for holdings
5. Position closing interface

**User Intent:**
View overall portfolio performance and holdings. Assess portfolio risk.

**Data Display Type:**
- ✅ Real-time streaming data (market prices)
- ✅ Historical/static data (holdings)

**Interaction Model:**
- ✅ Interactive controls (position management)
- ✅ Form submission (close position)

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Medium (Data aggregation, risk calculations)

**Current Issues/Pain Points:**
- Already integrated into TradingHubView as a tab
- Overlaps with Dashboard portfolio display
- Good as tab within trading hub

---

#### PAGE 11: TrainingView

**File Location:** `src/views/TrainingView.tsx`  
**Route:** `/training`
- **File:** `src/views/PositionsView.tsx`
- **Status:** Merge into Hub
- **Priority:** HIGH
- **Merge Target:** UnifiedTradingHubView
- **Tab Name:** positions
- **Purpose:** AI model training interface with configuration, metrics display, and training execution....
- **Complexity:** - ✅ High (ML training pipeline, real-time metrics)


### 🔄 PAGE 10: PortfolioPage

- **Route:** `/portfolio` (redirects to `/trading-hub?tab=portfolio`)  
**Component Name:** `PortfolioPage`

**Primary Purpose:**
Portfolio overview with holdings, risk center, and market data integration.

**API Dependencies:**
- Fetches: `/api/positions/open`, market data via DatasourceClient
- WebSocket: None

**Key Features:**
1. Portfolio value and PnL
2. Holdings display
3. Risk center integration
4. Market data for holdings
5. Position closing interface

**User Intent:**
View overall portfolio performance and holdings. Assess portfolio risk.

**Data Display Type:**
- ✅ Real-time streaming data (market prices)
- ✅ Historical/static data (holdings)

**Interaction Model:**
- ✅ Interactive controls (position management)
- ✅ Form submission (close position)

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Medium (Data aggregation, risk calculations)

**Current Issues/Pain Points:**
- Already integrated into TradingHubView as a tab
- Overlaps with Dashboard portfolio display
- Good as tab within trading hub

---

#### PAGE 11: TrainingView

**File Location:** `src/views/TrainingView.tsx`  
**Route:** `/training`
- **File:** `src/views/PortfolioPage.tsx`
- **Status:** Merge into Hub
- **Priority:** HIGH
- **Merge Target:** UnifiedTradingHubView
- **Tab Name:** portfolio
- **Purpose:** AI model training interface with configuration, metrics display, and training execution....
- **Complexity:** - ✅ High (ML training pipeline, real-time metrics)


### 🆕 PAGE 8: TradingHubView

- **Route:** `/trading-hub`
- **File:** `src/views/TradingHubView.tsx`
- **Status:** To be Created (new unified hub)
- **Priority:** HIGH
- **Purpose:** Unified trading hub combining futures trading, technical analysis, risk management, positions, and p...
- **Complexity:** - ✅ Medium (Tab management, URL routing, component composition)


---

## 📁 MARKET ANALYSIS

### ✅ PAGE 3: MarketAnalysisHub

- **Route:** `/market-analysis`
- **File:** `src/views/MarketAnalysisHub.tsx`
- **Status:** Keep Standalone
- **Priority:** MEDIUM
- **Purpose:** Unified hub combining market overview, scanner, and technical analysis. Phase 2 consolidation page....
- **Complexity:** - ✅ Medium (Tab management, URL routing, component composition)


### ✅ PAGE 15: TechnicalAnalysisView

- **Route:** `/technical-analysis` (used in MarketAnalysisHub and TradingHubView)  
**Component Name:** `TechnicalAnalysisView`

**Primary Purpose:**
Advanced pattern detection dashboard integrating SMC, Elliott Wave, Fibonacci, Harmonic patterns, Parabolic SAR, and market regime analysis.

**API Dependencies:**
- Fetches: OHLCV data via DatasourceClient
- WebSocket: None

**Key Features:**
1. Smart Money Concepts (order blocks, liquidity zones, FVG)
2. Elliott Wave pattern analysis
3. Fibonacci retracement levels
4. Harmonic pattern detection (Gartley, Bat, Butterfly, Crab)
5. Parabolic SAR signals
6. Market regime classification
7. Symbol and timeframe selection
8. Visual pattern displays

**User Intent:**
Analyze price charts for technical patterns and market structure.

**Data Display Type:**
- ✅ Historical/static data (OHLCV)
- ✅ Analysis/computation results (pattern detection)

**Interaction Model:**
- ✅ Interactive controls (symbol/timeframe selection)
- ✅ Chart/visualization interaction

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Very High (Multiple pattern detectors, complex calculations)

**Current Issues/Pain Points:**
- Used in both MarketAnalysisHub and TradingHubView (good reuse)
- Distinct enough to warrant separate component
- Well-designed for reuse

---

#### PAGE 16: SettingsView

**File Location:** `src/views/SettingsView.tsx`  
**Route:** `/settings`
- **File:** `src/views/TechnicalAnalysisView.tsx`
- **Status:** Keep Standalone
- **Priority:** MEDIUM
- **Purpose:** User settings and configuration including detector weights, strategy thresholds, risk parameters, ex...
- **Complexity:** - ✅ Medium (Form management, settings persistence)


### ⚠️ PAGE 4: MarketView

- **Route:** `/market` (redirects to `/market-analysis?tab=market`)  
**Component Name:** `MarketView`

**Primary Purpose:**
Real-time market data display with price charts, market ticker, news feed, and AI predictions.

**API Dependencies:**
- Fetches: `/api/market/prices`, `/api/market-data/:symbol`, `/api/market/historical`, `/api/hf/ohlcv`
- WebSocket: `price_update` (10s cadence)

**Key Features:**
1. Real-time price charts with OHLCV data
2. Market ticker with top coins
3. News feed integration
4. AI predictor component
5. Symbol search and selection
6. Exchange selector
7. Backtest button integration
8. Multiple data source support (mock/real)

**User Intent:**
View real-time market prices and trends. Analyze price movements with charts.

**Data Display Type:**
- ✅ Real-time streaming data (primary)
- ✅ Historical/static data (charts)
- ✅ Analysis/computation results (AI predictions)

**Interaction Model:**
- ✅ Interactive controls (symbol selection, exchange selector)
- ✅ Chart/visualization interaction
- ✅ WebSocket live updates

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ High (Real-time WS, multiple data sources, chart rendering)

**Current Issues/Pain Points:**
- Already integrated into MarketAnalysisHub as a tab
- Still accessible as standalone (redundant)
- Overlaps with Dashboard market data

---

#### PAGE 5: ScannerView

**File Location:** `src/views/ScannerView.tsx`  
**Route:** `/scanner` (redirects to `/market-analysis?tab=scanner`)  
**Component Name:** `ScannerView`

**Primary Purpose:**
AI-powered market scanner with multiple scanning modes: AI signals, technical patterns, smart money, news sentiment, whale activity.

**API Dependencies:**
- Fetches: `/api/signals/analyze`, `/api/signals/history`
- WebSocket: `signal_update` (3s cadence, on-demand subscription)

**Key Features:**
1. Multi-tab scanner interface (Overview, AI Signals, Patterns, Smart Money, Sentiment, Whales, Feed)
2. Real-time signal scanning
3. Symbol search and filtering
4. Watchlist management
5. Scanner feed panel with live updates
6. Multiple scanner types (AISignalsScanner, TechnicalPatternsScanner, SmartMoneyScanner, NewsSentimentScanner, WhaleActivityScanner)

**User Intent:**
Find trading opportunities by scanning markets for signals, patterns, and anomalies.

**Data Display Type:**
- ✅ Real-time streaming data (signals)
- ✅ Analysis/computation results (scanner results)

**Interaction Model:**
- ✅ Interactive controls (filters, search, tabs)
- ✅ Form submission (symbol watchlist)
- ✅ WebSocket live updates

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Very High (Multiple scanner engines, real-time WS, complex filtering)

**Current Issues/Pain Points:**
- Already integrated into MarketAnalysisHub as a tab
- Still accessible as standalone (redundant)
- Distinct enough to warrant separate tab

---

#### PAGE 6: EnhancedTradingView

**File Location:** `src/views/EnhancedTradingView.tsx`  
**Route:** `/enhanced-trading`
- **File:** `src/views/MarketView.tsx`
- **Status:** Redundant (already in hub)
- **Priority:** MEDIUM
- **Merge Target:** MarketAnalysisHub
- **Tab Name:** market
- **Purpose:** Scoring-based trading interface with spot/futures tabs, multi-timeframe analysis, and confluence sco...
- **Complexity:** - ✅ High (Real-time WS, complex scoring display, order management)


### ⚠️ PAGE 5: ScannerView

- **Route:** `/scanner` (redirects to `/market-analysis?tab=scanner`)  
**Component Name:** `ScannerView`

**Primary Purpose:**
AI-powered market scanner with multiple scanning modes: AI signals, technical patterns, smart money, news sentiment, whale activity.

**API Dependencies:**
- Fetches: `/api/signals/analyze`, `/api/signals/history`
- WebSocket: `signal_update` (3s cadence, on-demand subscription)

**Key Features:**
1. Multi-tab scanner interface (Overview, AI Signals, Patterns, Smart Money, Sentiment, Whales, Feed)
2. Real-time signal scanning
3. Symbol search and filtering
4. Watchlist management
5. Scanner feed panel with live updates
6. Multiple scanner types (AISignalsScanner, TechnicalPatternsScanner, SmartMoneyScanner, NewsSentimentScanner, WhaleActivityScanner)

**User Intent:**
Find trading opportunities by scanning markets for signals, patterns, and anomalies.

**Data Display Type:**
- ✅ Real-time streaming data (signals)
- ✅ Analysis/computation results (scanner results)

**Interaction Model:**
- ✅ Interactive controls (filters, search, tabs)
- ✅ Form submission (symbol watchlist)
- ✅ WebSocket live updates

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Very High (Multiple scanner engines, real-time WS, complex filtering)

**Current Issues/Pain Points:**
- Already integrated into MarketAnalysisHub as a tab
- Still accessible as standalone (redundant)
- Distinct enough to warrant separate tab

---

#### PAGE 6: EnhancedTradingView

**File Location:** `src/views/EnhancedTradingView.tsx`  
**Route:** `/enhanced-trading`
- **File:** `src/views/ScannerView.tsx`
- **Status:** Redundant (already in hub)
- **Priority:** MEDIUM
- **Merge Target:** MarketAnalysisHub
- **Tab Name:** scanner
- **Purpose:** Scoring-based trading interface with spot/futures tabs, multi-timeframe analysis, and confluence sco...
- **Complexity:** - ✅ High (Real-time WS, complex scoring display, order management)


---

## 📁 AI/ML

### 🔄 PAGE 11: TrainingView

- **Route:** `/training`
- **File:** `src/views/TrainingView.tsx`
- **Status:** Merge into Hub
- **Priority:** MEDIUM
- **Merge Target:** UnifiedAILabView
- **Tab Name:** training
- **Purpose:** AI model training interface with configuration, metrics display, and training execution....
- **Complexity:** - ✅ High (ML training pipeline, real-time metrics)


### 🔄 PAGE 12: EnhancedStrategyLabView

- **Route:** `/strategylab`
- **File:** `src/views/EnhancedStrategyLabView.tsx`
- **Status:** Merge into Hub
- **Priority:** MEDIUM
- **Merge Target:** UnifiedAILabView
- **Purpose:** Strategy development, testing, and analysis platform with multiple tabs: Lab, Builder, Insights, Bac...
- **Complexity:** - ✅ Very High (Strategy pipeline, backtesting engine, complex state management)


---

## 📁 RISK MANAGEMENT

### ✅ PAGE 13: ProfessionalRiskView

- **Route:** `/professional-risk`
- **File:** `src/views/ProfessionalRiskView.tsx`
- **Status:** Keep Standalone
- **Priority:** MEDIUM
- **Purpose:** Advanced risk metrics and portfolio analysis with professional risk calculations....
- **Complexity:** - ✅ High (Complex risk calculations, stress testing)


### ✅ PAGE 14: RiskManagementView

- **Route:** `/risk-management` (used in TradingHubView)  
**Component Name:** `RiskManagementView`

**Primary Purpose:**
Interactive risk calculator for position sizing, liquidation price calculation, and stress testing.

**API Dependencies:**
- Fetches: Market prices via DatasourceClient
- WebSocket: None

**Key Features:**
1. Position input form (symbol, entry price, size, leverage, SL/TP)
2. Liquidation price calculator
3. Optimal position size calculator
4. Risk/reward ratio calculation
5. Stress testing scenarios
6. Margin requirement calculation
7. Real-time price fetching

**User Intent:**
Calculate risk parameters for a specific position before entering a trade.

**Data Display Type:**
- ✅ User input/configuration
- ✅ Analysis/computation results (risk calculations)

**Interaction Model:**
- ✅ Interactive controls (form inputs)
- ✅ Form submission (calculate risk)

**Usage Frequency:**
- ✅ Regular use (Before placing trades)

**Technical Complexity:**
- ✅ Medium (Risk calculations, form management)

**Current Issues/Pain Points:**
- Different from ProfessionalRiskView (calculator vs metrics dashboard)
- Already integrated into TradingHubView as a tab
- Good as standalone calculator tool

---

#### PAGE 15: TechnicalAnalysisView

**File Location:** `src/views/TechnicalAnalysisView.tsx`  
**Route:** `/technical-analysis` (used in MarketAnalysisHub and TradingHubView)  
**Component Name:** `TechnicalAnalysisView`

**Primary Purpose:**
Advanced pattern detection dashboard integrating SMC, Elliott Wave, Fibonacci, Harmonic patterns, Parabolic SAR, and market regime analysis.

**API Dependencies:**
- Fetches: OHLCV data via DatasourceClient
- WebSocket: None

**Key Features:**
1. Smart Money Concepts (order blocks, liquidity zones, FVG)
2. Elliott Wave pattern analysis
3. Fibonacci retracement levels
4. Harmonic pattern detection (Gartley, Bat, Butterfly, Crab)
5. Parabolic SAR signals
6. Market regime classification
7. Symbol and timeframe selection
8. Visual pattern displays

**User Intent:**
Analyze price charts for technical patterns and market structure.

**Data Display Type:**
- ✅ Historical/static data (OHLCV)
- ✅ Analysis/computation results (pattern detection)

**Interaction Model:**
- ✅ Interactive controls (symbol/timeframe selection)
- ✅ Chart/visualization interaction

**Usage Frequency:**
- ✅ Regular use (Multiple times per day)

**Technical Complexity:**
- ✅ Very High (Multiple pattern detectors, complex calculations)

**Current Issues/Pain Points:**
- Used in both MarketAnalysisHub and TradingHubView (good reuse)
- Distinct enough to warrant separate component
- Well-designed for reuse

---

#### PAGE 16: SettingsView

**File Location:** `src/views/SettingsView.tsx`  
**Route:** `/settings`
- **File:** `src/views/RiskManagementView.tsx`
- **Status:** Keep Standalone
- **Priority:** MEDIUM
- **Purpose:** User settings and configuration including detector weights, strategy thresholds, risk parameters, ex...
- **Complexity:** - ✅ Medium (Form management, settings persistence)


---

## 📁 ADMIN

### 🔄 PAGE 17: HealthView

- **Route:** `/health`
- **File:** `src/views/HealthView.tsx`
- **Status:** Merge into Hub
- **Priority:** LOW
- **Merge Target:** UnifiedAdminView
- **Tab Name:** health
- **Purpose:** System health monitoring and provider diagnostics....
- **Complexity:** - ✅ Medium (Health monitoring, metrics collection)


### 🔄 PAGE 18: MonitoringView

- **Route:** `/monitoring`
- **File:** `src/views/MonitoringView.tsx`
- **Status:** Merge into Hub
- **Priority:** LOW
- **Merge Target:** UnifiedAdminView
- **Tab Name:** monitoring
- **Purpose:** Performance and error monitoring dashboard for development/admin use....
- **Complexity:** - ✅ Medium (Error tracking, performance monitoring)


---

## 📁 SETTINGS

### ✅ PAGE 16: SettingsView

- **Route:** `/settings`
- **File:** `src/views/SettingsView.tsx`
- **Status:** Keep Standalone
- **Priority:** MEDIUM
- **Purpose:** User settings and configuration including detector weights, strategy thresholds, risk parameters, ex...
- **Complexity:** - ✅ Medium (Form management, settings persistence)


---

## 📁 DASHBOARD

### ✅ PAGE 1: EnhancedDashboardView

- **Route:** `/dashboard`
- **File:** `src/views/EnhancedDashboardView.tsx`
- **Status:** Keep Standalone
- **Priority:** HIGH
- **Purpose:** Main overview page displaying portfolio summary, market statistics, top signals, and quick market da...
- **Complexity:** - ✅ High (Real-time WS, complex state management, multiple data sources)


---

## 🗺️ IMPLEMENTATION ROADMAP

### Phase 1: Unified Trading Hub (HIGH Priority)

- Pages to merge: 5
  - TradingViewDashboard → UnifiedTradingHubView (charts tab)
  - EnhancedTradingView → UnifiedTradingHubView (spot tab)
  - FuturesTradingView → UnifiedTradingHubView (futures tab)
  - PositionsView → UnifiedTradingHubView (positions tab)
  - PortfolioPage → UnifiedTradingHubView (portfolio tab)


### Phase 2: Unified AI Lab (MEDIUM Priority)

- Pages to merge: 2
  - TrainingView → UnifiedAILabView (training tabs)
  - EnhancedStrategyLabView → UnifiedAILabView (multiple tabs)


### Phase 3: Unified Admin Hub (LOW Priority)

- Pages to merge: 2
  - HealthView → UnifiedAdminView (health tab)
  - MonitoringView → UnifiedAdminView (monitoring tab)

