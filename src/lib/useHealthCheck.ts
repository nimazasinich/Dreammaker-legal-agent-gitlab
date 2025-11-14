import { useEffect, useState } from 'react';
import { API_BASE } from '../config/env';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';
type ProviderStatus = 'up' | 'degraded' | 'down' | 'unknown';

interface HealthResult {
  status: HealthStatus;
  error: string | null;
  providers?: Record<string, ProviderStatus>;
}

interface HealthResponse {
  ok: boolean;
  services?: Record<string, ProviderStatus>;
  error?: string;
}

const DEFAULT_ENDPOINTS = ['/api/system/health', '/health', '/status/health'];

export function useHealthCheck(pingMs = 10000, timeoutMs = 3000): HealthResult {
  const [status, setStatus] = useState<HealthStatus>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, ProviderStatus> | undefined>(undefined);

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

    const fetchWithTimeout = async (url: string): Promise<{ status: HealthStatus; providers?: Record<string, ProviderStatus> }> => {
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
              if (isMounted) {
                setProviders(data.services);
              }
              // Overall status: healthy if backend is up
              const backendStatus = data.services.backend || 'unknown';
              return {
                status: backendStatus === 'up' ? 'healthy' : (backendStatus === 'down' ? 'down' : 'degraded'),
                providers: data.services
              };
            }
            return { status: 'healthy' };
          } catch (parseError) {
            // JSON parse error, but response was OK
            return { status: 'healthy' };
          }
        }

        // 5xx = server error = down
        if (response.status >= 500) {
          console.error(`Server error: HTTP ${response.status}`);
          return { status: 'down' };
        }

        // 4xx = client error = degraded
        if (response.status >= 400) {
          return { status: 'degraded' };
        }

        // Other non-OK status
        console.error(`HTTP ${response.status}`);
        return { status: 'degraded' };
      } catch (err) {
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const check = async () => {
      setError(null);

      for (const endpoint of endpoints) {
        try {
          const result = await fetchWithTimeout(endpoint);
          if (isMounted) {
            setStatus(result.status);
            if (result.providers) {
              setProviders(result.providers);
            }
            if (result.status === 'healthy') {
              return; // Stop checking other endpoints on first healthy response
            }
            // If degraded, continue checking other endpoints
          }
        } catch (err: any) {
          if (isMounted) {
            // Check for backend unreachable errors
            const message = err instanceof Error ? err.message : String(err);
            if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
              setError('Backend is not reachable on port 8001 – please ensure the server is running.');
            } else {
              setError(message);
            }
          }
        }
      }

      // If we reached here, all endpoints failed or returned degraded
      if (isMounted && status !== 'degraded') {
        setStatus('down');
      }
    };

    check();
    const intervalId = setInterval(check, pingMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pingMs, timeoutMs]);

  return { status, error, providers };
}

export default useHealthCheck;
