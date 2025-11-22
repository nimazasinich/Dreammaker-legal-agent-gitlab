/**
 * KuCoin Health Check Service
 * 
 * Implements health checking with:
 * - Retry logic with exponential backoff
 * - Proper error labels (KUCOIN_HEALTH_FAIL, KUCOIN_UNAVAILABLE, DISABLED_BY_CONFIG)
 * - Structured logging
 * - Status caching
 */

import { Logger } from '../core/Logger.js';
import { KuCoinFuturesService } from './KuCoinFuturesService.js';

const logger = Logger.getInstance();

interface HealthCheckResult {
  status: 'ok' | 'error';
  code?: string;
  message: string;
  data?: {
    isHealthy: boolean;
    lastCheck: number;
    latencyMs?: number;
    consecutiveFailures: number;
  };
}

interface HealthStatus {
  isHealthy: boolean;
  lastCheck: number;
  lastSuccessTime?: number;
  consecutiveFailures: number;
  cachedUntil?: number;
}

export class KuCoinHealthService {
  private static instance: KuCoinHealthService;
  private readonly logger = Logger.getInstance();
  private healthStatus: HealthStatus = {
    isHealthy: true,
    lastCheck: 0,
    consecutiveFailures: 0
  };

  // Configuration
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly CACHE_TTL = 60000; // 1 minute
  private readonly HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

  private constructor() {}

  static getInstance(): KuCoinHealthService {
    if (!KuCoinHealthService.instance) {
      KuCoinHealthService.instance = new KuCoinHealthService();
    }
    return KuCoinHealthService.instance;
  }

  /**
   * Check KuCoin health with retry logic
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    // Check if credentials are configured
    const kuCoinService = KuCoinFuturesService.getInstance();
    if (!kuCoinService.hasCredentials()) {
      this.logger.warn('DISABLED_BY_CONFIG', {
        component: 'KuCoinHealthService',
        message: 'KuCoin credentials not configured'
      });

      return {
        status: 'error',
        code: 'DISABLED_BY_CONFIG',
        message: 'KuCoin is disabled. API credentials not configured.',
        data: {
          isHealthy: false,
          lastCheck: startTime,
          consecutiveFailures: this.healthStatus.consecutiveFailures
        }
      };
    }

    // Check if we have a cached status
    if (this.healthStatus.cachedUntil && Date.now() < this.healthStatus.cachedUntil) {
      this.logger.debug('Using cached KuCoin health status', {
        isHealthy: this.healthStatus.isHealthy,
        cachedUntil: this.healthStatus.cachedUntil
      });

      return {
        status: this.healthStatus.isHealthy ? 'ok' : 'error',
        code: this.healthStatus.isHealthy ? undefined : 'KUCOIN_UNAVAILABLE',
        message: this.healthStatus.isHealthy 
          ? 'KuCoin is operational (cached)' 
          : 'KuCoin is currently unavailable (cached)',
        data: {
          isHealthy: this.healthStatus.isHealthy,
          lastCheck: this.healthStatus.lastCheck,
          consecutiveFailures: this.healthStatus.consecutiveFailures
        }
      };
    }

    // Perform health check with retry logic
    let attempts = 0;
    let lastError: any = null;
    let totalLatency = 0;

    while (attempts < this.MAX_RETRIES) {
      attempts++;
      const attemptStartTime = Date.now();

      try {
        this.logger.debug('KuCoin health check attempt', { attempt: attempts, maxRetries: this.MAX_RETRIES });

        // Simple health check: try to fetch account balance
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT);

        await kuCoinService.getAccountBalance();
        clearTimeout(timeoutId);

        const latency = Date.now() - attemptStartTime;
        totalLatency += latency;

        // Success!
        this.healthStatus = {
          isHealthy: true,
          lastCheck: Date.now(),
          lastSuccessTime: Date.now(),
          consecutiveFailures: 0,
          cachedUntil: Date.now() + this.CACHE_TTL
        };

        this.logger.info('KUCOIN_HEALTH_SUCCESS', {
          component: 'KuCoinHealthService',
          attempts,
          latencyMs: latency,
          message: 'KuCoin health check passed'
        });

        return {
          status: 'ok',
          message: 'KuCoin is operational',
          data: {
            isHealthy: true,
            lastCheck: this.healthStatus.lastCheck,
            latencyMs: latency,
            consecutiveFailures: 0
          }
        };

      } catch (error: any) {
        lastError = error;
        const latency = Date.now() - attemptStartTime;
        totalLatency += latency;

        this.logger.error('KUCOIN_HEALTH_FAIL', {
          component: 'KuCoinHealthService',
          attempt: attempts,
          maxRetries: this.MAX_RETRIES,
          latencyMs: latency,
          error: error.message,
          statusCode: error.statusCode || error.status
        }, error);

        // If this isn't the last attempt, wait before retrying
        if (attempts < this.MAX_RETRIES) {
          const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempts - 1); // Exponential backoff
          this.logger.debug('Retrying KuCoin health check', { delay, nextAttempt: attempts + 1 });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    this.healthStatus.consecutiveFailures++;
    this.healthStatus.isHealthy = false;
    this.healthStatus.lastCheck = Date.now();
    this.healthStatus.cachedUntil = Date.now() + this.CACHE_TTL;

    const avgLatency = totalLatency / attempts;

    this.logger.error('KUCOIN_UNAVAILABLE', {
      component: 'KuCoinHealthService',
      attempts,
      consecutiveFailures: this.healthStatus.consecutiveFailures,
      avgLatencyMs: avgLatency,
      lastError: lastError?.message,
      message: `KuCoin health check failed after ${attempts} attempts`
    }, lastError);

    return {
      status: 'error',
      code: 'KUCOIN_UNAVAILABLE',
      message: `KuCoin is currently unavailable. Health check failed after ${attempts} retries.`,
      data: {
        isHealthy: false,
        lastCheck: this.healthStatus.lastCheck,
        latencyMs: avgLatency,
        consecutiveFailures: this.healthStatus.consecutiveFailures
      }
    };
  }

  /**
   * Get current health status (cached)
   */
  getStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Clear cached health status (force re-check on next call)
   */
  clearCache(): void {
    this.healthStatus.cachedUntil = undefined;
    this.logger.info('Cleared KuCoin health cache');
  }

  /**
   * Reset consecutive failures counter
   */
  resetFailures(): void {
    this.healthStatus.consecutiveFailures = 0;
    this.logger.info('Reset KuCoin consecutive failures counter');
  }
}

export const kuCoinHealthService = KuCoinHealthService.getInstance();
