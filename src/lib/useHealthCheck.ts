import { useEffect, useState, useCallback } from 'react';
import { API_BASE } from '../config/env';
import { LoadState } from '../types/loadState';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
type ProviderStatus = 'up' | 'degraded' | 'down' | 'unknown';

interface HealthData {
  status: HealthStatus;
  providers?: Record<string, ProviderStatus>;
  primaryDataSource?: string;
}

interface HealthResponse {
  ok: boolean;
  services?: Record<string, ProviderStatus>;
  primaryDataSource?: string;
  error?: string;
}

interface HealthResult {
  state: LoadState<HealthData>;
  refresh: () => void;
}

const DEFAULT_ENDPOINTS = ['/api/system/health', '/health', '/status/health'];

export function useHealthCheck(pingMs = 10000, timeoutMs = 3000): HealthResult {
  const [state, setState] = useState<LoadState<HealthData>>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const normalizeBase = (base: string) => {
      if (!base) return '';
      return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const base = normalizeBase(API_BASE);
    const endpoints = (DEFAULT_ENDPOINTS || []).map((endpoint) => {
      if (endpoint.startsWith('http')) return endpoint;
      return `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    });

    const fetchWithTimeout = async (url: string): Promise<HealthData> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'include'
        });

        // 2xx = healthy
        if (response.ok) {
          try {
            const data: HealthResponse = await response.json();
            // Extract per-provider status from new health format
            if (data.services) {
              // Overall status: healthy if backend is up
              const backendStatus = data.services.backend || 'unknown';
              return {
                status: backendStatus === 'up' ? 'healthy' : (backendStatus === 'down' ? 'down' : 'degraded'),
                providers: data.services,
                primaryDataSource: data.primaryDataSource
              };
            }
            return { status: 'healthy', primaryDataSource: data.primaryDataSource };
          } catch (parseError) {
            // JSON parse error, but response was OK
            return { status: 'healthy' };
          }
        }

        // 5xx = server error = down
        if (response.status >= 500) {
          console.error(`Server error: HTTP ${response.status}`);
          throw new Error(`Server error: HTTP ${response.status}`);
        }

        // 4xx = client error = degraded
        if (response.status >= 400) {
          throw new Error(`Client error: HTTP ${response.status}`);
        }

        // Other non-OK status
        console.error(`HTTP ${response.status}`);
        throw new Error(`Unexpected status: HTTP ${response.status}`);
      } catch (err) {
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const check = async () => {
      // Don't set loading on periodic checks, only on initial mount or manual refresh
      const isFirstCheck = state.status === 'loading' || retryCount > 0;

      if (!isFirstCheck && isMounted) {
        // For periodic checks, keep current data visible
      }

      let lastError: string | null = null;

      for (const endpoint of endpoints) {
        try {
          const healthData = await fetchWithTimeout(endpoint);
          if (isMounted) {
            setState({ status: 'success', data: healthData });
            setRetryCount(0); // Reset retry count on success
            return; // Stop checking other endpoints on first successful response
          }
        } catch (err: any) {
          // Check for backend unreachable errors
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes('Failed to fetch') || message.includes('NetworkError') || message.includes('AbortError')) {
            lastError = 'Backend is not reachable – please ensure the server is running.';
          } else {
            lastError = message;
          }
        }
      }

      // If we reached here, all endpoints failed
      if (isMounted) {
        setState({
          status: 'error',
          error: lastError || 'All health check endpoints failed'
        });
      }
    };

    check();
    const intervalId = setInterval(check, pingMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pingMs, timeoutMs, retryCount]);

  const refresh = useCallback(() => {
    setState({ status: 'loading' });
    setRetryCount((prev) => prev + 1);
  }, []);

  return { state, refresh };
}

export default useHealthCheck;
