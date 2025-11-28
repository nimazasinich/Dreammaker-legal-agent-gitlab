// src/services/HistoricalDataService.ts
import axios from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';
import { logThrottled } from '../utils/logOnce.js';
import { PROVIDER_TTL_MS } from '../config/flags.js';

// Provider configuration
const PROVIDERS = {
  ttlMs: PROVIDER_TTL_MS,
  backoff: { baseMs: 500, factor: 2, maxMs: 8000, jitter: 0.25 },
  list: ['coingecko', 'cryptocompare', 'coincap', 'binance'] as const
} as const;

export class HistoricalDataService {
  private static instance: HistoricalDataService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  
  // Rate limiters for each provider
  private readonly cgLimiter = new TokenBucket(10, 0.5);    // CoinGecko: 10 capacity, 0.5 req/sec
  private readonly ccLimiter = new TokenBucket(10, 2);      // CryptoCompare: 10, 2 req/sec
  private readonly binanceLimiter = new TokenBucket(20, 2); // Binance: 20, 2 req/sec
  
  // Cache with proper TTL
  private readonly histCache = new TTLCache<any>(PROVIDERS.ttlMs);

  static getInstance(): HistoricalDataService {
    if (!HistoricalDataService.instance) {
      HistoricalDataService.instance = new HistoricalDataService();
    }
    return HistoricalDataService.instance;
  }

  // Retry with exponential backoff
  private async backoffRetry<T>(
    fn: () => Promise<T>, 
    attempt: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt > 4) throw error;

      const delay = Math.min(
        PROVIDERS.backoff.maxMs,
        PROVIDERS.backoff.baseMs * Math.pow(PROVIDERS.backoff.factor, attempt - 1)
      );

      const jitter = delay * PROVIDERS.backoff.jitter * (Math.random() * 2 - 1);
      const ms = Math.max(0, delay + jitter);

      this.logger.debug(`Retrying after ${ms}ms (attempt ${attempt})`);
      await new Promise(resolve => setTimeout(resolve, ms));
      return this.backoffRetry(fn, attempt + 1);
    }
  }

  // Data normalization per provider
  private normalizeHistoricalData(raw: any, provider: string, symbol: string) {
    if (provider === 'coingecko') {
      return raw?.prices?.map((x: [number, number]) => ({
        timestamp: x[0],
        price: x[1],
        symbol
      })) ?? [];
    }

    if (provider === 'cryptocompare') {
      return (raw?.Data?.Data ?? []).map((r: any) => ({
        timestamp: r.time * 1000,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volumefrom,
        symbol
      }));
    }

    if (provider === 'coincap') {
      return (raw?.data ?? []).map((r: any) => ({
        timestamp: new Date(r.time).getTime(),
        price: parseFloat(r.priceUsd),
        symbol
      }));
    }

    if (provider === 'binance') {
      return (raw || []).map((k: any[]) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        symbol
      }));
    }

    return [];
  }

  // Map symbol to provider-specific format
  private mapSymbolToProvider(symbol: string, provider: string): string {
    const mappings: Record<string, Record<string, string>> = {
      BTC: {
        coingecko: 'bitcoin',
        coincap: 'bitcoin'
      },
      ETH: {
        coingecko: 'ethereum',
        coincap: 'ethereum'
      },
      USDT: {
        coingecko: 'tether',
        coincap: 'tether'
      },
      BNB: {
        coingecko: 'binancecoin',
        coincap: 'binance-coin'
      },
      ADA: {
        coingecko: 'cardano',
        coincap: 'cardano'
      },
      SOL: {
        coingecko: 'solana',
        coincap: 'solana'
      }
    };

    return mappings[symbol.toUpperCase()]?.[provider] || symbol.toLowerCase();
  }

  // Try specific provider
  private async tryProvider(
    provider: string, 
    symbol: string, 
    vs: string, 
    days: number
  ) {
    if (provider === 'coingecko') {
      await this.cgLimiter.wait();
      
      const geckoId = this.mapSymbolToProvider(symbol, 'coingecko');
      const url = `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=${vs.toLowerCase()}&days=${days}&interval=daily`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          if (response.status === 429) {
            console.error('coingecko_429_rate_limit');
          }
          console.error(`coingecko_error_${response.status}`);
        }
        
        const data = await response.json();
        if (data?.status?.error_code || data?.error) {
          console.error('coingecko_error');
        }
        return this.normalizeHistoricalData(data, 'coingecko', symbol);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error('coingecko_timeout');
        }
        throw error;
      }
    }

    if (provider === 'cryptocompare') {
      await this.ccLimiter.wait();
      
      const apiKey = this.config.getConfig().apis?.cryptocompare?.key ||
        process.env.CRYPTOCOMPARE_API_KEY || '';
      
      const headers: any = {};
      if (apiKey) {
        headers.authorization = `Apikey ${apiKey}`;
      }

      const url = `https://min-api.cryptocompare.com/data/v2/histoday?fsym=${symbol.toUpperCase()}&tsym=${vs.toUpperCase()}&limit=${Math.min(days, 2000)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, {
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) console.error('cryptocompare_error');
        const data = await response.json();
        if (data?.Response === 'Error') console.error('cryptocompare_error');
        return this.normalizeHistoricalData(data, 'cryptocompare', symbol);
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    if (provider === 'coincap') {
      const coincapId = this.mapSymbolToProvider(symbol, 'coincap');
      const url = `https://api.coincap.io/v2/assets/${coincapId}/history?interval=d1&limit=${days}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) console.error('coincap_error');
        const data = await response.json();
        return this.normalizeHistoricalData(data, 'coincap', symbol);
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    if (provider === 'binance') {
      await this.binanceLimiter.wait();
      
      const quote = vs.toUpperCase().replace(/[^A-Z]/g, '') || 'USDT';
      const symbolPair = `${symbol.toUpperCase()}${quote}`;
      const url = `https://api.binance.com/api/v3/klines?symbol=${symbolPair}&interval=1d&limit=${Math.min(days, 1000)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) console.error('binance_error');
        const data = await response.json();
        return this.normalizeHistoricalData(data, 'binance', symbol);
      } catch (error: any) {
        clearTimeout(timeoutId);
        throw error;
      }
    }

    console.error(`Unknown provider: ${provider}`);
  }

  // Main historical data method with multi-provider fallback
  async getHistoricalData(
    symbol: string, 
    vs: string = 'USD', 
    days: number = 7
  ): Promise<any[]> {
    const key = `${symbol}:${vs}:${days}`;
    const cached = this.histCache.get(key);

    // Return cached data if valid
    if (cached) {
      this.logger.debug(`Using cached historical data for ${key}`);
      return cached;
    }

    // Try providers in order with fallbacks
    for (const provider of PROVIDERS.list) {
      try {
        this.logger.debug(`Trying ${provider} for ${symbol}...`);

        const data = await this.backoffRetry(() =>
          this.tryProvider(provider, symbol, vs, days)
        );

        if (data?.length > 0) {
          this.logger.info(`Success from ${provider} with ${data.length} records`);
          this.histCache.set(key, data);
          return data;
        }
      } catch (error: any) {
        logThrottled(`hist_${provider}_${symbol}_failed`, () => {
          this.logger.warn(`${provider} failed for ${symbol}`, {
            error: error?.message || error
          });
        }, 10000);
        // Continue to next provider
      }
    }

    logThrottled(`hist_all_failed_${symbol}`, () => {
      this.logger.error(`All historical data providers failed for ${symbol}`);
    }, 60000);
    console.error(`All historical providers failed for ${symbol}`);
  }

  // Get USDT price with multiple fallbacks
  async getUSDTPrice(): Promise<{ price: number; source: string }> {
    const providers = [
      {
        name: 'CoinGecko',
        fetch: async () => {
          const data = await this.getHistoricalData('USDT', 'usd', 1);
          return data[0]?.price || null;
        }
      },
      {
        name: 'Binance',
        fetch: async () => {
          try {
            const data = await this.tryProvider('binance', 'USDT', 'USDT', 1);
            return data[0]?.close || null;
          } catch {
            return null;
          }
        }
      },
      {
        name: 'CoinCap',
        fetch: async () => {
          try {
            const data = await this.tryProvider('coincap', 'tether', 'usd', 1);
            return data[0]?.price || null;
          } catch {
            return null;
          }
        }
      }
    ];

    for (const provider of providers) {
      try {
        const price = await provider.fetch();
        if (price && price > 0) {
          return { price, source: provider.name };
        }
      } catch (error) {
        this.logger.warn(`${provider.name} failed for USDT price`);
      }
    }

    console.error('All USDT price providers failed');
  }
}

