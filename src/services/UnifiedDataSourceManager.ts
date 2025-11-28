/**
 * UnifiedDataSourceManager
 * 
 * Comprehensive multi-source data retrieval system with:
 * - Primary and fallback source management
 * - Automatic timeout-based switching (5 seconds default)
 * - Database caching for all retrieved data
 * - Failure tracking and source health monitoring
 * - Mixed mode support for simultaneous multi-source fetching
 * - HuggingFace integration expansion
 * - User notifications for source failures
 */

import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { AdvancedCache } from '../core/AdvancedCache.js';
import { MultiProviderMarketDataService } from './MultiProviderMarketDataService.js';
import { HuggingFaceService } from './HuggingFaceService.js';
import { hfDataEngineAdapter } from './HFDataEngineAdapter.js';
import { BinanceService } from './BinanceService.js';
import { EventEmitter } from 'events';
import axios, { AxiosRequestConfig } from 'axios';
import providersConfig from '../../config/providers_config.json' assert { type: 'json' };

// ========== Types and Interfaces ==========

export type DataSourceType = 'primary' | 'fallback' | 'cache' | 'mock';
export type DataSourceMode = 'direct' | 'huggingface' | 'mixed';
export type DataCategory = 'market' | 'news' | 'sentiment' | 'onchain' | 'explorer' | 'whales';

export interface DataSourceConfig {
  name: string;
  type: DataSourceType;
  priority: number;
  timeout: number;
  enabled: boolean;
  category: DataCategory;
  baseUrl?: string;
  apiKey?: string;
  rateLimitPerMinute?: number;
}

export interface DataSourceHealth {
  name: string;
  isHealthy: boolean;
  lastSuccess: number;
  lastFailure: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  isDisabled: boolean;
  disabledUntil?: number;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  fallbackEnabled?: boolean;
  cacheEnabled?: boolean;
  mode?: DataSourceMode;
  forceSource?: string;
}

export interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: string;
  sourceType: DataSourceType;
  timestamp: number;
  responseTime: number;
  fromCache: boolean;
  fallbackUsed: boolean;
}

export interface MarketDataRequest {
  symbol: string;
  timeframe?: string;
  limit?: number;
}

export interface SentimentRequest {
  symbol?: string;
  keyword?: string;
}

export interface NewsRequest {
  limit?: number;
  keyword?: string;
  source?: string;
}

export interface DataSourceNotification {
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  source: string;
  timestamp: number;
  details?: any;
}

// ========== Main Manager Class ==========

export class UnifiedDataSourceManager extends EventEmitter {
  private static instance: UnifiedDataSourceManager;
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private cache = AdvancedCache.getInstance();
  
  // Service instances
  private multiProviderService = MultiProviderMarketDataService.getInstance();
  private huggingFaceService = HuggingFaceService.getInstance();
  private binanceService = BinanceService.getInstance();
  
  // Health monitoring
  private sourceHealthMap = new Map<string, DataSourceHealth>();
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly FAILURE_COOLDOWN_MS = 60000; // 1 minute
  private readonly DEFAULT_TIMEOUT = 5000; // 5 seconds
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  
  // Configuration
  private currentMode: DataSourceMode = 'direct';
  private dataSources: DataSourceConfig[] = [];
  
  private constructor() {
    super();
    this.initializeDataSources();
    this.startHealthMonitoring();
  }

  static getInstance(): UnifiedDataSourceManager {
    if (!UnifiedDataSourceManager.instance) {
      UnifiedDataSourceManager.instance = new UnifiedDataSourceManager();
    }
    return UnifiedDataSourceManager.instance;
  }

  // ========== Initialization ==========

  private initializeDataSources(): void {
    this.logger.info('Initializing unified data sources...');
    
    // Load from providers_config.json
    for (const [category, config] of Object.entries(providersConfig.categories)) {
      const categoryConfig = config as any;
      for (const provider of categoryConfig.providers || []) {
        const dataSource: DataSourceConfig = {
          name: provider.name,
          type: provider.priority === 1 ? 'primary' : 'fallback',
          priority: provider.priority,
          timeout: categoryConfig.timeout || this.DEFAULT_TIMEOUT,
          enabled: provider.enabled,
          category: category as DataCategory,
          baseUrl: provider.baseUrl,
          apiKey: provider.key,
          rateLimitPerMinute: provider.rateLimitPerMinute
        };
        
        this.dataSources.push(dataSource);
        
        // Initialize health tracking
        this.sourceHealthMap.set(provider.name, {
          name: provider.name,
          isHealthy: true,
          lastSuccess: 0,
          lastFailure: 0,
          consecutiveFailures: 0,
          averageResponseTime: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          isDisabled: !provider.enabled
        });
      }
    }
    
    this.logger.info(`Initialized ${this.dataSources.length} data sources`);
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // ========== Mode Management ==========

  setMode(mode: DataSourceMode): void {
    this.logger.info(`Switching data source mode to: ${mode}`);
    this.currentMode = mode;
    this.emitNotification({
      type: 'info',
      message: `Data source mode changed to ${mode}`,
      source: 'system',
      timestamp: Date.now()
    });
  }

  getMode(): DataSourceMode {
    return this.currentMode;
  }

  // ========== Core Fetch Methods ==========

  /**
   * Fetch data with automatic fallback and timeout handling
   */
  async fetchWithFallback<T>(
    fetchFn: (source: DataSourceConfig) => Promise<T>,
    category: DataCategory,
    cacheKey: string,
    options: FetchOptions = {}
  ): Promise<FetchResult<T>> {
    const startTime = Date.now();
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;
    const useCacheOnFailure = options.cacheEnabled !== false;
    
    // Try to get from cache first
    if (options.cacheEnabled !== false) {
      const cachedData = await this.getFromCache<T>(cacheKey);
      if (cachedData) {
        return {
          success: true,
          data: cachedData,
          source: 'cache',
          sourceType: 'cache',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          fromCache: true,
          fallbackUsed: false
        };
      }
    }
    
    // Get available sources for this category
    const sources = this.getAvailableSources(category, options.mode);
    
    if (sources.length === 0) {
      return {
        success: false,
        error: `No available sources for category: ${category}`,
        source: 'none',
        sourceType: 'primary',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        fromCache: false,
        fallbackUsed: false
      };
    }
    
    // Try primary source first
    let lastError: Error | null = null;
    let fallbackUsed = false;
    
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const health = this.sourceHealthMap.get(source.name);
      
      // Skip disabled sources
      if (health?.isDisabled && health.disabledUntil && Date.now() < health.disabledUntil) {
        continue;
      }
      
      try {
        const result = await this.fetchWithTimeout(
          () => fetchFn(source),
          source,
          timeout
        );
        
        // Success - store in cache and database
        await this.storeSuccessfulFetch(cacheKey, result, source);
        
        return {
          success: true,
          data: result,
          source: source.name,
          sourceType: i === 0 ? 'primary' : 'fallback',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          fromCache: false,
          fallbackUsed: i > 0
        };
        
      } catch (error) {
        lastError = error as Error;
        fallbackUsed = i > 0;
        
        // Track failure
        await this.trackFailure(source, error as Error);
        
        // Log warning and continue to next source
        this.logger.warn(`Source ${source.name} failed, trying next...`, {
          error: (error as Error).message,
          source: source.name
        });
        
        // Emit notification for primary source failure
        if (i === 0) {
          this.emitNotification({
            type: 'warning',
            message: `Primary source ${source.name} failed, switching to fallback`,
            source: source.name,
            timestamp: Date.now(),
            details: { error: (error as Error).message }
          });
        }
      }
    }
    
    // All sources failed - try to return cached data if available
    if (useCacheOnFailure) {
      const staleData = await this.getStaleCache<T>(cacheKey);
      if (staleData) {
        this.emitNotification({
          type: 'warning',
          message: 'All sources failed, using stale cached data',
          source: 'cache',
          timestamp: Date.now()
        });
        
        return {
          success: true,
          data: staleData,
          source: 'cache',
          sourceType: 'cache',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          fromCache: true,
          fallbackUsed: true
        };
      }
    }
    
    // Complete failure
    this.emitNotification({
      type: 'error',
      message: 'All data sources failed',
      source: 'system',
      timestamp: Date.now(),
      details: { lastError: lastError?.message }
    });
    
    return {
      success: false,
      error: lastError?.message || 'All sources failed',
      source: 'none',
      sourceType: 'primary',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
      fromCache: false,
      fallbackUsed
    };
  }

  /**
   * Fetch with automatic timeout
   */
  private async fetchWithTimeout<T>(
    fetchFn: () => Promise<T>,
    source: DataSourceConfig,
    timeout: number
  ): Promise<T> {
    const startTime = Date.now();
    
    return new Promise<T>(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout after ${timeout}ms for source: ${source.name}`));
      }, timeout);
      
      try {
        const result = await fetchFn();
        clearTimeout(timeoutId);
        
        // Track success
        const responseTime = Date.now() - startTime;
        await this.trackSuccess(source, responseTime);
        
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  // ========== Mixed Mode Support ==========

  /**
   * Fetch from multiple sources simultaneously and return fastest/best result
   */
  async fetchMixed<T>(
    fetchFn: (source: DataSourceConfig) => Promise<T>,
    category: DataCategory,
    cacheKey: string,
    options: FetchOptions = {}
  ): Promise<FetchResult<T>> {
    const sources = this.getAvailableSources(category, 'mixed');
    
    if (sources.length === 0) {
      return this.fetchWithFallback(fetchFn, category, cacheKey, options);
    }
    
    const startTime = Date.now();
    
    // Race all sources
    const promises = sources.map(async (source) => {
      try {
        const data = await this.fetchWithTimeout(
          () => fetchFn(source),
          source,
          options.timeout || this.DEFAULT_TIMEOUT
        );
        return { success: true, data, source };
      } catch (error) {
        return { success: false, error, source };
      }
    });
    
    // Wait for first success or all failures
    const results = await Promise.allSettled(promises);
    
    // Find first successful result
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        const { data, source } = result.value;
        
        // Store in cache
        await this.storeSuccessfulFetch(cacheKey, data, source);
        
        return {
          success: true,
          data,
          source: source.name,
          sourceType: 'primary',
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          fromCache: false,
          fallbackUsed: false
        };
      }
    }
    
    // All failed - fallback to cache
    const cachedData = await this.getStaleCache<T>(cacheKey);
    if (cachedData) {
      return {
        success: true,
        data: cachedData,
        source: 'cache',
        sourceType: 'cache',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        fromCache: true,
        fallbackUsed: true
      };
    }
    
    return {
      success: false,
      error: 'All sources failed in mixed mode',
      source: 'none',
      sourceType: 'primary',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
      fromCache: false,
      fallbackUsed: true
    };
  }

  // ========== Specific Data Fetching Methods ==========

  /**
   * Fetch market data with fallback support
   */
  async fetchMarketData(
    request: MarketDataRequest,
    options: FetchOptions = {}
  ): Promise<FetchResult<any>> {
    const cacheKey = `market:${request.symbol}:${request.timeframe || 'ticker'}`;
    
    const fetchFn = async (source: DataSourceConfig) => {
      if (this.currentMode === 'huggingface' || source.name === 'huggingface') {
        return await hfDataEngineAdapter.getMarketPrice(request.symbol);
      } else if (source.name === 'binance') {
        return await this.binanceService.getCurrentPrice(request.symbol);
      } else {
        return await this.multiProviderService.getRealTimePrice(request.symbol);
      }
    };
    
    if (options.mode === 'mixed' || this.currentMode === 'mixed') {
      return this.fetchMixed(fetchFn, 'market', cacheKey, options);
    }
    
    return this.fetchWithFallback(fetchFn, 'market', cacheKey, options);
  }

  /**
   * Fetch sentiment data
   */
  async fetchSentiment(
    request: SentimentRequest,
    options: FetchOptions = {}
  ): Promise<FetchResult<any>> {
    const cacheKey = `sentiment:${request.symbol || request.keyword || 'general'}`;
    
    const fetchFn = async (source: DataSourceConfig) => {
      // Implement sentiment fetching based on source
      if (source.name === 'alternative_feargreed') {
        const response = await axios.get(`${source.baseUrl}/?limit=1`, {
          timeout: source.timeout
        });
        return response.data;
      }
      // Add more sentiment sources here
      return null;
    };
    
    return this.fetchWithFallback(fetchFn, 'sentiment', cacheKey, options);
  }

  /**
   * Fetch news data
   */
  async fetchNews(
    request: NewsRequest,
    options: FetchOptions = {}
  ): Promise<FetchResult<any>> {
    const cacheKey = `news:${request.keyword || 'general'}:${request.limit || 20}`;
    
    const fetchFn = async (source: DataSourceConfig) => {
      // Implement news fetching based on source
      if (source.name === 'newsapi') {
        const url = `${source.baseUrl}/everything?q=crypto&pageSize=${request.limit || 20}`;
        const response = await axios.get(url, {
          headers: { 'X-Api-Key': source.apiKey },
          timeout: source.timeout
        });
        return response.data.articles;
      }
      // Add more news sources here
      return null;
    };
    
    return this.fetchWithFallback(fetchFn, 'news', cacheKey, options);
  }

  // ========== HuggingFace Expansion ==========

  /**
   * Fetch expanded HuggingFace data including sentiment, predictions, etc.
   */
  async fetchHuggingFaceExtended(symbol: string): Promise<FetchResult<any>> {
    const cacheKey = `hf:extended:${symbol}`;
    
    try {
      const [price, sentiment, prediction] = await Promise.allSettled([
        hfDataEngineAdapter.getMarketPrice(symbol),
        hfDataEngineAdapter.getSentiment(symbol),
        hfDataEngineAdapter.getPricePrediction(symbol)
      ]);
      
      const data = {
        price: price.status === 'fulfilled' ? price.value : null,
        sentiment: sentiment.status === 'fulfilled' ? sentiment.value : null,
        prediction: prediction.status === 'fulfilled' ? prediction.value : null,
        timestamp: Date.now()
      };
      
      // Store in cache and database
      await this.cache.set(cacheKey, data, { ttl: 60, tags: ['hf', symbol] });
      await this.storeInDatabase('huggingface_extended', symbol, data);
      
      return {
        success: true,
        data,
        source: 'huggingface',
        sourceType: 'primary',
        timestamp: Date.now(),
        responseTime: 0,
        fromCache: false,
        fallbackUsed: false
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        source: 'huggingface',
        sourceType: 'primary',
        timestamp: Date.now(),
        responseTime: 0,
        fromCache: false,
        fallbackUsed: false
      };
    }
  }

  // ========== Cache and Storage Management ==========

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return await this.cache.get(key) as T | null;
    } catch {
      return null;
    }
  }

  private async getStaleCache<T>(key: string): Promise<T | null> {
    try {
      // Get from cache even if expired
      const cached = await this.cache.get(key);
      return cached as T | null;
    } catch {
      return null;
    }
  }

  private async storeSuccessfulFetch<T>(
    cacheKey: string,
    data: T,
    source: DataSourceConfig
  ): Promise<void> {
    // Store in cache
    await this.cache.set(cacheKey, data, {
      ttl: 120,
      tags: [source.category, source.name]
    });
    
    // Store in database
    await this.storeInDatabase(source.category, cacheKey, data, source.name);
  }

  private async storeInDatabase(
    category: string,
    key: string,
    data: any,
    source?: string
  ): Promise<void> {
    try {
      // Store in a data_retrieval_log table
      await this.database.query(`
        INSERT INTO data_retrieval_log (category, cache_key, data, source, timestamp)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          data = excluded.data,
          source = excluded.source,
          timestamp = excluded.timestamp
      `, [category, key, JSON.stringify(data), source || 'unknown', Date.now()]);
    } catch (error) {
      this.logger.error('Failed to store in database', { category, key }, error as Error);
    }
  }

  // ========== Health Tracking ==========

  private async trackSuccess(source: DataSourceConfig, responseTime: number): Promise<void> {
    const health = this.sourceHealthMap.get(source.name);
    if (!health) return;
    
    health.lastSuccess = Date.now();
    health.consecutiveFailures = 0;
    health.totalRequests++;
    health.successfulRequests++;
    health.isHealthy = true;
    health.isDisabled = false;
    
    // Update average response time
    const prevAvg = health.averageResponseTime;
    const totalSuccessful = health.successfulRequests;
    health.averageResponseTime = ((prevAvg * (totalSuccessful - 1)) + responseTime) / totalSuccessful;
    
    this.sourceHealthMap.set(source.name, health);
  }

  private async trackFailure(source: DataSourceConfig, error: Error): Promise<void> {
    const health = this.sourceHealthMap.get(source.name);
    if (!health) return;
    
    health.lastFailure = Date.now();
    health.consecutiveFailures++;
    health.totalRequests++;
    health.failedRequests++;
    
    // Disable source if too many consecutive failures
    if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      health.isHealthy = false;
      health.isDisabled = true;
      health.disabledUntil = Date.now() + this.FAILURE_COOLDOWN_MS;
      
      this.logger.warn(`Source ${source.name} disabled due to consecutive failures`, {
        consecutiveFailures: health.consecutiveFailures,
        disabledUntil: new Date(health.disabledUntil).toISOString()
      });
      
      this.emitNotification({
        type: 'error',
        message: `Data source ${source.name} temporarily disabled`,
        source: source.name,
        timestamp: Date.now(),
        details: {
          reason: 'Too many consecutive failures',
          disabledUntil: health.disabledUntil
        }
      });
    }
    
    this.sourceHealthMap.set(source.name, health);
    
    // Log failure to database
    await this.logFailure(source, error);
  }

  private async logFailure(source: DataSourceConfig, error: Error): Promise<void> {
    try {
      await this.database.query(`
        INSERT INTO data_source_failures (source_name, category, error_message, timestamp)
        VALUES (?, ?, ?, ?)
      `, [source.name, source.category, error.message, Date.now()]);
    } catch (dbError) {
      this.logger.error('Failed to log failure to database', {}, dbError as Error);
    }
  }

  // ========== Health Monitoring ==========

  private async performHealthChecks(): Promise<void> {
    for (const [name, health] of this.sourceHealthMap.entries()) {
      // Re-enable sources that have been in cooldown
      if (health.isDisabled && health.disabledUntil && Date.now() >= health.disabledUntil) {
        health.isDisabled = false;
        health.consecutiveFailures = 0;
        this.sourceHealthMap.set(name, health);
        
        this.logger.info(`Source ${name} re-enabled after cooldown`);
        
        this.emitNotification({
          type: 'success',
          message: `Data source ${name} re-enabled`,
          source: name,
          timestamp: Date.now()
        });
      }
    }
  }

  getSourceHealth(sourceName?: string): DataSourceHealth | DataSourceHealth[] {
    if (sourceName) {
      return this.sourceHealthMap.get(sourceName) || {
        name: sourceName,
        isHealthy: false,
        lastSuccess: 0,
        lastFailure: 0,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        isDisabled: true
      };
    }
    
    return Array.from(this.sourceHealthMap.values());
  }

  // ========== Helper Methods ==========

  private getAvailableSources(
    category: DataCategory,
    mode?: DataSourceMode
  ): DataSourceConfig[] {
    const effectiveMode = mode || this.currentMode;
    
    let sources = this.dataSources
      .filter(s => s.category === category && s.enabled)
      .sort((a, b) => a.priority - b.priority);
    
    // Filter out disabled sources
    sources = sources.filter(s => {
      const health = this.sourceHealthMap.get(s.name);
      return !health?.isDisabled || !health.disabledUntil || Date.now() >= health.disabledUntil;
    });
    
    // In HuggingFace mode, prefer HF sources
    if (effectiveMode === 'huggingface') {
      const hfSources = sources.filter(s => s.name.includes('hugging'));
      if (hfSources.length > 0) {
        return hfSources;
      }
    }
    
    return sources;
  }

  private emitNotification(notification: DataSourceNotification): void {
    this.emit('notification', notification);
    this.logger.info('Data source notification', notification);
  }

  // ========== Public API ==========

  /**
   * Get current system statistics
   */
  getStats() {
    const health = Array.from(this.sourceHealthMap.values());
    
    return {
      mode: this.currentMode,
      totalSources: this.dataSources.length,
      healthySources: health.filter(h => h.isHealthy).length,
      disabledSources: health.filter(h => h.isDisabled).length,
      totalRequests: health.reduce((sum, h) => sum + h.totalRequests, 0),
      successfulRequests: health.reduce((sum, h) => sum + h.successfulRequests, 0),
      failedRequests: health.reduce((sum, h) => sum + h.failedRequests, 0),
      averageSuccessRate: health.length > 0
        ? health.reduce((sum, h) => sum + (h.successfulRequests / (h.totalRequests || 1)), 0) / health.length
        : 0,
      sources: health
    };
  }

  /**
   * Manually disable a source
   */
  disableSource(sourceName: string, durationMs?: number): void {
    const health = this.sourceHealthMap.get(sourceName);
    if (health) {
      health.isDisabled = true;
      health.disabledUntil = durationMs ? Date.now() + durationMs : undefined;
      this.sourceHealthMap.set(sourceName, health);
      
      this.logger.info(`Manually disabled source: ${sourceName}`);
    }
  }

  /**
   * Manually enable a source
   */
  enableSource(sourceName: string): void {
    const health = this.sourceHealthMap.get(sourceName);
    if (health) {
      health.isDisabled = false;
      health.disabledUntil = undefined;
      health.consecutiveFailures = 0;
      this.sourceHealthMap.set(sourceName, health);
      
      this.logger.info(`Manually enabled source: ${sourceName}`);
    }
  }
}

export const unifiedDataSourceManager = UnifiedDataSourceManager.getInstance();
