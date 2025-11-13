/**
 * Centralized API Manager
 * مدیریت متمرکز API ها با سیستم fallback پیشرفته
 * 
 * Features:
 * - Automatic fallback chain
 * - CORS proxy management
 * - Rate limiting
 * - Caching
 * - Never fails - always has alternatives
 */

import { Logger } from '../core/Logger.js';
import { CentralizedAPIConfig, APIConfig, APICategory, CORSProxy } from '../config/CentralizedAPIConfig.js';
import { TTLCache } from '../utils/cache.js';
import { TokenBucket } from '../utils/rateLimiter.js';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'GRAPHQL';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  useProxy?: boolean;
  retries?: number;
}

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  source: string;
  error?: string;
  timestamp: number;
}

interface RateLimiterMap {
  [key: string]: TokenBucket;
}

export class CentralizedAPIManager {
  private static instance: CentralizedAPIManager;
  private logger = Logger.getInstance();
  private config = CentralizedAPIConfig;
  
  // Rate limiters per API
  private rateLimiters: RateLimiterMap = {};
  
  // Caches per API type
  private caches: Map<string, TTLCache<any>> = new Map();
  
  // Current proxy index for rotation
  private currentProxyIndex = 0;
  
  // API health tracking
  private apiHealth: Map<string, { failures: number; lastSuccess: number; disabled: boolean }> = new Map();
  
  // Boot window configuration
  private bootStart = Date.now();
  private primaryOnlyDuringBoot = process.env.BOOT_PRIMARY_ONLY === 'true';
  private bootWindowMs = Number(process.env.BOOT_WINDOW_MS || 60000);
  
  // Default cache TTLs (in milliseconds)
  private readonly defaultCacheTTLs = {
    marketData: 60000,      // 1 minute
    news: 60000,             // 1 minute
    sentiment: 300000,       // 5 minutes
    whaleTracking: 60000,    // 1 minute
    blockExplorer: 300000,   // 5 minutes
    onChainAnalytics: 600000 // 10 minutes
  };

  private constructor() {
    this.initializeRateLimiters();
    this.initializeCaches();
  }

  static getInstance(): CentralizedAPIManager {
    if (!CentralizedAPIManager.instance) {
      CentralizedAPIManager.instance = new CentralizedAPIManager();
    }
    return CentralizedAPIManager.instance;
  }

  /**
   * Initialize rate limiters for all APIs
   */
  private initializeRateLimiters(): void {
    // Market Data - FREE providers only
    this.addRateLimiter('coingecko', 50, 60000);
    // CoinMarketCap DISABLED - Limited quota
    // this.addRateLimiter('coinmarketcap', 5, 1000);
    // this.addRateLimiter('coinmarketcap_2', 5, 1000);
    this.addRateLimiter('cryptocompare', 100, 60000);
    this.addRateLimiter('coincap', 200, 60000);
    
    // Block Explorers
    this.addRateLimiter('etherscan', 5, 1000);
    this.addRateLimiter('etherscan_2', 5, 1000);
    this.addRateLimiter('bscscan', 5, 1000);
    this.addRateLimiter('tronscan', 10, 1000);
    
    // News
    this.addRateLimiter('newsapi', 100, 86400000); // 100 per day
    this.addRateLimiter('reddit', 60, 60000);
    
    // Sentiment
    this.addRateLimiter('alternative_me', 100, 60000);
  }

  /**
   * Add rate limiter
   */
  private addRateLimiter(name: string, requests: number, interval: number): void {
    this.rateLimiters[name] = new TokenBucket(requests, interval);
  }

  /**
   * Initialize caches
   */
  private initializeCaches(): void {
    Object.keys(this.defaultCacheTTLs).forEach(key => {
      this.caches.set(key, new TTLCache<any>(this.defaultCacheTTLs[key as keyof typeof this.defaultCacheTTLs]));
    });
  }

  /**
   * Get rate limiter for API
   */
  private getRateLimiter(apiName: string): TokenBucket | null {
    return this.rateLimiters[apiName] || null;
  }

  /**
   * Check if API is healthy
   */
  private isAPIHealthy(apiName: string): boolean {
    const health = this.apiHealth.get(apiName);
    if (!health) return true;
    
    // Re-enable after 5 minutes if disabled
    if (health.disabled && Date.now() - health.lastSuccess > 300000) {
      health.disabled = false;
      health.failures = 0;
    }
    
    return !health.disabled;
  }

  /**
   * Record API failure
   */
  private recordFailure(apiName: string): void {
    const health = this.apiHealth.get(apiName) || { failures: 0, lastSuccess: 0, disabled: false };
    health.failures++;
    
    // Disable after 5 consecutive failures
    if (health.failures >= 5) {
      health.disabled = true;
      this.logger.warn(`API ${apiName} disabled after ${health.failures} failures`);
    }
    
    this.apiHealth.set(apiName, health);
  }

  /**
   * Record API success
   */
  private recordSuccess(apiName: string): void {
    const health = this.apiHealth.get(apiName) || { failures: 0, lastSuccess: 0, disabled: false };
    health.failures = 0;
    health.lastSuccess = Date.now();
    health.disabled = false;
    this.apiHealth.set(apiName, health);
  }

  /**
   * Get next CORS proxy (round-robin)
   */
  private getNextProxy(): CORSProxy {
    const proxy = this.config.corsProxies[this.currentProxyIndex];
    this.currentProxyIndex = (this.currentProxyIndex + 1) % this.config.corsProxies.length;
    return proxy;
  }

  /**
   * Apply CORS proxy to URL
   */
  private applyProxy(url: string, proxy: CORSProxy): string {
    if (proxy.url.includes('allorigins.win')) {
      return `${proxy.url}${encodeURIComponent(url)}`;
    } else if (proxy.url.includes('cors.sh')) {
      return `${proxy.url}${url}`;
    } else if (proxy.url.includes('corsfix.com')) {
      return `${proxy.url}${encodeURIComponent(url)}`;
    } else if (proxy.url.includes('codetabs.com')) {
      return `${proxy.url}${encodeURIComponent(url)}`;
    } else if (proxy.url.includes('thingproxy')) {
      return `${proxy.url}${url}`;
    }
    return url;
  }

  /**
   * Make request with single API config
   */
  private async makeRequest<T>(
    apiConfig: APIConfig,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    if (!apiConfig.enabled) {
      console.error(`API ${apiConfig.name} is disabled`);
    }

    if (!this.isAPIHealthy(apiConfig.name)) {
      console.error(`API ${apiConfig.name} is temporarily disabled`);
    }

    // Wait for rate limiter if available
    const limiter = this.getRateLimiter(apiConfig.name);
    if (limiter) {
      await limiter.wait();
    }

    let url = `${apiConfig.baseUrl}${endpoint}`;
    const requestOptions: RequestInit = {
      method: options.method || apiConfig.method || 'GET',
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      signal: AbortSignal.timeout(options.timeout || apiConfig.timeout || 10000)
    };

    // Add API key
    if (apiConfig.key) {
      if (apiConfig.headerKey) {
        requestOptions.headers![apiConfig.headerKey] = apiConfig.key;
      } else {
        // Add to URL params for GET requests
        const urlObj = new URL(url);
        urlObj.searchParams.append('apikey', apiConfig.key);
        url = urlObj.toString();
      }
    }

    // Add body for POST/GRAPHQL
    if (options.method === 'POST' || apiConfig.method === 'POST' || apiConfig.method === 'GRAPHQL') {
      requestOptions.body = JSON.stringify(options.body || {});
      requestOptions.headers!['Content-Type'] = 'application/json';
    }

    // Apply CORS proxy if needed
    if (apiConfig.needsProxy || options.useProxy) {
      const proxy = this.getNextProxy();
      url = this.applyProxy(url, proxy);
      
      if (proxy.requiresOrigin) {
        requestOptions.headers!['Origin'] = window.location.origin;
        requestOptions.headers!['x-requested-with'] = 'XMLHttpRequest';
      }
    }

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        console.error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data: any;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle allOrigins wrapper
      if (apiConfig.needsProxy && data.contents) {
        try {
          data = JSON.parse(data.contents);
        } catch {
          // Already parsed or not JSON
        }
      }

      this.recordSuccess(apiConfig.name);
      
      return {
        success: true,
        data,
        source: apiConfig.name,
        timestamp: Date.now()
      };
    } catch (error) {
      this.recordFailure(apiConfig.name);
      throw error;
    }
  }

  /**
   * Request with fallback chain
   * درخواست با زنجیره fallback
   */
  async requestWithFallback<T>(
    category: APICategory,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<APIResponse<T>> {
    const cacheKey = `request_${category.primary.name}_${endpoint}_${JSON.stringify(options)}`;
    const cacheType = this.getCacheType(category.primary.name);
    
    // Check cache
    if (cacheType) {
      const cache = this.caches.get(cacheType);
      const cached = cache?.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for ${category.primary.name}`);
        return cached;
      }
    }

    const allSources = [category.primary, ...category?.fallbacks?.filter(f => f.enabled)];
    const errors: string[] = [];

    // Try primary first
    try {
      const result = await this.makeRequest<T>(category.primary, endpoint, options);
      
      // Cache successful response
      if (cacheType && result.success) {
        const cache = this.caches.get(cacheType);
        cache?.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      errors.push(`${category.primary.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.logger.warn(`Primary API ${category.primary.name} failed, trying fallbacks...`);
    }

    // Try fallbacks (skip during boot window if configured)
    const skipFallbacks = this.primaryOnlyDuringBoot && (Date.now() - this.bootStart) < this.bootWindowMs;
    for (const fallback of skipFallbacks ? [] : category.fallbacks) {
      if (!fallback.enabled || !this.isAPIHealthy(fallback.name)) {
        continue;
      }

      try {
        const result = await this.makeRequest<T>(fallback, endpoint, options);
        
        // Cache successful response
        if (cacheType && result.success) {
          const cache = this.caches.get(cacheType);
          cache?.set(cacheKey, result);
        }
        
        this.logger.info(`Fallback ${fallback.name} succeeded`);
        return result;
      } catch (error) {
        errors.push(`${fallback.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        continue;
      }
    }

    // All sources failed
    const errorMessage = `All APIs failed. Errors: ${errors.join('; ')}`;
    this.logger.error(errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      source: 'none',
      timestamp: Date.now()
    };
  }

  /**
   * Determine cache type from API name
   */
  private getCacheType(apiName: string): string | null {
    // CoinMarketCap removed (disabled)
    if (apiName.includes('coingecko') || apiName.includes('cryptocompare')) {
      return 'marketData';
    }
    if (apiName.includes('news') || apiName.includes('cryptopanic') || apiName.includes('reddit')) {
      return 'news';
    }
    if (apiName.includes('sentiment') || apiName.includes('alternative') || apiName.includes('fng')) {
      return 'sentiment';
    }
    if (apiName.includes('whale') || apiName.includes('clank')) {
      return 'whaleTracking';
    }
    if (apiName.includes('scan') || apiName.includes('etherscan') || apiName.includes('tronscan')) {
      return 'blockExplorer';
    }
    if (apiName.includes('graph') || apiName.includes('glassnode') || apiName.includes('nansen')) {
      return 'onChainAnalytics';
    }
    return null;
  }

  /**
   * Get market prices with fallback
   */
  async getMarketPrices(symbols: string[]): Promise<APIResponse> {
    const symbolsParam = symbols.join(',');
    
    // Try CoinGecko first (FREE - no key, no CORS)
    try {
      const result = await this.requestWithFallback(
        this.config.marketData,
        `/simple/price?ids=${symbolsParam}&vs_currencies=usd`,
        { useProxy: false }
      );
      
      if (result.success) {
        return result;
      }
    } catch (error) {
      this.logger.warn('CoinGecko failed, trying CryptoCompare...');
    }

    // CoinMarketCap DISABLED - Limited quota (ظرفیت محدود - غیرفعال)
    // Skip CoinMarketCap and go directly to CryptoCompare
    
    // Try CryptoCompare (FREE with key)
    return await this.requestWithFallback(
      this.config.marketData,
      `/pricemulti?fsyms=${symbolsParam}&tsyms=USD`,
      { useProxy: false }
    );
  }

  /**
   * Get Ethereum balance with fallback
   */
  async getETHBalance(address: string): Promise<APIResponse> {
    return await this.requestWithFallback(
      this.config.blockExplorers.ethereum,
      `?module=account&action=balance&address=${address}&tag=latest`
    );
  }

  /**
   * Get BSC balance with fallback
   */
  async getBSCBalance(address: string): Promise<APIResponse> {
    return await this.requestWithFallback(
      this.config.blockExplorers.bsc,
      `?module=account&action=balance&address=${address}&tag=latest`
    );
  }

  /**
   * Get TRON balance with fallback
   */
  async getTRONBalance(address: string): Promise<APIResponse> {
    return await this.requestWithFallback(
      this.config.blockExplorers.tron,
      `/account?address=${address}`
    );
  }

  /**
   * Get Fear & Greed Index with fallback
   */
  async getFearGreedIndex(): Promise<APIResponse> {
    return await this.requestWithFallback(
      this.config.sentiment,
      `/?limit=1&format=json`
    );
  }

  /**
   * Get crypto news with fallback
   */
  async getCryptoNews(limit: number = 10): Promise<APIResponse> {
    // Try CryptoPanic first
    try {
      const result = await this.requestWithFallback(
        this.config.news,
        `/posts/?public=true&limit=${limit}`
      );
      
      if (result.success) {
        return result;
      }
    } catch (error) {
      this.logger.warn('CryptoPanic failed, trying NewsAPI...');
    }

    // Try NewsAPI
    try {
      const result = await this.requestWithFallback(
        this.config.news,
        `/everything?q=crypto&pageSize=${limit}`,
        { useProxy: true }
      );
      
      if (result.success) {
        return result;
      }
    } catch (error) {
      this.logger.warn('NewsAPI failed, trying Reddit...');
    }

    // Try Reddit
    return await this.requestWithFallback(
      this.config.news,
      `/new.json?limit=${limit}`
    );
  }

  /**
   * Get whale transactions with fallback
   */
  async getWhaleTransactions(minValue: number = 1000000): Promise<APIResponse> {
    const start = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const end = Math.floor(Date.now() / 1000);
    
    // Try ClankApp first (free, no key)
    try {
      const result = await this.requestWithFallback(
        this.config.whaleTracking,
        `/whales/recent`
      );
      
      if (result.success) {
        return result;
      }
    } catch (error) {
      this.logger.warn('ClankApp failed, trying WhaleAlert...');
    }

    // Try WhaleAlert (requires key)
    return await this.requestWithFallback(
      this.config.whaleTracking,
      `/transactions?min_value=${minValue}&start=${start}&end=${end}`
    );
  }

  /**
   * Clear cache for specific type
   */
  clearCache(cacheType: string): void {
    const cache = this.caches.get(cacheType);
    if (cache) {
      cache.clear();
      this.logger.info(`Cache cleared for ${cacheType}`);
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.caches.forEach((cache, type) => {
      cache.clear();
    });
    this.logger.info('All caches cleared');
  }

  /**
   * Get API health status
   */
  getAPIHealth(): Record<string, { failures: number; lastSuccess: number; disabled: boolean }> {
    const health: Record<string, any> = {};
    this.apiHealth.forEach((value, key) => {
      health[key] = { ...value };
    });
    return health;
  }

  /**
   * Reset API health (force re-enable)
   */
  resetAPIHealth(apiName?: string): void {
    if (apiName) {
      this.apiHealth.delete(apiName);
      this.logger.info(`Health reset for ${apiName}`);
    } else {
      this.apiHealth.clear();
      this.logger.info('All API health reset');
    }
  }

  /**
   * Generic request method (for compatibility)
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<APIResponse<T>> {
    // Use marketData as default category
    return await this.requestWithFallback<T>(
      this.config.marketData,
      endpoint,
      options
    );
  }
}

// Export singleton instance
export const centralizedAPIManager = CentralizedAPIManager.getInstance();

export default centralizedAPIManager;

