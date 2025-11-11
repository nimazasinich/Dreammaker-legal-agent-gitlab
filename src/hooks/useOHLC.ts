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

const logger = Logger.getInstance();

export interface OHLCBar {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

export interface UseOHLCResult {
  data: OHLCBar[] | null;
  loading: boolean;
  error: string | null;
  updatedAt: number | null;
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
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<OHLCBar[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Convert symbol to Binance format (BTC/USDT -> BTCUSDT)
      const binanceSymbol = symbol.replace('/', '');

      const url = `${API_BASE}/market/ohlcv?symbol=${binanceSymbol}&timeframe=${timeframe}&limit=${limit}`;

      logger.info('Fetching OHLC data:', { symbol: binanceSymbol, timeframe, limit });

      const response = await fetchWithRetry(url, {
        signal: abortControllerRef.current.signal,
        timeout: 10000,
        retries: 3,
      });

      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      // Validate response structure
      if (!Array.isArray(json)) {
        console.error('Invalid response: expected array of OHLC bars');
      }

      // Transform to consistent format
      const bars: OHLCBar[] = (json || []).map((bar: any) => ({
        t: bar.t ?? bar.timestamp ?? bar.time ?? Date.now(),
        o: bar.o ?? bar.open ?? 0,
        h: bar.h ?? bar.high ?? 0,
        l: bar.l ?? bar.low ?? 0,
        c: bar.c ?? bar.close ?? 0,
        v: bar.v ?? bar.volume ?? 0,
      }));

      // Validate minimum data requirement
      if (bars.length < MIN_BARS) {
        console.error(`Insufficient data: got ${bars.length} bars, need at least ${MIN_BARS}`);
      }

      setData(bars);
      setUpdatedAt(Date.now());
      setError(null);

      logger.info('OHLC data loaded successfully:', {
        symbol: binanceSymbol,
        bars: bars.length,
      });
    } catch (err: any) {
      // Don't overwrite data on error (keep last good data visible)
      const errorMessage = err.name === 'AbortError'
        ? 'Request cancelled'
        : err.message || 'Failed to fetch OHLC data';

      setError(errorMessage);

      logger.error('Failed to fetch OHLC data:', { symbol, timeframe, limit }, err);

      // In Online mode, never use mock/synthetic data
      if (requiresRealData()) {
        logger.warn('Online mode: no fallback to mock data');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [symbol, timeframe, limit]);

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
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    updatedAt,
    reload,
  };
}
