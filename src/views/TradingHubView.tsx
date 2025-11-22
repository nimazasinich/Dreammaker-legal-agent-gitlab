/**
 * Trading Hub - Unified Trading Interface
 * 
 * Central hub combining all trading features:
 * - Live Futures Trading (real-time execution)
 * - Technical Analysis (pattern detection)
 * - Risk Management (position sizing & analysis)
 * 
 * @component
 * @example
 * ```tsx
 * <TradingHubView />
 * ```
 * 
 * Features:
 * - Tabbed interface for easy navigation
 * - Keyboard shortcuts (Cmd/Ctrl + 1/2/3)
 * - Persistent tab state
 * - Beautiful gradient design matching theme
 * 
 * @since 1.0.0
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Shield,
  LayoutDashboard
} from 'lucide-react';
import { FuturesTradingView } from './FuturesTradingView';
import { TechnicalAnalysisView } from './TechnicalAnalysisView';
import { RiskManagementView } from './RiskManagementView';

type TabId = 'futures' | 'technical' | 'risk';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
}

const TABS: Tab[] = [
  {
    id: 'futures',
    label: 'Live Trading',
    icon: TrendingUp,
    component: FuturesTradingView,
  },
  {
    id: 'technical',
    label: 'Technical Analysis',
    icon: Activity,
    component: TechnicalAnalysisView,
  },
  {
    id: 'risk',
    label: 'Risk Management',
    icon: Shield,
    component: RiskManagementView,
  },
];

/**
 * Trading Hub View Component
 * Provides tabbed interface for all trading features
 */
export const TradingHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('futures');

  // Keyboard shortcuts (Cmd/Ctrl + 1/2/3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey)) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('futures');
        } else if (e.key === '2') {
          e.preventDefault();
          setActiveTab('technical');
        } else if (e.key === '3') {
          e.preventDefault();
          setActiveTab('risk');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get active component
  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || FuturesTradingView;

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
                  Unified trading, analysis, and risk management
                </p>
              </div>
            </div>

            {/* Tabs */}
            <nav className="flex-1 flex gap-2" role="tablist">
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
                    className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300 ${
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
                      style={isActive ? {
                        filter: 'drop-shadow(0 0 6px rgba(167, 139, 250, 0.6))'
                      } : {}}
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
        <ActiveComponent />
      </div>
    </div>
  );
};

export default TradingHubView;
