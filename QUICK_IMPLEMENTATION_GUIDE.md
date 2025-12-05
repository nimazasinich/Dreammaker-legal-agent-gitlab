# Quick Implementation Guide - Architecture Reorganization

## Task Overview
Reorganize 18 pages into 8-9 pages by merging similar pages into unified hubs.

## Phase 1: Unified Trading Hub (HIGH Priority)

### Create New Component
**File:** `src/views/UnifiedTradingHubView.tsx`

**Route:** `/trading`

**Tabs to create:**
1. `charts` - from TradingViewDashboard
2. `spot` - from EnhancedTradingView  
3. `futures` - from FuturesTradingView (default)
4. `positions` - from PositionsView
5. `portfolio` - from PortfolioPage

### Steps:
1. Create main hub component with tab navigation
2. Extract content from old pages into tab components
3. Implement shared WebSocket connection
4. Optimize data fetching (shared data fetched once)
5. Add routes and redirects:
   ```typescript
   <Route path="/trading" element={<UnifiedTradingHubView />} />
   <Route path="/tradingview-dashboard" element={<Navigate to="/trading?tab=charts" replace />} />
   <Route path="/enhanced-trading" element={<Navigate to="/trading?tab=spot" replace />} />
   <Route path="/futures" element={<Navigate to="/trading?tab=futures" replace />} />
   <Route path="/trading-hub" element={<Navigate to="/trading" replace />} />
   <Route path="/positions" element={<Navigate to="/trading?tab=positions" replace />} />
   <Route path="/portfolio" element={<Navigate to="/trading?tab=portfolio" replace />} />
   ```
6. Update navigation menu

## Phase 2: Unified AI Lab (MEDIUM Priority)

**File:** `src/views/UnifiedAILabView.tsx`

**Route:** `/ai-lab`

**Tabs:**
- `scanner` (default) - from ScannerView
- `training` - from TrainingView
- `backtest` - from EnhancedStrategyLabView
- `builder` - from EnhancedStrategyLabView
- `insights` - from EnhancedStrategyLabView

**Redirects:**
```typescript
<Route path="/ai-lab" element={<UnifiedAILabView />} />
<Route path="/training" element={<Navigate to="/ai-lab?tab=training" replace />} />
<Route path="/strategylab" element={<Navigate to="/ai-lab" replace />} />
<Route path="/scanner" element={<Navigate to="/ai-lab?tab=scanner" replace />} />
```

## Phase 3: Unified Admin Hub (LOW Priority)

**File:** `src/views/UnifiedAdminView.tsx`

**Route:** `/admin`

**Tabs:**
- `health` (default) - from HealthView
- `monitoring` - from MonitoringView
- `diagnostics` - from HealthView

**Redirects:**
```typescript
<Route path="/admin" element={<UnifiedAdminView />} />
<Route path="/health" element={<Navigate to="/admin?tab=health" replace />} />
<Route path="/monitoring" element={<Navigate to="/admin?tab=monitoring" replace />} />
```

## Phase 4: Dashboard Cleanup

Remove market data display from `EnhancedDashboardView.tsx`, keep only portfolio overview.

## Key Requirements

1. **Backward Compatibility:** All old routes must redirect to new routes
2. **Deep Linking:** Support URL parameters like `/trading?tab=futures&symbol=BTCUSDT`
3. **Shared State:** Selected symbol shared across tabs
4. **Lazy Loading:** Load Charts tab on-demand (TradingView widgets are heavy)
5. **WebSocket:** Single shared WebSocket connection for all tabs
6. **Data Optimization:** Shared data fetched once, tab-specific data fetched on-demand

## Testing Checklist

- [ ] All tabs work correctly
- [ ] Data fetching optimized (no duplicate API calls)
- [ ] WebSocket works across tabs
- [ ] Redirects work for all old routes
- [ ] Deep linking works (URL parameters)
- [ ] Navigation menu updated
- [ ] Page load time < 2 seconds

## Files to Reference

- Full report: `Comprehensive_Architecture_Analysis_Report.txt`
- Organized data: `architecture_pages_data.json`
- Route mapping: `ROUTE_MAPPING.md`
- Detailed guide: `IMPLEMENTATION_PROMPT.md`
