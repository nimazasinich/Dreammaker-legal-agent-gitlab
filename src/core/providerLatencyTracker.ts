/**
 * Provider Latency Tracker
 *
 * Tracks response times and latency statistics for each data provider
 * (HuggingFace, Binance, KuCoin)
 */

export type ProviderName = 'huggingface' | 'binance' | 'kucoin';

interface LatencyStats {
  provider: ProviderName;
  avgLatency: number; // in milliseconds
  minLatency: number;
  maxLatency: number;
  lastLatency: number;
  totalRequests: number;
  lastUpdated: string;
}

class ProviderLatencyTracker {
  private static instance: ProviderLatencyTracker;
  private latencies: Map<ProviderName, number[]> = new Map();
  private readonly MAX_SAMPLES = 100; // Keep last 100 samples

  private constructor() {
    // Initialize tracking for each provider
    this.latencies.set('huggingface', []);
    this.latencies.set('binance', []);
    this.latencies.set('kucoin', []);
  }

  static getInstance(): ProviderLatencyTracker {
    if (!ProviderLatencyTracker.instance) {
      ProviderLatencyTracker.instance = new ProviderLatencyTracker();
    }
    return ProviderLatencyTracker.instance;
  }

  /**
   * Record a latency measurement for a provider
   */
  recordLatency(provider: ProviderName, latencyMs: number): void {
    const samples = this.latencies.get(provider) || [];

    samples.push(latencyMs);

    // Keep only the last MAX_SAMPLES
    if (samples.length > this.MAX_SAMPLES) {
      samples.shift();
    }

    this.latencies.set(provider, samples);
  }

  /**
   * Get latency statistics for a provider
   */
  getStats(provider: ProviderName): LatencyStats {
    const samples = this.latencies.get(provider) || [];

    if (samples.length === 0) {
      return {
        provider,
        avgLatency: 0,
        minLatency: 0,
        maxLatency: 0,
        lastLatency: 0,
        totalRequests: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const sum = samples.reduce((acc, val) => acc + val, 0);
    const avg = sum / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const last = samples[samples.length - 1];

    return {
      provider,
      avgLatency: Math.round(avg),
      minLatency: Math.round(min),
      maxLatency: Math.round(max),
      lastLatency: Math.round(last),
      totalRequests: samples.length,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Get all provider statistics
   */
  getAllStats(): LatencyStats[] {
    const providers: ProviderName[] = ['huggingface', 'binance', 'kucoin'];
    return providers.map(provider => this.getStats(provider));
  }

  /**
   * Clear latency data for a provider
   */
  clearStats(provider: ProviderName): void {
    this.latencies.set(provider, []);
  }

  /**
   * Clear all latency data
   */
  clearAllStats(): void {
    this.latencies.set('huggingface', []);
    this.latencies.set('binance', []);
    this.latencies.set('kucoin', []);
  }

  /**
   * Utility to measure and record latency automatically
   */
  async measure<T>(
    provider: ProviderName,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const endTime = Date.now();
      this.recordLatency(provider, endTime - startTime);
      return result;
    } catch (error) {
      const endTime = Date.now();
      this.recordLatency(provider, endTime - startTime);
      throw error;
    }
  }
}

// Export singleton instance
export const providerLatencyTracker = ProviderLatencyTracker.getInstance();
