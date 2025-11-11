/**
 * fetchWithRetry - Resilient fetch with exponential backoff
 *
 * Features:
 * - 3 retry attempts with exponential backoff (1s, 2s, 4s)
 * - 10 second timeout per request
 * - Preserves original fetch API
 */

export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

class FetchRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchRetryError';
  }
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number }
): Promise<Response> {
  const timeout = options.timeout ?? 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if ((error as Error).name === 'AbortError') {
      throw new FetchTimeoutError(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Exponential backoff delay
 */
function backoffDelay(attempt: number): Promise<void> {
  const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Fetch with retry and exponential backoff
 *
 * @param url - URL to fetch
 * @param options - Fetch options with optional timeout and retries
 * @returns Response promise
 *
 * @example
 * const response = await fetchWithRetry('/api/market/ohlcv?symbol=BTCUSDT', {
 *   timeout: 10000,
 *   retries: 3
 * });
 */
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { timeout = 10000, retries = 3, ...fetchOptions } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        timeout,
      });

      // Only retry on network errors or 5xx errors
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // 5xx errors are retryable
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      // Don't wait after the last attempt
      if (attempt < retries) {
        await backoffDelay(attempt);
      }
    } catch (error) {
      lastError = error as Error;

      // Don't wait after the last attempt
      if (attempt < retries) {
        await backoffDelay(attempt);
      }
    }
  }

  throw new FetchRetryError(
    `Failed after ${retries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  );
}
