import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Home,
  Layers,
  Search,
  Settings,
  Shield,
  Sliders,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  Rocket,
  ListOrdered,
  Monitor,
  Stethoscope,
} from 'lucide-react';
import { useNavigation, NavigationView } from './NavigationProvider';
import { t } from '../../i18n';

interface NavigationItem {
  id: NavigationView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: t('navigation.dashboard'), icon: Home },
  { id: 'charting', label: t('navigation.charting'), icon: TrendingUp },
  { id: 'market', label: t('navigation.market'), icon: Zap },
  { id: 'scanner', label: t('navigation.scanner'), icon: Search },
  { id: 'trading', label: t('navigation.trading'), icon: Sparkles },
  { id: 'enhanced-trading', label: 'Enhanced Trading', icon: Rocket },
  { id: 'positions', label: 'Positions', icon: ListOrdered },
  { id: 'futures', label: t('navigation.futures'), icon: DollarSign },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet },
  { id: 'training', label: t('navigation.training'), icon: Brain },
  { id: 'risk', label: t('navigation.risk'), icon: Shield },
  { id: 'professional-risk', label: '🔥 Pro Risk', icon: AlertTriangle },
  { id: 'backtest', label: t('navigation.backtest'), icon: BarChart3 },
  { id: 'strategyBuilder', label: 'Strategy Builder', icon: Sliders },
  { id: 'strategylab', label: 'Strategy Lab', icon: Activity },
  { id: 'strategy-insights', label: 'Strategy Insights', icon: Layers },
  { id: 'health', label: t('navigation.health'), icon: Activity },
  { id: 'monitoring', label: 'Monitoring', icon: Monitor },
  { id: 'diagnostics', label: 'Diagnostics', icon: Stethoscope },
  { id: 'settings', label: t('navigation.settings'), icon: Settings },
  { id: 'exchange-settings', label: 'Exchange Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView } = useNavigation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`relative backdrop-blur-xl border-t border-border/50 lg:border-t-0 lg:border-l flex-shrink-0 transition-all duration-500 ease-in-out lg:h-screen ${
        collapsed ? 'w-20' : 'w-full lg:w-sidebar'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 15, 24, 0.98) 0%, rgba(20, 20, 30, 0.98) 50%, rgba(25, 15, 35, 0.98) 100%)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      }}
    >
      {/* Animated gradient overlay */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />
      
      {/* Glassmorphism top highlight */}
      <div 
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.5) 50%, transparent 100%)',
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <span 
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-transform duration-300 hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
              boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
            }}
          >
            <Zap className="h-5 w-5 text-white" aria-hidden="true" style={{
              filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))'
            }} />
          </span>
          {!collapsed && (
            <div className="transition-opacity duration-300">
              <p className="text-sm font-bold uppercase tracking-wide bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Bolt AI</p>
              <p className="text-xs text-slate-400">{t('layout.sidebarTagline')}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 text-slate-400 transition-all duration-300 hover:text-purple-400 hover:border-purple-400/50 hover:bg-purple-500/10 hover:scale-110 hover:rotate-180"
          style={{
            background: 'rgba(15, 15, 24, 0.6)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.05)',
          }}
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(139, 92, 246, 0.3) rgba(0, 0, 0, 0.1)',
      }}>
        <style>{`
          nav::-webkit-scrollbar {
            width: 6px;
          }
          nav::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
          }
          nav::-webkit-scrollbar-thumb {
            background: rgba(139, 92, 246, 0.3);
            border-radius: 3px;
          }
          nav::-webkit-scrollbar-thumb:hover {
            background: rgba(139, 92, 246, 0.5);
          }
        `}</style>
        <ul className="space-y-1 px-2 py-4">
          {(NAV_ITEMS || []).map((item, index) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <li key={item.id} style={{
                animation: `slideIn 0.3s ease-out ${index * 0.03}s both`,
              }}>
                <style>{`
                  @keyframes slideIn {
                    from {
                      opacity: 0;
                      transform: translateX(-20px);
                    }
                    to {
                      opacity: 1;
                      transform: translateX(0);
                    }
                  }
                `}</style>
                <button
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 overflow-hidden ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
                    boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  } : {}}
                >
                  {/* Hover glow effect */}
                  <div 
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isActive ? 'hidden' : ''}`}
                    style={{
                      background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                    }}
                  />
                  
                  {/* Icon container */}
                  <span
                    className={`relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'scale-110'
                        : 'scale-100 group-hover:scale-110'
                    }`}
                    style={isActive ? {
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                      boxShadow: '0 8px 20px rgba(139, 92, 246, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2)',
                    } : {
                      background: 'rgba(15, 15, 24, 0.6)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    <span style={isActive ? {
                      filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))'
                    } : {}}>
                      <Icon className={`h-4 w-4 transition-all duration-300 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-400'
                      }`} aria-hidden="true" />
                    </span>
                  </span>
                  
                  {/* Label */}
                  {!collapsed && (
                    <span className={`relative z-10 transition-all duration-300 ${
                      isActive ? 'font-semibold' : 'group-hover:translate-x-1'
                    }`}>
                      {item.label}
                    </span>
                  )}
                  
                  {/* Active indicator */}
                  {isActive && !collapsed && (
                    <div 
                      className="absolute right-2 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: '#a78bfa',
                        boxShadow: '0 0 8px rgba(167, 139, 250, 0.8)',
                        animation: 'pulse 2s ease-in-out infinite',
                      }}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer Status */}
      <div className="relative border-t border-border/30 px-5 py-4 text-xs">
        {!collapsed ? (
          <div className="relative rounded-xl px-4 py-3 overflow-hidden transition-all duration-300 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.10) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#10b981',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <p className="font-bold text-emerald-400">{t('layout.sidebarOnline')}</p>
            </div>
            <p className="text-[10px] text-slate-400 pl-4">{t('layout.sidebarDetails')}</p>
          </div>
        ) : (
          <div className="flex h-12 items-center justify-center">
            <div 
              className="w-3 h-3 rounded-full"
              style={{
                background: '#10b981',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>
    </aside>
  );
};