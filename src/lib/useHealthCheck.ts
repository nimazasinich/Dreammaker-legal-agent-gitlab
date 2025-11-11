import { useEffect, useState } from 'react';
import { API_BASE } from '../config/env';

type HealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface HealthResult {
  status: HealthStatus;
  error: string | null;
}

const DEFAULT_ENDPOINTS = ['/health', '/status/health'];

export function useHealthCheck(pingMs = 10000, timeoutMs = 3000): HealthResult {
    const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<HealthStatus>('unknown');
  const [error, setError] = useState<string | null>(null);

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

    const fetchWithTimeout = async (url: string): Promise<HealthStatus> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'include'
        });

        // 2xx = healthy
        if (response.ok) {
          await response.json().catch(() => ({}));
          return 'healthy';
        }

        // 5xx = server error = down
        if (response.status >= 500) {
          console.error(`Server error: HTTP ${response.status}`);
        }

        // 4xx = client error = degraded
        if (response.status >= 400) {
          return 'degraded';
        }

        // Other non-OK status
        console.error(`HTTP ${response.status}`);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const check = async () => {
      setError(null);

      for (const endpoint of endpoints) {
        try {
          const healthStatus = await fetchWithTimeout(endpoint);
          if (isMounted) {
            setStatus(healthStatus);
            if (healthStatus === 'healthy') {
              return; // Stop checking other endpoints on first healthy response
            }
            // If degraded, continue checking other endpoints
          }
        } catch (err: any) {
          if (isMounted) {
            setError(err instanceof Error ? err.message : String(err));
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

  return { status, error };
}

export default useHealthCheck;
