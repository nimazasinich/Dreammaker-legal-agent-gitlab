// src/services/SentimentAnalysisService.ts
import { Logger } from '../core/Logger.js';
import { SentimentData } from '../types/index.js';
import { SentimentNewsService } from './SentimentNewsService.js';
import { HFSentimentService } from './HFSentimentService.js';
import { DynamicWeightingService } from './DynamicWeightingService.js';
import { SocialAggregationService } from './SocialAggregationService.js';
import { FearGreedService } from './FearGreedService.js';

/**
 * Sentiment Analysis Service
 * Aggregates sentiment from multiple sources using Hugging Face models and dynamic weighting
 * Uses real data sources: HF Sentiment, Reddit (via SocialAggregation), News, Fear & Greed
 */
export class SentimentAnalysisService {
  private static instance: SentimentAnalysisService;
  private logger = Logger.getInstance();
  private sentimentNewsService = SentimentNewsService.getInstance();
  private hfSentimentService = HFSentimentService.getInstance();
  private dynamicWeighting = DynamicWeightingService.getInstance();
  private socialAggregation = SocialAggregationService.getInstance();
  private fearGreedService = FearGreedService.getInstance();

  private constructor() {}

  static getInstance(): SentimentAnalysisService {
    if (!SentimentAnalysisService.instance) {
      SentimentAnalysisService.instance = new SentimentAnalysisService();
    }
    return SentimentAnalysisService.instance;
  }

  /**
   * Analyze sentiment for a given symbol
   * Uses Hugging Face models for real sentiment analysis
   */
  async analyzeSentiment(symbol: string): Promise<SentimentData> {
    const startTime = Date.now();
    
    try {
      // Fetch real sentiment data from multiple sources
      let fearGreed = 0;
      let news = 0;
      let reddit = 0;
      let hfSentiment = 0;

      // Fetch Fear & Greed Index (real API via FearGreedService)
      try {
        const startFg = Date.now();
        const fgData = await this.fearGreedService.getFearGreedIndex();
        fearGreed = this.fearGreedService.normalizeToSentimentScale(fgData.value);
        const fgResponseTime = Date.now() - startFg;
        
        // Record success for dynamic weighting
        this.dynamicWeighting.recordSuccess('fear_greed', fgResponseTime);
        this.dynamicWeighting.updateFreshness('fear_greed', 0); // Fresh data
        
        this.logger.debug('Fetched Fear & Greed Index', {
          symbol,
          value: fgData.value,
          classification: fgData.classification,
          normalized: fearGreed
        });
      } catch (error) {
        this.logger.warn('Failed to fetch Fear & Greed Index', { symbol }, error as Error);
        this.dynamicWeighting.recordFailure('fear_greed');
        fearGreed = 0; // Neutral fallback
      }

      // Analyze news sentiment using HF models
      try {
        const startNews = Date.now();
        const newsItems = await this.sentimentNewsService.getCryptoNews(50);
        const baseSymbol = symbol.replace('USDT', '').replace('USD', '').toLowerCase();
        
        // Filter news items for this symbol
        const symbolNews = newsItems.filter(item => 
          item.title.toLowerCase().includes(baseSymbol) ||
          item.title.toLowerCase().includes(symbol.toLowerCase())
        );
        
        if ((symbolNews?.length || 0) > 0) {
          // Extract titles and analyze with HF sentiment model
          const titles = (symbolNews || []).map(item => item.title);
          const hfResults = await this.hfSentimentService.analyzeBatch(titles);
          
          // Calculate average sentiment from HF analysis
          hfSentiment = hfResults.aggregate.vote * 100; // Convert -1 to 1 range to -100 to 100
          
          // Also calculate news sentiment (weighted by HF results)
          const newsScores = (symbolNews || []).map((item, index) => {
            const hfScore = hfResults.results[index]?.sentiment || 0;
            // Combine HF sentiment with item sentiment if available
            if (item.sentiment === 'positive') return 30 + (hfScore * 70);
            if (item.sentiment === 'negative') return -30 + (hfScore * 70);
            return hfScore * 100;
          });
          news = newsScores.reduce((sum, score) => sum + score, 0) / newsScores.length;
          
          const newsResponseTime = Date.now() - startNews;
          this.dynamicWeighting.recordSuccess('news', newsResponseTime);
          this.dynamicWeighting.recordSuccess('hf_sentiment', newsResponseTime);
          this.dynamicWeighting.updateFreshness('news', 0);
          
          this.logger.debug('Analyzed news sentiment with HF', {
            symbol,
            newsCount: symbolNews.length,
            hfSentiment,
            newsSentiment: news
          });
        } else {
          this.logger.debug('No news found for symbol', { symbol });
        }
      } catch (error) {
        this.logger.warn('Failed to analyze news sentiment', { symbol }, error as Error);
        this.dynamicWeighting.recordFailure('news');
        this.dynamicWeighting.recordFailure('hf_sentiment');
      }

      // Reddit sentiment via SocialAggregationService
      try {
        const startSocial = Date.now();
        const socialResult = await this.socialAggregation.aggregateSocialSentiment();
        reddit = socialResult.sentiment; // Already in -100 to 100 scale
        const socialResponseTime = Date.now() - startSocial;
        
        // Record success for dynamic weighting
        this.dynamicWeighting.recordSuccess('reddit', socialResponseTime);
        this.dynamicWeighting.updateFreshness('reddit', 0);
        
        this.logger.debug('Fetched Reddit sentiment', {
          symbol,
          redditSentiment: reddit,
          samples: socialResult.sources.find(s => s.source === 'reddit')?.samples || 0
        });
      } catch (error) {
        this.logger.warn('Failed to fetch Reddit sentiment', { symbol }, error as Error);
        this.dynamicWeighting.recordFailure('reddit');
        reddit = 0;
      }

      // Calculate overall sentiment using dynamic weights
      const weights = this.dynamicWeighting.calculateWeights([
        'hf_sentiment',
        'reddit',
        'news',
        'fear_greed'
      ]);

      const overallScore = this.calculateOverallSentiment(
        {
          hfSentiment,
          reddit,
          news,
          fearGreed
        },
        weights
      );

      // Calculate velocity (rate of change)
      const velocity = await this.calculateSentimentVelocity(symbol, overallScore);

      // Calculate momentum (current + velocity)
      const momentum = overallScore * 0.7 + velocity * 0.3;

      // Get recent news impact
      const newsImpact = await this.extractNewsImpact(symbol);

      const sentimentData: SentimentData = {
        symbol,
        timestamp: Date.now(),
        overallScore,
        sources: {
          twitter: 0, // Disabled - no real API
          reddit: reddit,
          news: news,
          fearGreedIndex: fearGreed,
          googleTrends: 0 // Disabled - no real API
        },
        velocity,
        momentum,
        newsImpact
      };

      const totalTime = Date.now() - startTime;
      this.logger.debug('Sentiment analysis complete', {
        symbol,
        overallScore,
        sources: sentimentData.sources,
        weights: {
          hf_sentiment: weights.hf_sentiment,
          reddit: weights.reddit,
          news: weights.news,
          fear_greed: weights.fear_greed
        },
        duration: totalTime
      });

      return sentimentData;
    } catch (error) {
      this.logger.error('Sentiment analysis failed', { symbol }, error as Error);
      
      // Return neutral sentiment on error
      return this.getNeutralSentiment(symbol);
    }
  }

  /**
   * Normalize Fear & Greed Index to -100 to +100 scale
   */
  private normalizeFearGreed(value: number): number {
    // 0-100 scale -> -100 to +100 scale
    return (value - 50) * 2;
  }

  /**
   * Calculate overall sentiment from weighted sources using dynamic weights
   */
  private calculateOverallSentiment(
    sources: { hfSentiment: number; reddit: number; news: number; fearGreed: number },
    weights: { [key: string]: number }
  ): number {
    // Map sources to weight keys
    const weightedSum = 
      sources.hfSentiment * (weights.hf_sentiment || 0.4) +
      sources.reddit * (weights.reddit || 0.25) +
      sources.news * (weights.news || 0.25) +
      sources.fearGreed * (weights.fear_greed || 0.1);

    // Normalize to -100 to +100 range
    return Math.max(-100, Math.min(100, weightedSum));
  }

  /**
   * Calculate sentiment velocity (rate of change)
   * Tracks historical sentiment changes using stored history
   */
  private async calculateSentimentVelocity(symbol: string, currentScore: number): Promise<number> {
    try {
      // Check if we have historical sentiment data
      const cacheKey = `sentiment_history_${symbol}`;
      const storedHistory = this.sentimentHistory.get(cacheKey);
      
      if (storedHistory && (storedHistory?.length || 0) >= 2) {
        // Calculate actual velocity from historical data
        const previousScore = storedHistory[storedHistory.length - 1].score;
        const timeDelta = Date.now() - storedHistory[storedHistory.length - 1].timestamp;
        const hoursDelta = timeDelta / (1000 * 60 * 60); // Convert to hours
        
        if (hoursDelta > 0) {
          const velocity = (currentScore - previousScore) / hoursDelta;
          return velocity; // Return actual velocity in score per hour
        }
      }
      
      // If no history available, return 0 (no velocity)
      // Store current score for future velocity calculation
      if (!storedHistory) {
        this.sentimentHistory.set(cacheKey, []);
      }
      this.sentimentHistory.get(cacheKey)!.push({
        score: currentScore,
        timestamp: Date.now()
      });
      
      // Keep only last 100 entries
      const history = this.sentimentHistory.get(cacheKey)!;
      if ((history?.length || 0) > 100) {
        history.shift();
      }
      
      return 0; // No velocity if no history
    } catch (error) {
      this.logger.warn('Failed to calculate sentiment velocity', { symbol, error });
      return 0;
    }
  }
  
  private sentimentHistory: Map<string, Array<{ score: number; timestamp: number }>> = new Map();

  /**
   * Extract news impact from recent headlines
   */
  private async extractNewsImpact(symbol: string): Promise<SentimentData['newsImpact']> {
    try {
      const newsItems = await this.sentimentNewsService.getCryptoNews(20);
      const baseSymbol = symbol.replace('USDT', '').replace('USD', '').toLowerCase();
      
      const symbolNews = newsItems
        .filter(item => 
          item.title.toLowerCase().includes(baseSymbol) ||
          item.title.toLowerCase().includes(symbol.toLowerCase())
        )
        .slice(0, 10);

      // Analyze headlines with HF for better impact scoring
      if ((symbolNews?.length || 0) > 0) {
        const titles = (symbolNews || []).map(item => item.title);
        const hfResults = await this.hfSentimentService.analyzeBatch(titles);

        return (symbolNews || []).map((item, index) => {
          const hfResult = hfResults.results[index];
          return {
            headline: item.title,
            source: item.source,
            timestamp: item.published.getTime(),
            impact: (hfResult?.sentiment || 0) * 100,
            category: this.categorizeNewsHeadline(item.title)
          };
        });
      }

      return [];
    } catch (error) {
      this.logger.warn('Failed to extract news impact', { symbol }, error as Error);
      return [];
    }
  }

  /**
   * Categorize news headline
   */
  private categorizeNewsHeadline(headline: string): 'REGULATORY' | 'PARTNERSHIP' | 'TECHNICAL' | 'MARKET_ANALYSIS' {
    const lowerHeadline = headline.toLowerCase();
    
    if (lowerHeadline.includes('regulatory') || lowerHeadline.includes('sec') || lowerHeadline.includes('regulation')) {
      return 'REGULATORY';
    }
    if (lowerHeadline.includes('partnership') || lowerHeadline.includes('partners') || lowerHeadline.includes('integration')) {
      return 'PARTNERSHIP';
    }
    if (lowerHeadline.includes('update') || lowerHeadline.includes('upgrade') || lowerHeadline.includes('launch')) {
      return 'TECHNICAL';
    }
    
    return 'MARKET_ANALYSIS';
  }

  /**
   * Get neutral sentiment data
   */
  private getNeutralSentiment(symbol: string): SentimentData {
    return {
      symbol,
      timestamp: Date.now(),
      overallScore: 0,
      sources: {
        twitter: 0,
        reddit: 0,
        news: 0,
        fearGreedIndex: 0,
        googleTrends: 0
      },
      velocity: 0,
      momentum: 0,
      newsImpact: []
    };
  }
}
