// src/services/RealMarketDataService.ts
import axios from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { HistoricalDataService } from './HistoricalDataService.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';
import { logThrottled } from '../utils/logOnce.js';
import { ImprovedRealTimeDataService } from './ImprovedRealTimeDataService.js';
import { withExponentialBackoff, isRateLimitError } from '../utils/exponentialBackoff.js';
import {
  ENABLE_CMC,
  ENABLE_COINGECKO,
  ENABLE_CRYPTOCOMPARE,
  PROVIDER_TTL_MS,
  PRICE_CACHE_TTL_MS
} from '../config/flags.js';

export interface MarketData {
  symbol: string;
  price: number;
  volume: number;
  change24h: number;
  source: string;
  timestamp: number;
}

// Symbol mapping for CryptoCompare fallbacks
const SYMBOL_MAP: Record<string, string> = {
  'BTC': 'BTC', 'ETH': 'ETH', 'USDT': 'USDT', 'USDC': 'USDC',
  'XRP': 'XRP', 'ADA': 'ADA', 'DOT': 'DOT', 'LINK': 'LINK',
  'LTC': 'LTC', 'BCH': 'BCH', 'XLM': 'XLM', 'DOGE': 'DOGE',
  'SOL': 'SOL', 'BNB': 'BNB', 'MATIC': 'MATIC', 'AVAX': 'AVAX'
};

export class RealMarketDataService {
  private static instance: RealMarketDataService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private historicalService: HistoricalDataService;
  private realTimeService: ImprovedRealTimeDataService;

  // Rate limiters for each provider
  private readonly cmcLimiter = new TokenBucket(5, 1);      // 5 tokens, 1 req/sec
  private readonly ccLimiter = new TokenBucket(10, 2);      // CryptoCompare
  private readonly cgLimiter = new TokenBucket(10, 2);      // CoinGecko

  // Caches
  private readonly priceCache = new TTLCache<any>(PRICE_CACHE_TTL_MS);
  private readonly histCache = new TTLCache<any>(PROVIDER_TTL_MS);

  constructor() {
    this.historicalService = new HistoricalDataService();
    this.realTimeService = ImprovedRealTimeDataService.getInstance();
  }

  static getInstance(): RealMarketDataService {
    if (!RealMarketDataService.instance) {
      RealMarketDataService.instance = new RealMarketDataService();
    }
    return RealMarketDataService.instance;
  }

  /**
   * Get real-time WebSocket connection (alternative approach)
   * Use this for live streaming data
   */
  connectToRealTimeStream(url?: string): void {
    this.realTimeService.connectToRealTimeData(url);
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToRealTime(stream: string, callback: (data: any) => void): () => void {
    return this.realTimeService.subscribe(stream, callback);
  }

  /**
   * Check if real-time connection is active
   */
  isRealTimeConnected(): boolean {
    return this.realTimeService.isConnected();
  }

  private async tryCoinMarketCap(symbol: string, vs = 'USD'): Promise<number> {
    if (!ENABLE_CMC) console.error('cmc_disabled');

    await this.cmcLimiter.wait();

    const url = `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol.toUpperCase()}&convert=${vs.toUpperCase()}`;
    const headers = { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY! };

    return withExponentialBackoff(
      async () => {
        const response = await axios.get(url, {
          headers,
          validateStatus: status => status < 500,
          timeout: 10000
        });

        if (response.status === 401) console.error('cmc_401_invalid_key');
        if (response.status === 429) {
          this.logger.debug(`CoinMarketCap rate limit hit for ${symbol}, retrying with backoff...`);
          throw { response, status: 429, message: 'cmc_429_rate_limit' };
        }

        const price = response.data?.data?.[symbol.toUpperCase()]?.[0]?.quote?.[vs.toUpperCase()]?.price;
        if (typeof price !== 'number') console.error('cmc_invalid_response');

        return price;
      },
      {
        maxRetries: 3,
        initialDelayMs: 2000,
        maxDelayMs: 20000,
        retryOn: (error) => isRateLimitError(error)
      }
    );
  }

  private async tryCryptoCompare(symbol: string, vs = 'USD'): Promise<number> {
    await this.ccLimiter.wait();

    const fsym = SYMBOL_MAP[symbol.toUpperCase()] ?? symbol.toUpperCase();
    const url = `https://min-api.cryptocompare.com/data/price?fsym=${fsym}&tsyms=${vs.toUpperCase()}`;

    const headers = process.env.CRYPTOCOMPARE_KEY ?
      { authorization: `Apikey ${process.env.CRYPTOCOMPARE_KEY}` } : undefined;

    return withExponentialBackoff(
      async () => {
        const response = await axios.get(url, {
          headers,
          validateStatus: status => status < 500,
          timeout: 10000
        });

        if (response.status === 429) {
          this.logger.debug(`CryptoCompare rate limit hit for ${symbol}, retrying with backoff...`);
          throw { response, status: 429, message: 'cryptocompare_429_rate_limit' };
        }

        const price = response.data?.[vs.toUpperCase()];
        if (typeof price !== 'number') console.error('cryptocompare_no_data');

        return price;
      },
      {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 15000,
        retryOn: (error) => isRateLimitError(error)
      }
    );
  }

  private async tryCoinGecko(symbol: string, vs = 'USD'): Promise<number> {
    if (!ENABLE_COINGECKO) {
      this.logger.debug('CoinGecko disabled via config');
      throw new Error('COINGECKO_DISABLED');
    }

    await this.cgLimiter.wait();

    const geckoId = this.mapSymbolToGeckoId(symbol);
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=${vs.toLowerCase()}`;

    return withExponentialBackoff(
      async () => {
        const response = await axios.get(url, {
          validateStatus: status => status < 500, // Don't throw on 429
          timeout: 10000
        });

        // Handle 429 Rate Limit - soft disable with longer backoff
        if (response.status === 429) {
          this.logger.warn('CoinGecko rate limit (429) – temporarily disabling', {
            symbol,
            retryAfter: '60-120 seconds'
          });
          // Wait longer before retry
          await new Promise(resolve => setTimeout(resolve, 60000));
          throw { response, status: 429, message: 'coingecko_429_rate_limit' };
        }

        const price = response.data?.[geckoId]?.[vs.toLowerCase()];
        if (typeof price !== 'number') {
          this.logger.debug(`CoinGecko: No data for ${symbol}`, { geckoId });
          throw new Error('COINGECKO_NO_DATA');
        }

        return price;
      },
      {
        maxRetries: 2, // Reduced retries for 429
        initialDelayMs: 2000, // Longer initial delay
        maxDelayMs: 120000, // 2 minutes max delay
        retryOn: (error) => {
          // Only retry on 429, not on other errors
          return isRateLimitError(error) && error.status === 429;
        }
      }
    );
  }

  private mapSymbolToGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'LTC': 'litecoin',
      'LINK': 'chainlink',
      'BCH': 'bitcoin-cash',
      'XLM': 'stellar',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'SOL': 'solana',
      'MATIC': 'matic-network',
      'AVAX': 'avalanche-2',
      'ATOM': 'cosmos',
      'USDT': 'tether',
      'USDC': 'usd-coin'
    };
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  async getRealTimePrice(symbol: string, vs = 'USD'): Promise<number> {
    const cacheKey = `price:${symbol}:${vs}`;
    const cached = this.priceCache.get(cacheKey);
    if (cached) return cached;
    
    const providers: Array<() => Promise<number>> = [
      () => this.tryCoinGecko(symbol, vs),
      () => this.tryCryptoCompare(symbol, vs),
    ];
    
    // Only include CMC if enabled and has valid key
    if (ENABLE_CMC) {
      providers.unshift(() => this.tryCoinMarketCap(symbol, vs));
    }
    
    for (const provider of providers) {
      try {
        const price = await provider();
        this.priceCache.set(cacheKey, price);
        return price;
      } catch (error: any) {
        const errorMsg = String(error?.message || error);
        logThrottled(`price_${symbol}_${errorMsg}`, () => {
          this.logger.warn(`[Price] Provider failed for ${symbol}: ${errorMsg}`);
        }, 10000);
      }
    }
    
    console.error(`All price providers failed for ${symbol}`);
  }

  async getRealTimeMarketData(symbol: string, vs = 'USD'): Promise<MarketData> {
    const price = await this.getRealTimePrice(symbol, vs);
    
    return {
      symbol,
      price,
      volume: 0, // Volume not available from simple price endpoints
      change24h: 0, // Would need separate endpoint
      source: 'multi-provider',
      timestamp: Date.now()
    };
  }

  async getMultipleRealTimePrices(symbols: string[]): Promise<MarketData[]> {
    const prices = await Promise.allSettled(
      (symbols || []).map(symbol => 
        this.getRealTimeMarketData(symbol, 'USD')
          .then(data => data)
          .catch(() => null)
      )
    );

    return prices
      .filter((result): result is PromiseFulfilledResult<MarketData> =>
        result.status === 'fulfilled' && result.value !== null && result.value.price > 0
      )
      .map(result => result.value);
  }

  async getLatestNews(): Promise<any[]> {
    // News functionality moved to NewsService if it exists
    // Returning empty array to prevent errors
    return [];
  }

  async getMarketSentiment(): Promise<any> {
    // Fear & Greed Index (free API, no auth needed)
    try {
      const response = await fetch('https://api.alternative.me/fng/?limit=1', {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) console.error(`FNG API error: ${response.status}`);

      const data = await response.json();
      
      if (!data.data || !data.data[0]) {
        console.error('No Fear & Greed data available');
      }

      return {
        value: parseInt(data.data[0].value),
        classification: data.data[0].value_classification,
        timestamp: new Date(parseInt(data.data[0].timestamp) * 1000)
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch Fear & Greed: ${(error as Error).message}`);
      return { value: 50, classification: 'Neutral', timestamp: new Date() };
    }
  }

  async getHistoricalData(symbol: string, days: number = 30): Promise<any[]> {
    const cacheKey = `hist:${symbol}:${days}`;
    const cached = this.histCache.get(cacheKey);
    if (cached) return cached;

    try {
      const data = await this.historicalService.getHistoricalData(symbol, 'USD', days);
      
      // Transform to expected format (backward compatibility)
      const transformed = (data || []).map((point: any) => ({
        timestamp: point.timestamp || point.t,
        price: point.price || point.close || point.c,
        symbol: point.symbol || symbol,
        ...(point.open && { open: point.open || point.o }),
        ...(point.high && { high: point.high || point.h }),
        ...(point.low && { low: point.low || point.l }),
        ...(point.volume && { volume: point.volume || point.v })
      }));
      
      this.histCache.set(cacheKey, transformed);
      return transformed;
    } catch (error) {
      this.logger.error('Failed to get historical data', { symbol, days }, error as Error);
      throw error;
    }
  }

  async getTopCoins(limit: number = 100): Promise<any[]> {
    try {
      // Minimal stub - returns empty array for now
      // Can be implemented with actual API calls if needed
      this.logger.debug(`getTopCoins called with limit ${limit}`, { limit });
      return [];
    } catch (error) {
      this.logger.error('Failed to get top coins', { limit }, error as Error);
      return [];
    }
  }

  async getAggregatedMarketData(symbol: string) {
    try {
      const [historical, price] = await Promise.all([
        this.getHistoricalData(symbol, 30),
        this.getRealTimePrice(symbol)
      ]);

      const historicalFirst = historical[0];
      const performance = historicalFirst ? {
        change: price - historicalFirst.price,
        percent: ((price - historicalFirst.price) / historicalFirst.price) * 100
      } : { change: 0, percent: 0 };

      return {
        symbol,
        currentPrice: price,
        historical: historical.slice(-7),
        performance,
        timestamp: Date.now(),
        priceChange24h: performance.percent,
        volume24h: 0
      };
    } catch (error) {
      this.logger.error('Failed to get aggregated market data', { symbol }, error as Error);
      throw error;
    }
  }

  startRealTimeStream(
    symbols: string[], 
    callback: (data: MarketData) => void, 
    interval: number = 5000
  ): () => void {
    const intervalId = setInterval(async () => {
      for (const symbol of symbols) {
        try {
          const marketData = await this.getRealTimeMarketData(symbol);
          callback(marketData);
        } catch (error) {
          this.logger.error(`Real-time stream error for ${symbol}:`, {}, error as Error);
        }
      }
    }, interval);

    return () => clearInterval(intervalId);
  }
}
