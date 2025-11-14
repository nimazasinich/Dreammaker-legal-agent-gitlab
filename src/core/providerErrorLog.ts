/**
 * Provider Error Log
 *
 * Tracks and stores error messages for each data provider
 * Keeps the last 20 errors in memory for diagnostics
 */

import { ProviderName } from './providerLatencyTracker.js';

export interface ProviderError {
  provider: ProviderName;
  timestamp: string;
  message: string;
  endpoint?: string;
  statusCode?: number;
  details?: any;
}

interface ProviderErrorStats {
  provider: ProviderName;
  totalErrors: number;
  lastError?: ProviderError;
  recentErrors: ProviderError[];
}

class ProviderErrorLog {
  private static instance: ProviderErrorLog;
  private errors: Map<ProviderName, ProviderError[]> = new Map();
  private readonly MAX_ERRORS = 20; // Keep last 20 errors per provider

  private constructor() {
    // Initialize error logs for each provider
    this.errors.set('huggingface', []);
    this.errors.set('binance', []);
    this.errors.set('kucoin', []);
  }

  static getInstance(): ProviderErrorLog {
    if (!ProviderErrorLog.instance) {
      ProviderErrorLog.instance = new ProviderErrorLog();
    }
    return ProviderErrorLog.instance;
  }

  /**
   * Log an error for a provider
   */
  logError(
    provider: ProviderName,
    message: string,
    endpoint?: string,
    statusCode?: number,
    details?: any
  ): void {
    const error: ProviderError = {
      provider,
      timestamp: new Date().toISOString(),
      message,
      endpoint,
      statusCode,
      details
    };

    const providerErrors = this.errors.get(provider) || [];
    providerErrors.push(error);

    // Keep only the last MAX_ERRORS
    if (providerErrors.length > this.MAX_ERRORS) {
      providerErrors.shift();
    }

    this.errors.set(provider, providerErrors);
  }

  /**
   * Get error statistics for a provider
   */
  getStats(provider: ProviderName): ProviderErrorStats {
    const errors = this.errors.get(provider) || [];

    return {
      provider,
      totalErrors: errors.length,
      lastError: errors.length > 0 ? errors[errors.length - 1] : undefined,
      recentErrors: [...errors] // Return a copy
    };
  }

  /**
   * Get all provider error statistics
   */
  getAllStats(): ProviderErrorStats[] {
    const providers: ProviderName[] = ['huggingface', 'binance', 'kucoin'];
    return providers.map(provider => this.getStats(provider));
  }

  /**
   * Get recent errors for a provider (limit to N most recent)
   */
  getRecentErrors(provider: ProviderName, limit: number = 10): ProviderError[] {
    const errors = this.errors.get(provider) || [];
    return errors.slice(-limit);
  }

  /**
   * Get last error for a provider
   */
  getLastError(provider: ProviderName): ProviderError | undefined {
    const errors = this.errors.get(provider) || [];
    return errors.length > 0 ? errors[errors.length - 1] : undefined;
  }

  /**
   * Clear errors for a provider
   */
  clearErrors(provider: ProviderName): void {
    this.errors.set(provider, []);
  }

  /**
   * Clear all errors
   */
  clearAllErrors(): void {
    this.errors.set('huggingface', []);
    this.errors.set('binance', []);
    this.errors.set('kucoin', []);
  }

  /**
   * Get error count for a provider
   */
  getErrorCount(provider: ProviderName): number {
    const errors = this.errors.get(provider) || [];
    return errors.length;
  }

  /**
   * Check if provider has recent errors (in last N minutes)
   */
  hasRecentErrors(provider: ProviderName, minutesAgo: number = 5): boolean {
    const errors = this.errors.get(provider) || [];
    if (errors.length === 0) return false;

    const lastError = errors[errors.length - 1];
    const lastErrorTime = new Date(lastError.timestamp).getTime();
    const thresholdTime = Date.now() - (minutesAgo * 60 * 1000);

    return lastErrorTime > thresholdTime;
  }
}

// Export singleton instance
export const providerErrorLog = ProviderErrorLog.getInstance();
