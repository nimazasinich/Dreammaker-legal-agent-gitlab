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
 * @example
 * ```tsx
 * <UnifiedTradingHubView />
 * ```
 * 
 * Features:
 * - Tab-based interface for easy navigation
 * - Keyboard shortcuts (Cmd/Ctrl + 1/2/3/4/5)
 * - URL parameter support for deep linking
 * - Shared state (selected symbol) across tabs
 * - Optimized data fetching
 * 
 * @since 1.0.0
 * @version 1.0.0
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
 * Provides tabbed interface for all trading features
 */
export const UnifiedTradingHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash);
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
