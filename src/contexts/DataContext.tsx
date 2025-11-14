import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Logger } from '../core/Logger.js';
import { realDataManager, getPrices } from '../services/RealDataManager-old';
import { useMode } from './ModeContext';
import type { DataSource } from '../components/ui/DataSourceBadge';
import { APP_MODE, shouldUseMockFixtures, requiresRealData } from '../config/dataPolicy';
import { API_BASE } from '../config/env.js';
import { toBinanceSymbol } from '../lib/symbolMapper';

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

  const loadAllData = async () => {
    // Prevent duplicate requests
    if (loadingRef.current) {
      logger.info('⏳ Already loading data, skipping...', { data: 'skipping' });
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
      logger.info('🔄 Loading all data...', { data: new Date().toISOString() });

      // Load prices - سیمبل‌های اصلی برای داده‌های واقعی
      const priceSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
      const pricesData = await realDataManager.getPrices(priceSymbols);

      logger.info('✅ Prices loaded:', { data: pricesData.length });
      setPrices(pricesData);

      // Update data source based on policy
      if (shouldUseMockFixtures() || APP_MODE === 'demo') {
        setDataSource('mock');
      } else if (requiresRealData() || APP_MODE === 'online') {
        setDataSource('real');
      } else {
        setDataSource('real');
      }

      // Load other data - داده‌های واقعی
      const [portfolio, positions, signals, statistics, metrics] = await Promise.all([
        realDataManager.getPortfolio().catch(() => null),
        realDataManager.getPositions().catch(() => []),
        realDataManager.getSignals().catch(() => []),
        Promise.resolve({ accuracy: 0.85, totalSignals: 150 }),
        Promise.resolve([]),
      ]);

      // Check if request was aborted or component unmounted
      if (abortController.signal.aborted || ignoreRef.current) {
        logger.info('⏹️ Request aborted or component unmounted');
        return;
      }

      if (mountedRef.current && !ignoreRef.current) {
        setData({
          portfolio,
          positions,
          prices: pricesData,
          signals,
          statistics,
          metrics,
        });

        setLastUpdate(new Date());

        logger.info('✅ All data loaded successfully', {
          portfolio: !!portfolio,
          positions: positions.length,
          prices: pricesData.length,
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

        // Fallback: Always show some data
        try {
          const fallbackPrices = await realDataManager.getPrices(['BTC', 'ETH', 'SOL']);
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

  // Initial load - DISABLED to reduce queries on startup
  useEffect(() => {
    mountedRef.current = true;
    ignoreRef.current = false;

    // Initial load is now disabled by default - data loads on demand
    logger.info('⏸️ Initial load disabled. Data will load on demand.');
    setLoading(false);

    // Auto-refresh disabled to reduce unnecessary queries
    // Users can manually refresh when needed

    return () => {
      mountedRef.current = false;
      ignoreRef.current = true;
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

  const refresh = (next?: { symbol?: string; timeframe?: string }) => {
    if (next?.symbol) setSymbol(next.symbol);
    if (next?.timeframe) setTimeframe(next.timeframe);
    loadOHLCVData(next?.symbol ?? symbol, next?.timeframe ?? timeframe);
    loadAllData();
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
