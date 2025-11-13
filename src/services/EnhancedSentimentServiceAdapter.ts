/**
 * Enhanced Sentiment Service Adapter
 *
 * Bridges the existing SentimentAnalysisService with the new UnifiedDataService
 * Provides enhanced sentiment analysis with multi-source aggregation
 */

import { Logger } from '../core/Logger.js';
import { UnifiedDataService } from './UnifiedDataService.js';
import type { SentimentData } from '../types/index.js';

/**
 * Adapter for enhanced sentiment analysis
 */
export class EnhancedSentimentServiceAdapter {
  private static instance: EnhancedSentimentServiceAdapter;
  private logger = Logger.getInstance();
  private unifiedService = UnifiedDataService.getInstance();

  private constructor() {
    this.logger.info('EnhancedSentimentServiceAdapter initialized');
  }

  static getInstance(): EnhancedSentimentServiceAdapter {
    if (!EnhancedSentimentServiceAdapter.instance) {
      EnhancedSentimentServiceAdapter.instance = new EnhancedSentimentServiceAdapter();
    }
    return EnhancedSentimentServiceAdapter.instance;
  }

  /**
   * Get Fear & Greed Index with multi-source support
   * Compatible with SentimentAnalysisService
   */
  async getFearGreedIndex() {
    try {
      return await this.unifiedService.getFearGreedIndex();
    } catch (error) {
      this.logger.error('Failed to get Fear & Greed Index', {}, error as Error);
      throw error;
    }
  }

  /**
   * Analyze sentiment for a symbol (enhanced version)
   * Uses UnifiedDataService for news and sentiment aggregation
   */
  async analyzeSentiment(symbol: string): Promise<SentimentData> {
    try {
      // Get Fear & Greed
      const fearGreed = await this.unifiedService.getFearGreedIndex();

      // Get news for the symbol
      const news = await this.unifiedService.getNews(50, [symbol.replace('USDT', '').replace('USD', '')]);

      // Calculate news sentiment
      const newsSentiment = this.calculateNewsSentiment(news);

      // Aggregate sentiments
      const aggregatedScore = this.aggregateSentiments({
        fearGreed: fearGreed.value,
        news: newsSentiment
      });

      return {
        symbol,
        score: aggregatedScore,
        overallScore: aggregatedScore,
        confidence: this.calculateConfidence(fearGreed, news.length),
        sources: {
          fearGreedIndex: fearGreed.value,
          news: newsSentiment,
          twitter: 0,
          reddit: 0,
          googleTrends: 0
        },
        velocity: 0,
        momentum: aggregatedScore,
        newsImpact: news.slice(0, 5).map(item => ({
          headline: item.title,
          source: item.source || 'Unknown',
          impact: (item as any).sentimentScore || 0,
          timestamp: item.published?.getTime() || Date.now(),
          category: 'MARKET_ANALYSIS' as const
        })),
        timestamp: Date.now()
      };

    } catch (error) {
      this.logger.error('Failed to analyze sentiment', { symbol }, error as Error);

      // Return neutral sentiment on error
      return {
        symbol,
        score: 0,
        overallScore: 0,
        confidence: 0,
        sources: {
          fearGreedIndex: 0,
          news: 0,
          twitter: 0,
          reddit: 0,
          googleTrends: 0
        },
        velocity: 0,
        momentum: 0,
        newsImpact: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get latest crypto news
   */
  async getNews(limit: number = 50, currencies?: string[]) {
    try {
      return await this.unifiedService.getNews(limit, currencies);
    } catch (error) {
      this.logger.error('Failed to get news', { limit, currencies }, error as Error);
      return [];
    }
  }

  /**
   * Calculate sentiment from news items
   */
  private calculateNewsSentiment(news: any[]): number {
    if (news.length === 0) return 0;

    const sentimentScores = (news || []).map(item => {
      switch (item.sentiment) {
        case 'positive': return 50;
        case 'negative': return -50;
        case 'neutral':
        default: return 0;
      }
    });

    const average = sentimentScores.reduce((sum, score) => sum + score, 0) / sentimentScores.length;
    return average;
  }

  /**
   * Aggregate multiple sentiment sources
   */
  private aggregateSentiments(sources: { fearGreed: number; news: number }): number {
    // Weight distribution
    const weights = {
      fearGreed: 0.6, // 60% weight to Fear & Greed (most reliable)
      news: 0.4       // 40% weight to news sentiment
    };

    const weighted =
      (sources.fearGreed * weights.fearGreed) +
      (sources.news * weights.news);

    // Normalize to -100 to +100 range
    return Math.max(-100, Math.min(100, weighted));
  }

  /**
   * Calculate confidence based on data availability
   */
  private calculateConfidence(fearGreed: any, newsCount: number): number {
    let confidence = 0;

    // Base confidence from Fear & Greed availability
    if (fearGreed && fearGreed.value !== undefined) {
      confidence += 50;
    }

    // Additional confidence from news availability
    if (newsCount > 0) {
      confidence += Math.min(50, newsCount * 2); // Max 50 from news
    }

    return Math.min(100, confidence);
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return this.unifiedService.getHealthStatus();
  }
}
