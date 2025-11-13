/**
 * Enhanced Multi-Source API Client
 *
 * Features:
 * - Load balancing across multiple API sources
 * - Automatic failover with health tracking
 * - Round-robin distribution to prevent rate limiting
 * - Smart caching with TTL
 * - CORS proxy fallback support
 * - Real-time health monitoring
 *
 * Based on api-config-complete.txt
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Logger } from '../core/Logger.js';
import { TTLCache } from '../utils/cache.js';
import { CORSProxyService } from './CORSProxyService.js';
import type { APIConfig } from '../config/CentralizedAPIConfig.js';

export interface APIHealth {
  provider: string;
  healthy: boolean;
  lastSuccess: number;
  lastFailure: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
}

export interface LoadBalancerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  providerStats: Map<string, APIHealth>;
}

/**
 * Enhanced API Client with load balancing and health tracking
 */
export class EnhancedAPIClient {
  private logger = Logger.getInstance();
  private corsProxy = CORSProxyService.getInstance();

  // Provider health tracking
  private healthMap = new Map<string, APIHealth>();

  // Round-robin counters per category
  private roundRobinCounters = new Map<string, number>();

  // Request cache
  private cache: TTLCache<any>;

  // Axios instances per provider
  private clients = new Map<string, AxiosInstance>();

  // Stats
  private stats: LoadBalancerStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    providerStats: new Map()
  };

  constructor(
    private cacheTTL: number = 60000, // 1 minute default
    private maxConsecutiveFailures: number = 3,
    private healthCheckInterval: number = 60000 // 1 minute
  ) {
    this.cache = new TTLCache<any>(cacheTTL);

    // Start health check interval
    setInterval(() => this.cleanupUnhealthyProviders(), this.healthCheckInterval);
  }

  /**
   * Initialize Axios client for a provider
   */
  private getOrCreateClient(config: APIConfig): AxiosInstance {
    const key = `${config.name}-${config.baseUrl}`;

    if (!this.clients.has(key)) {
      const axiosConfig: AxiosRequestConfig = {
        baseURL: config.baseUrl,
        timeout: config.timeout || 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      };

      // Add API key header if needed
      if (config.headerKey && config.key) {
        axiosConfig.headers![config.headerKey] = config.key;
      }

      this.clients.set(key, axios.create(axiosConfig));
    }

    return this.clients.get(key)!;
  }

  /**
   * Get or initialize provider health
   */
  private getOrCreateProviderHealth(providerName: string): APIHealth {
    if (!this.healthMap.has(providerName)) {
      this.healthMap.set(providerName, {
        provider: providerName,
        healthy: true,
        lastSuccess: Date.now(),
        lastFailure: 0,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successRate: 100
      });
    }
    return this.healthMap.get(providerName)!;
  }

  /**
   * Record successful request
   */
  private recordSuccess(providerName: string, responseTime: number): void {
    const health = this.getOrCreateProviderHealth(providerName);

    health.healthy = true;
    health.lastSuccess = Date.now();
    health.consecutiveFailures = 0;
    health.totalRequests++;

    // Update average response time (exponential moving average)
    health.averageResponseTime = health.averageResponseTime === 0
      ? responseTime
      : (health.averageResponseTime * 0.7) + (responseTime * 0.3);

    // Update success rate
    const successCount = Math.round(health.successRate * health.totalRequests / 100);
    health.successRate = ((successCount + 1) / health.totalRequests) * 100;

    this.stats.successfulRequests++;
    this.stats.providerStats.set(providerName, health);
  }

  /**
   * Record failed request
   */
  private recordFailure(providerName: string, error: Error): void {
    const health = this.getOrCreateProviderHealth(providerName);

    health.lastFailure = Date.now();
    health.consecutiveFailures++;
    health.totalRequests++;

    // Mark as unhealthy if too many consecutive failures
    if (health.consecutiveFailures >= this.maxConsecutiveFailures) {
      health.healthy = false;
      this.logger.warn(`Provider ${providerName} marked as unhealthy`, {
        consecutiveFailures: health.consecutiveFailures,
        error: error.message
      });
    }

    // Update success rate
    const successCount = Math.round(health.successRate * health.totalRequests / 100);
    health.successRate = (successCount / health.totalRequests) * 100;

    this.stats.failedRequests++;
    this.stats.providerStats.set(providerName, health);
  }

  /**
   * Get next provider using round-robin with health filtering
   */
  private getNextProvider(
    category: string,
    providers: APIConfig[],
    onlyHealthy: boolean = true
  ): APIConfig | null {
    // Filter healthy providers if requested
    let availableProviders = providers;
    if (onlyHealthy) {
      availableProviders = providers.filter(p => {
        const health = this.getProviderHealth(p.name);
        return health && health.healthy && (p.enabled !== false);
      });
    }

    if (availableProviders.length === 0) {
      // If no healthy providers, try all providers as last resort
      if (onlyHealthy) {
        this.logger.warn(`No healthy providers in category ${category}, trying all`);
        return this.getNextProvider(category, providers, false);
      }
      return null;
    }

    // Get current counter
    const counter = this.roundRobinCounters.get(category) || 0;
    const index = counter % availableProviders.length;

    // Update counter
    this.roundRobinCounters.set(category, counter + 1);

    return availableProviders[index];
  }

  /**
   * Fetch with automatic provider selection and failover
   */
  async fetchWithLoadBalancing(
    category: string,
    primary: APIConfig,
    fallbacks: APIConfig[],
    endpoint: string,
    params: Record<string, any> = {},
    options: {
      method?: 'GET' | 'POST';
      data?: any;
      useCache?: boolean;
      cacheTTL?: number;
      retryCount?: number;
    } = {}
  ): Promise<any> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Build cache key
    const cacheKey = `${category}-${endpoint}-${JSON.stringify(params)}`;

    // Check cache if enabled
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached data', { category, endpoint });
        return cached;
      }
    }

    // All providers (primary + fallbacks)
    const allProviders = [primary, ...fallbacks];

    // Try providers in round-robin order
    const maxRetries = options.retryCount || allProviders.length;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const provider = this.getNextProvider(category, allProviders);

      if (!provider) {
        this.logger.error('No available providers', { category });
        break;
      }

      try {
        this.logger.debug(`Trying provider ${provider.name}`, {
          category,
          endpoint,
          attempt: attempt + 1,
          maxRetries
        });

        const result = await this.makeRequest(provider, endpoint, params, options);

        // Record success
        const responseTime = Date.now() - startTime;
        this.recordSuccess(provider.name, responseTime);

        // Update global stats
        this.stats.averageResponseTime = this.stats.averageResponseTime === 0
          ? responseTime
          : (this.stats.averageResponseTime * 0.7) + (responseTime * 0.3);

        // Cache result
        if (options.useCache !== false) {
          this.cache.set(cacheKey, result);
        }

        this.logger.debug(`Success with provider ${provider.name}`, {
          category,
          responseTime,
          attempt: attempt + 1
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        this.recordFailure(provider.name, lastError);

        this.logger.warn(`Provider ${provider.name} failed`, {
          category,
          endpoint,
          attempt: attempt + 1,
          error: lastError.message
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    this.logger.error('All providers failed', {
      category,
      endpoint,
      retriesAttempted: maxRetries,
      lastError: lastError?.message
    });

    console.error(`All providers failed for ${category}/${endpoint}: ${lastError?.message}`);
  }

  /**
   * Make request to a specific provider
   */
  private async makeRequest(
    config: APIConfig,
    endpoint: string,
    params: Record<string, any>,
    options: {
      method?: 'GET' | 'POST';
      data?: any;
    }
  ): Promise<any> {
    const method = options.method || config.method || 'GET';

    // Build URL
    let url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`;

    // Add API key to params if needed (for query string auth)
    const queryParams = { ...params };
    if (config.key && !config.headerKey) {
      queryParams.apikey = config.key;
    }

    // Add query parameters
    if (Object.keys(queryParams).length > 0 && method === 'GET') {
      const searchParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        searchParams.append(key, String(value));
      });
      url += (url.includes('?') ? '&' : '?') + searchParams.toString();
    }

    // Use CORS proxy if needed
    if (config.needsProxy) {
      return await this.corsProxy.fetchWithProxy(url, {
        method,
        headers: config.headerKey && config.key ? {
          [config.headerKey]: config.key
        } : undefined,
        body: method === 'POST' ? JSON.stringify(options.data || queryParams) : undefined
      });
    }

    // Direct request
    const client = this.getOrCreateClient(config);

    if (method === 'POST') {
      const response = await client.post(endpoint, options.data || queryParams);
      return response.data;
    } else {
      const response = await client.get(endpoint, { params: queryParams });
      return response.data;
    }
  }

  /**
   * Get provider health status
   */
  getProviderHealth(providerName: string): APIHealth | undefined {
    return this.healthMap.get(providerName);
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): APIHealth[] {
    return Array.from(this.healthMap.values());
  }

  /**
   * Get load balancer statistics
   */
  getStats(): LoadBalancerStats {
    return {
      ...this.stats,
      providerStats: new Map(this.stats.providerStats)
    };
  }

  /**
   * Reset provider health (useful for testing or manual recovery)
   */
  resetProviderHealth(providerName?: string): void {
    if (providerName) {
      this.healthMap.delete(providerName);
      this.logger.info(`Reset health for provider: ${providerName}`);
    } else {
      this.healthMap.clear();
      this.logger.info('Reset health for all providers');
    }
  }

  /**
   * Cleanup unhealthy providers that have been down for too long
   */
  private cleanupUnhealthyProviders(): void {
    const now = Date.now();
    const recoveryTime = 5 * 60 * 1000; // 5 minutes

    this.healthMap.forEach((health, providerName) => {
      if (!health.healthy && (now - health.lastFailure) > recoveryTime) {
        // Reset consecutive failures to give it another chance
        health.consecutiveFailures = 0;
        health.healthy = true;

        this.logger.info(`Provider ${providerName} eligible for recovery`, {
          timeSinceLastFailure: now - health.lastFailure
        });
      }
    });
  }

  /**
   * Clear cache
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      ttl: this.cacheTTL
    };
  }
}
