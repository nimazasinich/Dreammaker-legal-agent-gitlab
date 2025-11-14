/**
 * Request Deduplication - Prevents duplicate simultaneous requests
 *
 * Features:
 * - Deduplicates concurrent requests to the same URL
 * - Returns the same Promise for duplicate requests
 * - Automatic cleanup after request completion
 * - Error propagation to all waiting callers
 *
 * @example
 * ```ts
 * // Multiple components request the same data simultaneously
 * const data1 = await dedupedFetch('api/data', () => fetch('/api/data'));
 * const data2 = await dedupedFetch('api/data', () => fetch('/api/data'));
 * // Only one actual fetch is made, both get the same result
 * ```
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private inFlightRequests = new Map<string, PendingRequest<any>>();
  private stats = {
    totalRequests: 0,
    dedupedRequests: 0,
    cacheHits: 0
  };

  /**
   * Execute a fetch function with deduplication
   * @param key - Unique key for the request (usually the URL)
   * @param fetcher - Function that performs the actual fetch
   * @returns Promise that resolves to the fetched data
   */
  async dedupedFetch<T>(
    key: string,
    fetcher: () => Promise<T>
  ): Promise<T> {
    this.stats.totalRequests++;

    // Check if there's already a pending request for this key
    const pending = this.inFlightRequests.get(key);

    if (pending) {
      this.stats.dedupedRequests++;
      // Return the existing promise
      return pending.promise;
    }

    // Create new request
    const promise = fetcher().finally(() => {
      // Clean up after completion (success or failure)
      this.inFlightRequests.delete(key);
    });

    // Store the promise
    this.inFlightRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    return promise;
  }

  /**
   * Get current deduplication statistics
   */
  getStats() {
    return {
      ...this.stats,
      inFlight: this.inFlightRequests.size,
      deduplicationRate: this.stats.totalRequests > 0
        ? (this.stats.dedupedRequests / this.stats.totalRequests) * 100
        : 0
    };
  }

  /**
   * Clear all pending requests (useful for testing or cleanup)
   */
  clear() {
    this.inFlightRequests.clear();
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      dedupedRequests: 0,
      cacheHits: 0
    };
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Convenience function for deduplicating fetch requests
 * @param key - Unique key for the request
 * @param fetcher - Function that performs the fetch
 */
export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  return requestDeduplicator.dedupedFetch(key, fetcher);
}

/**
 * Get deduplication statistics
 */
export function getDeduplicationStats() {
  return requestDeduplicator.getStats();
}

export default requestDeduplicator;
