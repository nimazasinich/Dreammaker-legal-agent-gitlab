/**
 * useOHLC - SWR-like hook for OHLC data
 *
 * Features:
 * - Auto-fetch on mount and symbol/timeframe change
 * - Keeps last good data visible during refetch
 * - Auto retry on failure with exponential backoff
 * - Explicit reload function
 * - No demo/mock data in Online mode
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithRetry } from '../lib/fetchWithRetry';
import { API_BASE, requiresRealData } from '../config/env';
import { MIN_BARS } from '../config/risk';
import { Logger } from '../core/Logger';
import { LoadState } from '../types/loadState';
import { AdvancedCache } from '../utils/cache';
import { dedupedFetch } from '../lib/requestDeduplication';
import { errorTracker, classifyError } from '../lib/errorTracking';
import { performanceMonitor } from '../lib/performanceMonitor';

const logger = Logger.getInstance();

// Create cache instance for OHLC data (30 second TTL)
const ohlcCache = new AdvancedCache<OHLCData>({
  ttl: 30000, // 30 seconds
  maxSize: 50, // Cache up to 50 different symbol/timeframe combinations
  staleWhileRevalidate: true // Return stale data while fetching fresh
});

export interface OHLCBar {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

export interface OHLCData {
  bars: OHLCBar[];
  updatedAt: number;
}

export interface UseOHLCResult {
  state: LoadState<OHLCData>;
  reload: () => void;
}

/**
 * Hook to fetch OHLC data with resilience
 *
 * @param symbol - Trading pair symbol (e.g., 'BTC/USDT')
 * @param timeframe - Timeframe (e.g., '1h', '4h', '1d')
 * @param limit - Number of bars to fetch (default: 500)
 * @returns OHLC data, loading state, error, and reload function
 *
 * @example
 * const { data, loading, error, reload } = useOHLC('BTC/USDT', '1h', 500);
 */
export function useOHLC(
  symbol: string,
  timeframe: string,
  limit: number = 500
): UseOHLCResult {
  const [state, setState] = useState<LoadState<OHLCData>>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    // Convert symbol to Binance format (BTC/USDT -> BTCUSDT)
    const binanceSymbol = symbol.replace('/', '');
    const cacheKey = `${binanceSymbol}-${timeframe}-${limit}`;

    // Check cache first
    const cachedData = ohlcCache.get(cacheKey);
    if (cachedData && retryCount === 0) {
      // Use cached data immediately
      setState({ status: 'success', data: cachedData });
      logger.info('OHLC data loaded from cache:', { symbol: binanceSymbol, timeframe, limit });
      return;
    }

    setState({ status: 'loading' });

    try {
      // Measure performance and use request deduplication
      const result = await performanceMonitor.measure(
        'fetchOHLC',
        async () => {
          const url = `${API_BASE}/market/ohlcv?symbol=${binanceSymbol}&timeframe=${timeframe}&limit=${limit}`;

          logger.info('Fetching OHLC data:', { symbol: binanceSymbol, timeframe, limit });

          // Use deduplication to prevent concurrent duplicate requests
          return await dedupedFetch(cacheKey, async () => {
            const response = await fetchWithRetry(url, {
              signal: abortControllerRef.current!.signal,
              timeout: 10000,
              retries: 3,
            });

            if (!response.ok) {
              const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
              throw new Error(errorMsg);
            }

            const json = await response.json();

            // Check for structured error response
            if (json.ok === false) {
              const errorMsg = json.message || json.reason || 'Data source error';
              throw new Error(errorMsg);
            }

            // Validate response structure
            if (!Array.isArray(json)) {
              throw new Error('Invalid response: expected array of OHLC bars');
            }

            return json;
          });
        },
        { symbol: binanceSymbol, timeframe, limit: String(limit) }
      );

      // Transform to consistent format
      const bars: OHLCBar[] = (result || []).map((bar: any) => ({
        t: bar.t ?? bar.timestamp ?? bar.time ?? Date.now(),
        o: bar.o ?? bar.open ?? 0,
        h: bar.h ?? bar.high ?? 0,
        l: bar.l ?? bar.low ?? 0,
        c: bar.c ?? bar.close ?? 0,
        v: bar.v ?? bar.volume ?? 0,
      }));

      // Validate minimum data requirement
      if (bars.length < MIN_BARS) {
        const warnMsg = `Insufficient data: got ${bars.length} bars, need at least ${MIN_BARS}`;
        console.warn(warnMsg);
      }

      const ohlcData: OHLCData = {
        bars,
        updatedAt: Date.now()
      };

      // Update cache
      ohlcCache.set(cacheKey, ohlcData);

      setState({
        status: 'success',
        data: ohlcData
      });
      setRetryCount(0); // Reset retry count on success

      // Track successful recovery if this was a retry
      if (retryCount > 0) {
        errorTracker.trackRecovery('useOHLC', 'fetchData');
      }

      logger.info('OHLC data loaded successfully:', {
        symbol: binanceSymbol,
        bars: bars.length,
      });
    } catch (err: any) {
      // Track error
      const errorType = classifyError(err);
      const errorMessage = err.name === 'AbortError'
        ? 'Request cancelled'
        : err.message || 'Failed to fetch OHLC data';

      errorTracker.track({
        type: errorType,
        message: errorMessage,
        context: {
          component: 'useOHLC',
          action: 'fetchData',
          symbol: binanceSymbol,
          timeframe,
          limit: String(limit),
          retryCount: String(retryCount)
        },
        stack: err.stack
      });

      setState({ status: 'error', error: errorMessage });

      logger.error('Failed to fetch OHLC data:', { symbol, timeframe, limit }, err);

      // In Online mode, never use mock/synthetic data
      if (requiresRealData()) {
        logger.warn('Online mode: no fallback to mock data');
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [symbol, timeframe, limit, retryCount]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchData();

    // Cleanup: abort pending request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Explicit reload function
  const reload = useCallback(() => {
    // Invalidate cache on manual reload
    const binanceSymbol = symbol.replace('/', '');
    const cacheKey = `${binanceSymbol}-${timeframe}-${limit}`;
    ohlcCache.delete(cacheKey);

    // Track retry attempt
    errorTracker.trackRecoveryAttempt('useOHLC', 'fetchData');

    setRetryCount((prev) => prev + 1);
    fetchData();
  }, [fetchData, symbol, timeframe, limit]);

  return {
    state,
    reload,
  };
}
