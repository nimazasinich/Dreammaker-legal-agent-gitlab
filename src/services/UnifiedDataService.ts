/**
 * Unified Data Service
 *
 * Provides a unified interface to all cryptocurrency data sources with:
 * - Automatic load balancing across multiple providers
 * - Real-time health monitoring
 * - Intelligent failover
 * - Comprehensive data from market prices, sentiment, news, whale tracking, etc.
 *
 * Based on api-config-complete.txt configuration
 */

import { Logger } from '../core/Logger.js';
import { EnhancedAPIClient } from './EnhancedAPIClient.js';
import { CentralizedAPIConfig, getEnabledProviders } from '../config/CentralizedAPIConfig.js';

export interface UnifiedPriceData {
  symbol: string;
  price: number;
  volume24h?: number;
  change24h?: number;
  changePercent24h?: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  source: string;
  timestamp: number;
}

export interface UnifiedNewsItem {
  title: string;
  url: string;
  source: string;
  published: Date;
  sentiment?: 'positive' | 'negative' | 'neutral';
  currencies?: string[];
}

export interface UnifiedSentimentData {
  value: number; // -100 to +100
  classification: string;
  timestamp: number;
  source: string;
  breakdown?: {
    fearGreed?: number;
    news?: number;
    social?: number;
  };
}

export interface UnifiedWhaleTransaction {
  amount: number;
  symbol: string;
  from: string;
  to: string;
  timestamp: number;
  hash: string;
  blockchain: string;
  usdValue?: number;
}

/**
 * Unified Data Service - Single interface for all crypto data
 */
export class UnifiedDataService {
  private static instance: UnifiedDataService;
  private logger = Logger.getInstance();

  // Enhanced API clients for different categories
  private marketDataClient: EnhancedAPIClient;
  private newsClient: EnhancedAPIClient;
  private sentimentClient: EnhancedAPIClient;
  private whaleClient: EnhancedAPIClient;

  private constructor() {
    // Initialize clients with appropriate cache TTLs
    this.marketDataClient = new EnhancedAPIClient(5000); // 5 seconds for price data
    this.newsClient = new EnhancedAPIClient(300000); // 5 minutes for news
    this.sentimentClient = new EnhancedAPIClient(300000); // 5 minutes for sentiment
    this.whaleClient = new EnhancedAPIClient(60000); // 1 minute for whale tracking

    this.logger.info('UnifiedDataService initialized with multi-source support');
  }

  static getInstance(): UnifiedDataService {
    if (!UnifiedDataService.instance) {
      UnifiedDataService.instance = new UnifiedDataService();
    }
    return UnifiedDataService.instance;
  }

  // ========================================================================
  // MARKET DATA - Price, Volume, Market Cap
  // ========================================================================

  /**
   * Get current price for a cryptocurrency
   * Uses round-robin across: CoinGecko, Binance, CoinCap, CoinPaprika, etc.
   */
  async getPrice(symbol: string, vsCurrency: string = 'usd'): Promise<UnifiedPriceData> {
    const { primary, fallbacks } = CentralizedAPIConfig.marketData;

    try {
      // Try CoinGecko first (most reliable, no key needed)
      const data = await this.marketDataClient.fetchWithLoadBalancing(
        'marketData',
        primary,
        fallbacks,
        '/simple/price',
        {
          ids: this.symbolToGeckoId(symbol),
          vs_currencies: vsCurrency,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_market_cap: true
        }
      );

      const geckoId = this.symbolToGeckoId(symbol);
      const priceData = data[geckoId];

      if (!priceData) {
        console.error(`No price data for ${symbol}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price: priceData[vsCurrency],
        volume24h: priceData[`${vsCurrency}_24h_vol`],
        change24h: priceData[`${vsCurrency}_24h_change`],
        changePercent24h: priceData[`${vsCurrency}_24h_change`],
        marketCap: priceData[`${vsCurrency}_market_cap`],
        source: 'coingecko',
        timestamp: Date.now()
      };

    } catch (error) {
      this.logger.warn('Primary price fetch failed, trying fallback', { symbol }, error as Error);

      // Fallback to Binance
      try {
        const binanceSymbol = `${symbol.toUpperCase()}${vsCurrency.toUpperCase()}`;
        const data = await this.marketDataClient.fetchWithLoadBalancing(
          'marketData',
          fallbacks.find(f => f.name === 'binance')!,
          [],
          '/ticker/24hr',
          { symbol: binanceSymbol }
        );

        return {
          symbol: symbol.toUpperCase(),
          price: parseFloat(data.lastPrice),
          volume24h: parseFloat(data.volume),
          change24h: parseFloat(data.priceChange),
          changePercent24h: parseFloat(data.priceChangePercent),
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          source: 'binance',
          timestamp: Date.now()
        };
      } catch (binanceError) {
        this.logger.error('All price sources failed', { symbol }, binanceError as Error);
        console.error(`Unable to fetch price for ${symbol}`);
      }
    }
  }

  /**
   * Get prices for multiple symbols at once
   */
  async getPrices(symbols: string[], vsCurrency: string = 'usd'): Promise<UnifiedPriceData[]> {
    const { primary, fallbacks } = CentralizedAPIConfig.marketData;

    try {
      const geckoIds = (symbols || []).map(s => this.symbolToGeckoId(s)).join(',');

      const data = await this.marketDataClient.fetchWithLoadBalancing(
        'marketData',
        primary,
        fallbacks,
        '/simple/price',
        {
          ids: geckoIds,
          vs_currencies: vsCurrency,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_market_cap: true
        }
      );

      return (symbols || []).map(symbol => {
        const geckoId = this.symbolToGeckoId(symbol);
        const priceData = data[geckoId];

        if (!priceData) {
          return {
            symbol: symbol.toUpperCase(),
            price: 0,
            source: 'error',
            timestamp: Date.now()
          };
        }

        return {
          symbol: symbol.toUpperCase(),
          price: priceData[vsCurrency],
          volume24h: priceData[`${vsCurrency}_24h_vol`],
          change24h: priceData[`${vsCurrency}_24h_change`],
          changePercent24h: priceData[`${vsCurrency}_24h_change`],
          marketCap: priceData[`${vsCurrency}_market_cap`],
          source: 'coingecko',
          timestamp: Date.now()
        };
      });

    } catch (error) {
      this.logger.error('Batch price fetch failed', { symbols }, error as Error);
      // Return individual fetches as fallback
      return await Promise.all((symbols || []).map(s => this.getPrice(s, vsCurrency).catch(() => ({
        symbol: s.toUpperCase(),
        price: 0,
        source: 'error',
        timestamp: Date.now()
      }))));
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrending(): Promise<Array<{id: string, name: string, symbol: string, rank: number}>> {
    const { primary, fallbacks } = CentralizedAPIConfig.marketData;

    const data = await this.marketDataClient.fetchWithLoadBalancing(
      'marketData',
      primary,
      fallbacks,
      '/search/trending',
      {},
      { useCache: true, cacheTTL: 600000 } // Cache for 10 minutes
    );

    return (data.coins || []).map((item: any) => ({
      id: item.item.id,
      name: item.item.name,
      symbol: item.item.symbol,
      rank: item.item.market_cap_rank
    }));
  }

  // ========================================================================
  // NEWS - Crypto News from Multiple Sources
  // ========================================================================

  /**
   * Get latest crypto news
   * Sources: CryptoPanic, Reddit, NewsAPI, CoinDesk, etc.
   */
  async getNews(limit: number = 50, currencies?: string[]): Promise<UnifiedNewsItem[]> {
    const { primary, fallbacks } = CentralizedAPIConfig.news;

    try {
      // Try CryptoPanic (primary)
      const data = await this.newsClient.fetchWithLoadBalancing(
        'news',
        primary,
        fallbacks,
        '/posts/',
        {
          public: true,
          currencies: currencies?.join(','),
          kind: 'news'
        },
        { useCache: true, cacheTTL: 300000 } // Cache for 5 minutes
      );

      return (data.results || []).slice(0, limit).map((post: any) => ({
        title: post.title,
        url: post.url,
        source: post.source?.title || 'Unknown',
        published: new Date(post.published_at),
        sentiment: this.detectSentiment(post.votes),
        currencies: post.currencies?.map((c: any) => c.code)
      }));

    } catch (error) {
      this.logger.warn('CryptoPanic failed, trying Reddit', {}, error as Error);

      // Fallback to Reddit
      try {
        const redditFallback = fallbacks.find(f => f.name === 'reddit');
        if (!redditFallback) console.error('Reddit fallback not configured');

        const data = await this.newsClient.fetchWithLoadBalancing(
          'news',
          redditFallback,
          [],
          '/hot.json',
          { limit }
        );

        return (data.data?.children || []).map((post: any) => ({
          title: post.data.title,
          url: post.data.url,
          source: 'Reddit - r/CryptoCurrency',
          published: new Date(post.data.created_utc * 1000),
          sentiment: post.data.upvote_ratio > 0.6 ? 'positive' :
                    post.data.upvote_ratio < 0.4 ? 'negative' : 'neutral'
        }));

      } catch (redditError) {
        this.logger.error('All news sources failed', {}, redditError as Error);
        return [];
      }
    }
  }

  // ========================================================================
  // SENTIMENT - Fear & Greed Index, Social Sentiment
  // ========================================================================

  /**
   * Get Fear & Greed Index
   * Primary: Alternative.me
   */
  async getFearGreedIndex(): Promise<UnifiedSentimentData> {
    const { primary, fallbacks } = CentralizedAPIConfig.sentiment;

    const data = await this.sentimentClient.fetchWithLoadBalancing(
      'sentiment',
      primary,
      fallbacks,
      '/',
      { limit: 1 },
      { useCache: true, cacheTTL: 300000 } // Cache for 5 minutes
    );

    const fng = data.data[0];

    return {
      value: this.normalizeToSentimentScale(parseInt(fng.value)),
      classification: fng.value_classification,
      timestamp: parseInt(fng.timestamp) * 1000,
      source: 'alternative.me',
      breakdown: {
        fearGreed: parseInt(fng.value)
      }
    };
  }

  // ========================================================================
  // WHALE TRACKING - Large Transactions
  // ========================================================================

  /**
   * Get recent whale transactions
   * Sources: ClankApp, BitQuery
   */
  async getWhaleTransactions(minValue: number = 1000000): Promise<UnifiedWhaleTransaction[]> {
    const { primary, fallbacks } = CentralizedAPIConfig.whaleTracking;

    try {
      const data = await this.whaleClient.fetchWithLoadBalancing(
        'whaleTracking',
        primary,
        fallbacks,
        '/whales/recent',
        { min_value: minValue },
        { useCache: true, cacheTTL: 60000 } // Cache for 1 minute
      );

      return (data.transactions || []).map((tx: any) => ({
        amount: tx.amount,
        symbol: tx.symbol,
        from: tx.from?.address || tx.from,
        to: tx.to?.address || tx.to,
        timestamp: tx.timestamp * 1000,
        hash: tx.hash,
        blockchain: tx.blockchain,
        usdValue: tx.amount_usd
      }));

    } catch (error) {
      this.logger.warn('Whale tracking unavailable', { minValue }, error as Error);
      return [];
    }
  }

  // ========================================================================
  // HEALTH & STATISTICS
  // ========================================================================

  /**
   * Get health status of all data sources
   */
  getHealthStatus() {
    return {
      marketData: this.marketDataClient.getStats(),
      news: this.newsClient.getStats(),
      sentiment: this.sentimentClient.getStats(),
      whaleTracking: this.whaleClient.getStats()
    };
  }

  /**
   * Get detailed provider health
   */
  getProviderHealth() {
    return {
      marketData: this.marketDataClient.getAllProviderHealth(),
      news: this.newsClient.getAllProviderHealth(),
      sentiment: this.sentimentClient.getAllProviderHealth(),
      whaleTracking: this.whaleClient.getAllProviderHealth()
    };
  }

  /**
   * Reset provider health (for recovery)
   */
  resetProviderHealth(category?: string, provider?: string) {
    switch (category) {
      case 'marketData':
        this.marketDataClient.resetProviderHealth(provider);
        break;
      case 'news':
        this.newsClient.resetProviderHealth(provider);
        break;
      case 'sentiment':
        this.sentimentClient.resetProviderHealth(provider);
        break;
      case 'whaleTracking':
        this.whaleClient.resetProviderHealth(provider);
        break;
      default:
        // Reset all
        this.marketDataClient.resetProviderHealth(provider);
        this.newsClient.resetProviderHealth(provider);
        this.sentimentClient.resetProviderHealth(provider);
        this.whaleClient.resetProviderHealth(provider);
    }

    this.logger.info('Provider health reset', { category, provider });
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Map symbol to CoinGecko ID
   */
  private symbolToGeckoId(symbol: string): string {
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
      'TRX': 'tron',
      'USDT': 'tether',
      'USDC': 'usd-coin',
      'UNI': 'uniswap',
      'AAVE': 'aave'
    };

    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  /**
   * Normalize Fear & Greed to -100 to +100 scale
   */
  private normalizeToSentimentScale(value: number): number {
    return (value - 50) * 2;
  }

  /**
   * Detect sentiment from votes
   */
  private detectSentiment(votes: any): 'positive' | 'negative' | 'neutral' {
    if (!votes) return 'neutral';

    const positive = votes.positive || 0;
    const negative = votes.negative || 0;
    const total = positive + negative;

    if (total === 0) return 'neutral';

    const ratio = positive / total;

    if (ratio > 0.6) return 'positive';
    if (ratio < 0.4) return 'negative';
    return 'neutral';
  }
}
