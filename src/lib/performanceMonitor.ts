/**
 * Performance Monitor - Track and analyze performance metrics
 *
 * Features:
 * - Measure function execution time
 * - Track API response times
 * - Monitor component render time
 * - Calculate percentiles (p50, p95, p99)
 * - Export metrics for analysis
 *
 * @example
 * ```ts
 * // Measure a function
 * const result = await performanceMonitor.measure('fetchOHLC', async () => {
 *   return await fetchOHLC(symbol, timeframe);
 * });
 *
 * // Get stats
 * const stats = performanceMonitor.getStats('fetchOHLC');
 * console.log(`Average: ${stats.avg}ms, p95: ${stats.p95}ms`);
 * ```
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface PerformanceStats {
  name: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  recentMeasurements: PerformanceMetric[];
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>();
  private maxMetricsPerName = 100; // Keep last 100 measurements per metric

  /**
   * Measure execution time of a function
   * @param name - Metric name
   * @param fn - Function to measure
   * @param tags - Optional tags for categorization
   * @returns Result of the function
   */
  async measure<T>(
    name: string,
    fn: () => T | Promise<T>,
    tags?: Record<string, string>
  ): Promise<T> {
    const startMark = `${name}-start-${Date.now()}`;
    const endMark = `${name}-end-${Date.now()}`;

    // Use Performance API if available
    if (typeof performance !== 'undefined') {
      performance.mark(startMark);
    }

    const start = Date.now();

    try {
      const result = await fn();
      const duration = Date.now() - start;

      if (typeof performance !== 'undefined') {
        performance.mark(endMark);
        try {
          performance.measure(name, startMark, endMark);
        } catch {
          // Ignore measure errors
        }
      }

      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        tags
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.recordMetric({
        name: `${name}-error`,
        duration,
        timestamp: Date.now(),
        tags: { ...tags, error: 'true' }
      });

      throw error;
    }
  }

  /**
   * Measure execution time synchronously
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    tags?: Record<string, string>
  ): T {
    const start = Date.now();

    try {
      const result = fn();
      const duration = Date.now() - start;

      this.recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        tags
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      this.recordMetric({
        name: `${name}-error`,
        duration,
        timestamp: Date.now(),
        tags: { ...tags, error: 'true' }
      });

      throw error;
    }
  }

  /**
   * Record a metric manually
   */
  recordMetric(metric: PerformanceMetric): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);

    // Keep only last N measurements
    if (metrics.length > this.maxMetricsPerName) {
      metrics.shift();
    }

    this.metrics.set(metric.name, metrics);

    // Log in development
    if (import.meta.env.DEV) {
      const emoji = metric.duration > 1000 ? '🐌' : metric.duration > 500 ? '⚠️' : '⚡';
      console.log(
        `${emoji} [Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`,
        metric.tags ? metric.tags : ''
      );
    }
  }

  /**
   * Get statistics for a specific metric
   */
  getStats(name: string): PerformanceStats | null {
    const metrics = this.metrics.get(name);

    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);

    const sum = durations.reduce((acc, d) => acc + d, 0);
    const count = durations.length;
    const avg = sum / count;
    const min = durations[0];
    const max = durations[count - 1];
    const median = this.percentile(durations, 50);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);

    return {
      name,
      count,
      min,
      max,
      avg,
      median,
      p95,
      p99,
      recentMeasurements: metrics.slice(-10)
    };
  }

  /**
   * Get all metric names
   */
  getAllMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Get summary of all metrics
   */
  getAllStats(): Record<string, PerformanceStats> {
    const stats: Record<string, PerformanceStats> = {};

    this.metrics.forEach((_, name) => {
      const metricStats = this.getStats(name);
      if (metricStats) {
        stats[name] = metricStats;
      }
    });

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();

    // Clear Performance API marks and measures
    if (typeof performance !== 'undefined') {
      try {
        performance.clearMarks();
        performance.clearMeasures();
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Clear metrics for a specific name
   */
  clearMetric(name: string): void {
    this.metrics.delete(name);
  }

  /**
   * Calculate percentile
   */
  private percentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: Object.fromEntries(this.metrics),
      stats: this.getAllStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    slowOperations: Array<{ name: string; avgDuration: number }>;
    fastOperations: Array<{ name: string; avgDuration: number }>;
  } {
    const allStats = this.getAllStats();
    const statsArray = Object.values(allStats);

    // Sort by average duration
    const sorted = statsArray.sort((a, b) => b.avg - a.avg);

    return {
      totalMetrics: statsArray.length,
      slowOperations: sorted
        .slice(0, 5)
        .map(s => ({ name: s.name, avgDuration: s.avg })),
      fastOperations: sorted
        .slice(-5)
        .reverse()
        .map(s => ({ name: s.name, avgDuration: s.avg }))
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Convenience function to measure performance
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  return performanceMonitor.measure(name, fn, tags);
}

/**
 * Get performance stats
 */
export function getPerformanceStats(name: string): PerformanceStats | null {
  return performanceMonitor.getStats(name);
}

export default performanceMonitor;
