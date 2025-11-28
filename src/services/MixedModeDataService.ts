/**
 * MixedModeDataService
 * 
 * Comprehensive Mixed Mode data fetching system that:
 * - Uses HuggingFace as the primary data source
 * - Falls back to CoinGecko, CryptoCompare, and other sources
 * - Implements TTL-based caching to reduce API calls
 * - Requests data on-demand only when needed
 * - Provides graceful error handling and logging
 * - Indicates the data source for UI display
 * 
 * NO WebSocket usage - all data fetched via HTTP(S) API calls
 * NO Binance or KuCoin - completely excluded from the system
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { EventEmitter } from 'events';

// ========== Types and Interfaces ==========

export type DataSourceName = 'huggingface' | 'coingecko' | 'cryptocompare' | 'coinpaprika' | 'coincap' | 'cache' | 'fallback';
export type DataSourcePriority = 'primary' | 'secondary' | 'tertiary' | 'fallback';
export type DataStatus = 'fresh' | 'cached' | 'stale' | 'fallback' | 'error';

export interface MixedModeConfig {
  enableMixedMode: boolean;
  primarySource: DataSourceName;
  fallbackSources: DataSourceName[];
  cacheTTL: {
    marketData: number;  // milliseconds
    sentiment: number;
    news: number;
    predictions: number;
  };
  requestTimeout: number;
  maxRetries: number;
  pollingInterval: number;  // For real-time updates
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: DataSourceName;
  ttl: number;
  staleAfter: number;
}

export interface DataResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source: DataSourceName;
  sourceType: DataSourcePriority;
  status: DataStatus;
  timestamp: number;
  responseTime: number;
  fromCache: boolean;
  fallbackUsed: boolean;
}

export interface MarketPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  marketCap?: number;
  rank?: number;
  lastUpdated: string;
  source: DataSourceName;
}

export interface SentimentData {
  symbol?: string;
  score: number;  // -1 to 1
  label: 'bearish' | 'neutral' | 'bullish';
  confidence: number;
  sources: string[];
  timestamp: number;
  source: DataSourceName;
}

export interface SourceHealth {
  name: DataSourceName;
  isHealthy: boolean;
  lastSuccess: number;
  lastFailure: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  totalRequests: number;
  successRate: number;
  isDisabled: boolean;
  disabledUntil?: number;
}

export interface DataSourceNotification {
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: DataSourceName;
  timestamp: number;
  details?: any;
}

// ========== Default Configuration ==========

const DEFAULT_CONFIG: MixedModeConfig = {
  enableMixedMode: true,
  primarySource: 'huggingface',
  fallbackSources: ['coingecko', 'cryptocompare', 'coinpaprika', 'coincap'],
  cacheTTL: {
    marketData: 60000,    // 1 minute
    sentiment: 300000,    // 5 minutes
    news: 600000,         // 10 minutes
    predictions: 180000,  // 3 minutes
  },
  requestTimeout: 10000,  // 10 seconds
  maxRetries: 2,
  pollingInterval: 30000, // 30 seconds for polling updates
};

// ========== Main Service Class ==========

export class MixedModeDataService extends EventEmitter {
  private static instance: MixedModeDataService;
  private logger = Logger.getInstance();
  private config: MixedModeConfig;
  
  // HTTP Clients
  private huggingFaceClient: AxiosInstance;
  private coinGeckoClient: AxiosInstance;
  private cryptoCompareClient: AxiosInstance;
  private coinPaprikaClient: AxiosInstance;
  private coinCapClient: AxiosInstance;
  
  // Cache storage
  private cache = new Map<string, CacheEntry<any>>();
  
  // Source health tracking
  private sourceHealth = new Map<DataSourceName, SourceHealth>();
  
  // Constants
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly FAILURE_COOLDOWN_MS = 60000; // 1 minute
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  
  // Symbol mapping for different APIs
  private readonly symbolToGeckoId: Record<string, string> = {
    'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
    'ADA': 'cardano', 'DOT': 'polkadot', 'LTC': 'litecoin',
    'LINK': 'chainlink', 'BCH': 'bitcoin-cash', 'XLM': 'stellar',
    'XRP': 'ripple', 'DOGE': 'dogecoin', 'SOL': 'solana',
    'MATIC': 'matic-network', 'AVAX': 'avalanche-2', 'ATOM': 'cosmos',
    'TRX': 'tron', 'USDT': 'tether', 'USDC': 'usd-coin'
  };

  private constructor(config?: Partial<MixedModeConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeClients();
    this.initializeSourceHealth();
    this.startHealthMonitoring();
    this.logger.info('✅ MixedModeDataService initialized', {
      primarySource: this.config.primarySource,
      fallbackSources: this.config.fallbackSources,
      enableMixedMode: this.config.enableMixedMode
    });
  }

  static getInstance(config?: Partial<MixedModeConfig>): MixedModeDataService {
    if (!MixedModeDataService.instance) {
      MixedModeDataService.instance = new MixedModeDataService(config);
    }
    return MixedModeDataService.instance;
  }

  // ========== Initialization ==========

  private initializeClients(): void {
    // HuggingFace Data Engine client
    const hfBaseUrl = process.env.HF_ENGINE_BASE_URL || '/api/hf-engine';
    this.huggingFaceClient = axios.create({
      baseURL: hfBaseUrl,
      timeout: this.config.requestTimeout,
      headers: { 'Accept': 'application/json' }
    });

    // CoinGecko client (No API key needed for free tier)
    this.coinGeckoClient = axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: this.config.requestTimeout,
      headers: { 'Accept': 'application/json' }
    });

    // CryptoCompare client
    const cryptoCompareKey = process.env.CRYPTOCOMPARE_API_KEY || '';
    this.cryptoCompareClient = axios.create({
      baseURL: 'https://min-api.cryptocompare.com/data',
      timeout: this.config.requestTimeout,
      headers: cryptoCompareKey ? {
        'authorization': `Apikey ${cryptoCompareKey}`,
        'Accept': 'application/json'
      } : { 'Accept': 'application/json' }
    });

    // CoinPaprika client (No API key needed)
    this.coinPaprikaClient = axios.create({
      baseURL: 'https://api.coinpaprika.com/v1',
      timeout: this.config.requestTimeout,
      headers: { 'Accept': 'application/json' }
    });

    // CoinCap client (No API key needed)
    this.coinCapClient = axios.create({
      baseURL: 'https://api.coincap.io/v2',
      timeout: this.config.requestTimeout,
      headers: { 'Accept': 'application/json' }
    });
  }

  private initializeSourceHealth(): void {
    const sources: DataSourceName[] = ['huggingface', 'coingecko', 'cryptocompare', 'coinpaprika', 'coincap'];
    
    for (const source of sources) {
      this.sourceHealth.set(source, {
        name: source,
        isHealthy: true,
        lastSuccess: 0,
        lastFailure: 0,
        consecutiveFailures: 0,
        averageResponseTime: 0,
        totalRequests: 0,
        successRate: 100,
        isDisabled: false
      });
    }
  }

  private startHealthMonitoring(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // ========== Core Data Fetching Methods ==========

  /**
   * Main method to fetch market data with Mixed Mode support
   * Uses HuggingFace as primary, falls back to other sources
   */
  async fetchMarketData(symbol: string, forceRefresh = false): Promise<DataResponse<MarketPrice>> {
    const startTime = Date.now();
    const cacheKey = `market:${symbol.toUpperCase()}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getFromCache<MarketPrice>(cacheKey, this.config.cacheTTL.marketData);
      if (cached) {
        return {
          success: true,
          data: cached.data,
          source: cached.source,
          sourceType: 'primary',
          status: this.getCacheStatus(cached),
          timestamp: Date.now(),
          responseTime: Date.now() - startTime,
          fromCache: true,
          fallbackUsed: false
        };
      }
    }

    // Determine sources to try based on mode
    const sourcesToTry = this.config.enableMixedMode
      ? [this.config.primarySource, ...this.config.fallbackSources]
      : [this.config.primarySource];

    let lastError: Error | null = null;
    let fallbackUsed = false;

    for (let i = 0; i < sourcesToTry.length; i++) {
      const source = sourcesToTry[i];
      const health = this.sourceHealth.get(source);
      
      // Skip disabled sources
      if (health?.isDisabled && health.disabledUntil && Date.now() < health.disabledUntil) {
        this.logger.debug(`Skipping disabled source: ${source}`);
        continue;
      }

      try {
        const data = await this.fetchFromSource(source, symbol);
        
        if (data) {
          // Success - cache and return
          this.setCache(cacheKey, data, source, this.config.cacheTTL.marketData);
          this.trackSuccess(source, Date.now() - startTime);

          if (i > 0) {
            fallbackUsed = true;
            this.emitNotification({
              type: 'warning',
              message: `Using fallback source ${source} for ${symbol}`,
              source,
              timestamp: Date.now()
            });
          }

          return {
            success: true,
            data,
            source,
            sourceType: i === 0 ? 'primary' : 'fallback',
            status: 'fresh',
            timestamp: Date.now(),
            responseTime: Date.now() - startTime,
            fromCache: false,
            fallbackUsed
          };
        }
      } catch (error) {
        lastError = error as Error;
        this.trackFailure(source, error as Error);
        this.logger.warn(`Source ${source} failed for ${symbol}`, { error: (error as Error).message });

        // Emit notification for primary source failure
        if (i === 0) {
          this.emitNotification({
            type: 'warning',
            message: `Primary source ${source} failed, trying fallbacks`,
            source,
            timestamp: Date.now(),
            details: { error: (error as Error).message }
          });
        }
      }
    }

    // All sources failed - try stale cache
    const staleCache = this.getStaleCache<MarketPrice>(cacheKey);
    if (staleCache) {
      this.emitNotification({
        type: 'warning',
        message: 'All sources failed, using stale cached data',
        source: 'cache',
        timestamp: Date.now()
      });

      return {
        success: true,
        data: staleCache.data,
        source: 'cache',
        sourceType: 'fallback',
        status: 'stale',
        timestamp: Date.now(),
        responseTime: Date.now() - startTime,
        fromCache: true,
        fallbackUsed: true
      };
    }

    // Complete failure
    this.emitNotification({
      type: 'error',
      message: `All data sources failed for ${symbol}`,
      source: 'fallback',
      timestamp: Date.now(),
      details: { lastError: lastError?.message }
    });

    return {
      success: false,
      error: lastError?.message || 'All data sources failed',
      source: 'fallback',
      sourceType: 'fallback',
      status: 'error',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
      fromCache: false,
      fallbackUsed: true
    };
  }

  /**
   * Fetch multiple market prices at once
   */
  async fetchMultipleMarketData(symbols: string[], forceRefresh = false): Promise<DataResponse<MarketPrice[]>> {
    const startTime = Date.now();
    const results: MarketPrice[] = [];
    const errors: string[] = [];
    let primarySourceUsed = true;

    for (const symbol of symbols) {
      const result = await this.fetchMarketData(symbol, forceRefresh);
      if (result.success && result.data) {
        results.push(result.data);
        if (result.fallbackUsed) {
          primarySourceUsed = false;
        }
      } else {
        errors.push(`${symbol}: ${result.error}`);
      }
    }

    return {
      success: results.length > 0,
      data: results,
      error: errors.length > 0 ? errors.join('; ') : undefined,
      source: primarySourceUsed ? this.config.primarySource : 'fallback',
      sourceType: primarySourceUsed ? 'primary' : 'fallback',
      status: results.length === symbols.length ? 'fresh' : 'fallback',
      timestamp: Date.now(),
      responseTime: Date.now() - startTime,
      fromCache: false,
      fallbackUsed: !primarySourceUsed
    };
  }

  /**
   * Fetch from a specific data source
   */
  private async fetchFromSource(source: DataSourceName, symbol: string): Promise<MarketPrice | null> {
    const upperSymbol = symbol.toUpperCase();
    
    switch (source) {
      case 'huggingface':
        return this.fetchFromHuggingFace(upperSymbol);
      case 'coingecko':
        return this.fetchFromCoinGecko(upperSymbol);
      case 'cryptocompare':
        return this.fetchFromCryptoCompare(upperSymbol);
      case 'coinpaprika':
        return this.fetchFromCoinPaprika(upperSymbol);
      case 'coincap':
        return this.fetchFromCoinCap(upperSymbol);
      default:
        return null;
    }
  }

  // ========== Source-Specific Fetch Methods ==========

  private async fetchFromHuggingFace(symbol: string): Promise<MarketPrice | null> {
    try {
      const response = await this.huggingFaceClient.get(`/market/price/${symbol}`);
      
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        return {
          symbol: data.symbol || symbol,
          name: data.name || symbol,
          price: data.price || 0,
          change24h: data.change_24h || 0,
          changePercent24h: data.change_24h || 0,
          volume24h: data.volume_24h || 0,
          marketCap: data.market_cap,
          rank: data.rank,
          lastUpdated: data.last_updated || new Date().toISOString(),
          source: 'huggingface'
        };
      }

      // Try alternate endpoint
      const altResponse = await this.huggingFaceClient.get(`/prices/${symbol}`);
      if (altResponse.data) {
        return {
          symbol,
          name: altResponse.data.name || symbol,
          price: altResponse.data.price || 0,
          change24h: altResponse.data.change_24h || 0,
          changePercent24h: altResponse.data.percent_change_24h || 0,
          volume24h: altResponse.data.volume_24h || 0,
          marketCap: altResponse.data.market_cap,
          rank: altResponse.data.rank,
          lastUpdated: new Date().toISOString(),
          source: 'huggingface'
        };
      }

      return null;
    } catch (error) {
      this.logger.debug('HuggingFace fetch failed', { symbol, error: (error as Error).message });
      throw error;
    }
  }

  private async fetchFromCoinGecko(symbol: string): Promise<MarketPrice | null> {
    try {
      const geckoId = this.symbolToGeckoId[symbol] || symbol.toLowerCase();
      
      const response = await this.coinGeckoClient.get('/simple/price', {
        params: {
          ids: geckoId,
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        }
      });

      const data = response.data[geckoId];
      if (data && data.usd) {
        return {
          symbol,
          name: symbol,
          price: data.usd,
          change24h: data.usd_24h_change || 0,
          changePercent24h: data.usd_24h_change || 0,
          volume24h: data.usd_24h_vol || 0,
          marketCap: data.usd_market_cap,
          lastUpdated: data.last_updated_at 
            ? new Date(data.last_updated_at * 1000).toISOString()
            : new Date().toISOString(),
          source: 'coingecko'
        };
      }

      return null;
    } catch (error) {
      this.logger.debug('CoinGecko fetch failed', { symbol, error: (error as Error).message });
      throw error;
    }
  }

  private async fetchFromCryptoCompare(symbol: string): Promise<MarketPrice | null> {
    try {
      const response = await this.cryptoCompareClient.get('/pricemultifull', {
        params: {
          fsyms: symbol,
          tsyms: 'USD'
        }
      });

      const data = response.data?.RAW?.[symbol]?.USD;
      if (data) {
        return {
          symbol,
          name: symbol,
          price: data.PRICE || 0,
          change24h: data.CHANGE24HOUR || 0,
          changePercent24h: data.CHANGEPCT24HOUR || 0,
          volume24h: data.VOLUME24HOUR || 0,
          marketCap: data.MKTCAP,
          lastUpdated: new Date(data.LASTUPDATE * 1000).toISOString(),
          source: 'cryptocompare'
        };
      }

      return null;
    } catch (error) {
      this.logger.debug('CryptoCompare fetch failed', { symbol, error: (error as Error).message });
      throw error;
    }
  }

  private async fetchFromCoinPaprika(symbol: string): Promise<MarketPrice | null> {
    try {
      const symbolIdMap: Record<string, string> = {
        'BTC': 'btc-bitcoin', 'ETH': 'eth-ethereum', 'BNB': 'bnb-binance-coin',
        'ADA': 'ada-cardano', 'SOL': 'sol-solana', 'XRP': 'xrp-ripple',
        'DOGE': 'doge-dogecoin', 'TRX': 'trx-tron', 'DOT': 'dot-polkadot',
        'LINK': 'link-chainlink', 'MATIC': 'matic-polygon', 'AVAX': 'avax-avalanche',
        'ATOM': 'atom-cosmos', 'LTC': 'ltc-litecoin', 'BCH': 'bch-bitcoin-cash'
      };

      const coinId = symbolIdMap[symbol] || `${symbol.toLowerCase()}-${symbol.toLowerCase()}`;
      const response = await this.coinPaprikaClient.get(`/tickers/${coinId}`);

      if (response.data && response.data.quotes?.USD) {
        const quote = response.data.quotes.USD;
        return {
          symbol,
          name: response.data.name || symbol,
          price: quote.price || 0,
          change24h: quote.volume_24h_change_24h || 0,
          changePercent24h: quote.percent_change_24h || 0,
          volume24h: quote.volume_24h || 0,
          marketCap: quote.market_cap,
          rank: response.data.rank,
          lastUpdated: response.data.last_updated || new Date().toISOString(),
          source: 'coinpaprika'
        };
      }

      return null;
    } catch (error) {
      this.logger.debug('CoinPaprika fetch failed', { symbol, error: (error as Error).message });
      throw error;
    }
  }

  private async fetchFromCoinCap(symbol: string): Promise<MarketPrice | null> {
    try {
      const symbolIdMap: Record<string, string> = {
        'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binance-coin',
        'ADA': 'cardano', 'SOL': 'solana', 'XRP': 'ripple',
        'DOGE': 'dogecoin', 'TRX': 'tron', 'DOT': 'polkadot',
        'LINK': 'chainlink', 'MATIC': 'polygon', 'AVAX': 'avalanche',
        'ATOM': 'cosmos', 'LTC': 'litecoin', 'BCH': 'bitcoin-cash'
      };

      const coinId = symbolIdMap[symbol] || symbol.toLowerCase();
      const response = await this.coinCapClient.get(`/assets/${coinId}`);

      if (response.data?.data) {
        const asset = response.data.data;
        return {
          symbol,
          name: asset.name || symbol,
          price: parseFloat(asset.priceUsd || '0'),
          change24h: parseFloat(asset.changePercent24Hr || '0'),
          changePercent24h: parseFloat(asset.changePercent24Hr || '0'),
          volume24h: parseFloat(asset.volumeUsd24Hr || '0'),
          marketCap: parseFloat(asset.marketCapUsd || '0'),
          rank: parseInt(asset.rank || '0'),
          lastUpdated: new Date().toISOString(),
          source: 'coincap'
        };
      }

      return null;
    } catch (error) {
      this.logger.debug('CoinCap fetch failed', { symbol, error: (error as Error).message });
      throw error;
    }
  }

  // ========== Cache Management ==========

  private getFromCache<T>(key: string, ttl: number): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age < ttl) {
      return entry as CacheEntry<T>;
    }

    return null;
  }

  private getStaleCache<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (entry) {
      return entry as CacheEntry<T>;
    }
    return null;
  }

  private setCache<T>(key: string, data: T, source: DataSourceName, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      source,
      ttl,
      staleAfter: Date.now() + ttl
    };
    this.cache.set(key, entry);

    // Cleanup old entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour max cache age

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheStatus(entry: CacheEntry<any>): DataStatus {
    const age = Date.now() - entry.timestamp;
    if (age < entry.ttl) return 'fresh';
    if (age < entry.ttl * 2) return 'stale';
    return 'stale';
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Clear cache for specific symbol
   */
  clearCacheForSymbol(symbol: string): void {
    const upperSymbol = symbol.toUpperCase();
    for (const key of this.cache.keys()) {
      if (key.includes(upperSymbol)) {
        this.cache.delete(key);
      }
    }
  }

  // ========== Health Tracking ==========

  private trackSuccess(source: DataSourceName, responseTime: number): void {
    const health = this.sourceHealth.get(source);
    if (!health) return;

    health.lastSuccess = Date.now();
    health.consecutiveFailures = 0;
    health.totalRequests++;
    health.isHealthy = true;
    health.isDisabled = false;
    
    // Update average response time
    const totalSuccessful = Math.round(health.totalRequests * (health.successRate / 100));
    health.averageResponseTime = ((health.averageResponseTime * (totalSuccessful - 1)) + responseTime) / totalSuccessful || responseTime;
    health.successRate = ((totalSuccessful) / health.totalRequests) * 100;

    this.sourceHealth.set(source, health);
  }

  private trackFailure(source: DataSourceName, error: Error): void {
    const health = this.sourceHealth.get(source);
    if (!health) return;

    health.lastFailure = Date.now();
    health.consecutiveFailures++;
    health.totalRequests++;
    
    // Calculate success rate
    const totalSuccessful = Math.round(health.totalRequests * (health.successRate / 100));
    health.successRate = (totalSuccessful / health.totalRequests) * 100;

    // Disable source after too many failures
    if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      health.isHealthy = false;
      health.isDisabled = true;
      health.disabledUntil = Date.now() + this.FAILURE_COOLDOWN_MS;

      this.logger.warn(`Source ${source} disabled due to consecutive failures`, {
        consecutiveFailures: health.consecutiveFailures,
        disabledUntil: new Date(health.disabledUntil).toISOString()
      });

      this.emitNotification({
        type: 'error',
        message: `Data source ${source} temporarily disabled`,
        source,
        timestamp: Date.now(),
        details: { reason: 'Too many consecutive failures' }
      });
    }

    this.sourceHealth.set(source, health);
  }

  private performHealthChecks(): void {
    for (const [name, health] of this.sourceHealth.entries()) {
      // Re-enable sources after cooldown
      if (health.isDisabled && health.disabledUntil && Date.now() >= health.disabledUntil) {
        health.isDisabled = false;
        health.consecutiveFailures = 0;
        this.sourceHealth.set(name, health);

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

  // ========== Polling Support (Real-time Updates without WebSocket) ==========

  private pollingTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Start polling for market data updates
   * This replaces WebSocket subscriptions with HTTP polling
   */
  startPolling(
    symbols: string[],
    callback: (data: MarketPrice[]) => void,
    interval: number = this.config.pollingInterval
  ): () => void {
    const pollerId = `poll_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const poll = async () => {
      try {
        const result = await this.fetchMultipleMarketData(symbols, true);
        if (result.success && result.data) {
          callback(result.data);
        }
      } catch (error) {
        this.logger.error('Polling error', { symbols }, error as Error);
      }
    };

    // Initial fetch
    poll();

    // Set up interval
    const timer = setInterval(poll, interval);
    this.pollingTimers.set(pollerId, timer);

    // Return cleanup function
    return () => {
      const existingTimer = this.pollingTimers.get(pollerId);
      if (existingTimer) {
        clearInterval(existingTimer);
        this.pollingTimers.delete(pollerId);
      }
    };
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const [id, timer] of this.pollingTimers.entries()) {
      clearInterval(timer);
      this.pollingTimers.delete(id);
    }
  }

  // ========== Notifications ==========

  private emitNotification(notification: DataSourceNotification): void {
    this.emit('notification', notification);
    this.logger.info('Data source notification', notification);
  }

  /**
   * Subscribe to notifications
   */
  onNotification(callback: (notification: DataSourceNotification) => void): () => void {
    this.on('notification', callback);
    return () => this.off('notification', callback);
  }

  // ========== Public API ==========

  /**
   * Get current configuration
   */
  getConfig(): MixedModeConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MixedModeConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Configuration updated', this.config);
  }

  /**
   * Get health status for all sources
   */
  getSourceHealthStatus(): SourceHealth[] {
    return Array.from(this.sourceHealth.values());
  }

  /**
   * Get health status for specific source
   */
  getSourceHealth(source: DataSourceName): SourceHealth | undefined {
    return this.sourceHealth.get(source);
  }

  /**
   * Get statistics
   */
  getStats() {
    const health = Array.from(this.sourceHealth.values());

    return {
      mode: this.config.enableMixedMode ? 'mixed' : 'single',
      primarySource: this.config.primarySource,
      fallbackSources: this.config.fallbackSources,
      cacheSize: this.cache.size,
      activePollers: this.pollingTimers.size,
      sources: {
        total: health.length,
        healthy: health.filter(h => h.isHealthy).length,
        disabled: health.filter(h => h.isDisabled).length
      },
      requests: {
        total: health.reduce((sum, h) => sum + h.totalRequests, 0),
        averageSuccessRate: health.length > 0
          ? health.reduce((sum, h) => sum + h.successRate, 0) / health.length
          : 0
      }
    };
  }

  /**
   * Manually disable a source
   */
  disableSource(source: DataSourceName, durationMs?: number): void {
    const health = this.sourceHealth.get(source);
    if (health) {
      health.isDisabled = true;
      health.disabledUntil = durationMs ? Date.now() + durationMs : undefined;
      this.sourceHealth.set(source, health);
      this.logger.info(`Manually disabled source: ${source}`);
    }
  }

  /**
   * Manually enable a source
   */
  enableSource(source: DataSourceName): void {
    const health = this.sourceHealth.get(source);
    if (health) {
      health.isDisabled = false;
      health.disabledUntil = undefined;
      health.consecutiveFailures = 0;
      this.sourceHealth.set(source, health);
      this.logger.info(`Manually enabled source: ${source}`);
    }
  }
}

// Export singleton instance
export const mixedModeDataService = MixedModeDataService.getInstance();
