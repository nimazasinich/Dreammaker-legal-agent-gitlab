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
  { id: 'settings', label: t('navigation.settings'), icon: Settings },
  { id: 'exchange-settings', label: 'Exchange Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { currentView, setCurrentView } = useNavigation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`bg-surface/95 backdrop-blur-sm border-t border-border lg:border-t-0 lg:border-l shadow-card flex-shrink-0 transition-all duration-300 lg:h-screen ${
        collapsed ? 'w-20' : 'w-full lg:w-sidebar'
      }`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 shadow-sm">
            <Zap className="h-5 w-5" aria-hidden="true" />
          </span>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Bolt AI</p>
              <p className="text-xs text-text-muted">{t('layout.sidebarTagline')}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition hover:text-primary-600"
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="space-y-1 px-2 py-4">
          {(NAV_ITEMS || []).map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setCurrentView(item.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-text-secondary hover:bg-surface-muted hover:text-primary-600'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition ${
                      isActive
                        ? 'border-transparent bg-primary-100 text-primary-700'
                        : 'border-border bg-surface text-text-muted group-hover:border-primary-200'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

        <div className="border-t border-border px-5 py-4 text-xs text-text-muted">
          {!collapsed ? (
            <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
              <p className="font-medium text-text-secondary">{t('layout.sidebarOnline')}</p>
              <p className="mt-1 text-text-muted">{t('layout.sidebarDetails')}</p>
            </div>
          ) : (
            <div className="flex h-9 items-center justify-center text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {t('layout.sidebarCompact')}
            </div>
          )}
        </div>
    </aside>
  );
};