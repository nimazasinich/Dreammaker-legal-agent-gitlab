import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export type NavigationView =
  | 'dashboard'
  | 'charting'
  | 'market'
  | 'scanner'
  | 'futures'
  | 'trading'
  | 'portfolio'
  | 'training'
  | 'risk'
  | 'professional-risk'
  | 'backtest'
  | 'strategyBuilder'
  | 'health'
  | 'settings'
  | 'enhanced-trading'
  | 'positions'
  | 'strategylab'
  | 'strategy-insights'
  | 'exchange-settings'
  | 'monitoring'
  | 'diagnostics';

/**
 * Map view names to URL hash paths
 */
const VIEW_TO_HASH: Record<NavigationView, string> = {
  dashboard: '/dashboard',
  charting: '/charting',
  market: '/market',
  scanner: '/scanner',
  futures: '/futures',
  trading: '/trading',
  portfolio: '/portfolio',
  training: '/training',
  risk: '/risk',
  'professional-risk': '/professional-risk',
  backtest: '/backtest',
  strategyBuilder: '/strategy-builder',
  health: '/health',
  settings: '/settings',
  'enhanced-trading': '/enhanced-trading',
  positions: '/positions',
  strategylab: '/strategy-lab',
  'strategy-insights': '/strategy-insights',
  'exchange-settings': '/exchange-settings',
  monitoring: '/monitoring',
  diagnostics: '/diagnostics',
};

/**
 * Map URL hash paths to view names (reverse lookup)
 */
const HASH_TO_VIEW: Record<string, NavigationView> = Object.entries(VIEW_TO_HASH).reduce(
  (acc, [view, hash]) => {
    acc[hash] = view as NavigationView;
    return acc;
  },
  {} as Record<string, NavigationView>
);

/**
 * Get view from URL hash
 */
const getViewFromHash = (): NavigationView | null => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  // Support both /dashboard and dashboard formats
  const normalizedHash = hash.startsWith('/') ? hash : `/${hash}`;
  return HASH_TO_VIEW[normalizedHash] || null;
};

/**
 * Get hash from view name
 */
const getHashFromView = (view: NavigationView): string => {
  return `#${VIEW_TO_HASH[view]}`;
};

interface NavigationContextType {
  currentView: NavigationView;
  setCurrentView: (view: NavigationView) => void;
  navigationHistory: NavigationView[];
  goBack: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  // Initialize from hash if available, otherwise default to dashboard
  const initialView = getViewFromHash() || 'dashboard';
  const [currentView, setCurrentViewState] = useState<NavigationView>(initialView);
  const [navigationHistory, setNavigationHistory] = useState<NavigationView[]>([initialView]);
  const [isHashSyncEnabled, setIsHashSyncEnabled] = useState(true);
  const currentViewRef = useRef<NavigationView>(initialView);

  // Keep ref in sync with state
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  // Sync currentView to URL hash when it changes
  useEffect(() => {
    if (!isHashSyncEnabled) return;
    const hash = getHashFromView(currentView);
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash);
    }
  }, [currentView, isHashSyncEnabled]);

  // Listen for hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const viewFromHash = getViewFromHash();
      if (viewFromHash && viewFromHash !== currentViewRef.current) {
        setIsHashSyncEnabled(false); // Prevent circular update
        setCurrentViewState(viewFromHash);
        setNavigationHistory(prev => {
          const newHistory = [...prev, viewFromHash];
          return newHistory.slice(-50);
        });
        // Re-enable hash sync after a brief delay
        setTimeout(() => setIsHashSyncEnabled(true), 0);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []); // Empty deps - handler uses ref

  // Initialize hash on mount if not present
  useEffect(() => {
    if (!window.location.hash) {
      const hash = getHashFromView(initialView);
      window.history.replaceState(null, '', hash);
    }
  }, []);

  const setCurrentView = (view: NavigationView) => {
    if (view !== currentView) {
      // Limit history to prevent memory growth (keep last 50 entries)
      setNavigationHistory(prev => {
        const newHistory = [...prev, view];
        return newHistory.slice(-50);
      });
      setCurrentViewState(view);
    }
  };

  const goBack = () => {
    if ((navigationHistory?.length || 0) > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousView = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentViewState(previousView);
    }
  };

  const canGoBack = (navigationHistory?.length || 0) > 1;

  return (
    <NavigationContext.Provider value={{
      currentView,
      setCurrentView,
      navigationHistory,
      goBack,
      canGoBack
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    console.error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};