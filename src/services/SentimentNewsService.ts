// src/services/SentimentNewsService.ts
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';
import { getAPIKey, getBaseURL } from '../config/CentralizedAPIConfig.js';

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  published: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore?: number;
}

export interface FearGreedIndex {
  value: number; // 0-100
  classification: string; // Extreme Fear, Fear, Neutral, Greed, Extreme Greed
  timestamp: Date;
}

export interface SentimentData {
  fearGreedIndex: FearGreedIndex;
  newsSentiment: {
    positive: number;
    negative: number;
    neutral: number;
    total: number;
  };
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  overallScore: number; // -100 to 100
  timestamp: number;
}

export class SentimentNewsService {
  private static instance: SentimentNewsService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  
  // HTTP clients
  private alternativeClient: AxiosInstance;
  private cryptopanicClient: AxiosInstance;
  private newsapiClient: AxiosInstance;
  
  // Rate limiters
  private readonly alternativeLimiter = new TokenBucket(100, 60); // 100 calls per minute (very lenient)
  private readonly cryptopanicLimiter = new TokenBucket(100, 60); // 100 calls per minute
  private readonly newsapiLimiter = new TokenBucket(100, 60); // 100 calls per minute
  
  // Caches
  private readonly fearGreedCache = new TTLCache<FearGreedIndex>(300000); // 5 minutes
  private readonly newsCache = new TTLCache<NewsItem[]>(60000); // 1 minute
  private readonly sentimentCache = new TTLCache<SentimentData>(300000); // 5 minutes

  private constructor() {
    const apisConfig = this.config.getApisConfig();

    // Resolve API keys using fallback chain: env > config > api - Copy.txt > defaults
    const NEWSAPI_KEY = getAPIKey('newsapi', 'news');
    const CRYPTOPANIC_KEY = getAPIKey('cryptopanic', 'news');

    // Initialize Alternative.me client (Fear & Greed Index)
    this.alternativeClient = axios.create({
      baseURL: getBaseURL('alternative_me', 'sentiment') || apisConfig.alternative?.baseUrl || 'https://api.alternative.me',
      timeout: 10000
    });

    // Initialize CryptoPanic client
    this.cryptopanicClient = axios.create({
      baseURL: getBaseURL('cryptopanic', 'news') || apisConfig.cryptopanic?.baseUrl || 'https://cryptopanic.com/api/v1',
      timeout: 10000,
      params: CRYPTOPANIC_KEY ? {
        auth_token: CRYPTOPANIC_KEY
      } : {}
    });

    // Initialize NewsAPI client
    this.newsapiClient = axios.create({
      baseURL: getBaseURL('newsapi', 'news') || apisConfig.newsapi?.baseUrl || 'https://newsapi.org/v2',
      timeout: 10000,
      headers: NEWSAPI_KEY ? {
        'X-API-Key': NEWSAPI_KEY
      } : {}
    });
  }

  static getInstance(): SentimentNewsService {
    if (!SentimentNewsService.instance) {
      SentimentNewsService.instance = new SentimentNewsService();
    }
    return SentimentNewsService.instance;
  }

  /**
   * Get Fear & Greed Index with retry logic
   */
  async getFearGreedIndex(): Promise<FearGreedIndex> {
    // Check cache first
    const cached = this.fearGreedCache.get('fear_greed');
    if (cached) {
      this.logger.debug('FEAR_GREED_CACHED', { value: cached.value });
      return cached;
    }

    await this.alternativeLimiter.wait();

    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await this.alternativeClient.get('/fng/', {
          params: { limit: 1 },
          timeout: 5000
        });

        // Validate response
        if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
          throw new Error('Invalid response structure');
        }

        if (response.data.data.length === 0) {
          throw new Error('No Fear & Greed data available');
        }

        const data = response.data.data[0];
        
        // Validate data fields
        if (!data.value || !data.value_classification || !data.timestamp) {
          throw new Error('Incomplete Fear & Greed data');
        }

        const result: FearGreedIndex = {
          value: parseInt(data.value),
          classification: data.value_classification,
          timestamp: new Date(parseInt(data.timestamp) * 1000)
        };

        // Cache successful result
        this.fearGreedCache.set('fear_greed', result);
        this.logger.info('FEAR_GREED_SUCCESS', { value: result.value, classification: result.classification });
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (error.response?.status === 429) {
          this.logger.warn('FEAR_GREED_RATE_LIMIT', { attempt: attempt + 1 });
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          this.logger.warn('FEAR_GREED_TIMEOUT', { attempt: attempt + 1 });
        } else if (error.code === 'ENOTFOUND') {
          this.logger.error('FEAR_GREED_UNREACHABLE', { error: 'Service unreachable' });
          break; // No point retrying if service is unreachable
        } else {
          this.logger.warn('FEAR_GREED_ERROR', { attempt: attempt + 1, error: error.message });
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = 1000 * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed - return neutral default
    this.logger.error('FEAR_GREED_ALL_RETRIES_FAILED', { 
      error: lastError?.message || 'Unknown error',
      fallback: 'Returning neutral default' 
    });
    
    const fallback: FearGreedIndex = {
      value: 50,
      classification: 'Neutral',
      timestamp: new Date()
    };
    
    // Cache fallback for shorter duration to retry sooner
    this.fearGreedCache.set('fear_greed', fallback);
    return fallback;
  }

  /**
   * Get crypto news with fallback providers
   * REFACTORED: Now uses DatasourceClient with fallback to NewsAPI
   */
  async getCryptoNews(limit: number = 20): Promise<NewsItem[]> {
    const cacheKey = `news_${limit}`;
    const cached = this.newsCache.get(cacheKey);
    if (cached) {
      this.logger.debug('NEWS_CACHED', { count: cached.length });
      return cached;
    }

    // Try primary provider (DatasourceClient)
    try {
      const datasourceClient = await this.loadDatasourceClient();
      const newsData = await datasourceClient.getLatestNews(limit);
      
      // Validate response
      if (!newsData || !Array.isArray(newsData)) {
        throw new Error('Invalid news data from DatasourceClient');
      }
      
      // Convert to NewsItem format
      const newsItems: NewsItem[] = newsData.map((item: any) => ({
        title: item.title || 'Untitled',
        url: item.url || '',
        source: item.source || 'Unknown',
        published: new Date(item.publishedAt || Date.now()),
        sentiment: (item.sentiment as 'positive' | 'negative' | 'neutral') || 'neutral',
        sentimentScore: this.getSentimentScoreFromString(item.sentiment)
      })).filter(item => item.url !== ''); // Filter invalid items

      if (newsItems.length > 0) {
        this.newsCache.set(cacheKey, newsItems);
        this.logger.info('NEWS_SUCCESS', { provider: 'DatasourceClient', count: newsItems.length });
        return newsItems;
      } else {
        throw new Error('No valid news items from DatasourceClient');
      }
    } catch (error) {
      this.logger.warn('NEWS_PRIMARY_FAIL', { provider: 'DatasourceClient', error: (error as Error).message });
      
      // Try fallback provider (NewsAPI)
      const fallbackNews = await this.getNewsFromNewsAPI(limit);
      if (fallbackNews && fallbackNews.length > 0) {
        this.newsCache.set(cacheKey, fallbackNews);
        this.logger.info('NEWS_SUCCESS', { provider: 'NewsAPI (fallback)', count: fallbackNews.length });
        return fallbackNews;
      }
      
      // All providers failed
      this.logger.error('NEWS_ALL_PROVIDERS_FAILED', { 
        error: 'All news providers failed',
        fallback: 'Returning empty array' 
      });
      return []; // Return empty array on complete failure
    }
  }
  
  // Helper to dynamically import DatasourceClient
  private async loadDatasourceClient(): Promise<any> {
    const module = await import('./DatasourceClient.js');
    return module.default;
  }
  
  // Helper to get sentiment score from string
  private getSentimentScoreFromString(sentiment?: string): number {
    if (!sentiment) return 0;
    const s = sentiment.toLowerCase();
    if (s === 'positive' || s.includes('bullish')) return 1;
    if (s === 'negative' || s.includes('bearish')) return -1;
    return 0;
  }

  /**
   * Get news from NewsAPI (fallback)
   */
  private async getNewsFromNewsAPI(limit: number): Promise<NewsItem[] | null> {
    await this.newsapiLimiter.wait();

    try {
      const response = await this.newsapiClient.get('/everything', {
        params: {
          q: 'cryptocurrency OR bitcoin OR ethereum',
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: limit
        }
      });

      if (!response.data.articles || !Array.isArray(response.data.articles)) {
        this.logger.warn('Invalid NewsAPI response format');
        return null;
      }

      return (response.data.articles || []).map((article: any) => ({
        title: article.title,
        url: article.url,
        source: article.source?.name || 'Unknown',
        published: new Date(article.publishedAt),
        sentiment: 'neutral' as const, // NewsAPI doesn't provide sentiment
        sentimentScore: 0
      }));
    } catch (error: any) {
      // Handle 401 Unauthorized as soft-disable (provider disabled, not an error)
      if (error.response?.status === 401) {
        this.logger.warn('NewsAPI unauthorized (401) – treating as disabled provider', {
          message: 'NewsAPI key missing or invalid. Provider will be skipped.'
        });
        return null; // Return null to indicate provider is disabled
      }

      // Handle other errors as warnings (not critical)
      this.logger.warn('Failed to fetch NewsAPI news', {}, error as Error);
      return null; // Return null instead of empty array to indicate failure
    }
  }

  /**
   * Map CryptoPanic sentiment to our format
   */
  private mapCryptoPanicSentiment(sentiment: any): 'positive' | 'negative' | 'neutral' {
    if (!sentiment) return 'neutral';
    
    const sentimentStr = String(sentiment).toLowerCase();
    if (sentimentStr.includes('bullish') || sentimentStr.includes('positive')) {
      return 'positive';
    }
    if (sentimentStr.includes('bearish') || sentimentStr.includes('negative')) {
      return 'negative';
    }
    return 'neutral';
  }

  /**
   * Get sentiment score from CryptoPanic sentiment
   */
  private getSentimentScore(sentiment: any): number {
    if (!sentiment) return 0;
    
    const sentimentStr = String(sentiment).toLowerCase();
    if (sentimentStr.includes('bullish') || sentimentStr.includes('positive')) {
      return 1;
    }
    if (sentimentStr.includes('bearish') || sentimentStr.includes('negative')) {
      return -1;
    }
    return 0;
  }

  /**
   * Get aggregated sentiment data
   * REFACTORED: Now uses DatasourceClient for sentiment data
   */
  async getAggregatedSentiment(): Promise<SentimentData> {
    const cached = this.sentimentCache.get('aggregated');
    if (cached) return cached;

    try {
      // Get sentiment from DatasourceClient
      const datasourceClient = await this.loadDatasourceClient();
      const marketSentiment = await datasourceClient.getMarketSentiment();
      
      if (marketSentiment) {
        // Convert to SentimentData format
        const fearGreedIndex: FearGreedIndex = {
          value: marketSentiment.fearGreedIndex || 50,
          classification: marketSentiment.classification || 'Neutral',
          timestamp: new Date(marketSentiment.timestamp || Date.now())
        };
        
        // Get news for sentiment analysis
        const newsItems = await this.getCryptoNews(50);
        
        // Calculate news sentiment
        const newsSentiment = {
          positive: newsItems.filter(n => n.sentiment === 'positive').length,
          negative: newsItems.filter(n => n.sentiment === 'negative').length,
          neutral: newsItems.filter(n => n.sentiment === 'neutral').length,
          total: newsItems.length
        };

        // Use fear/greed from datasource
        const fearGreedScore = (fearGreedIndex.value - 50);
        
        // News sentiment: weighted average
        const newsScore = newsSentiment.total > 0
          ? ((newsSentiment.positive - newsSentiment.negative) / newsSentiment.total) * 50
          : 0;

        // Combined score: -100 to +100
        const overallScore = fearGreedScore + newsScore;
        
        // Determine overall sentiment
        let overallSentiment: 'bullish' | 'bearish' | 'neutral';
        if (overallScore > 20) {
          overallSentiment = 'bullish';
        } else if (overallScore < -20) {
          overallSentiment = 'bearish';
        } else {
          overallSentiment = 'neutral';
        }

        const result: SentimentData = {
          fearGreedIndex,
          newsSentiment,
          overallSentiment,
          overallScore: Math.max(-100, Math.min(100, overallScore)),
          timestamp: Date.now()
        };

        this.sentimentCache.set('aggregated', result);
        return result;
      }
      
      // Fallback if datasource fails
      return {
        fearGreedIndex: { value: 50, classification: 'Neutral', timestamp: new Date() },
        newsSentiment: { positive: 0, negative: 0, neutral: 0, total: 0 },
        overallSentiment: 'neutral',
        overallScore: 0,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to get aggregated sentiment', {}, error as Error);
      // Return neutral sentiment on error
      return {
        fearGreedIndex: { value: 50, classification: 'Neutral', timestamp: new Date() },
        newsSentiment: { positive: 0, negative: 0, neutral: 0, total: 0 },
        overallSentiment: 'neutral',
        overallScore: 0,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Analyze sentiment for a specific keyword/coin
   */
  async analyzeKeywordSentiment(keyword: string): Promise<SentimentData> {
    try {
      // Search for news related to the keyword
      const response = await this.cryptopanicClient.get('/posts/', {
        params: {
          public: true,
          kind: 'news',
          filter: 'hot',
          currencies: keyword.toUpperCase(),
          limit: 30
        }
      }).catch(() => ({ data: { results: [] } }));

      const newsItems: NewsItem[] = (response.data.results || []).map((post: any) => ({
        title: post.title,
        url: post.url,
        source: post.source?.title || 'Unknown',
        published: new Date(post.published_at),
        sentiment: this.mapCryptoPanicSentiment(post.sentiment),
        sentimentScore: this.getSentimentScore(post.sentiment)
      }));

      const fearGreedIndex = await this.getFearGreedIndex();

      const newsSentiment = {
        positive: newsItems.filter(n => n.sentiment === 'positive').length,
        negative: newsItems.filter(n => n.sentiment === 'negative').length,
        neutral: newsItems.filter(n => n.sentiment === 'neutral').length,
        total: newsItems.length
      };

      const newsScore = newsSentiment.total > 0
        ? ((newsSentiment.positive - newsSentiment.negative) / newsSentiment.total) * 100
        : 0;

      const fearGreedScore = (fearGreedIndex.value - 50) / 50 * 50;
      const overallScore = fearGreedScore + newsScore * 0.5;

      return {
        fearGreedIndex,
        newsSentiment,
        overallSentiment: overallScore > 20 ? 'bullish' : overallScore < -20 ? 'bearish' : 'neutral',
        overallScore: Math.max(-100, Math.min(100, overallScore)),
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to analyze keyword sentiment', { keyword }, error as Error);
      throw error;
    }
  }

  /**
   * Get latest news stream (for real-time updates)
   */
  startNewsStream(
    callback: (news: NewsItem) => void,
    interval: number = 30000
  ): () => void {
    const intervalId = setInterval(async () => {
      try {
        const news = await this.getCryptoNews(10); // Get latest 10 news items
        for (const item of news) {
          callback(item);
        }
      } catch (error) {
        this.logger.error('News stream error', {}, error as Error);
      }
    }, interval);

    return () => clearInterval(intervalId);
  }
}

