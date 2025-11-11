// src/services/ResourceMonitorService.ts
/**
 * Resource Monitor Service - نظارت و کنترل هوشمند منابع
 * 
 * این سرویس:
 * - استفاده از منابع API را ردیابی می‌کند
 * - اولویت‌بندی هوشمند منابع را مدیریت می‌کند
 * - از منابع رایگان بیشتر استفاده می‌کند
 * - از منابع محدود کمتر استفاده می‌کند
 * - Cache را بهینه می‌کند
 */

import { Logger } from '../core/Logger.js';

export interface ResourceUsage {
  provider: string;
  requests: number;
  successes: number;
  failures: number;
  lastUsed: number;
  averageResponseTime: number;
  quotaUsed?: number;
  quotaLimit?: number;
  isFree: boolean;
  priority: number; // Higher = more preferred
}

export interface ResourceStats {
  totalRequests: number;
  totalSuccesses: number;
  totalFailures: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  resources: Map<string, ResourceUsage>;
}

export class ResourceMonitorService {
  private static instance: ResourceMonitorService;
  private logger = Logger.getInstance();
  
  // Resource usage tracking
  private resourceUsage = new Map<string, ResourceUsage>();
  
  // Cache statistics
  private cacheStats = {
    hits: 0,
    misses: 0
  };
  
  // Response time tracking
  private responseTimes = new Map<string, number[]>();
  
  // Resource priorities (higher = more preferred)
  private resourcePriorities: Map<string, number> = new Map([
    // Free providers - highest priority
    ['coingecko', 100],
    ['coincap', 95],
    ['coinpaprika', 90],
    ['binance', 85],
    ['coinlore', 80],
    ['cryptocompare', 75],
    ['nomics', 70],
    ['messari', 65],
    ['huggingface', 60],
    
    // Paid/limited providers - lower priority
    ['coinmarketcap', 10], // DISABLED but tracked
    ['coinmarketcap_2', 10], // DISABLED but tracked
  ]);

  private constructor() {
    this.initializeResources();
  }

  static getInstance(): ResourceMonitorService {
    if (!ResourceMonitorService.instance) {
      ResourceMonitorService.instance = new ResourceMonitorService();
    }
    return ResourceMonitorService.instance;
  }

  /**
   * Initialize resource tracking
   */
  private initializeResources(): void {
    const freeProviders = ['coingecko', 'coincap', 'coinpaprika', 'binance', 'coinlore', 'cryptocompare', 'nomics', 'messari', 'huggingface'];
    const paidProviders = ['coinmarketcap', 'coinmarketcap_2'];

    freeProviders.forEach(provider => {
      this.resourceUsage.set(provider, {
        provider,
        requests: 0,
        successes: 0,
        failures: 0,
        lastUsed: 0,
        averageResponseTime: 0,
        isFree: true,
        priority: this.resourcePriorities.get(provider) || 50
      });
    });

    paidProviders.forEach(provider => {
      this.resourceUsage.set(provider, {
        provider,
        requests: 0,
        successes: 0,
        failures: 0,
        lastUsed: 0,
        averageResponseTime: 0,
        isFree: false,
        priority: this.resourcePriorities.get(provider) || 10,
        quotaUsed: 0,
        quotaLimit: 0
      });
    });
  }

  /**
   * Track API request
   */
  trackRequest(provider: string, startTime: number): void {
    const resource = this.resourceUsage.get(provider.toLowerCase());
    if (!resource) {
      // Auto-register unknown provider
      this.resourceUsage.set(provider.toLowerCase(), {
        provider: provider.toLowerCase(),
        requests: 1,
        successes: 0,
        failures: 0,
        lastUsed: Date.now(),
        averageResponseTime: 0,
        isFree: true,
        priority: 50
      });
      return;
    }

    resource.requests++;
    resource.lastUsed = Date.now();
  }

  /**
   * Track successful response
   */
  trackSuccess(provider: string, startTime: number): void {
    const resource = this.resourceUsage.get(provider.toLowerCase());
    if (!resource) return;

    const responseTime = Date.now() - startTime;
    resource.successes++;
    resource.lastUsed = Date.now();

    // Update average response time
    const times = this.responseTimes.get(provider.toLowerCase()) || [];
    times.push(responseTime);
    if (times.length > 100) times.shift(); // Keep last 100
    this.responseTimes.set(provider.toLowerCase(), times);
    
    resource.averageResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Track failed response
   */
  trackFailure(provider: string, startTime: number, error?: any): void {
    const resource = this.resourceUsage.get(provider.toLowerCase());
    if (!resource) return;

    resource.failures++;
    resource.lastUsed = Date.now();

    // Log error details
    if (error) {
      const statusCode = error.response?.status || error.status;
      if (statusCode === 429) {
        this.logger.warn(`Rate limit hit for ${provider}`, { provider });
      } else if (statusCode === 401) {
        this.logger.warn(`Authentication failed for ${provider}`, { provider });
      }
    }
  }

  /**
   * Track cache hit
   */
  trackCacheHit(): void {
    this.cacheStats.hits++;
  }

  /**
   * Track cache miss
   */
  trackCacheMiss(): void {
    this.cacheStats.misses++;
  }

  /**
   * Get recommended provider order based on usage and priority
   */
  getRecommendedProviders(category: 'market' | 'news' | 'sentiment' | 'onchain' = 'market'): string[] {
    const providers = Array.from(this.resourceUsage.values())
      .filter(r => {
        // Filter by category
        if (category === 'market') {
          return ['coingecko', 'coincap', 'coinpaprika', 'binance', 'coinlore', 'cryptocompare', 'nomics', 'messari', 'coinmarketcap', 'coinmarketcap_2'].includes(r.provider);
        }
        // Add more category filters as needed
        return true;
      })
      .filter(r => {
        // Skip disabled providers
        if (r.provider.includes('coinmarketcap')) {
          return false; // CoinMarketCap is disabled
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by:
        // 1. Success rate (higher is better)
        // 2. Priority (higher is better)
        // 3. Average response time (lower is better)
        // 4. Free providers first
        
        const aSuccessRate = a.requests > 0 ? a.successes / a.requests : 0;
        const bSuccessRate = b.requests > 0 ? b.successes / b.requests : 0;
        
        // Free providers get bonus
        const aScore = (aSuccessRate * 100) + (a.isFree ? 50 : 0) + a.priority - (a.averageResponseTime / 10);
        const bScore = (bSuccessRate * 100) + (b.isFree ? 50 : 0) + b.priority - (b.averageResponseTime / 10);
        
        return bScore - aScore;
      })
      .map(r => r.provider);

    return providers;
  }

  /**
   * Check if provider should be used (based on quota and failures)
   */
  shouldUseProvider(provider: string): boolean {
    const resource = this.resourceUsage.get(provider.toLowerCase());
    if (!resource) return true;

    // Skip disabled providers
    if (provider.includes('coinmarketcap')) {
      return false;
    }

    // Don't use if failure rate is too high (>50%)
    if (resource.requests > 10) {
      const failureRate = resource.failures / resource.requests;
      if (failureRate > 0.5) {
        this.logger.warn(`Provider ${provider} has high failure rate: ${(failureRate * 100).toFixed(1)}%`);
        return false;
      }
    }

    // Check quota limits (if applicable)
    if (resource.quotaLimit && resource.quotaUsed) {
      const quotaUsage = resource.quotaUsed / resource.quotaLimit;
      if (quotaUsage > 0.9) {
        this.logger.warn(`Provider ${provider} quota nearly exhausted: ${(quotaUsage * 100).toFixed(1)}%`);
        return false;
      }
    }

    return true;
  }

  /**
   * Get resource statistics
   */
  getStats(): ResourceStats {
    const resources = new Map(this.resourceUsage);
    
    const totalRequests = Array.from(resources.values())
      .reduce((sum, r) => sum + r.requests, 0);
    
    const totalSuccesses = Array.from(resources.values())
      .reduce((sum, r) => sum + r.successes, 0);
    
    const totalFailures = Array.from(resources.values())
      .reduce((sum, r) => sum + r.failures, 0);
    
    const avgResponseTime = Array.from(resources.values())
      .filter(r => r.averageResponseTime > 0)
      .reduce((sum, r) => sum + r.averageResponseTime, 0) / 
      Array.from(resources.values()).filter(r => r.averageResponseTime > 0).length || 0;

    return {
      totalRequests,
      totalSuccesses,
      totalFailures,
      cacheHits: this.cacheStats.hits,
      cacheMisses: this.cacheStats.misses,
      averageResponseTime: avgResponseTime || 0,
      resources
    };
  }

  /**
   * Get provider health status
   */
  getProviderHealth(provider: string): {
    healthy: boolean;
    successRate: number;
    averageResponseTime: number;
    recommendations: string[];
  } {
    const resource = this.resourceUsage.get(provider.toLowerCase());
    if (!resource) {
      return {
        healthy: false,
        successRate: 0,
        averageResponseTime: 0,
        recommendations: ['Provider not tracked']
      };
    }

    const successRate = resource.requests > 0 
      ? resource.successes / resource.requests 
      : 0;
    
    const healthy = successRate > 0.7 && resource.averageResponseTime < 5000;
    
    const recommendations: string[] = [];
    if (successRate < 0.7) {
      recommendations.push('Low success rate - consider using alternative providers');
    }
    if (resource.averageResponseTime > 5000) {
      recommendations.push('Slow response time - consider caching');
    }
    if (resource.failures > resource.successes) {
      recommendations.push('High failure rate - provider may be unavailable');
    }

    return {
      healthy,
      successRate,
      averageResponseTime: resource.averageResponseTime,
      recommendations
    };
  }

  /**
   * Reset statistics (for testing or periodic cleanup)
   */
  resetStats(): void {
    this.resourceUsage.forEach(resource => {
      resource.requests = 0;
      resource.successes = 0;
      resource.failures = 0;
      resource.averageResponseTime = 0;
    });
    this.cacheStats.hits = 0;
    this.cacheStats.misses = 0;
    this.responseTimes.clear();
    this.logger.info('Resource statistics reset');
  }

  /**
   * Update quota usage (for providers with quota limits)
   */
  updateQuota(provider: string, used: number, limit: number): void {
    const resource = this.resourceUsage.get(provider.toLowerCase());
    if (resource) {
      resource.quotaUsed = used;
      resource.quotaLimit = limit;
    }
  }

  /**
   * Get cache efficiency
   */
  getCacheEfficiency(): number {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    if (total === 0) return 0;
    return (this.cacheStats.hits / total) * 100;
  }
}

