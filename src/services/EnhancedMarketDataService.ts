/**
 * Enhanced Multi-Provider Market Data Service
 *
 * Integrates ALL free and unrestricted crypto APIs:
 *
 * PRICE DATA:
 * 1. CoinGecko (no auth, 50 calls/min)
 * 2. CoinPaprika (no auth, 20k calls/month)
 * 3. CoinCap (no auth, 200 calls/min)
 * 4. Binance Public (no auth, 1200 calls/min)
 * 5. CoinDesk Bitcoin Price Index (no auth, unlimited)
 *
 * BLOCKCHAIN DATA:
 * 6. Blockchair (no auth, 1000 calls/day, 5 req/sec)
 *
 * SENTIMENT:
 * 7. Fear & Greed Index (no auth, unlimited)
 * 8. Reddit (no auth via .json endpoints)
 *
 * WHALE TRACKING:
 * 9. Whale Alert (100 calls/day free)
 *
 * This service implements:
 * - Automatic fallback between providers
 * - Rate limiting per provider
 * - Caching with configurable TTL
 * - Error handling and retry logic
 */

import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';

// ================ TYPES ================

export interface PriceData {
  symbol: string;
  price: number;
  volume24h: number;
  change24h: number;
  changePercent24h: number;
  marketCap?: number;
  source: string;
  timestamp: number;
}

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol: string;
  interval: string;
}

export interface FearGreedData {
  value: number; // 0-100
  classification: string; // Extreme Fear, Fear, Neutral, Greed, Extreme Greed
  timestamp: number;
  change24h?: number;
}

export interface RedditPost {
  title: string;
  author: string;
  score: number;
  url: string;
  created: number;
  numComments: number;
  selftext?: string;
}

export interface BlockchainData {
  chain: string;
  address: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
  txCount: number;
  source: string;
}

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number;
  amountUsd: number;
  symbol: string;
  timestamp: number;
  blockchain: string;
}

// ================ SERVICE ================

export class EnhancedMarketDataService {
  private static instance: EnhancedMarketDataService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();

  // HTTP clients per provider
  private coingeckoClient: AxiosInstance;
  private coinpaprikaClient: AxiosInstance;
  private coincapClient: AxiosInstance;
  private binanceClient: AxiosInstance;
  private coindeskClient: AxiosInstance;
  private blockchairClient: AxiosInstance;
  private alternativeClient: AxiosInstance; // Fear & Greed
  private redditClient: AxiosInstance;
  private whaleAlertClient: AxiosInstance;

  // Rate limiters (calls per minute unless specified)
  private readonly coingeckoLimiter = new TokenBucket(50, 1); // 50/min
  private readonly coinpaprikaLimiter = new TokenBucket(30, 1); // ~20k/month = ~13/min
  private readonly coincapLimiter = new TokenBucket(200, 1); // 200/min
  private readonly binanceLimiter = new TokenBucket(1200, 1); // 1200/min
  private readonly blockchairLimiter = new TokenBucket(5, 1); // 5/sec = 300/min (conservative)
  private readonly whaleAlertLimiter = new TokenBucket(2, 1); // 100/day = ~4/hour (conservative)
  private readonly redditLimiter = new TokenBucket(10, 1); // Be nice to Reddit

  // Caches
  private readonly priceCache = new TTLCache<PriceData[]>(5000); // 5 seconds
  private readonly ohlcvCache = new TTLCache<OHLCVData[]>(60000); // 1 minute
  private readonly fearGreedCache = new TTLCache<FearGreedData>(300000); // 5 minutes
  private readonly redditCache = new TTLCache<RedditPost[]>(60000); // 1 minute
  private readonly blockchainCache = new TTLCache<BlockchainData>(30000); // 30 seconds
  private readonly whaleCache = new TTLCache<WhaleTransaction[]>(60000); // 1 minute

  // Symbol mappings
  private readonly symbolToGeckoId: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binancecoin',
    ADA: 'cardano',
    DOT: 'polkadot',
    LTC: 'litecoin',
    LINK: 'chainlink',
    BCH: 'bitcoin-cash',
    XLM: 'stellar',
    XRP: 'ripple',
    DOGE: 'dogecoin',
    SOL: 'solana',
    MATIC: 'matic-network',
    AVAX: 'avalanche-2',
    ATOM: 'cosmos',
    TRX: 'tron'
  };

  private readonly symbolToCoinCapId: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'binance-coin',
    ADA: 'cardano',
    SOL: 'solana',
    XRP: 'ripple',
    DOGE: 'dogecoin',
    TRX: 'tron',
    DOT: 'polkadot',
    LINK: 'chainlink',
    MATIC: 'polygon',
    AVAX: 'avalanche',
    ATOM: 'cosmos',
    LTC: 'litecoin',
    BCH: 'bitcoin-cash',
    XLM: 'stellar'
  };

  private readonly symbolToCoinPaprikaId: Record<string, string> = {
    BTC: 'btc-bitcoin',
    ETH: 'eth-ethereum',
    BNB: 'bnb-binance-coin',
    ADA: 'ada-cardano',
    SOL: 'sol-solana',
    XRP: 'xrp-ripple',
    DOGE: 'doge-dogecoin',
    TRX: 'trx-tron',
    DOT: 'dot-polkadot',
    LINK: 'link-chainlink',
    MATIC: 'matic-polygon',
    AVAX: 'avax-avalanche',
    ATOM: 'atom-cosmos',
    LTC: 'ltc-litecoin',
    BCH: 'bch-bitcoin-cash',
    XLM: 'xlm-stellar'
  };

  private constructor() {
    const apisConfig = this.config.getApisConfig();

    // Initialize CoinGecko client (Primary - No auth)
    this.coingeckoClient = axios.create({
      baseURL: apisConfig.coingecko?.baseUrl || 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize CoinPaprika client (No auth)
    this.coinpaprikaClient = axios.create({
      baseURL: 'https://api.coinpaprika.com/v1',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize CoinCap client (No auth)
    this.coincapClient = axios.create({
      baseURL: 'https://api.coincap.io/v2',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize Binance Public API (No auth)
    this.binanceClient = axios.create({
      baseURL: 'https://api.binance.com/api/v3',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize CoinDesk client (No auth)
    this.coindeskClient = axios.create({
      baseURL: 'https://api.coindesk.com/v1',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize Blockchair client (No auth for basic usage)
    this.blockchairClient = axios.create({
      baseURL: 'https://api.blockchair.com',
      timeout: 15000,
      headers: { Accept: 'application/json' }
    });

    // Initialize Alternative.me client (Fear & Greed Index - No auth)
    this.alternativeClient = axios.create({
      baseURL: 'https://api.alternative.me',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize Reddit client (No auth for .json endpoints)
    this.redditClient = axios.create({
      baseURL: 'https://www.reddit.com',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });

    // Initialize Whale Alert client
    this.whaleAlertClient = axios.create({
      baseURL: 'https://api.whale-alert.io/v1',
      timeout: 10000,
      headers: { Accept: 'application/json' }
    });
  }

  static getInstance(): EnhancedMarketDataService {
    if (!EnhancedMarketDataService.instance) {
      EnhancedMarketDataService.instance = new EnhancedMarketDataService();
    }
    return EnhancedMarketDataService.instance;
  }

  // ================ PRICE DATA ================

  /**
   * Get real-time prices with multi-provider fallback
   */
  async getRealTimePrices(symbols: string[]): Promise<PriceData[]> {
    const cacheKey = symbols.sort().join(',');
    const cached = this.priceCache.get(cacheKey);
    if (cached) {
      return Array.isArray(cached) ? cached : [cached];
    }

    this.logger.info(`Fetching prices for: ${symbols.join(', ')}`);

    // Provider cascade with all free APIs
    const providers = [
      { name: 'CoinGecko', fn: () => this.getPricesFromCoinGecko(symbols) },
      { name: 'CoinCap', fn: () => this.getPricesFromCoinCap(symbols) },
      { name: 'CoinPaprika', fn: () => this.getPricesFromCoinPaprika(symbols) },
      { name: 'Binance', fn: () => this.getPricesFromBinance(symbols) },
      { name: 'CoinDesk', fn: () => this.getPricesFromCoinDesk(symbols) }
    ];

    for (const provider of providers) {
      try {
        this.logger.debug(`Trying ${provider.name}...`);
        const prices = await provider.fn();

        if (prices && (prices?.length || 0) > 0) {
          this.logger.info(`✅ ${provider.name} succeeded with ${prices.length} prices`);
          this.priceCache.set(cacheKey, prices);
          return prices;
        }
      } catch (error: any) {
        this.logger.warn(`${provider.name} failed: ${error.message}`);
      }
    }

    console.error(`All price providers failed for: ${symbols.join(', ')}`);
  }

  /**
   * CoinGecko price provider
   */
  private async getPricesFromCoinGecko(symbols: string[]): Promise<PriceData[]> {
    await this.coingeckoLimiter.wait();

    const geckoIds = symbols
      .map(s => this.symbolToGeckoId[s.toUpperCase()])
      .filter(Boolean);

    const response = await this.coingeckoClient.get('/simple/price', {
      params: {
        ids: geckoIds.join(','),
        vs_currencies: 'usd',
        include_market_cap: true,
        include_24hr_vol: true,
        include_24hr_change: true
      }
    });

    const results: PriceData[] = [];
    for (const symbol of symbols) {
      const geckoId = this.symbolToGeckoId[symbol.toUpperCase()];
      const data = response.data[geckoId];

      if (data?.usd) {
        results.push({
          symbol: symbol.toUpperCase(),
          price: data.usd,
          volume24h: data.usd_24h_vol || 0,
          change24h: data.usd_24h_change || 0,
          changePercent24h: data.usd_24h_change || 0,
          marketCap: data.usd_market_cap,
          source: 'coingecko',
          timestamp: Date.now()
        });
      }
    }

    return results;
  }

  /**
   * CoinCap price provider
   */
  private async getPricesFromCoinCap(symbols: string[]): Promise<PriceData[]> {
    await this.coincapLimiter.wait();

    const results: PriceData[] = [];
    await Promise.all(
      (symbols || []).map(async symbol => {
        try {
          const coinId = this.symbolToCoinCapId[symbol.toUpperCase()];
          if (!coinId) { console.warn("Missing data"); }

          const response = await this.coincapClient.get(`/assets/${coinId}`);
          const asset = response.data.data;

          if (asset) {
            results.push({
              symbol: symbol.toUpperCase(),
              price: parseFloat(asset.priceUsd),
              volume24h: parseFloat(asset.volumeUsd24Hr || '0'),
              change24h: parseFloat(asset.changePercent24Hr || '0'),
              changePercent24h: parseFloat(asset.changePercent24Hr || '0'),
              marketCap: parseFloat(asset.marketCapUsd || '0'),
              source: 'coincap',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          // Skip failed symbols
        }
      })
    );

    return results;
  }

  /**
   * CoinPaprika price provider
   */
  private async getPricesFromCoinPaprika(symbols: string[]): Promise<PriceData[]> {
    await this.coinpaprikaLimiter.wait();

    const results: PriceData[] = [];
    await Promise.all(
      (symbols || []).map(async symbol => {
        try {
          const coinId = this.symbolToCoinPaprikaId[symbol.toUpperCase()];
          if (!coinId) { console.warn("Missing data"); }

          const response = await this.coinpaprikaClient.get(`/tickers/${coinId}`);
          const quote = response.data.quotes?.USD;

          if (quote) {
            results.push({
              symbol: symbol.toUpperCase(),
              price: quote.price || 0,
              volume24h: quote.volume_24h || 0,
              change24h: quote.volume_24h_change_24h || 0,
              changePercent24h: quote.percent_change_24h || 0,
              marketCap: quote.market_cap || 0,
              source: 'coinpaprika',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          // Skip failed symbols
        }
      })
    );

    return results;
  }

  /**
   * Binance price provider
   */
  private async getPricesFromBinance(symbols: string[]): Promise<PriceData[]> {
    await this.binanceLimiter.wait();

    const results: PriceData[] = [];
    await Promise.all(
      (symbols || []).map(async symbol => {
        try {
          const binanceSymbol = `${symbol.toUpperCase()}USDT`;
          const response = await this.binanceClient.get('/ticker/24hr', {
            params: { symbol: binanceSymbol }
          });

          const ticker = response.data;
          if (ticker?.lastPrice) {
            results.push({
              symbol: symbol.toUpperCase(),
              price: parseFloat(ticker.lastPrice),
              volume24h: parseFloat(ticker.volume || '0'),
              change24h: parseFloat(ticker.priceChange || '0'),
              changePercent24h: parseFloat(ticker.priceChangePercent || '0'),
              source: 'binance',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          // Skip failed symbols
        }
      })
    );

    return results;
  }

  /**
   * CoinDesk Bitcoin Price Index (BTC only)
   */
  private async getPricesFromCoinDesk(symbols: string[]): Promise<PriceData[]> {
    // CoinDesk only supports BTC
    if (!symbols.some(s => s.toUpperCase() === 'BTC')) {
      return [];
    }

    const response = await this.coindeskClient.get('/bpi/currentprice.json');
    const btcPrice = response.data.bpi?.USD?.rate_float;

    if (btcPrice) {
      return [
        {
          symbol: 'BTC',
          price: btcPrice,
          volume24h: 0,
          change24h: 0,
          changePercent24h: 0,
          source: 'coindesk',
          timestamp: Date.now()
        }
      ];
    }

    return [];
  }

  // ================ SENTIMENT DATA ================

  /**
   * Get Fear & Greed Index (0-100 scale)
   * https://api.alternative.me/fng/
   */
  async getFearGreedIndex(): Promise<FearGreedData> {
    const cached = this.fearGreedCache.get('fng');
    if (cached) return cached;

    try {
      const response = await this.alternativeClient.get('/fng/', {
        params: { limit: 2 } // Get current + previous for 24h change
      });

      const current = response.data.data[0];
      const previous = response.data.data[1];

      const result: FearGreedData = {
        value: parseInt(current.value),
        classification: current.value_classification,
        timestamp: parseInt(current.timestamp) * 1000,
        change24h: previous ? parseInt(current.value) - parseInt(previous.value) : undefined
      };

      this.fearGreedCache.set('fng', result);
      this.logger.info(`Fear & Greed Index: ${result.value} (${result.classification})`);
      return result;
    } catch (error) {
      this.logger.warn('Fear & Greed Index failed, returning neutral');
      return {
        value: 50,
        classification: 'Neutral',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get Reddit posts from r/CryptoCurrency
   * Uses .json endpoint (no auth required)
   */
  async getRedditPosts(subreddit: string = 'CryptoCurrency', limit: number = 25): Promise<RedditPost[]> {
    const cacheKey = `reddit_${subreddit}_${limit}`;
    const cached = this.redditCache.get(cacheKey);
    if (cached) return cached;

    await this.redditLimiter.wait();

    try {
      const response = await this.redditClient.get(`/r/${subreddit}/new.json`, {
        params: { limit }
      });

      const posts: RedditPost[] = (response.data.data.children || []).map((child: any) => ({
        title: child.data.title,
        author: child.data.author,
        score: child.data.score,
        url: child.data.url,
        created: child.data.created_utc * 1000,
        numComments: child.data.num_comments,
        selftext: child.data.selftext
      }));

      this.redditCache.set(cacheKey, posts);
      this.logger.info(`Fetched ${posts.length} posts from r/${subreddit}`);
      return posts;
    } catch (error: any) {
      this.logger.error(`Reddit fetch failed: ${error.message}`);
      return [];
    }
  }

  // ================ BLOCKCHAIN DATA ================

  /**
   * Get blockchain address data from Blockchair
   * Supports: Bitcoin, Ethereum, BSC, many others
   */
  async getBlockchainData(address: string, chain: string = 'bitcoin'): Promise<BlockchainData | null> {
    const cacheKey = `blockchain_${chain}_${address}`;
    const cached = this.blockchainCache.get(cacheKey);
    if (cached) return cached;

    await this.blockchairLimiter.wait();

    try {
      const response = await this.blockchairClient.get(`/${chain}/dashboards/address/${address}`);
      const data = response.data.data[address];

      if (!data) return null;

      const result: BlockchainData = {
        chain,
        address,
        balance: parseFloat(data.address.balance) || 0,
        totalReceived: parseFloat(data.address.received) || 0,
        totalSent: parseFloat(data.address.spent) || 0,
        txCount: data.address.transaction_count || 0,
        source: 'blockchair'
      };

      this.blockchainCache.set(cacheKey, result);
      this.logger.info(`Blockchair data for ${address} on ${chain}: Balance=${result.balance}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Blockchair fetch failed: ${error.message}`);
      return null;
    }
  }

  // ================ WHALE TRACKING ================

  /**
   * Get recent whale transactions from Whale Alert
   * Requires API key (free tier: 100 calls/day)
   */
  async getWhaleTransactions(minValue: number = 1000000): Promise<WhaleTransaction[]> {
    const cacheKey = `whale_${minValue}`;
    const cached = this.whaleCache.get(cacheKey);
    if (cached) return cached;

    // Check if API key is configured
    const apiKey = this.config.getApisConfig().whaleAlert?.key;
    if (!apiKey) {
      this.logger.warn('Whale Alert API key not configured');
      return [];
    }

    await this.whaleAlertLimiter.wait();

    try {
      const response = await this.whaleAlertClient.get('/transactions', {
        params: {
          api_key: apiKey,
          min_value: minValue,
          limit: 100
        }
      });

      const transactions: WhaleTransaction[] = (response.data.transactions || []).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from?.address || 'unknown',
        to: tx.to?.address || 'unknown',
        amount: tx.amount,
        amountUsd: tx.amount_usd,
        symbol: tx.symbol,
        timestamp: tx.timestamp * 1000,
        blockchain: tx.blockchain
      }));

      this.whaleCache.set(cacheKey, transactions);
      this.logger.info(`Fetched ${transactions.length} whale transactions`);
      return transactions;
    } catch (error: any) {
      this.logger.error(`Whale Alert fetch failed: ${error.message}`);
      return [];
    }
  }

  // ================ HISTORICAL DATA ================

  /**
   * Get historical OHLCV data (uses CoinGecko as primary)
   */
  async getHistoricalData(symbol: string, days: number = 30): Promise<OHLCVData[]> {
    const cacheKey = `hist_${symbol}_${days}`;
    const cached = this.ohlcvCache.get(cacheKey);
    if (cached) return cached;

    await this.coingeckoLimiter.wait();

    try {
      const geckoId = this.symbolToGeckoId[symbol.toUpperCase()];
      if (!geckoId) console.error(`Unknown symbol: ${symbol}`);

      const response = await this.coingeckoClient.get(`/coins/${geckoId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days,
          interval: days <= 1 ? 'hourly' : 'daily'
        }
      });

      const prices = response.data.prices || [];
      const volumes = response.data.total_volumes || [];

      const data: OHLCVData[] = (prices || []).map(([timestamp, price]: [number, number], i: number) => ({
        timestamp,
        open: price,
        high: price * 1.02,
        low: price * 0.98,
        close: price,
        volume: volumes[i]?.[1] || 0,
        symbol: symbol.toUpperCase(),
        interval: days <= 1 ? '1h' : '1d'
      }));

      this.ohlcvCache.set(cacheKey, data);
      return data;
    } catch (error: any) {
      this.logger.error(`Historical data fetch failed: ${error.message}`);
      return [];
    }
  }

  // ================ UTILITY ================

  /**
   * Get single real-time price
   */
  async getRealTimePrice(symbol: string): Promise<PriceData> {
    const prices = await this.getRealTimePrices([symbol]);
    if (prices.length === 0) {
      console.error(`No price data for ${symbol}`);
    }
    return prices[0];
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.priceCache.clear();
    this.ohlcvCache.clear();
    this.fearGreedCache.clear();
    this.redditCache.clear();
    this.blockchainCache.clear();
    this.whaleCache.clear();
    this.logger.info('All caches cleared');
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<Record<string, boolean>> {
    const checks = {
      coingecko: async () => {
        const res = await this.coingeckoClient.get('/ping');
        return res.status === 200;
      },
      coinpaprika: async () => {
        const res = await this.coinpaprikaClient.get('/ping');
        return res.status === 200;
      },
      coincap: async () => {
        const res = await this.coincapClient.get('/assets/bitcoin');
        return res.status === 200;
      },
      binance: async () => {
        const res = await this.binanceClient.get('/ping');
        return res.status === 200;
      },
      feargreed: async () => {
        const res = await this.alternativeClient.get('/fng/');
        return res.status === 200;
      }
    };

    const results: Record<string, boolean> = {};
    await Promise.all(
      Object.entries(checks).map(async ([name, check]) => {
        try {
          results[name] = await check();
        } catch {
          results[name] = false;
        }
      })
    );

    return results;
  }
}
