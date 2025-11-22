/**
 * Unified News Service
 * 
 * Implements news fetching with:
 * - Multiple provider support with fallback
 * - Proper error labels (NEWS_API_FAIL:<provider>, INVALID_NEWS_API_KEY)
 * - Structured logging
 * - Caching
 */

import { Logger } from '../core/Logger.js';
import { fetchNews, fetchFearGreed, NewsArticle } from './enhanced/newsProvider.js';
import { NewsApiService } from './optional/NewsApiService.js';

const logger = Logger.getInstance();

interface NewsResponse {
  status: 'ok' | 'error';
  code?: string;
  message: string;
  data: NewsArticle[];
  source?: string;
  cached?: boolean;
}

interface NewsCache {
  articles: NewsArticle[];
  timestamp: number;
  source: string;
}

export class UnifiedNewsService {
  private static instance: UnifiedNewsService;
  private cache: Map<string, NewsCache> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): UnifiedNewsService {
    if (!UnifiedNewsService.instance) {
      UnifiedNewsService.instance = new UnifiedNewsService();
    }
    return UnifiedNewsService.instance;
  }

  /**
   * Fetch news with fallback providers
   */
  async fetchNews(query: string = 'cryptocurrency', pageSize: number = 24): Promise<NewsResponse> {
    const cacheKey = `${query}-${pageSize}`;

    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.debug('Returning cached news', { query, source: cached.source });
      return {
        status: 'ok',
        message: 'News retrieved from cache',
        data: cached.articles,
        source: cached.source,
        cached: true
      };
    }

    // Try primary provider (proxy/aggregated)
    try {
      logger.info('Fetching news from primary provider', { query, pageSize });
      
      const articles = await fetchNews(query, pageSize);
      
      if (articles && articles.length > 0) {
        // Cache successful result
        this.cache.set(cacheKey, {
          articles,
          timestamp: Date.now(),
          source: 'primary'
        });

        logger.info('NEWS_FETCH_SUCCESS', {
          component: 'UnifiedNewsService',
          provider: 'primary',
          count: articles.length,
          query
        });

        return {
          status: 'ok',
          message: 'News fetched successfully',
          data: articles,
          source: 'primary'
        };
      }
    } catch (error: any) {
      logger.warn('NEWS_API_FAIL:primary', {
        component: 'UnifiedNewsService',
        provider: 'primary',
        error: error.message,
        query
      }, error);
    }

    // Try fallback provider (NewsAPI)
    try {
      logger.info('Trying fallback news provider', { query, pageSize });
      
      const articles = await NewsApiService.search(query, pageSize);
      
      if (articles && articles.length > 0) {
        // Convert to standard format
        const formattedArticles: NewsArticle[] = articles.map((a: any, idx: number) => ({
          id: `${a.url || 'unknown'}-${idx}`,
          title: a.title || 'Untitled',
          description: a.description || '',
          url: a.url || '#',
          image: a.urlToImage || undefined,
          source: a.source?.name || 'newsapi',
          published: a.publishedAt || new Date().toISOString()
        }));

        // Cache successful result
        this.cache.set(cacheKey, {
          articles: formattedArticles,
          timestamp: Date.now(),
          source: 'newsapi'
        });

        logger.info('NEWS_FETCH_SUCCESS', {
          component: 'UnifiedNewsService',
          provider: 'newsapi',
          count: formattedArticles.length,
          query
        });

        return {
          status: 'ok',
          message: 'News fetched from fallback provider',
          data: formattedArticles,
          source: 'newsapi'
        };
      }
    } catch (error: any) {
      logger.error('NEWS_API_FAIL:newsapi', {
        component: 'UnifiedNewsService',
        provider: 'newsapi',
        error: error.message,
        query
      }, error);
    }

    // All providers failed - check if we have stale cache
    const staleCache = this.cache.get(cacheKey);
    if (staleCache) {
      logger.warn('Returning stale cached news (all providers failed)', { 
        query, 
        source: staleCache.source,
        age: Date.now() - staleCache.timestamp 
      });

      return {
        status: 'error',
        code: 'NEWS_API_FAIL:all',
        message: 'All news providers failed. Returning cached results.',
        data: staleCache.articles,
        source: staleCache.source,
        cached: true
      };
    }

    // No cache available - return error
    logger.error('NEWS_API_FAIL:all', {
      component: 'UnifiedNewsService',
      message: 'All news providers failed and no cache available',
      query
    });

    return {
      status: 'error',
      code: 'NEWS_API_FAIL:all',
      message: 'Unable to fetch news from any provider. Please try again later.',
      data: []
    };
  }

  /**
   * Clear news cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Cleared news cache');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export const unifiedNewsService = UnifiedNewsService.getInstance();
