// src/services/FearGreedService.ts
import axios, { AxiosInstance } from 'axios';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { TokenBucket } from '../utils/rateLimiter.js';
import { TTLCache } from '../utils/cache.js';

export interface FearGreedIndex {
  value: number; // 0-100
  classification: string; // Extreme Fear, Fear, Neutral, Greed, Extreme Greed
  timestamp: number;
  change24h?: number;
}

/**
 * Fear & Greed Index Service
 * Dedicated service for Fear & Greed Index data
 * Extracted from SentimentNewsService for standalone use
 */
export class FearGreedService {
  private static instance: FearGreedService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();

  // HTTP client
  private alternativeClient: AxiosInstance;

  // Rate limiter (100 calls per minute - very lenient)
  private readonly alternativeLimiter = new TokenBucket(100, 60);

  // Cache for Fear & Greed Index (5 minutes)
  private readonly fearGreedCache = new TTLCache<FearGreedIndex>(300000);

  private constructor() {
    const apisConfig = this.config.getApisConfig();

    // Initialize Alternative.me client (Fear & Greed Index)
    this.alternativeClient = axios.create({
      baseURL: apisConfig.alternative?.baseUrl || 'https://api.alternative.me',
      timeout: 10000
    });
  }

  static getInstance(): FearGreedService {
    if (!FearGreedService.instance) {
      FearGreedService.instance = new FearGreedService();
    }
    return FearGreedService.instance;
  }

  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex(): Promise<FearGreedIndex> {
    // Check cache
    const cached = this.fearGreedCache.get('fear_greed');
    if (cached) {
      this.logger.debug('Returning cached Fear & Greed Index', { value: cached.value });
      return cached;
    }

    await this.alternativeLimiter.wait();

    try {
      const response = await this.alternativeClient.get('/fng/', {
        params: {
          limit: 2 // Get current and previous for 24h change
        }
      });

      if (!response.data.data || !response.data.data[0]) {
        console.error('No Fear & Greed data available');
      }

      const currentData = response.data.data[0];
      const previousData = response.data.data[1];

      const result: FearGreedIndex = {
        value: parseInt(currentData.value),
        classification: currentData.value_classification,
        timestamp: parseInt(currentData.timestamp) * 1000,
        change24h: previousData 
          ? parseInt(currentData.value) - parseInt(previousData.value)
          : undefined
      };

      // Cache result
      this.fearGreedCache.set('fear_greed', result);

      this.logger.debug('Fetched Fear & Greed Index', {
        value: result.value,
        classification: result.classification,
        change24h: result.change24h
      });

      return result;
    } catch (error) {
      this.logger.warn('Failed to fetch Fear & Greed Index', {}, error as Error);
      
      // Return neutral default on error
      return {
        value: 50,
        classification: 'Neutral',
        timestamp: Date.now()
      };
    }
  }

  /**
   * Normalize Fear & Greed Index to -100 to +100 scale
   */
  normalizeToSentimentScale(value: number): number {
    // 0-100 scale -> -100 to +100 scale
    return (value - 50) * 2;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.fearGreedCache.clear();
    this.logger.info('Fear & Greed cache cleared');
  }
}

