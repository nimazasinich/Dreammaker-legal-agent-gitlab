/**
 * useMixedModeData Hook
 * 
 * Custom React hook for fetching market data using the Mixed Mode architecture.
 * 
 * Features:
 * - Automatic HuggingFace primary + fallback sources
 * - TTL-based caching
 * - On-demand data fetching (only when needed)
 * - Real-time polling support
 * - Data source tracking
 * 
 * NO WebSocket, NO Binance, NO KuCoin
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  mixedModeDataService, 
  MarketPrice, 
  DataResponse, 
  DataSourceNotification,
  SourceHealth
} from '../services/MixedModeDataService';

interface UseMixedModeDataOptions {
  /** Symbols to fetch (e.g., ['BTC', 'ETH']) */
  symbols?: string[];
  /** Whether to enable automatic polling */
  enablePolling?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Force refresh data on mount */
  forceRefreshOnMount?: boolean;
  /** Callback when data source changes */
  onSourceChange?: (source: string) => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

interface UseMixedModeDataReturn {
  /** Market data for requested symbols */
  data: MarketPrice[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current data source */
  source: string;
  /** Data freshness status */
  status: 'fresh' | 'cached' | 'stale' | 'fallback' | 'error' | 'loading';
  /** Whether fallback was used */
  fallbackUsed: boolean;
  /** Manually refresh data */
  refresh: () => Promise<void>;
  /** Fetch data for a specific symbol */
  fetchSymbol: (symbol: string) => Promise<DataResponse<MarketPrice>>;
  /** Source health status */
  sourceHealth: SourceHealth[];
  /** Service statistics */
  stats: any;
}

/**
 * Hook for fetching market data using Mixed Mode
 */
export function useMixedModeData(options: UseMixedModeDataOptions = {}): UseMixedModeDataReturn {
  const {
    symbols = [],
    enablePolling = false,
    pollingInterval = 30000,
    forceRefreshOnMount = false,
    onSourceChange,
    onError
  } = options;

  const [data, setData] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('huggingface');
  const [status, setStatus] = useState<'fresh' | 'cached' | 'stale' | 'fallback' | 'error' | 'loading'>('loading');
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [sourceHealth, setSourceHealth] = useState<SourceHealth[]>([]);
  const [stats, setStats] = useState<any>({});

  const pollingCleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // Fetch data for all symbols
  const fetchData = useCallback(async (forceRefresh = false) => {
    if (symbols.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await mixedModeDataService.fetchMultipleMarketData(symbols, forceRefresh);

      if (!mountedRef.current) return;

      if (result.success && result.data) {
        setData(result.data);
        setSource(result.source);
        setStatus(result.status);
        setFallbackUsed(result.fallbackUsed);

        if (result.fallbackUsed && onSourceChange) {
          onSourceChange(result.source);
        }
      } else {
        setError(result.error || 'Failed to fetch data');
        setStatus('error');
        if (onError) {
          onError(result.error || 'Failed to fetch data');
        }
      }
    } catch (err) {
      if (!mountedRef.current) return;
      
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setStatus('error');
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [symbols, onSourceChange, onError]);

  // Fetch single symbol
  const fetchSymbol = useCallback(async (symbol: string): Promise<DataResponse<MarketPrice>> => {
    return mixedModeDataService.fetchMarketData(symbol);
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  // Initial fetch and polling setup
  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch
    if (symbols.length > 0) {
      fetchData(forceRefreshOnMount);
    }

    // Set up polling if enabled
    if (enablePolling && symbols.length > 0) {
      pollingCleanupRef.current = mixedModeDataService.startPolling(
        symbols,
        (prices) => {
          if (!mountedRef.current) return;
          setData(prices);
          // Update source from the first price
          if (prices.length > 0) {
            setSource(prices[0].source);
          }
          setStatus('fresh');
        },
        pollingInterval
      );
    }

    // Subscribe to notifications
    const unsubscribe = mixedModeDataService.onNotification((notification: DataSourceNotification) => {
      if (!mountedRef.current) return;
      
      if (notification.type === 'error') {
        setError(notification.message);
        setStatus('error');
      } else if (notification.type === 'warning' && notification.message.includes('fallback')) {
        setFallbackUsed(true);
        setSource(notification.source);
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
        pollingCleanupRef.current = null;
      }
    };
  }, [symbols.join(','), enablePolling, pollingInterval, forceRefreshOnMount]);

  // Update health and stats periodically
  useEffect(() => {
    const updateHealth = () => {
      setSourceHealth(mixedModeDataService.getSourceHealthStatus());
      setStats(mixedModeDataService.getStats());
    };

    updateHealth();
    const interval = setInterval(updateHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    isLoading,
    error,
    source,
    status,
    fallbackUsed,
    refresh,
    fetchSymbol,
    sourceHealth,
    stats
  };
}

/**
 * Hook for fetching single symbol data
 */
export function useMixedModeSymbol(symbol: string, options: Omit<UseMixedModeDataOptions, 'symbols'> = {}) {
  const result = useMixedModeData({ ...options, symbols: [symbol] });
  
  return {
    ...result,
    price: result.data[0] || null
  };
}

/**
 * Hook for getting data source health status
 */
export function useMixedModeHealth() {
  const [health, setHealth] = useState<SourceHealth[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const updateHealth = () => {
      setHealth(mixedModeDataService.getSourceHealthStatus());
      setStats(mixedModeDataService.getStats());
    };

    updateHealth();
    const interval = setInterval(updateHealth, 10000);

    return () => clearInterval(interval);
  }, []);

  return { health, stats };
}

export default useMixedModeData;
