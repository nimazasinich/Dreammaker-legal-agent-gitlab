// src/services/DynamicWeightingService.ts
import { Logger } from '../core/Logger.js';
import { TTLCache } from '../utils/cache.js';

export interface WeightConfig {
  min: number;
  max: number;
  initial: number;
}

export interface SourceMetrics {
  source: string;
  accuracy: number; // 0 to 1
  freshness: number; // 0 to 1 (based on how recent the data is)
  quality: number; // 0 to 1 (data quality score)
  volatility: number; // 0 to 1 (market volatility adjustment)
  requestCount: number;
  successCount: number;
  lastUpdate: number;
  lastSuccess: number;
}

export interface DynamicWeights {
  [source: string]: number;
  lastUpdate: number;
  version: number;
}

/**
 * Dynamic Weighting Service
 * Calculates weights dynamically based on source performance metrics
 */
export class DynamicWeightingService {
  private static instance: DynamicWeightingService;
  private logger = Logger.getInstance();

  // Metrics tracking for each source
  private sourceMetrics: Map<string, SourceMetrics> = new Map();

  // Cache for calculated weights (5 minutes)
  private readonly weightsCache = new TTLCache<DynamicWeights>(300000);

  // Configuration for weight calculation
  private readonly weightConfig: Record<string, WeightConfig> = {
    // Sentiment sources
    'hf_sentiment': { min: 0.2, max: 0.5, initial: 0.4 },
    'reddit': { min: 0.15, max: 0.3, initial: 0.25 },
    'news': { min: 0.15, max: 0.35, initial: 0.25 },
    'fear_greed': { min: 0.05, max: 0.15, initial: 0.1 },
    
    // Signal generation sources
    'technical': { min: 0.2, max: 0.5, initial: 0.4 },
    'sentiment': { min: 0.2, max: 0.4, initial: 0.3 },
    'whale': { min: 0.1, max: 0.3, initial: 0.2 },
    'ai': { min: 0.05, max: 0.2, initial: 0.1 }
  };

  private constructor() {
    // Initialize metrics for all known sources
    Object.keys(this.weightConfig).forEach(source => {
      this.sourceMetrics.set(source, {
        source,
        accuracy: 0.5, // Start with neutral accuracy
        freshness: 1.0, // Assume fresh initially
        quality: 0.8, // Assume good quality initially
        volatility: 0.5, // Neutral volatility
        requestCount: 0,
        successCount: 0,
        lastUpdate: Date.now(),
        lastSuccess: Date.now()
      });
    });
  }

  static getInstance(): DynamicWeightingService {
    if (!DynamicWeightingService.instance) {
      DynamicWeightingService.instance = new DynamicWeightingService();
    }
    return DynamicWeightingService.instance;
  }

  /**
   * Record a successful request from a source
   */
  recordSuccess(source: string, responseTime?: number): void {
    const metrics = this.sourceMetrics.get(source);
    if (!metrics) {
      // Initialize new source
      this.sourceMetrics.set(source, {
        source,
        accuracy: 0.5,
        freshness: 1.0,
        quality: 0.8,
        volatility: 0.5,
        requestCount: 1,
        successCount: 1,
        lastUpdate: Date.now(),
        lastSuccess: Date.now()
      });
      return;
    }

    metrics.requestCount++;
    metrics.successCount++;
    metrics.lastUpdate = Date.now();
    metrics.lastSuccess = Date.now();

    // Update quality based on response time (faster = better quality)
    if (responseTime !== undefined) {
      // Normalize response time (assume < 2s is excellent, > 10s is poor)
      const normalizedQuality = Math.max(0, Math.min(1, 1 - (responseTime - 2000) / 8000));
      metrics.quality = metrics.quality * 0.9 + normalizedQuality * 0.1; // Exponential moving average
    }

    // Clear weights cache when metrics update
    this.weightsCache.clear();
  }

  /**
   * Record a failed request from a source
   */
  recordFailure(source: string): void {
    const metrics = this.sourceMetrics.get(source);
    if (!metrics) {
      return;
    }

    metrics.requestCount++;
    metrics.lastUpdate = Date.now();
    
    // Decrease quality on failure
    metrics.quality = metrics.quality * 0.95; // Small decrease
  }

  /**
   * Update accuracy for a source based on prediction results
   */
  updateAccuracy(source: string, correct: boolean, confidence?: number): void {
    const metrics = this.sourceMetrics.get(source);
    if (!metrics) {
      return;
    }

    // Update accuracy using exponential moving average
    const adjustment = correct ? 0.01 : -0.01;
    if (confidence !== undefined) {
      // Weight adjustment by confidence
      const weightedAdjustment = adjustment * confidence;
      metrics.accuracy = Math.max(0, Math.min(1, metrics.accuracy + weightedAdjustment));
    } else {
      metrics.accuracy = Math.max(0, Math.min(1, metrics.accuracy + adjustment));
    }

    // Clear weights cache
    this.weightsCache.clear();
  }

  /**
   * Update freshness for a source
   */
  updateFreshness(source: string, dataAgeMs: number): void {
    const metrics = this.sourceMetrics.get(source);
    if (!metrics) {
      return;
    }

    // Freshness decays over time (1 hour = 0.5, 24 hours = 0)
    const hoursSinceUpdate = dataAgeMs / (1000 * 60 * 60);
    metrics.freshness = Math.max(0, Math.min(1, 1 - hoursSinceUpdate / 24));
    
    this.weightsCache.clear();
  }

  /**
   * Update volatility adjustment for market conditions
   */
  updateVolatility(source: string, marketVolatility: number): void {
    const metrics = this.sourceMetrics.get(source);
    if (!metrics) {
      return;
    }

    // Some sources perform better in high volatility, others worse
    // Adjust based on source type
    if (source.includes('technical') || source.includes('ai')) {
      // Technical/AI sources often work better in volatile markets
      metrics.volatility = 0.5 + marketVolatility * 0.3;
    } else {
      // Sentiment sources may be less reliable in high volatility
      metrics.volatility = 0.5 - marketVolatility * 0.2;
    }

    metrics.volatility = Math.max(0, Math.min(1, metrics.volatility));
    this.weightsCache.clear();
  }

  /**
   * Calculate dynamic weights for sources
   */
  calculateWeights(sources: string[]): DynamicWeights {
    const cacheKey = sources.sort().join(',');
    const cached = this.weightsCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const weights: DynamicWeights = {
      lastUpdate: Date.now(),
      version: 1
    };

    // Get metrics for all sources
    const sourceScores: Array<{ source: string; score: number; config: WeightConfig }> = [];

    for (const source of sources) {
      const metrics = this.sourceMetrics.get(source);
      const config = this.weightConfig[source];
      
      if (!metrics || !config) {
        // Unknown source, use initial weight
        weights[source] = config?.initial || 0.1;
        continue;
      }

      // Calculate composite score
      // Formula: (accuracy * 0.4) + (freshness * 0.2) + (quality * 0.2) + (volatility * 0.2)
      const score = 
        metrics.accuracy * 0.4 +
        metrics.freshness * 0.2 +
        metrics.quality * 0.2 +
        metrics.volatility * 0.2;

      sourceScores.push({ source, score, config });
    }

    // Normalize scores to sum to 1, respecting min/max constraints
    const normalizedWeights = this.normalizeWeights(sourceScores);

    // Apply weights
    sourceScores.forEach(({ source }, index) => {
      weights[source] = normalizedWeights[index];
    });

    // Cache result
    this.weightsCache.set(cacheKey, weights);

    this.logger.debug('Calculated dynamic weights', {
      sources: Object.keys(weights).filter(k => k !== 'lastUpdate' && k !== 'version'),
      weights: Object.entries(weights).filter(([k]) => k !== 'lastUpdate' && k !== 'version')
    });

    return weights;
  }

  /**
   * Normalize weights to sum to 1, respecting min/max constraints
   */
  private normalizeWeights(
    sourceScores: Array<{ source: string; score: number; config: WeightConfig }>
  ): number[] {
    if (sourceScores.length === 0) {
      return [];
    }

    // First, scale scores to weight range
    const minScore = Math.min(...(sourceScores || []).map(s => s.score));
    const maxScore = Math.max(...(sourceScores || []).map(s => s.score));
    const scoreRange = maxScore - minScore || 1;

    const scaledWeights = (sourceScores || []).map(({ score, config }) => {
      const normalized = scoreRange > 0 ? (score - minScore) / scoreRange : 0.5;
      return config.min + (config.max - config.min) * normalized;
    });

    // Apply min/max constraints
    const constrainedWeights = (sourceScores || []).map(({ config }, index) => {
      return Math.max(config.min, Math.min(config.max, scaledWeights[index]));
    });

    // Normalize to sum to 1
    const sum = constrainedWeights.reduce((s, w) => s + w, 0);
    if (sum === 0) {
      // Fallback to equal weights
      return (sourceScores || []).map(() => 1 / sourceScores.length);
    }

    return (constrainedWeights || []).map(w => w / sum);
  }

  /**
   * Get current metrics for a source
   */
  getMetrics(source: string): SourceMetrics | undefined {
    return this.sourceMetrics.get(source);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, SourceMetrics> {
    return new Map(this.sourceMetrics);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.weightsCache.clear();
  }
}

