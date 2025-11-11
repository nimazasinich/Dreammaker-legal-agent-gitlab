// src/services/MultiProviderMarketDataService.ts
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';
import { MarketData } from '../types/index.js';
import { getAPIKey, getBaseURL } from '../config/CentralizedAPIConfig.js';
import { ResourceMonitorService } from './ResourceMonitorService.js';
import { HFOHLCVService } from './HFOHLCVService.js';
import { AlternateRegistryService } from './AlternateRegistryService.js';
import { requestCoordinator } from '../utils/requestCoordinator.js';

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

export class MultiProviderMarketDataService {
  private static instance: MultiProviderMarketDataService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  
  // HTTP clients per provider
  private coingeckoClient: AxiosInstance;
  private cmcClient: AxiosInstance;
  private cmcClient2: AxiosInstance; // Second CMC key
  private cryptoCompareClient: AxiosInstance;
  private binanceClient: AxiosInstance;
  private coincapClient: AxiosInstance;
  private coinpaprikaClient: AxiosInstance;
  private coinloreClient: AxiosInstance;
  private krakenClient: AxiosInstance;

  // HF Services
  private hfOHLCVService: HFOHLCVService;
  private alternateRegistry: AlternateRegistryService;
  private resourceMonitor: ResourceMonitorService;

  // Rate limiters
  private readonly coingeckoLimiter = new TokenBucket(50, 1); // 50 calls per minute
  private readonly cmcLimiter = new TokenBucket(5, 1); // 5 calls per second (Basic tier)
  private readonly cryptoCompareLimiter = new TokenBucket(100, 2); // 100 calls per minute
  private readonly binanceLimiter = new TokenBucket(1200, 1); // 1200 calls per minute
  private readonly coincapLimiter = new TokenBucket(200, 1); // 200 calls per minute
  
  // Caches - افزایش TTL برای کاهش فشار بر API ها
  private readonly priceCache = new TTLCache<PriceData>(15000); // افزایش از 5 به 15 ثانیه
  private readonly ohlcvCache = new TTLCache<OHLCVData[]>(120000); // افزایش از 1 به 2 دقیقه
  
  // Symbol to CoinGecko ID mapping
  private readonly symbolToGeckoId: Record<string, string> = {
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
    'TRX': 'tron',
    'USDT': 'tether',
    'USDC': 'usd-coin'
  };

  private constructor() {
    const apisConfig = this.config.getApisConfig();

    // Resolve API keys using fallback chain: env > config > api - Copy.txt > defaults
    const CMC_KEY_1 = getAPIKey('coinmarketcap', 'marketData') || 'b54bcf4d-1bca-4e8e-9a24-22ff2c3d462c';
    const CMC_KEY_2 = getAPIKey('coinmarketcap_2', 'marketData') || getAPIKey('coinmarketcap_alt', 'marketData') || '04cf4b5b-9868-465c-8ba0-9f2e78c92eb1';
    const CRYPTOCOMPARE_KEY = getAPIKey('cryptocompare', 'marketData') || 'e79c8e6d4c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f';

    // Initialize CoinGecko client (Primary - No key needed)
    this.coingeckoClient = axios.create({
      baseURL: getBaseURL('coingecko', 'marketData') || apisConfig.coingecko?.baseUrl || 'https://api.coingecko.com/api/v3',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Initialize CoinMarketCap client (First Key)
    this.cmcClient = axios.create({
      baseURL: getBaseURL('coinmarketcap', 'marketData') || apisConfig.coinmarketcap?.baseUrl || 'https://pro-api.coinmarketcap.com/v1',
      timeout: 10000,
      headers: {
        'X-CMC_PRO_API_KEY': CMC_KEY_1,
        'Accept': 'application/json'
      }
    });

    // Initialize CoinMarketCap client (Second Key - Fallback)
    this.cmcClient2 = axios.create({
      baseURL: getBaseURL('coinmarketcap', 'marketData') || apisConfig.coinmarketcap?.baseUrl || 'https://pro-api.coinmarketcap.com/v1',
      timeout: 10000,
      headers: {
        'X-CMC_PRO_API_KEY': CMC_KEY_2,
        'Accept': 'application/json'
      }
    });

    // Initialize CryptoCompare client
    this.cryptoCompareClient = axios.create({
      baseURL: getBaseURL('cryptocompare', 'marketData') || apisConfig.cryptocompare?.baseUrl || 'https://min-api.cryptocompare.com/data',
      timeout: 10000,
      headers: CRYPTOCOMPARE_KEY ? {
        'authorization': `Apikey ${CRYPTOCOMPARE_KEY}`
      } : {}
    });

    // Initialize Binance Public API (No key needed)
    this.binanceClient = axios.create({
      baseURL: 'https://api.binance.com/api/v3',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Initialize CoinCap client (No key needed)
    this.coincapClient = axios.create({
      baseURL: 'https://api.coincap.io/v2',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Initialize CoinPaprika client (No key needed)
    this.coinpaprikaClient = axios.create({
      baseURL: 'https://api.coinpaprika.com/v1',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Initialize CoinLore client (No key needed)
    this.coinloreClient = axios.create({
      baseURL: 'https://api.coinlore.net/api',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Initialize Kraken client (No key needed - Public API)
    this.krakenClient = axios.create({
      baseURL: 'https://api.kraken.com/0/public',
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });

    // Initialize HF Services
    this.hfOHLCVService = HFOHLCVService.getInstance();
    this.alternateRegistry = AlternateRegistryService.getInstance();
    this.resourceMonitor = ResourceMonitorService.getInstance();

    this.logger.info('✅ MultiProviderMarketDataService initialized with all providers (including Kraken & HuggingFace)');
  }

  static getInstance(): MultiProviderMarketDataService {
    if (!MultiProviderMarketDataService.instance) {
      MultiProviderMarketDataService.instance = new MultiProviderMarketDataService();
    }
    return MultiProviderMarketDataService.instance;
  }

  /**
   * Get real-time prices for multiple symbols
   */
  async getRealTimePrices(symbols: string[]): Promise<PriceData[]> {
    const cacheKey = symbols.sort().join(',');
    const cached = this.priceCache.get(cacheKey);
    if (cached) {
      this.resourceMonitor.trackCacheHit();
      this.logger.debug(`Cache hit for symbols: ${symbols.join(',')}`, { count: Array.isArray(cached) ? cached.length : 1 });
      return Array.isArray(cached) ? cached : [cached];
    }
    
    this.resourceMonitor.trackCacheMiss();

    // استفاده از requestCoordinator برای جلوگیری از race conditions
    return requestCoordinator.coordinate(
      `prices:${cacheKey}`,
      () => this.fetchRealTimePrices(symbols),
      30000
    );
  }

  /**
   * واقعی‌سازی fetch prices (استفاده شده توسط coordinator)
   */
  private async fetchRealTimePrices(symbols: string[]): Promise<PriceData[]> {
    this.logger.info(`Fetching prices for symbols: ${symbols.join(',')}`, { count: symbols.length });

    // Use resource monitor to get recommended providers (smart prioritization)
    const recommendedProviders = this.resourceMonitor.getRecommendedProviders('market');
    
    // Build provider list based on recommendations, but keep free providers first
    const providers = [
      { name: 'CoinGecko', fn: () => this.getPricesFromCoinGecko(symbols) },
      { name: 'CoinCap', fn: () => this.getPricesFromCoinCap(symbols) },
      { name: 'CoinPaprika', fn: () => this.getPricesFromCoinPaprika(symbols) },
      { name: 'Binance', fn: () => this.getPricesFromBinance(symbols) },
      { name: 'CryptoCompare', fn: () => this.getPricesFromCryptoCompare(symbols) },
      { name: 'CoinLore', fn: () => this.getPricesFromCoinLore(symbols) }
      // CoinMarketCap removed - Limited quota
    ];

    const errors: string[] = [];
    
    for (const provider of providers) {
      const providerKey = provider.name.toLowerCase();
      
      // Check if provider should be used (resource monitor)
      if (!this.resourceMonitor.shouldUseProvider(providerKey)) {
        this.logger.debug(`⏭️ Skipping ${provider.name} (resource monitor recommendation)`);
        continue;
      }
      
      try {
        this.logger.debug(`🔄 Trying ${provider.name} for ${symbols.length} symbols`);
        const startTime = Date.now();
        
        // Track request
        this.resourceMonitor.trackRequest(providerKey, startTime);
        
        const prices = await provider.fn();
        const duration = Date.now() - startTime;
        
        if (prices && (prices?.length || 0) > 0) {
          // Track success
          this.resourceMonitor.trackSuccess(providerKey, startTime);
          
          this.logger.info(`✅ ${provider.name} succeeded in ${duration}ms`, {
            count: prices.length,
            symbols: (prices || []).map(p => p.symbol).join(',')
          });
          const cacheKey = symbols.sort().join(',');
          prices.forEach(price => this.priceCache.set(`${price.symbol}`, price));
          return prices;
        } else {
          // Track failure (empty response)
          this.resourceMonitor.trackFailure(providerKey, startTime);
          
          this.logger.warn(`⚠️ ${provider.name} returned empty array after ${duration}ms`);
          errors.push(`${provider.name}: Empty response`);
        }
      } catch (error: any) {
        // Track failure
        const startTime = Date.now() - 1000; // Approximate
        this.resourceMonitor.trackFailure(providerKey, startTime, error);
        
        const errorMsg = `${provider.name}: ${error.message}`;
        this.logger.warn(`❌ ${errorMsg}`, { 
          provider: provider.name,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        errors.push(errorMsg);
        // Continue to next provider
      }
    }

    // All providers failed - log detailed error
    const errorMessage = `All ${providers.length} price providers failed for symbols: ${symbols.join(', ')}. Errors: ${errors.join('; ')}`;
    this.logger.error(`❌ ${errorMessage}`, { errors });
    this.logger.error(`Provider failure summary:`, { count: errors.length });
    // بازگشت آرایه خالی به جای throw error برای جلوگیری از crash
    return [];
  }

  /**
   * Get prices from CoinGecko (Primary)
   */
  private async getPricesFromCoinGecko(symbols: string[]): Promise<PriceData[]> {
    await this.coingeckoLimiter.wait();
    
    const geckoIds = symbols
      .map(s => this.symbolToGeckoId[s.toUpperCase()] || s.toLowerCase())
      .filter(Boolean);
    
    this.logger.debug(`CoinGecko request`, { 
      symbols: symbols.join(','), 
      geckoIds: geckoIds.join(',') 
    });
    
    try {
      const response = await this.coingeckoClient.get('/simple/price', {
        params: {
          ids: geckoIds.join(','),
          vs_currencies: 'usd',
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        },
        validateStatus: (status) => status < 500 // Don't throw on 429
      });

      // Handle 429 Rate Limit - soft disable with longer backoff
      if (response.status === 429) {
        this.logger.warn('CoinGecko rate limit exceeded (429) – temporarily disabling provider', {
          retryAfter: '60-120 seconds',
          message: 'CoinGecko will be skipped until rate limit resets'
        });
        // Increase limiter delay for next requests
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 60 seconds
        throw new Error('COINGECKO_RATE_LIMIT'); // Let fallback handle it
      }

      const data = response.data;
      const results: PriceData[] = [];

      for (const symbol of symbols) {
        const geckoId = this.symbolToGeckoId[symbol.toUpperCase()] || symbol.toLowerCase();
        const coinData = data[geckoId];
        
        if (coinData && coinData.usd) {
          results.push({
            symbol: symbol.toUpperCase(),
            price: coinData.usd,
            volume24h: coinData.usd_24h_vol || 0,
            change24h: coinData.usd_24h_change || 0,
            changePercent24h: coinData.usd_24h_change || 0,
            marketCap: coinData.usd_market_cap,
            source: 'coingecko',
            timestamp: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now()
          });
        } else {
          this.logger.warn(`CoinGecko: No data for ${symbol} (geckoId: ${geckoId})`);
        }
      }

      if (results.length === 0) {
        this.logger.warn(`CoinGecko: No valid prices returned`, { 
          requestedSymbols: symbols, 
          geckoIds,
          responseKeys: Object.keys(data || {})
        });
      }

      return results;
    } catch (error: any) {
      // Handle 429 specifically
      if (error.response?.status === 429 || error.message === 'COINGECKO_RATE_LIMIT') {
        this.logger.warn('CoinGecko rate limit (429) – using fallback providers', {
          symbols: symbols.join(',')
        });
        throw error; // Let fallback chain handle it
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get prices from CoinMarketCap (Fallback)
   * @param symbols Array of symbols
   * @param keyNumber Which API key to use (1 or 2)
   */
  private async getPricesFromCoinMarketCap(symbols: string[], keyNumber: number = 1): Promise<PriceData[]> {
    await this.cmcLimiter.wait();
    
    const client = keyNumber === 1 ? this.cmcClient : this.cmcClient2;
    
    const response = await client.get('/cryptocurrency/quotes/latest', {
      params: {
        symbol: symbols.join(','),
        convert: 'USD'
      }
    });

    const data = response.data.data;
    const results: PriceData[] = [];

    for (const symbol of symbols) {
      const symbolData = data[symbol.toUpperCase()];
      if (symbolData && symbolData[0]) {
        const quote = symbolData[0].quote.USD;
        results.push({
          symbol: symbol.toUpperCase(),
          price: quote.price,
          volume24h: quote.volume_24h || 0,
          change24h: quote.volume_24h_change_24h || 0,
          changePercent24h: quote.percent_change_24h || 0,
          marketCap: quote.market_cap,
          source: `coinmarketcap_key${keyNumber}`,
          timestamp: Date.now()
        });
      }
    }

    return results;
  }

  /**
   * Get prices from CryptoCompare (Fallback)
   */
  private async getPricesFromCryptoCompare(symbols: string[]): Promise<PriceData[]> {
    await this.cryptoCompareLimiter.wait();
    
    const results: PriceData[] = [];
    
    // CryptoCompare doesn't support batch requests efficiently, so we do them in parallel
    const pricePromises = (symbols || []).map(async (symbol): Promise<PriceData | null> => {
      try {
        const response = await this.cryptoCompareClient.get('/price', {
          params: {
            fsym: symbol.toUpperCase(),
            tsyms: 'USD'
          }
        });

        const price = response.data.USD;
        if (typeof price === 'number') {
          // Get additional data
          const fullData = await this.cryptoCompareClient.get('/pricemultifull', {
            params: {
              fsyms: symbol.toUpperCase(),
              tsyms: 'USD'
            }
          }).catch(() => null);

          const fullInfo = fullData?.data?.RAW?.[symbol.toUpperCase()]?.USD;

          return {
            symbol: symbol.toUpperCase(),
            price,
            volume24h: fullInfo?.VOLUME24HOUR || 0,
            change24h: fullInfo?.CHANGE24HOUR || 0,
            changePercent24h: fullInfo?.CHANGEPCT24HOUR || 0,
            marketCap: fullInfo?.MKTCAP,
            source: 'cryptocompare',
            timestamp: Date.now()
          };
        }
      } catch (error) {
        this.logger.warn(`CryptoCompare failed for ${symbol}`, { symbol }, error as Error);
      }
      return null;
    });

    const prices = await Promise.all(pricePromises);
    return prices.filter((p): p is PriceData => p !== null);
  }

  /**
   * Get prices from Binance Public API (Fallback)
   * Uses batch endpoint for better performance
   */
  private async getPricesFromBinance(symbols: string[]): Promise<PriceData[]> {
    await this.binanceLimiter.wait();
    
    const symbolMap: Record<string, string> = {
      'BTC': 'BTCUSDT',
      'ETH': 'ETHUSDT',
      'BNB': 'BNBUSDT',
      'ADA': 'ADAUSDT',
      'SOL': 'SOLUSDT',
      'XRP': 'XRPUSDT',
      'DOGE': 'DOGEUSDT',
      'TRX': 'TRXUSDT',
      'DOT': 'DOTUSDT',
      'LINK': 'LINKUSDT',
      'MATIC': 'MATICUSDT',
      'AVAX': 'AVAXUSDT',
      'ATOM': 'ATOMUSDT',
      'LTC': 'LTCUSDT',
      'BCH': 'BCHUSDT',
      'XLM': 'XLMUSDT'
    };

    // Convert symbols to Binance format
    const binanceSymbols = (symbols || []).map(s => symbolMap[s.toUpperCase()] || `${s.toUpperCase()}USDT`);
    
    try {
      // Try batch endpoint first (for multiple symbols)
      if ((binanceSymbols?.length || 0) > 0) {
        // Binance batch endpoint requires JSON array in query params
        const symbolsJson = JSON.stringify(binanceSymbols);
        const encodedSymbols = encodeURIComponent(symbolsJson);
        
        this.logger.debug(`Binance batch request`, { 
          symbols: binanceSymbols.join(','),
          count: binanceSymbols.length 
        });
        
        try {
          // Try /ticker/price endpoint with JSON array
          // Binance requires: symbols=["BTCUSDT","ETHUSDT"] as URL-encoded JSON
          const symbolsParam = encodeURIComponent(JSON.stringify(binanceSymbols));
          const batchUrl = `/ticker/price?symbols=${symbolsParam}`;
          
          this.logger.debug(`Binance batch URL`, { url: batchUrl });
          
          const batchResponse = await this.binanceClient.get(batchUrl);
          
          if (batchResponse.data && Array.isArray(batchResponse.data) && (batchResponse.data?.length || 0) > 0) {
            this.logger.info(`Binance batch succeeded`, { count: batchResponse.data.length });
            
            return (batchResponse.data || []).map((item: any) => {
              const baseSymbol = item.symbol.replace('USDT', '');
              return {
                symbol: baseSymbol,
                price: parseFloat(item.price || '0'),
                volume24h: 0, // Price endpoint doesn't provide volume
                change24h: 0,
                changePercent24h: 0,
                marketCap: undefined,
                source: 'binance',
                timestamp: Date.now()
              };
            });
          }
        } catch (batchError: any) {
          this.logger.debug(`Binance batch endpoint failed, trying individual requests`, { 
            error: batchError.message,
            status: batchError.response?.status,
            data: batchError.response?.data
          });
        }
      }
      
      // Fallback: Individual requests (more reliable)
      const pricePromises = (binanceSymbols || []).map(async (binanceSymbol, index): Promise<PriceData | null> => {
        try {
          // Small delay to avoid rate limit
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100 * index));
          }

          // Get 24hr ticker stats (includes volume and change)
          const tickerResponse = await this.binanceClient.get('/ticker/24hr', {
            params: { symbol: binanceSymbol }
          });

          const ticker = tickerResponse.data;
          if (ticker && ticker.lastPrice) {
            const baseSymbol = binanceSymbol.replace('USDT', '');
            return {
              symbol: baseSymbol,
              price: parseFloat(ticker.lastPrice),
              volume24h: parseFloat(ticker.volume || '0'),
              change24h: parseFloat(ticker.priceChange || '0'),
              changePercent24h: parseFloat(ticker.priceChangePercent || '0'),
              marketCap: undefined,
              source: 'binance',
              timestamp: Date.now()
            };
          }
        } catch (error: any) {
          this.logger.debug(`Binance failed for ${binanceSymbol}`, {
            error: error.message
          });
        }
        return null;
      });

      const prices = await Promise.all(pricePromises);
      const validPrices = prices.filter((p): p is PriceData => p !== null);
      
      if (validPrices.length === 0) {
        this.logger.warn(`Binance: No valid prices returned`, { 
          requestedSymbols: symbols,
          binanceSymbols 
        });
      }
      
      return validPrices;
    } catch (error: any) {
      this.logger.error(`Binance API error`, { 
        error: error.message,
        symbols: symbols.join(',')
      });
      return [];
    }
  }

  /**
   * Get prices from CoinCap (Fallback)
   */
  private async getPricesFromCoinCap(symbols: string[]): Promise<PriceData[]> {
    await this.coincapLimiter.wait();
    
    const results: PriceData[] = [];
    const symbolIdMap: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binance-coin',
      'ADA': 'cardano',
      'SOL': 'solana',
      'XRP': 'ripple',
      'DOGE': 'dogecoin',
      'TRX': 'tron',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'MATIC': 'polygon',
      'AVAX': 'avalanche',
      'ATOM': 'cosmos',
      'LTC': 'litecoin',
      'BCH': 'bitcoin-cash',
      'XLM': 'stellar'
    };

    const pricePromises = (symbols || []).map(async (symbol): Promise<PriceData | null> => {
      try {
        const coinId = symbolIdMap[symbol.toUpperCase()] || symbol.toLowerCase();

        const response = await this.coincapClient.get(`/assets/${coinId}`);

        if (response.data && response.data.data) {
          const asset = response.data.data;
          return {
            symbol: symbol.toUpperCase(),
            price: parseFloat(asset.priceUsd || '0'),
            volume24h: parseFloat(asset.volumeUsd24Hr || '0'),
            change24h: parseFloat(asset.changePercent24Hr || '0'),
            changePercent24h: parseFloat(asset.changePercent24Hr || '0'),
            marketCap: parseFloat(asset.marketCapUsd || '0'),
            source: 'coincap',
            timestamp: Date.now()
          };
        }
      } catch (error) {
        this.logger.debug(`CoinCap failed for ${symbol}`, { symbol, error: (error as Error).message });
      }
      return null;
    });

    const prices = await Promise.all(pricePromises);
    return prices.filter((p): p is PriceData => p !== null);
  }

  /**
   * Get prices from CoinPaprika (Fallback)
   */
  private async getPricesFromCoinPaprika(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const symbolIdMap: Record<string, string> = {
      'BTC': 'btc-bitcoin',
      'ETH': 'eth-ethereum',
      'BNB': 'bnb-binance-coin',
      'ADA': 'ada-cardano',
      'SOL': 'sol-solana',
      'XRP': 'xrp-ripple',
      'DOGE': 'doge-dogecoin',
      'TRX': 'trx-tron',
      'DOT': 'dot-polkadot',
      'LINK': 'link-chainlink',
      'MATIC': 'matic-polygon',
      'AVAX': 'avax-avalanche',
      'ATOM': 'atom-cosmos',
      'LTC': 'ltc-litecoin',
      'BCH': 'bch-bitcoin-cash',
      'XLM': 'xlm-stellar'
    };

    const pricePromises = (symbols || []).map(async (symbol): Promise<PriceData | null> => {
      try {
        const coinId = symbolIdMap[symbol.toUpperCase()] || symbol.toLowerCase();

        const response = await this.coinpaprikaClient.get(`/tickers/${coinId}`);

        if (response.data && response.data.quotes && response.data.quotes.USD) {
          const quote = response.data.quotes.USD;
          return {
            symbol: symbol.toUpperCase(),
            price: quote.price || 0,
            volume24h: quote.volume_24h || 0,
            change24h: quote.volume_24h_change_24h || 0,
            changePercent24h: quote.percent_change_24h || 0,
            marketCap: quote.market_cap || 0,
            source: 'coinpaprika',
            timestamp: Date.now()
          };
        }
      } catch (error) {
        this.logger.debug(`CoinPaprika failed for ${symbol}`, { symbol, error: (error as Error).message });
      }
      return null;
    });

    const prices = await Promise.all(pricePromises);
    return prices.filter((p): p is PriceData => p !== null);
  }

  /**
   * Get prices from CoinLore (Fallback)
   */
  private async getPricesFromCoinLore(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const symbolIdMap: Record<string, number> = {
      'BTC': 90,
      'ETH': 80,
      'BNB': 2710,
      'ADA': 257,
      'SOL': 48543,
      'XRP': 58,
      'DOGE': 2,
      'TRX': 1958,
      'DOT': 45061,
      'LINK': 2741,
      'MATIC': 3890,
      'AVAX': 45320,
      'ATOM': 4388,
      'LTC': 1,
      'BCH': 2321,
      'XLM': 512
    };

    try {
      // CoinLore returns all coins in one request
      const response = await this.coinloreClient.get('/ticker/');

      if (response.data && Array.isArray(response.data)) {
        for (const symbol of symbols) {
          const coinId = symbolIdMap[symbol.toUpperCase()];
          if (coinId) {
            const coinData = response.data.find((c: any) => c.id === coinId.toString());
            if (coinData) {
              results.push({
                symbol: symbol.toUpperCase(),
                price: parseFloat(coinData.price_usd || '0'),
                volume24h: parseFloat(coinData.volume24 || '0'),
                change24h: parseFloat(coinData.price_change_24h || '0'),
                changePercent24h: parseFloat(coinData.percent_change_24h || '0'),
                marketCap: parseFloat(coinData.market_cap_usd || '0'),
                source: 'coinlore',
                timestamp: Date.now()
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.debug(`CoinLore failed`, { error: (error as Error).message });
    }

    return results;
  }

  /**
   * Get prices from Kraken Public API (Primary - Most Reliable)
   * Kraken is one of the most reliable exchanges with no API key needed for public data
   */
  private async getPricesFromKraken(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const symbolPairMap: Record<string, string> = {
      'BTC': 'XXBTZUSD',
      'ETH': 'XETHZUSD',
      'ADA': 'ADAUSD',
      'SOL': 'SOLUSD',
      'XRP': 'XXRPZUSD',
      'DOGE': 'XDGUSD',
      'DOT': 'DOTUSD',
      'LINK': 'LINKUSD',
      'MATIC': 'MATICUSD',
      'AVAX': 'AVAXUSD',
      'ATOM': 'ATOMUSD',
      'LTC': 'XLTCZUSD',
      'BCH': 'BCHUSD',
      'XLM': 'XXLMZUSD'
    };

    try {
      // Build pairs array
      const pairs = symbols
        .map(s => symbolPairMap[s.toUpperCase()])
        .filter(Boolean);

      if (pairs.length === 0) {
        this.logger.debug('Kraken: No supported pairs found', { symbols });
        return [];
      }

      // Get ticker data for all pairs
      const tickerResponse = await this.krakenClient.get('/Ticker', {
        params: {
          pair: pairs.join(',')
        }
      });

      if (tickerResponse.data?.error && (tickerResponse.data.error?.length || 0) > 0) {
        throw new Error(`Kraken API error: ${tickerResponse.data.error.join(', ')}`);
      }

      const tickerData = tickerResponse.data?.result || {};

      // Process each symbol
      for (const symbol of symbols) {
        const pair = symbolPairMap[symbol.toUpperCase()];
        if (!pair) continue;

        const data = tickerData[pair];
        if (data) {
          // Kraken ticker format: c = last trade, v = volume, p = volume weighted average
          const lastPrice = parseFloat(data.c?.[0] || '0');
          const volume24h = parseFloat(data.v?.[1] || '0');
          const vwap24h = parseFloat(data.p?.[1] || '0');
          const open24h = parseFloat(data.o || '0');

          // Calculate change
          const change24h = open24h > 0 ? lastPrice - open24h : 0;
          const changePercent24h = open24h > 0 ? ((lastPrice - open24h) / open24h) * 100 : 0;

          results.push({
            symbol: symbol.toUpperCase(),
            price: lastPrice,
            volume24h: volume24h * vwap24h, // Convert volume to USD
            change24h,
            changePercent24h,
            marketCap: undefined,
            source: 'kraken',
            timestamp: Date.now()
          });
        }
      }

      this.logger.debug(`Kraken returned ${results.length} prices`, {
        requested: symbols.length,
        received: results.length
      });

      return results;
    } catch (error: any) {
      this.logger.warn(`Kraken API failed`, {
        error: error.message,
        symbols: symbols.join(',')
      });
      return [];
    }
  }

  /**
   * Get historical OHLCV data
   * Now includes HuggingFace datasets as a fallback for heavy historical requests
   */
  async getHistoricalData(
    symbol: string,
    interval: string = '1h',
    days: number = 30
  ): Promise<OHLCVData[]> {
    const cacheKey = `${symbol}_${interval}_${days}`;
    const cached = this.ohlcvCache.get(cacheKey);
    if (cached) return cached;

    // Convert interval to days if needed
    const daysForInterval = this.convertIntervalToDays(interval, days);

    // Prefer HF for large historical requests (>100 days) or when rate-limit pressure is high
    const limit = daysForInterval * (interval.includes('h') ? 24 : interval.includes('d') ? 1 : 1440);
    const preferHF = limit > 2000 || days > 100;

    // Try providers in order: Kraken -> CoinGecko -> CryptoCompare -> HuggingFace (for OHLCV)
    try {
      if (preferHF) {
        // Try HF first for large requests
        try {
          this.logger.info('Using HuggingFace for large historical request', { symbol, days, limit });
          const data = await this.getHistoricalFromHF(symbol, interval, limit);
          this.ohlcvCache.set(cacheKey, data);
          return data;
        } catch (hfError) {
          this.logger.warn('HF historical failed, falling back to traditional providers', {}, hfError as Error);
        }
      }

      // Try Kraken first (most reliable for OHLCV)
      try {
        const data = await this.getHistoricalFromKraken(symbol, interval, daysForInterval);
        this.ohlcvCache.set(cacheKey, data);
        return data;
      } catch (krakenError) {
        this.logger.warn('Kraken historical failed, trying CoinGecko fallback', {}, krakenError as Error);
      }

      const data = await this.getHistoricalFromCoinGecko(symbol, daysForInterval);
      this.ohlcvCache.set(cacheKey, data);
      return data;
    } catch (error: any) {
      this.logger.warn('CoinGecko historical failed, trying CryptoCompare fallback', {}, error as Error);
      try {
        const data = await this.getHistoricalFromCryptoCompare(symbol, interval, daysForInterval);
        this.ohlcvCache.set(cacheKey, data);
        return data;
      } catch (fallbackError) {
        this.logger.warn('CryptoCompare historical failed, trying HuggingFace as last resort', {}, fallbackError as Error);
        try {
          // Try HF as final fallback
          const data = await this.getHistoricalFromHF(symbol, interval, limit);
          this.ohlcvCache.set(cacheKey, data);
          return data;
        } catch (hfFinalError) {
          this.logger.error('All historical data providers failed (including HF)', { symbol, interval }, hfFinalError as Error);
          throw new Error(`Failed to fetch historical data for ${symbol}: ${(hfFinalError as Error).message}`);
        }
      }
    }
  }

  /**
   * Lightweight peek at OHLCV data availability for readiness checks
   * Checks cache first, then attempts minimal fetch if needed
   */
  async peekOHLCV(symbol: string, interval: string = '1h', minBars: number = 50): Promise<OHLCVData[]> {
    // Check cache first
    const cacheKey = `${symbol}_${interval}_30`; // Use standard cache key
    const cached = this.ohlcvCache.get(cacheKey);
    if (cached && (cached?.length || 0) >= minBars) {
      return cached.slice(-minBars);
    }

    // If not in cache or insufficient, try a light fetch
    // Use small days value to minimize data transfer for readiness check
    const days = Math.ceil(minBars / 24); // Rough estimate for hourly data
    const data = await this.getHistoricalData(symbol, interval, days);
    return data.slice(-minBars);
  }

  /**
   * Get historical OHLCV data from Kraken (Most reliable and accurate)
   */
  private async getHistoricalFromKraken(
    symbol: string,
    interval: string,
    days: number
  ): Promise<OHLCVData[]> {
    const symbolPairMap: Record<string, string> = {
      'BTC': 'XXBTZUSD',
      'ETH': 'XETHZUSD',
      'ADA': 'ADAUSD',
      'SOL': 'SOLUSD',
      'XRP': 'XXRPZUSD',
      'DOGE': 'XDGUSD',
      'DOT': 'DOTUSD',
      'LINK': 'LINKUSD',
      'MATIC': 'MATICUSD',
      'AVAX': 'AVAXUSD',
      'ATOM': 'ATOMUSD',
      'LTC': 'XLTCZUSD',
      'BCH': 'BCHUSD',
      'XLM': 'XXLMZUSD'
    };

    const pair = symbolPairMap[symbol.toUpperCase()];
    if (!pair) {
      throw new Error(`Kraken: Unsupported symbol ${symbol}`);
    }

    // Map interval to Kraken's format (in minutes)
    const intervalMinutes: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080
    };

    const intervalInMinutes = intervalMinutes[interval] || 60;

    try {
      // Calculate since timestamp (days ago)
      const since = Math.floor(Date.now() / 1000) - (days * 24 * 60 * 60);

      const response = await this.krakenClient.get('/OHLC', {
        params: {
          pair,
          interval: intervalInMinutes,
          since
        }
      });

      if (response.data?.error && (response.data.error?.length || 0) > 0) {
        throw new Error(`Kraken OHLC error: ${response.data.error.join(', ')}`);
      }

      const result = response.data?.result || {};
      const ohlcData = result[pair] || result[Object.keys(result)[0]] || [];

      if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
        throw new Error('Kraken returned no OHLC data');
      }

      // Kraken OHLC format: [time, open, high, low, close, vwap, volume, count]
      return (ohlcData || []).map((candle: any[]) => ({
        timestamp: candle[0] * 1000, // Convert to milliseconds
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[6]),
        symbol: symbol.toUpperCase(),
        interval
      }));
    } catch (error: any) {
      this.logger.error('Kraken OHLC fetch failed', { symbol, interval, days }, error);
      throw error;
    }
  }

  /**
   * Get historical data from CoinGecko
   */
  private async getHistoricalFromCoinGecko(
    symbol: string,
    days: number
  ): Promise<OHLCVData[]> {
    await this.coingeckoLimiter.wait();
    
    const geckoId = this.symbolToGeckoId[symbol.toUpperCase()] || symbol.toLowerCase();
    
    const response = await this.coingeckoClient.get(`/coins/${geckoId}/market_chart`, {
      params: {
        vs_currency: 'usd',
        days: days,
        interval: days <= 1 ? 'hourly' : 'daily'
      }
    });

    const prices = response.data.prices || [];
    const volumes = response.data.total_volumes || [];
    const marketCaps = response.data.market_caps || [];

    return (prices || []).map(([timestamp, price]: [number, number], index: number) => {
      const volume = volumes[index]?.[1] || 0;
      
      return {
        timestamp,
        open: price,
        high: price * (1 + Math.random() * 0.02), // Estimate from price (CoinGecko doesn't provide OHLC)
        low: price * (1 - Math.random() * 0.02),
        close: price,
        volume,
        symbol: symbol.toUpperCase(),
        interval: days <= 1 ? '1h' : '1d'
      };
    });
  }

  /**
   * Get historical data from CryptoCompare (better OHLCV support)
   */
  private async getHistoricalFromCryptoCompare(
    symbol: string,
    interval: string,
    days: number
  ): Promise<OHLCVData[]> {
    await this.cryptoCompareLimiter.wait();
    
    // Map interval to CryptoCompare format
    const intervalMap: Record<string, string> = {
      '1m': 'minute',
      '5m': 'minute',
      '15m': 'minute',
      '30m': 'minute',
      '1h': 'hour',
      '4h': 'hour',
      '1d': 'day'
    };
    
    const cryptoCompareInterval = intervalMap[interval] || 'hour';
    const limit = Math.min(days * (interval.includes('h') ? 24 : interval.includes('d') ? 1 : 1440), 2000);
    
    try {
      // Use appropriate endpoint based on interval
      const endpoint = interval.includes('d') ? '/histoday' : interval.includes('h') ? '/histohour' : '/histominute';
      
      const response = await this.cryptoCompareClient.get(endpoint, {
        params: {
          fsym: symbol.toUpperCase(),
          tsym: 'USD',
          limit: limit,
          aggregate: this.getCryptoCompareAggregate(interval)
        }
      });

      if (response.data.Response === 'Error') {
        throw new Error(`CryptoCompare API error: ${response.data.Message}`);
      }
      
      const dataPoints = response.data.Data?.Data || [];
      
      return (dataPoints || []).map((point: any) => ({
        timestamp: point.time * 1000,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        volume: point.volumefrom || 0,
        symbol: symbol.toUpperCase(),
        interval: interval
      }));
    } catch (error) {
      this.logger.error('CryptoCompare historical data fetch failed', { symbol, interval }, error as Error);
      throw error;
    }
  }

  /**
   * Get aggregate value for CryptoCompare API
   */
  private getCryptoCompareAggregate(interval: string): number {
    const aggregateMap: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 1,
      '4h': 4,
      '1d': 1
    };
    return aggregateMap[interval] || 1;
  }

  /**
   * Convert interval string to approximate days
   */
  private convertIntervalToDays(interval: string, limit: number): number {
    const intervalMinutes: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };

    const minutes = intervalMinutes[interval] || 60;
    const totalMinutes = minutes * limit;
    return Math.ceil(totalMinutes / 1440); // Convert to days
  }

  /**
   * Get single real-time price
   */
  async getRealTimePrice(symbol: string): Promise<PriceData> {
    const prices = await this.getRealTimePrices([symbol]);
    if (prices.length === 0) {
      throw new Error(`No price data found for ${symbol}`);
    }
    return prices[0];
  }

  /**
   * Start real-time price streaming
   */
  startRealTimeStream(
    symbols: string[],
    callback: (data: PriceData) => void,
    interval: number = 5000
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const prices = await this.getRealTimePrices(symbols);
        for (const price of prices) {
          callback(price);
        }
      } catch (error) {
        this.logger.error('Real-time stream error', { symbols }, error as Error);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }

  /**
   * Get historical data from Hugging Face datasets
   * Used as fallback for large historical requests or when other providers fail
   */
  private async getHistoricalFromHF(
    symbol: string,
    interval: string,
    limit: number
  ): Promise<OHLCVData[]> {
    try {
      // Normalize symbol for HF (e.g., BTCUSDT, ETHUSDT)
      const normalizedSymbol = symbol.toUpperCase().replace(/USD$/, 'USDT');

      this.logger.info('Fetching from HuggingFace datasets', { symbol: normalizedSymbol, interval, limit });

      // Get data from HF service
      const hfData = await this.hfOHLCVService.getOHLCV(normalizedSymbol, interval, limit);

      // Convert to OHLCVData format
      const ohlcvData: OHLCVData[] = (hfData || []).map(bar => ({
        timestamp: bar.timestamp,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume,
        symbol: symbol.toUpperCase(),
        interval
      }));

      this.logger.info('Successfully fetched from HuggingFace', {
        symbol: normalizedSymbol,
        rows: ohlcvData.length
      });

      return ohlcvData;
    } catch (error) {
      this.logger.error('HuggingFace historical data fetch failed', { symbol, interval, limit }, error as Error);
      throw error;
    }
  }

  /**
   * Convert PriceData to MarketData format (for backward compatibility)
   */
  priceDataToMarketData(priceData: PriceData): MarketData {
    return {
      symbol: priceData.symbol + 'USDT',
      timestamp: priceData.timestamp,
      open: priceData.price,
      high: priceData.price * 1.01, // Estimate
      low: priceData.price * 0.99, // Estimate
      close: priceData.price,
      volume: priceData.volume24h,
      price: priceData.price,
      change24h: priceData.change24h,
      changePercent24h: priceData.changePercent24h,
      interval: '1m'
    };
  }
}

