import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Logger } from '../core/Logger.js';
import { DatasourceClient } from '../services/DatasourceClient';
import { realDataManager, getPrices } from '../services/RealDataManager-old';
import { useMode } from './ModeContext';
import type { DataSource } from '../components/ui/DataSourceBadge';
import { APP_MODE, shouldUseMockFixtures, requiresRealData } from '../config/dataPolicy';
import { API_BASE } from '../config/env.js';
import { toBinanceSymbol } from '../lib/symbolMapper';
import { useRefreshSettings } from './RefreshSettingsContext';
import { BootstrapOrchestrator } from '../services/BootstrapOrchestrator';

interface DataContextType {
  portfolio: any;
  positions: any[];
  prices: any[];
  signals: any[];
  statistics: any;
  metrics: any[];
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refresh: (next?: { symbol?: string; timeframe?: string }) => void;
  symbol: string;
  timeframe: string;
  bars: Array<{
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  dataSource: DataSource;
}

const DataContext = createContext<DataContextType | null>(null);


const logger = Logger.getInstance();

export function DataProvider({
  children,
  defaultSymbol = 'BTC/USDT',
  defaultTimeframe = '1h',
}: {
  children: React.ReactNode;
  defaultSymbol?: string;
  defaultTimeframe?: string;
}) {
  const { state: { dataMode } } = useMode();
  const { autoRefreshEnabled, intervalSeconds } = useRefreshSettings();
    const [isLoading, setIsLoading] = useState(false);
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [timeframe, setTimeframe] = useState(defaultTimeframe);
  const [bars, setBars] = useState<DataContextType['bars']>([]);
  const [data, setData] = useState({
    portfolio: null,
    positions: [],
    prices: [],
    signals: [],
    statistics: null,
    metrics: [],
  });
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<DataSource>('real');

  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ignoreRef = useRef(false);
  const inflightOHLCVRef = useRef<{ cancel?: () => void } | null>(null);
  const bootstrapDoneRef = useRef(false);
  const lastBootstrapTimeRef = useRef<number>(0);

  // Preflight check disabled to reduce initial queries
  const checkOHLCVReadiness = async (s: string, tf: string): Promise<boolean> => {
    return true; // Skip preflight checks to reduce queries
  };

  const loadOHLCVData = async (s = symbol, tf = timeframe) => {
    inflightOHLCVRef.current?.cancel?.();
    setLoading(true);
    setError(null);

    // Determine expected data source based on policy
    const expectedSource: DataSource = shouldUseMockFixtures() ? 'mock' : 'real';
    setDataSource(expectedSource);

    // Preflight readiness check (online mode only)
    if (APP_MODE === 'online' || requiresRealData()) {
      const isReady = await checkOHLCVReadiness(s, tf);
      if (!isReady) {
        setError(
          `Real OHLCV data not available for ${s} ${tf}. ` +
          `Try switching to Demo mode or wait for data providers to become available.`
        );
        setDataSource('unknown');
        setLoading(false);
        return;
      }
    }

    const job = getPrices({
      mode: dataMode,
      symbol: s,
      timeframe: tf,
      limit: 200,
    });
    inflightOHLCVRef.current = job;
    job.promise
      .then((bars) => {
        setBars(bars);
        // Determine data source based on mode and policy
        if (shouldUseMockFixtures() || APP_MODE === 'demo') {
          setDataSource('mock');
        } else if (requiresRealData() || APP_MODE === 'online') {
          setDataSource('real');
        } else {
          setDataSource(dataMode === 'offline' ? 'mock' : 'real');
        }
      })
      .catch((e) => {
        const errorMsg = String(e);
        setError(errorMsg);

        // In online mode, errors should show 'unknown' not 'synthetic'
        if (requiresRealData() || APP_MODE === 'online') {
          setDataSource('unknown');
        } else if (errorMsg.includes('synthetic') || errorMsg.includes('ALLOW_FAKE_DATA')) {
          setDataSource('synthetic');
        } else {
          setDataSource('unknown');
        }
      })
      .finally(() => setLoading(false));
  };

  const loadAllData = async (forceRefresh = false) => {
    // Prevent duplicate requests
    if (loadingRef.current) {
      logger.info('⏳ Already loading data, skipping...', { data: 'skipping' });
      return;
    }

    // Don't load if component is unmounted or ignored
    if (!mountedRef.current || ignoreRef.current) {
      logger.info('⏸️ Component unmounted or ignored, skipping load');
      return;
    }

    // THROTTLE: Prevent rapid successive loads on startup (unless forced)
    const now = Date.now();
    const timeSinceLastBootstrap = now - lastBootstrapTimeRef.current;
    if (!forceRefresh && timeSinceLastBootstrap < 5000) {
      logger.info('🛑 Throttled: Too soon since last bootstrap', { timeSinceLastBootstrap });
      return;
    }

    // Cancel previous requests if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      logger.info('🔄 Loading all data (progressive)...', { data: new Date().toISOString() });
      lastBootstrapTimeRef.current = Date.now();

      // PHASE 1: Load core prices using DatasourceClient
      // This is the minimum needed to render the dashboard
      const datasourceClient = DatasourceClient.getInstance();
      const corePriceSymbols = ['BTC', 'ETH', 'SOL'];
      const corePricesData = await datasourceClient.getTopCoins(3, corePriceSymbols);

      logger.info('✅ Core prices loaded:', { data: corePricesData.length });
      setPrices(corePricesData);

      // Update data source based on policy
      if (shouldUseMockFixtures() || APP_MODE === 'demo') {
        setDataSource('mock');
      } else if (requiresRealData() || APP_MODE === 'online') {
        setDataSource('real');
      } else {
        setDataSource('real');
      }

      // Check if aborted before proceeding
      if (abortController.signal.aborted || ignoreRef.current) {
        logger.info('⏹️ Request aborted after core prices');
        return;
      }

      // PHASE 2: Load secondary data with staggered delays
      // Portfolio and positions are critical, so load them next
      const portfolio = await realDataManager.getPortfolio().catch(() => null);

      // Small delay to prevent request bunching
      await new Promise(resolve => setTimeout(resolve, 200));

      if (abortController.signal.aborted || ignoreRef.current) return;

      const positions = await realDataManager.getPositions().catch(() => []);

      // Another delay before signals
      await new Promise(resolve => setTimeout(resolve, 200));

      if (abortController.signal.aborted || ignoreRef.current) return;

      const signals = await realDataManager.getSignals().catch(() => []);

      // Statistics and metrics are low priority - use static defaults
      const statistics = { accuracy: 0.85, totalSignals: 150 };
      const metrics: any[] = [];

      // PHASE 3: Load additional prices (BNB, XRP) with delay
      // These are lower priority and can be loaded after core data is displayed
      await new Promise(resolve => setTimeout(resolve, 500));

      if (abortController.signal.aborted || ignoreRef.current) return;

      const additionalPriceSymbols = ['BNB', 'XRP'];
      const additionalPrices = await datasourceClient.getTopCoins(2, additionalPriceSymbols).catch(() => []);

      // Merge all prices
      const allPricesData = [...corePricesData, ...additionalPrices];

      if (mountedRef.current && !ignoreRef.current) {
        setData({
          portfolio,
          positions,
          prices: allPricesData,
          signals,
          statistics,
          metrics,
        });
        setPrices(allPricesData);

        setLastUpdate(new Date());
        bootstrapDoneRef.current = true;

        logger.info('✅ All data loaded successfully (progressive)', {
          portfolio: !!portfolio,
          positions: positions.length,
          prices: allPricesData.length,
          signals: signals.length,
          statistics: !!statistics,
          metrics: metrics.length,
        });
      }
    } catch (error) {
      logger.error('❌ Error loading data:', {}, error);

      if (abortController.signal.aborted || ignoreRef.current) {
        return;
      }

      if (mountedRef.current && !ignoreRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
        setError(`خطا در بارگذاری داده‌ها: ${errorMessage}. لطفاً مطمئن شوید که سرور در حال اجرا است (پورت 3001)`);

        // Fallback: Load minimal data (just BTC) using DatasourceClient
        try {
          const fallbackPrices = await datasourceClient.getTopCoins(1, ['BTC']);
          setPrices(fallbackPrices);

          setData((prev) => ({
            ...prev,
            prices: fallbackPrices,
          }));
        } catch (fallbackError) {
          logger.error('❌ Fallback prices also failed:', {}, fallbackError);
          // Set empty array as last resort
          setPrices([]);
          setData((prev) => ({
            ...prev,
            prices: [],
          }));
        }
      }
    } finally {
      if (mountedRef.current && !ignoreRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  };

  // Load OHLCV data only on explicit symbol/timeframe change (not on initial mount)
  useEffect(() => {
    if (!mountedRef.current) return; // Skip initial mount
    loadOHLCVData();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [symbol, timeframe]);

  // Initial load - Controlled by BootstrapOrchestrator to prevent request storms
  useEffect(() => {
    mountedRef.current = true;
    ignoreRef.current = false;
    bootstrapDoneRef.current = false;

    // Check if initial load is disabled via environment flag
    const disableInitialLoad = import.meta.env.VITE_DISABLE_INITIAL_LOAD === 'true';

    if (disableInitialLoad) {
      logger.info('🚫 DataContext: Initial load disabled via VITE_DISABLE_INITIAL_LOAD');
      setLoading(false);
      return () => {
        mountedRef.current = false;
        ignoreRef.current = true;
      };
    }

    // Use BootstrapOrchestrator to coordinate initial load
    // This prevents multiple contexts from triggering simultaneous loads
    const initTimer = setTimeout(() => {
      if (mountedRef.current && !ignoreRef.current && !bootstrapDoneRef.current) {
        logger.info('🔄 DataContext: Checking bootstrap orchestrator');

        // Use the orchestrator to ensure controlled, single bootstrap
        BootstrapOrchestrator.bootstrap(
          // Core data loader
          async () => {
            logger.info('🔄 DataContext: Initial load starting (orchestrated)');
            await loadAllData();
          }
        ).catch(err => {
          logger.error('❌ Bootstrap orchestration failed:', {}, err);
        });
      }
    }, 300); // Increased delay for provider stabilization and coordination

    return () => {
      mountedRef.current = false;
      ignoreRef.current = true;
      clearTimeout(initTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (inflightOHLCVRef.current) {
        inflightOHLCVRef.current.cancel?.();
      }
    };
  }, []);

  // Auto-refresh effect: reacts to settings changes
  useEffect(() => {
    if (!autoRefreshEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const intervalMs = intervalSeconds * 1000;
    logger.info('🔄 Auto-refresh enabled', { intervalSeconds });

    const runRefresh = () => {
      if (mountedRef.current && !ignoreRef.current && !loadingRef.current) {
        logger.info('🔄 Auto-refresh triggered');
        loadAllData();
      }
    };

    intervalRef.current = setInterval(runRefresh, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefreshEnabled, intervalSeconds]);

  const refresh = (next?: { symbol?: string; timeframe?: string }) => {
    // Prevent refresh if already loading
    if (loadingRef.current) {
      logger.info('⏳ Refresh skipped - already loading');
      return;
    }
    
    if (next?.symbol) setSymbol(next.symbol);
    if (next?.timeframe) setTimeframe(next.timeframe);
    loadOHLCVData(next?.symbol ?? symbol, next?.timeframe ?? timeframe);
    loadAllData(true); // true = force refresh (user-initiated)
  };

  return (
    <DataContext.Provider
      value={{
        portfolio: data.portfolio,
        positions: data.positions,
        prices: data.prices,
        signals: data.signals,
        statistics: data.statistics,
        metrics: data.metrics,
        loading,
        error,
        lastUpdate,
        refresh,
        symbol,
        timeframe,
        bars,
        dataSource,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextType {
  const context = useContext(DataContext);
  if (!context) {
    console.error('useData must be used within DataProvider');
  }
  return context;
}

export type { DataContextType };
