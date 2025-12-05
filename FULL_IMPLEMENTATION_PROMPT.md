# 🎯 Complete Architecture Reorganization - Full Implementation Prompt

## 📋 Mission Statement

You are an AI coding assistant tasked with implementing a complete architecture reorganization for the Dreammaker Crypto Platform. Based on the analysis report `Comprehensive_Architecture_Analysis_Report.txt`, you must reorganize 18 pages into 8-9 pages by merging similar functionality into unified hubs.

**Primary Goals:**
- Reduce navigation complexity by 55% (from 18 to 8-9 pages)
- Eliminate ~2000 lines of duplicate code
- Improve user experience (reduce navigation clicks from 3-4 to 0-1)
- Optimize API calls (reduce by 40%)

**Implementation Order:** Complete Phase 1 fully before moving to Phase 2, then Phase 3, then Phase 4.

---

## 🚀 PHASE 1: Unified Trading Hub (HIGHEST PRIORITY - DO THIS FIRST)

### Objective
Create a unified trading hub that merges 5 trading-related pages into one component with tabbed interface.

### Pages to Merge:
1. **ChartingView** → Tab: `charts` (lazy load - TradingView widgets are heavy)
2. **EnhancedTradingView** → Tab: `spot`
3. **FuturesTradingView** → Tab: `futures` (default tab)
4. **PositionsView** → Tab: `positions`
5. **PortfolioPage** → Tab: `portfolio`

### Step 1.1: Create UnifiedTradingHubView Component

**File:** `src/views/UnifiedTradingHubView.tsx`

Create this file with the following complete implementation:

```typescript
/**
 * Unified Trading Hub View
 * 
 * Central hub combining all trading features:
 * - Charts (from ChartingView)
 * - Spot Trading (from EnhancedTradingView)
 * - Futures Trading (from FuturesTradingView)
 * - Positions (from PositionsView)
 * - Portfolio (from PortfolioPage)
 * 
 * @component
 * @since 1.0.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { 
  BarChart3,
  TrendingUp, 
  Activity, 
  Wallet,
  LayoutDashboard
} from 'lucide-react';
import { FuturesTradingView } from './FuturesTradingView';
import { EnhancedTradingView } from './EnhancedTradingView';
import { PositionsView } from './PositionsView';
import { PortfolioPage } from './PortfolioPage';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Lazy load ChartingView as it's heavy
const ChartingView = lazy(() => import('./ChartingView'));

type TabId = 'charts' | 'spot' | 'futures' | 'positions' | 'portfolio';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
  lazy?: boolean;
}

const TABS: Tab[] = [
  {
    id: 'charts',
    label: 'Charts',
    icon: BarChart3,
    component: ChartingView,
    lazy: true, // Lazy load TradingView widgets
  },
  {
    id: 'spot',
    label: 'Spot',
    icon: TrendingUp,
    component: EnhancedTradingView,
  },
  {
    id: 'futures',
    label: 'Futures',
    icon: Activity,
    component: FuturesTradingView,
  },
  {
    id: 'positions',
    label: 'Positions',
    icon: Wallet,
    component: PositionsView,
  },
  {
    id: 'portfolio',
    label: 'Portfolio',
    icon: LayoutDashboard,
    component: PortfolioPage,
  },
];

/**
 * Get active tab from URL hash
 */
const getTabFromHash = (): TabId => {
  if (typeof window === 'undefined') return 'futures';
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const tab = params.get('tab') as TabId;
  return tab && TABS.some(t => t.id === tab) ? tab : 'futures';
};

/**
 * Update URL hash with tab parameter
 */
const updateHash = (tab: TabId) => {
  if (typeof window === 'undefined') return;
  const baseHash = window.location.hash.split('?')[0] || '#/trading';
  window.location.hash = `${baseHash}?tab=${tab}`;
};

/**
 * Unified Trading Hub View Component
 */
export const UnifiedTradingHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash());
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

  // Sync with URL hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL when tab changes
  useEffect(() => {
    updateHash(activeTab);
  }, [activeTab]);

  // Keyboard shortcuts (Cmd/Ctrl + 1/2/3/4/5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const key = e.key;
        if (key >= '1' && key <= '5') {
          e.preventDefault();
          const tabIndex = parseInt(key) - 1;
          if (tabIndex < TABS.length) {
            setActiveTab(TABS[tabIndex].id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get active component
  const activeTabConfig = TABS.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component || FuturesTradingView;

  return (
    <div className="min-h-screen bg-[color:var(--surface-page)]">
      {/* Header with Tabs */}
      <div 
        className="border-b border-[color:var(--border)] sticky top-0 z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            {/* Logo/Title */}
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
                }}
              >
                <LayoutDashboard className="w-6 h-6 text-white" style={{
                  filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))'
                }} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
                  Trading Hub
                </h1>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  Unified trading, analysis, and portfolio management
                </p>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex-1 flex gap-2 overflow-x-auto" role="tablist">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                      isActive
                        ? 'text-white'
                        : 'text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
                      boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                    } : {
                      background: 'rgba(15, 15, 24, 0.3)',
                      border: '1px solid rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    {/* Hover effect */}
                    <div 
                      className={`absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isActive ? 'hidden' : ''}`}
                      style={{
                        background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                      }}
                    />
                    
                    {/* Icon */}
                    <Icon 
                      className={`w-4 h-4 relative z-10 transition-all duration-300 ${
                        isActive ? 'text-purple-400' : 'text-[color:var(--text-secondary)] group-hover:text-purple-400'
                      }`}
                    />
                    
                    {/* Label */}
                    <span className="relative z-10">{tab.label}</span>
                    
                    {/* Keyboard shortcut hint */}
                    <span className={`relative z-10 ml-1 text-xs px-1.5 py-0.5 rounded ${
                      isActive 
                        ? 'bg-purple-500/20 text-purple-300' 
                        : 'bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]'
                    }`}>
                      ⌘{index + 1}
                    </span>

                    {/* Active indicator */}
                    {isActive && (
                      <div 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent 0%, #a78bfa 50%, transparent 100%)',
                          boxShadow: '0 0 8px rgba(167, 139, 250, 0.8)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div 
        role="tabpanel" 
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTabConfig?.lazy ? (
          <Suspense fallback={<LoadingSpinner />}>
            <ActiveComponent />
          </Suspense>
        ) : (
          <ActiveComponent />
        )}
      </div>
    </div>
  );
};

export default UnifiedTradingHubView;
```

### Step 1.2: Update NavigationProvider

**File:** `src/components/Navigation/NavigationProvider.tsx`

**Find the `NavigationView` type definition and add:**
```typescript
export type NavigationView =
  | 'dashboard'
  | 'charting'
  | 'market'
  | 'scanner'
  | 'futures'
  | 'trading'
  | 'trading-hub'
  | 'unified-trading'  // ADD THIS LINE
  | 'portfolio'
  // ... rest of existing types
```

**Find the `VIEW_TO_HASH` object and add:**
```typescript
const VIEW_TO_HASH: Record<NavigationView, string> = {
  dashboard: '/dashboard',
  charting: '/charting',
  market: '/market',
  scanner: '/scanner',
  futures: '/futures',
  trading: '/trading',
  'trading-hub': '/trading-hub',
  'unified-trading': '/trading',  // ADD THIS LINE
  portfolio: '/portfolio',
  // ... rest of existing mappings
};
```

### Step 1.3: Update App.tsx

**File:** `src/App.tsx`

**Add import at the top with other lazy loads:**
```typescript
const UnifiedTradingHubView = lazyLoad(() => import('./views/UnifiedTradingHubView'), 'UnifiedTradingHubView');
```

**In the `AppContent` component, add redirect handling at the beginning:**
```typescript
const AppContent: React.FC = () => {
  const { currentView, setCurrentView } = useNavigation();
  const viewTheme = getViewTheme(currentView);
  const logger = Logger.getInstance();

  // Handle redirects for old routes to new unified hubs
  React.useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    const path = hash.split('?')[0];
    const params = new URLSearchParams(hash.split('?')[1] || '');

    // Redirect old trading routes to unified trading hub
    const tradingRedirects: Record<string, string> = {
      '/tradingview-dashboard': '/trading?tab=charts',
      '/enhanced-trading': '/trading?tab=spot',
      '/futures': '/trading?tab=futures',
      '/trading-hub': '/trading',
      '/positions': '/trading?tab=positions',
      '/portfolio': '/trading?tab=portfolio',
    };

    if (tradingRedirects[path]) {
      const redirectPath = tradingRedirects[path];
      window.location.hash = redirectPath;
      setCurrentView('unified-trading');
      return;
    }

    // If already on /trading, ensure unified-trading view is set
    if (path === '/trading' && currentView !== 'unified-trading') {
      setCurrentView('unified-trading');
    }
  }, [currentView, setCurrentView]);

  // ... rest of existing code
```

**In the `renderCurrentView` switch statement, add:**
```typescript
case 'unified-trading': return <UnifiedTradingHubView />;
```

### Step 1.4: Update Sidebar Navigation

**File:** `src/components/Navigation/Sidebar.tsx`

**Replace the `NAV_ITEMS` array with:**
```typescript
const NAV_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: t('navigation.dashboard'), icon: Home },
  { id: 'unified-trading', label: '⚡ Trading Hub', icon: Layers },
  { id: 'market', label: t('navigation.market'), icon: Zap },
  { id: 'scanner', label: t('navigation.scanner'), icon: Search },
  { id: 'technical-analysis', label: 'Technical Analysis', icon: Activity },
  { id: 'risk-management', label: 'Risk Management', icon: Shield },
  { id: 'professional-risk', label: '🔥 Pro Risk', icon: AlertTriangle },
  { id: 'training', label: t('navigation.training'), icon: Brain },
  { id: 'strategylab', label: 'Strategy Lab', icon: Activity },
  { id: 'health', label: t('navigation.health'), icon: Activity },
  { id: 'monitoring', label: 'Monitoring', icon: Monitor },
  { id: 'settings', label: t('navigation.settings'), icon: Settings },
];
```

**REMOVE these items:** `charting`, `trading-hub`, `trading`, `enhanced-trading`, `positions`, `futures`, `portfolio`

### Step 1.5: Test Phase 1
- [ ] Navigate to `/trading` - should show Futures tab by default
- [ ] Test all 5 tabs work correctly
- [ ] Test old routes redirect: `/futures` → `/trading?tab=futures`
- [ ] Test deep linking: `/trading?tab=spot` works
- [ ] Test keyboard shortcuts (⌘1-5)
- [ ] Verify lazy loading works for Charts tab

**ONLY PROCEED TO PHASE 2 AFTER PHASE 1 IS COMPLETE AND TESTED**

---

## 🚀 PHASE 2: Unified AI Lab (MEDIUM PRIORITY)

### Objective
Create a unified AI lab that merges AI/ML related pages into one component with tabbed interface.

### Pages to Merge:
1. **ScannerView** → Tab: `scanner` (default)
2. **TrainingView** → Tab: `training`
3. **BacktestView** → Tab: `backtest`
4. **StrategyBuilderView** → Tab: `builder`
5. **StrategyInsightsView** → Tab: `insights`

### Step 2.1: Create UnifiedAILabView Component

**File:** `src/views/UnifiedAILabView.tsx`

Create this file with the following complete implementation:

```typescript
/**
 * Unified AI Lab View
 * 
 * Central hub for AI/ML workflow:
 * - Scanner (from ScannerView)
 * - Training (from TrainingView)
 * - Backtest (from BacktestView)
 * - Builder (from StrategyBuilderView)
 * - Insights (from StrategyInsightsView)
 * 
 * @component
 * @since 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Brain, BarChart3, Sliders, Layers } from 'lucide-react';
import { ScannerView } from './ScannerView';
import { TrainingView } from './TrainingView';
import { BacktestView } from './BacktestView';
import { StrategyBuilderView } from './StrategyBuilderView';
import { StrategyInsightsView } from './StrategyInsightsView';

type TabId = 'scanner' | 'training' | 'backtest' | 'builder' | 'insights';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const TABS: Tab[] = [
  { id: 'scanner', label: 'Scanner', icon: Search, component: ScannerView },
  { id: 'training', label: 'Training', icon: Brain, component: TrainingView },
  { id: 'backtest', label: 'Backtest', icon: BarChart3, component: BacktestView },
  { id: 'builder', label: 'Builder', icon: Sliders, component: StrategyBuilderView },
  { id: 'insights', label: 'Insights', icon: Layers, component: StrategyInsightsView },
];

const getTabFromHash = (): TabId => {
  if (typeof window === 'undefined') return 'scanner';
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const tab = params.get('tab') as TabId;
  return tab && TABS.some(t => t.id === tab) ? tab : 'scanner';
};

const updateHash = (tab: TabId) => {
  if (typeof window === 'undefined') return;
  const baseHash = window.location.hash.split('?')[0] || '#/ai-lab';
  window.location.hash = `${baseHash}?tab=${tab}`;
};

export const UnifiedAILabView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    updateHash(activeTab);
  }, [activeTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        const key = e.key;
        if (key >= '1' && key <= '5') {
          e.preventDefault();
          const tabIndex = parseInt(key) - 1;
          if (tabIndex < TABS.length) {
            setActiveTab(TABS[tabIndex].id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeTabConfig = TABS.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component || ScannerView;

  return (
    <div className="min-h-screen bg-[color:var(--surface-page)]">
      <div 
        className="border-b border-[color:var(--border)] sticky top-0 z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                }}
              >
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[color:var(--text-primary)]">AI Lab</h1>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  Scanner, Training, Backtest, Builder, Insights
                </p>
              </div>
            </div>

            <nav className="flex-1 flex gap-2 overflow-x-auto" role="tablist">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-[color:var(--text-secondary)]'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(52, 211, 153, 0.15) 100%)',
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    } : {
                      background: 'rgba(15, 15, 24, 0.3)',
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-green-400' : ''}`} />
                    <span>{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-green-500/20 text-green-300' : 'bg-[color:var(--surface-muted)]'
                    }`}>⌘{index + 1}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default UnifiedAILabView;
```

### Step 2.2: Update NavigationProvider

**Add to `NavigationView` type:**
```typescript
| 'unified-ai-lab'  // ADD THIS
```

**Add to `VIEW_TO_HASH`:**
```typescript
'unified-ai-lab': '/ai-lab',  // ADD THIS
```

### Step 2.3: Update App.tsx

**Add import:**
```typescript
const UnifiedAILabView = lazyLoad(() => import('./views/UnifiedAILabView'), 'UnifiedAILabView');
```

**Add redirects in the redirect handling useEffect:**
```typescript
const aiLabRedirects: Record<string, string> = {
  '/training': '/ai-lab?tab=training',
  '/strategy-lab': '/ai-lab',
  '/scanner': '/ai-lab?tab=scanner',
  '/backtest': '/ai-lab?tab=backtest',
  '/strategy-builder': '/ai-lab?tab=builder',
  '/strategy-insights': '/ai-lab?tab=insights',
};

if (aiLabRedirects[path]) {
  window.location.hash = aiLabRedirects[path];
  setCurrentView('unified-ai-lab');
  return;
}
```

**Add to switch statement:**
```typescript
case 'unified-ai-lab': return <UnifiedAILabView />;
```

### Step 2.4: Update Sidebar

**Replace `training` and `strategylab` items with:**
```typescript
{ id: 'unified-ai-lab', label: '🧠 AI Lab', icon: Brain },
```

**REMOVE:** `backtest`, `strategyBuilder`, `strategy-insights` from NAV_ITEMS

### Step 2.5: Test Phase 2
- [ ] Navigate to `/ai-lab` - should show Scanner tab by default
- [ ] Test all 5 tabs work correctly
- [ ] Test redirects: `/training` → `/ai-lab?tab=training`
- [ ] Test workflow: Scanner → Training → Backtest

**ONLY PROCEED TO PHASE 3 AFTER PHASE 2 IS COMPLETE AND TESTED**

---

## 🚀 PHASE 3: Unified Admin Hub (LOW PRIORITY)

### Objective
Create a unified admin hub that merges admin/monitoring pages.

### Pages to Merge:
1. **HealthView** → Tab: `health` (default)
2. **MonitoringView** → Tab: `monitoring`
3. **DiagnosticsView** → Tab: `diagnostics`

### Step 3.1: Create UnifiedAdminView Component

**File:** `src/views/UnifiedAdminView.tsx`

Create this file with the following complete implementation:

```typescript
/**
 * Unified Admin View
 * 
 * Central hub for system monitoring and diagnostics:
 * - Health (from HealthView)
 * - Monitoring (from MonitoringView)
 * - Diagnostics (from DiagnosticsView)
 * 
 * @component
 * @since 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Activity, Monitor, Stethoscope } from 'lucide-react';
import { HealthView } from './HealthView';
import { MonitoringView } from './MonitoringView';
import { DiagnosticsView } from './DiagnosticsView';

type TabId = 'health' | 'monitoring' | 'diagnostics';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const TABS: Tab[] = [
  { id: 'health', label: 'Health', icon: Activity, component: HealthView },
  { id: 'monitoring', label: 'Monitoring', icon: Monitor, component: MonitoringView },
  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope, component: DiagnosticsView },
];

const getTabFromHash = (): TabId => {
  if (typeof window === 'undefined') return 'health';
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash.split('?')[1] || '');
  const tab = params.get('tab') as TabId;
  return tab && TABS.some(t => t.id === tab) ? tab : 'health';
};

const updateHash = (tab: TabId) => {
  if (typeof window === 'undefined') return;
  const baseHash = window.location.hash.split('?')[0] || '#/admin';
  window.location.hash = `${baseHash}?tab=${tab}`;
};

export const UnifiedAdminView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getTabFromHash();
      setActiveTab(tab);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    updateHash(activeTab);
  }, [activeTab]);

  const activeTabConfig = TABS.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component || HealthView;

  return (
    <div className="min-h-screen bg-[color:var(--surface-page)]">
      <div 
        className="border-b border-[color:var(--border)] sticky top-0 z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.98) 0%, rgba(20, 20, 30, 0.98) 100%)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div 
                className="p-2.5 rounded-xl shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                }}
              >
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[color:var(--text-primary)]">Admin Dashboard</h1>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  System health, monitoring, and diagnostics
                </p>
              </div>
            </div>

            <nav className="flex-1 flex gap-2 overflow-x-auto" role="tablist">
              {TABS.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 whitespace-nowrap ${
                      isActive ? 'text-white' : 'text-[color:var(--text-secondary)]'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(248, 113, 113, 0.15) 100%)',
                      boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    } : {
                      background: 'rgba(15, 15, 24, 0.3)',
                      border: '1px solid rgba(239, 68, 68, 0.1)',
                    }}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-400' : ''}`} />
                    <span>{tab.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-red-500/20 text-red-300' : 'bg-[color:var(--surface-muted)]'
                    }`}>⌘{index + 1}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default UnifiedAdminView;
```

### Step 3.2: Update NavigationProvider

**Add to `NavigationView` type:**
```typescript
| 'unified-admin'  // ADD THIS
```

**Add to `VIEW_TO_HASH`:**
```typescript
'unified-admin': '/admin',  // ADD THIS
```

### Step 3.3: Update App.tsx

**Add import:**
```typescript
const UnifiedAdminView = lazyLoad(() => import('./views/UnifiedAdminView'), 'UnifiedAdminView');
```

**Add redirects:**
```typescript
const adminRedirects: Record<string, string> = {
  '/health': '/admin?tab=health',
  '/monitoring': '/admin?tab=monitoring',
  '/diagnostics': '/admin?tab=diagnostics',
};

if (adminRedirects[path]) {
  window.location.hash = adminRedirects[path];
  setCurrentView('unified-admin');
  return;
}
```

**Add to switch statement:**
```typescript
case 'unified-admin': return <UnifiedAdminView />;
```

### Step 3.4: Update Sidebar

**Replace `health` and `monitoring` items with:**
```typescript
{ id: 'unified-admin', label: '⚙️ Admin', icon: Monitor },
```

**REMOVE:** `diagnostics` from NAV_ITEMS

### Step 3.5: Test Phase 3
- [ ] Navigate to `/admin` - should show Health tab by default
- [ ] Test all 3 tabs work correctly
- [ ] Test redirects: `/health` → `/admin?tab=health`

**ONLY PROCEED TO PHASE 4 AFTER PHASE 3 IS COMPLETE AND TESTED**

---

## 🚀 PHASE 4: Dashboard Cleanup (MEDIUM PRIORITY)

### Objective
Remove market data duplication from Dashboard, focus on portfolio overview only.

### Step 4.1: Update DashboardView

**File:** `src/views/DashboardView.tsx`

**Find and REMOVE these sections:**
- Market statistics cards (total value, change %, active positions)
- Real-time price charts for selected symbols
- Symbol ribbon for quick symbol selection
- Any market data display components

**KEEP these sections:**
- Portfolio value and PnL display with real-time updates
- Top signals panel with AI-generated trading signals
- Health status indicator

**ADD a link to Market Analysis Hub:**
```typescript
import { useNavigation } from '../components/Navigation/NavigationProvider';

// In the component, add:
const { setCurrentView } = useNavigation();

// Add this button/link somewhere visible:
<button
  onClick={() => setCurrentView('market')}
  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white"
>
  View Market Data →
</button>
```

### Step 4.2: Test Phase 4
- [ ] Dashboard shows only portfolio overview
- [ ] Market data link works correctly
- [ ] No broken functionality

---

## ✅ FINAL CHECKLIST

### All Phases Complete:
- [ ] Phase 1: Unified Trading Hub - Complete and tested
- [ ] Phase 2: Unified AI Lab - Complete and tested
- [ ] Phase 3: Unified Admin Hub - Complete and tested
- [ ] Phase 4: Dashboard Cleanup - Complete and tested

### Final Navigation Menu Should Have (~10-12 items):
```typescript
[
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'unified-trading', label: '⚡ Trading Hub', icon: Layers },
  { id: 'market', label: 'Market', icon: Zap },
  { id: 'scanner', label: 'Scanner', icon: Search },
  { id: 'technical-analysis', label: 'Technical Analysis', icon: Activity },
  { id: 'risk-management', label: 'Risk Management', icon: Shield },
  { id: 'professional-risk', label: '🔥 Pro Risk', icon: AlertTriangle },
  { id: 'unified-ai-lab', label: '🧠 AI Lab', icon: Brain },
  { id: 'unified-admin', label: '⚙️ Admin', icon: Monitor },
  { id: 'settings', label: 'Settings', icon: Settings },
]
```

### Final Testing:
- [ ] All old routes redirect correctly
- [ ] All unified hubs work correctly
- [ ] Navigation menu is simplified (from 18 to ~10-12 items)
- [ ] No broken links
- [ ] All features accessible
- [ ] Deep linking works (URL parameters)
- [ ] Keyboard shortcuts work
- [ ] No console errors
- [ ] Performance is good

---

## 📊 Expected Results

**Before:**
- 18 top-level pages
- ~2000 lines of duplicate code
- 3-4 navigation clicks for common workflows
- 8-12 API calls per workflow

**After:**
- 8-9 top-level pages (50% reduction)
- <500 lines of duplicate code (75% reduction)
- 0-1 navigation clicks for common workflows
- 4-6 API calls per workflow (40% reduction)

---

## 🎯 Success Criteria

1. ✅ All 3 unified hubs created and working
2. ✅ All old routes redirect properly
3. ✅ Navigation menu simplified from 18 to ~10-12 items
4. ✅ No feature loss
5. ✅ Better user experience (fewer clicks)
6. ✅ Reduced code duplication
7. ✅ Improved performance

---

## 🚨 IMPORTANT NOTES

1. **Complete each phase fully before moving to the next**
2. **Test thoroughly after each phase**
3. **Maintain backward compatibility** - all old routes must redirect
4. **Use consistent UI patterns** - same tab navigation style across all hubs
5. **Support deep linking** - URL hash parameters must work
6. **Lazy load heavy components** - Charts tab uses lazy loading
7. **Update navigation menu** - remove redundant items

---

**START IMPLEMENTATION NOW. Begin with Phase 1, complete it fully, test it, then proceed to Phase 2, 3, and 4 in order.**

**Good luck! 🚀**
