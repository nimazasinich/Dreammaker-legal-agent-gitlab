// src/services/HFSentimentService.ts
import { HuggingFaceService } from './HuggingFaceService.js';
import { TTLCache } from '../utils/cache.js';
import { Logger } from '../core/Logger.js';

export interface SentimentResult {
  label: string;
  score: number;
}

export interface SentimentAnalysisResult {
  text: string;
  sentiment: number; // -1 to 1 (negative to positive)
  label: string; // 'POSITIVE', 'NEGATIVE', 'NEUTRAL'
  confidence: number;
  rawScores: SentimentResult[];
}

export interface BatchSentimentResult {
  results: SentimentAnalysisResult[];
  aggregate: {
    average: number;
    positive: number;
    negative: number;
    neutral: number;
    vote: number; // Overall sentiment (-1 to 1)
  };
}

/**
 * Hugging Face Sentiment Service
 * Uses CryptoBERT models for cryptocurrency sentiment analysis
 */
export class HFSentimentService extends HuggingFaceService {
  protected static instance: HFSentimentService;
  protected logger = Logger.getInstance();

  // Primary and fallback models
  private readonly PRIMARY_MODEL = 'ElKulako/cryptobert';
  private readonly FALLBACK_MODEL = 'kk08/CryptoBERT';

  // Cache for sentiment results (15 minutes)
  private readonly sentimentCache = new TTLCache<SentimentAnalysisResult>(900000);
  private readonly batchCache = new TTLCache<BatchSentimentResult>(900000);

  private constructor() {
    super();
  }

  static getInstance(): HFSentimentService {
    if (!HFSentimentService.instance) {
      HFSentimentService.instance = new HFSentimentService();
    }
    return HFSentimentService.instance;
  }

  /**
   * Analyze sentiment of a single text
   */
  async analyzeSentiment(text: string, useCache: boolean = true): Promise<SentimentAnalysisResult> {
    // Check cache
    if (useCache) {
      const cached = this.sentimentCache.get(text);
      if (cached) {
        this.logger.debug('Returning cached sentiment result', { text: text.substring(0, 50) });
        return cached;
      }
    }

    try {
      // Try primary model first
      const result = await this.analyzeWithModel(text, this.PRIMARY_MODEL);
      
      // Cache result
      if (useCache) {
        this.sentimentCache.set(text, result);
      }

      return result;
    } catch (error) {
      this.logger.warn('Primary sentiment model failed, trying fallback', { model: this.PRIMARY_MODEL }, error as Error);
      
      try {
        // Try fallback model
        const result = await this.analyzeWithModel(text, this.FALLBACK_MODEL);
        
        if (useCache) {
          this.sentimentCache.set(text, result);
        }

        return result;
      } catch (fallbackError) {
        this.logger.error('All sentiment models failed', {}, fallbackError as Error);
        
        // Return neutral fallback
        return {
          text,
          sentiment: 0,
          label: 'NEUTRAL',
          confidence: 0,
          rawScores: []
        };
      }
    }
  }

  /**
   * Analyze sentiment using a specific model
   */
  private async analyzeWithModel(text: string, modelId: string): Promise<SentimentAnalysisResult> {
    const response = await this.inference<any>(modelId, text);

    // Parse response (format may vary by model)
    let rawScores: SentimentResult[] = [];
    if (Array.isArray(response)) {
      rawScores = response;
    } else if (response && typeof response === 'object') {
      if (Array.isArray(response[0])) {
        rawScores = response[0];
      } else {
        rawScores = [response];
      }
    }

    // Normalize scores to -1 to 1 range
    let sentiment = 0;
    let label = 'NEUTRAL';
    let confidence = 0;

    if ((rawScores?.length || 0) > 0) {
      // Find the label with highest score
      const bestMatch = rawScores.reduce((max, item) => 
        item.score > max.score ? item : max
      );

      // Map labels to sentiment values
      const labelToSentiment: Record<string, number> = {
        'POSITIVE': 1,
        'POS': 1,
        'LABEL_1': 1,
        'NEGATIVE': -1,
        'NEG': -1,
        'LABEL_0': -1,
        'NEUTRAL': 0,
        'NEU': 0
      };

      label = bestMatch.label.toUpperCase();
      sentiment = labelToSentiment[label] || 0;
      confidence = bestMatch.score;
    }

    return {
      text,
      sentiment,
      label,
      confidence,
      rawScores
    };
  }

  /**
   * Analyze sentiment of multiple texts in batch
   */
  async analyzeBatch(texts: string[], useCache: boolean = true): Promise<BatchSentimentResult> {
    // Create cache key
    const cacheKey = texts.sort().join('||');
    
    // Check cache
    if (useCache) {
      const cached = this.batchCache.get(cacheKey);
      if (cached) {
        this.logger.debug('Returning cached batch sentiment result', { count: texts.length });
        return cached;
      }
    }

    // Analyze each text (HF models typically handle one text at a time)
    const results: SentimentAnalysisResult[] = [];
    
    for (const text of texts) {
      try {
        const result = await this.analyzeSentiment(text, useCache);
        results.push(result);
      } catch (error) {
        this.logger.warn('Failed to analyze sentiment for text', { text: text.substring(0, 50) }, error as Error);
        // Add neutral fallback
        results.push({
          text,
          sentiment: 0,
          label: 'NEUTRAL',
          confidence: 0,
          rawScores: []
        });
      }
    }

    // Calculate aggregate
    const sentiments = (results || []).map(r => r.sentiment);
    const average = (sentiments?.length || 0) > 0 
      ? sentiments.reduce((sum, s) => sum + s, 0) / sentiments.length 
      : 0;
    
    const positive = results.filter(r => r.sentiment > 0).length;
    const negative = results.filter(r => r.sentiment < 0).length;
    const neutral = results.filter(r => r.sentiment === 0).length;

    // Vote-based sentiment (weighted by confidence)
    const vote = (results?.length || 0) > 0
      ? results.reduce((sum, r) => sum + (r.sentiment * r.confidence), 0) / 
        results.reduce((sum, r) => sum + r.confidence, 0) || 0
      : 0;

    const aggregate = {
      average,
      positive,
      negative,
      neutral,
      vote: isNaN(vote) ? 0 : vote
    };

    const batchResult: BatchSentimentResult = {
      results,
      aggregate
    };

    // Cache result
    if (useCache) {
      this.batchCache.set(cacheKey, batchResult);
    }

    return batchResult;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.sentimentCache.clear();
    this.batchCache.clear();
    this.logger.info('HF Sentiment cache cleared');
  }
}

