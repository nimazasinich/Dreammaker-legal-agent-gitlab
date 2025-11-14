/**
 * Provider Recovery Tracker
 *
 * Tracks success/failure rates and recovery status for each data provider
 * (HuggingFace, Binance, KuCoin)
 */

import { ProviderName } from './providerLatencyTracker.js';

interface RecoveryStats {
  provider: ProviderName;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number; // percentage
  failureRate: number; // percentage
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastStatus: 'success' | 'failure' | 'unknown';
  isHealthy: boolean;
  lastSuccessTime?: string;
  lastFailureTime?: string;
  uptime: number; // percentage based on recent attempts
}

class ProviderRecoveryTracker {
  private static instance: ProviderRecoveryTracker;
  private stats: Map<ProviderName, {
    total: number;
    success: number;
    failed: number;
    consecutiveFailures: number;
    consecutiveSuccesses: number;
    lastStatus: 'success' | 'failure' | 'unknown';
    lastSuccessTime?: Date;
    lastFailureTime?: Date;
  }> = new Map();

  private readonly HEALTH_THRESHOLD = 3; // Mark as unhealthy after 3 consecutive failures

  private constructor() {
    // Initialize tracking for each provider
    const providers: ProviderName[] = ['huggingface', 'binance', 'kucoin'];
    providers.forEach(provider => {
      this.stats.set(provider, {
        total: 0,
        success: 0,
        failed: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastStatus: 'unknown',
      });
    });
  }

  static getInstance(): ProviderRecoveryTracker {
    if (!ProviderRecoveryTracker.instance) {
      ProviderRecoveryTracker.instance = new ProviderRecoveryTracker();
    }
    return ProviderRecoveryTracker.instance;
  }

  /**
   * Record a successful request
   */
  recordSuccess(provider: ProviderName): void {
    const stats = this.stats.get(provider);
    if (!stats) return;

    stats.total++;
    stats.success++;
    stats.consecutiveSuccesses++;
    stats.consecutiveFailures = 0;
    stats.lastStatus = 'success';
    stats.lastSuccessTime = new Date();

    this.stats.set(provider, stats);
  }

  /**
   * Record a failed request
   */
  recordFailure(provider: ProviderName): void {
    const stats = this.stats.get(provider);
    if (!stats) return;

    stats.total++;
    stats.failed++;
    stats.consecutiveFailures++;
    stats.consecutiveSuccesses = 0;
    stats.lastStatus = 'failure';
    stats.lastFailureTime = new Date();

    this.stats.set(provider, stats);
  }

  /**
   * Get recovery statistics for a provider
   */
  getStats(provider: ProviderName): RecoveryStats {
    const stats = this.stats.get(provider);
    if (!stats || stats.total === 0) {
      return {
        provider,
        totalAttempts: 0,
        successfulAttempts: 0,
        failedAttempts: 0,
        successRate: 0,
        failureRate: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        lastStatus: 'unknown',
        isHealthy: true,
        uptime: 0
      };
    }

    const successRate = (stats.success / stats.total) * 100;
    const failureRate = (stats.failed / stats.total) * 100;
    const isHealthy = stats.consecutiveFailures < this.HEALTH_THRESHOLD;

    return {
      provider,
      totalAttempts: stats.total,
      successfulAttempts: stats.success,
      failedAttempts: stats.failed,
      successRate: Math.round(successRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      consecutiveFailures: stats.consecutiveFailures,
      consecutiveSuccesses: stats.consecutiveSuccesses,
      lastStatus: stats.lastStatus,
      isHealthy,
      lastSuccessTime: stats.lastSuccessTime?.toISOString(),
      lastFailureTime: stats.lastFailureTime?.toISOString(),
      uptime: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Get all provider statistics
   */
  getAllStats(): RecoveryStats[] {
    const providers: ProviderName[] = ['huggingface', 'binance', 'kucoin'];
    return providers.map(provider => this.getStats(provider));
  }

  /**
   * Check if a provider is healthy
   */
  isHealthy(provider: ProviderName): boolean {
    const stats = this.stats.get(provider);
    if (!stats) return true;
    return stats.consecutiveFailures < this.HEALTH_THRESHOLD;
  }

  /**
   * Get recovery rate (from failure to success)
   */
  getRecoveryRate(provider: ProviderName): number {
    const stats = this.stats.get(provider);
    if (!stats || stats.total === 0) return 0;

    // Recovery rate is the percentage of times the provider recovered after a failure
    // For simplicity, we use the success rate as a proxy
    return (stats.success / stats.total) * 100;
  }

  /**
   * Clear statistics for a provider
   */
  clearStats(provider: ProviderName): void {
    this.stats.set(provider, {
      total: 0,
      success: 0,
      failed: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastStatus: 'unknown',
    });
  }

  /**
   * Clear all statistics
   */
  clearAllStats(): void {
    const providers: ProviderName[] = ['huggingface', 'binance', 'kucoin'];
    providers.forEach(provider => this.clearStats(provider));
  }
}

// Export singleton instance
export const providerRecoveryTracker = ProviderRecoveryTracker.getInstance();
