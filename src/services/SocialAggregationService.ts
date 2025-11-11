// src/services/SocialAggregationService.ts
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';
import { HFSentimentService } from './HFSentimentService.js';

export interface SocialSourceResult {
  source: string;
  samples: number;
  score: number; // -1 to 1
  sentiment: number; // -100 to 100
  confidence: number;
}

export interface SocialAggregationResult {
  sources: SocialSourceResult[];
  vote: number; // Overall sentiment -1 to 1
  sentiment: number; // Overall sentiment -100 to 100
  timestamp: number;
}

/**
 * Social Aggregation Service
 * Aggregates sentiment from social media sources (Reddit, etc.)
 * Uses Hugging Face models for real sentiment analysis
 */
export class SocialAggregationService {
  private static instance: SocialAggregationService;
  private logger = Logger.getInstance();
  private hfSentimentService = HFSentimentService.getInstance();

  // Reddit API (free, no key needed)
  private readonly REDDIT_BASE = 'https://www.reddit.com';
  private readonly REDDIT_TOP_ENDPOINT = '/r/cryptocurrency/top.json';
  
  // Rate limiter (60 requests per minute for Reddit)
  private readonly redditLimiter = new TokenBucket(60, 60);
  
  // HTTP client for Reddit
  private redditClient: AxiosInstance;

  // Cache for aggregated results (5 minutes)
  private readonly aggregationCache = new TTLCache<SocialAggregationResult>(300000);

  private constructor() {
    // Initialize Reddit client
    this.redditClient = axios.create({
      baseURL: this.REDDIT_BASE,
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (smart-api-system)'
      }
    });
  }

  static getInstance(): SocialAggregationService {
    if (!SocialAggregationService.instance) {
      SocialAggregationService.instance = new SocialAggregationService();
    }
    return SocialAggregationService.instance;
  }

  /**
   * Aggregate social sentiment from all available sources
   */
  async aggregateSocialSentiment(): Promise<SocialAggregationResult> {
    // Check cache
    const cached = this.aggregationCache.get('aggregate');
    if (cached) {
      this.logger.debug('Returning cached social aggregation', { timestamp: cached.timestamp });
      return cached;
    }

    const sources: SocialSourceResult[] = [];

    // Get Reddit sentiment
    try {
      const redditResult = await this.getRedditSentiment();
      sources.push(redditResult);
    } catch (error) {
      this.logger.warn('Failed to get Reddit sentiment', {}, error as Error);
      // Continue with other sources
    }

    // Calculate aggregate vote
    if (sources.length === 0) {
      // Return neutral if no sources available
      const result: SocialAggregationResult = {
        sources: [],
        vote: 0,
        sentiment: 0,
        timestamp: Date.now()
      };
      return result;
    }

    // Weighted average by confidence
    const weightedSum = sources.reduce((sum, s) => sum + (s.score * s.confidence), 0);
    const totalConfidence = sources.reduce((sum, s) => sum + s.confidence, 0);
    const vote = totalConfidence > 0 ? weightedSum / totalConfidence : 0;

    // Convert to sentiment scale (-100 to 100)
    const sentiment = vote * 100;

    const result: SocialAggregationResult = {
      sources,
      vote,
      sentiment,
      timestamp: Date.now()
    };

    // Cache result
    this.aggregationCache.set('aggregate', result);

    return result;
  }

  /**
   * Get Reddit sentiment from r/cryptocurrency
   */
  private async getRedditSentiment(): Promise<SocialSourceResult> {
    await this.redditLimiter.wait();

    try {
      const response = await this.redditClient.get(this.REDDIT_TOP_ENDPOINT, {
        params: {
          limit: 50,
          t: 'day' // Top posts from last day
        }
      });

      const posts = response.data?.data?.children || [];
      
      if (posts.length === 0) {
        console.error('No Reddit posts found');
      }

      // Extract titles
      const titles = posts
        .map((child: any) => child.data?.title)
        .filter((title: any) => title && typeof title === 'string')
        .slice(0, 50); // Limit to 50 titles

      if (titles.length === 0) {
        console.error('No valid titles found');
      }

      // Analyze titles with HF sentiment model
      const hfResults = await this.hfSentimentService.analyzeBatch(titles);

      // Calculate aggregate score
      const aggregate = hfResults.aggregate;
      const score = aggregate.vote; // -1 to 1
      const sentiment = score * 100; // -100 to 100

      // Calculate confidence based on sample size and HF confidence scores
      const avgConfidence = (hfResults.results?.length || 0) > 0
        ? hfResults?.results?.reduce((sum, r) => sum + r.confidence, 0) / hfResults.results.length
        : 0.5;

      this.logger.debug('Reddit sentiment analyzed', {
        postsAnalyzed: titles.length,
        score,
        sentiment,
        confidence: avgConfidence
      });

      return {
        source: 'reddit',
        samples: titles.length,
        score,
        sentiment,
        confidence: avgConfidence
      };
    } catch (error: any) {
      this.logger.error('Failed to fetch Reddit sentiment', {}, error as Error);
      
      // Return neutral fallback
      return {
        source: 'reddit',
        samples: 0,
        score: 0,
        sentiment: 0,
        confidence: 0
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.aggregationCache.clear();
    this.logger.info('Social aggregation cache cleared');
  }
}

