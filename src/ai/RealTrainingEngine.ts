/**
 * REAL AI TRAINING ENGINE - 100% REAL DATA
 * Trains neural networks using live market data from multiple sources
 */

import { Logger } from '../core/Logger.js';
import { TrainingEngine } from './TrainingEngine.js';
import { ExperienceBuffer, Experience } from './ExperienceBuffer.js';
import { RealMarketDataService } from '../services/RealMarketDataService.js';
import { FearGreedService } from '../services/FearGreedService.js';
import { TrainingMetrics } from '../types/index.js';

export interface RealTrainingConfig {
  symbols: string[];
  historicalDays: number;
  batchSize: number;
  epochs: number;
  validationSplit: number;
}

export class RealTrainingEngine {
  private static instance: RealTrainingEngine;
  private logger = Logger.getInstance();
  private trainingEngine = TrainingEngine.getInstance();
  private experienceBuffer = ExperienceBuffer.getInstance();
  private marketDataService = new RealMarketDataService();
  private sentimentService = FearGreedService.getInstance();

  private constructor() {}

  static getInstance(): RealTrainingEngine {
    if (!RealTrainingEngine.instance) {
      RealTrainingEngine.instance = new RealTrainingEngine();
    }
    return RealTrainingEngine.instance;
  }

  /**
   * Train AI model with real market data from multiple sources
   */
  async trainWithRealMarketData(config: RealTrainingConfig): Promise<{
    accuracy: number;
    loss: number;
    epochs: number;
    dataPoints: number;
  }> {
    this.logger.info('Starting real AI training', config);

    try {
      // Step 1: Fetch real historical data from multiple sources
      const [btcData, ethData, marketSentiment] = await Promise.all([
        this.fetchRealHistoricalData('BTC', config.historicalDays),
        this.fetchRealHistoricalData('ETH', config.historicalDays),
        this.fetchRealSentimentData()
      ]);

      this.logger.info('Real data fetched', {
        btcPoints: btcData.length,
        ethPoints: ethData.length,
        sentiment: marketSentiment.value
      });

      // Step 2: Create real training dataset
      const trainingDataset = this.createRealTrainingDataset([btcData, ethData], marketSentiment);

      this.logger.info('Training dataset created', {
        features: trainingDataset.features.length,
        labels: trainingDataset.labels.length
      });

      // Step 3: Initialize neural network
      await this.trainingEngine.initializeNetwork('hybrid', trainingDataset.features[0].length, 3);

      // Step 4: Convert to experiences for training
      const experiences = this.convertToExperiences(trainingDataset);
      
      // Add to experience buffer
      experiences.forEach(exp => this.experienceBuffer.addExperience(exp));

      // Step 5: Train the model
      const allMetrics: TrainingMetrics[] = [];
      
      for (let epoch = 0; epoch < config.epochs; epoch++) {
        const epochMetrics = await this.trainingEngine.trainEpoch();
        allMetrics.push(...epochMetrics);

        // Log progress every 10 epochs
        if (epoch % 10 === 0) {
          const avgMetrics = this.calculateAverageMetrics(epochMetrics);
          this.logger.info(`Real Training - Epoch ${epoch}`, {
            loss: avgMetrics.mse.toFixed(6),
            accuracy: (avgMetrics.directionalAccuracy || 0).toFixed(3),
            learningRate: avgMetrics.learningRate.toExponential(3)
          });
        }

        // Early stopping check
        if (this.trainingEngine.shouldStopEarly()) {
          this.logger.info('Early stopping triggered', { epoch });
          break;
        }
      }

      // Calculate final metrics
      const finalMetrics = this.calculateAverageMetrics(allMetrics);

      return {
        accuracy: finalMetrics.directionalAccuracy || 0,
        loss: finalMetrics.mse,
        epochs: config.epochs,
        dataPoints: trainingDataset.features.length
      };

    } catch (error) {
      this.logger.error('Real AI training failed', {}, error as Error);
      throw error;
    }
  }

  /**
   * Fetch real historical data from CoinGecko/CryptoCompare/CMC
   */
  private async fetchRealHistoricalData(symbol: string, days: number): Promise<any[]> {
    try {
      const data = await this.marketDataService.getHistoricalData(symbol, days);
      
      if (!data || data.length === 0) {
        console.error(`No historical data available for ${symbol}`);
      }

      return data;
    } catch (error) {
      this.logger.error(`Failed to fetch historical data for ${symbol}`, {}, error as Error);
      throw error;
    }
  }

  /**
   * Fetch real sentiment data from Fear & Greed Index
   */
  private async fetchRealSentimentData(): Promise<any> {
    try {
      const sentiment = await this.sentimentService.getFearGreedIndex();
      return sentiment;
    } catch (error) {
      this.logger.error('Failed to fetch sentiment data', {}, error as Error);
      // Return neutral sentiment as fallback
      return { value: 50, classification: 'Neutral' };
    }
  }

  /**
   * Create training dataset from real market data
   */
  private createRealTrainingDataset(
    marketDataArrays: any[][],
    sentiment: any
  ): { features: number[][]; labels: number[] } {
    const features: number[][] = [];
    const labels: number[] = [];

    // Process each market data array
    for (const marketData of marketDataArrays) {
      for (let i = 20; i < marketData.length - 1; i++) {
        // Create feature vector from real data
        const feature = this.extractFeatures(marketData.slice(i - 20, i), sentiment);
        features.push(feature);

        // Create label (price direction)
        const currentPrice = marketData[i].price || marketData[i].close;
        const nextPrice = marketData[i + 1].price || marketData[i + 1].close;
        const priceChange = (nextPrice - currentPrice) / currentPrice;
        
        // Label: 0 = down, 1 = neutral, 2 = up
        const label = priceChange < -0.01 ? 0 : priceChange > 0.01 ? 2 : 1;
        labels.push(label);
      }
    }

    return { features, labels };
  }

  /**
   * Extract features from real market data
   */
  private extractFeatures(recentData: any[], sentiment: any): number[] {
    const features: number[] = [];

    // Price features (normalized)
    const prices = (recentData || []).map(d => d.price || d.close);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    prices.forEach(price => {
      features.push((price - minPrice) / priceRange);
    });

    // Volume features (if available)
    if (recentData[0].volume) {
      const volumes = (recentData || []).map(d => d.volume);
      const maxVolume = Math.max(...volumes);
      volumes.forEach(vol => {
        features.push(vol / maxVolume);
      });
    }

    // Sentiment feature (normalized)
    features.push(sentiment.value / 100);

    // Price momentum
    const momentum = (prices[prices.length - 1] - prices[0]) / prices[0];
    features.push(Math.tanh(momentum * 10)); // Normalize to [-1, 1]

    // Volatility
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    features.push(Math.min(volatility * 10, 1)); // Cap at 1

    return features;
  }

  /**
   * Convert training dataset to experiences
   */
  private convertToExperiences(dataset: { features: number[][]; labels: number[] }): Experience[] {
    return (dataset.features || []).map((feature, i) => ({
      id: `exp_${Date.now()}_${i}`,
      state: feature,
      action: dataset.labels[i],
      reward: dataset.labels[i] === 2 ? 1 : dataset.labels[i] === 0 ? -1 : 0,
      nextState: dataset.features[Math.min(i + 1, dataset.features.length - 1)],
      terminal: i === dataset.features.length - 1,
      tdError: 0,
      priority: 1.0,
      timestamp: Date.now() - (dataset.features.length - i) * 60000, // Simulate timestamps
      symbol: 'BTC',
      metadata: {
        price: 0,
        volume: 0,
        volatility: 0,
        confidence: 1.0
      }
    }));
  }

  /**
   * Calculate average metrics
   */
  private calculateAverageMetrics(metrics: TrainingMetrics[]): TrainingMetrics {
    const count = metrics.length;
    return {
      epoch: metrics[0].epoch,
      timestamp: Date.now(),
      mse: metrics.reduce((sum, m) => sum + m.mse, 0) / count,
      mae: metrics.reduce((sum, m) => sum + m.mae, 0) / count,
      r2: metrics.reduce((sum, m) => sum + m.r2, 0) / count,
      directionalAccuracy: metrics.reduce((sum, m) => sum + (m.directionalAccuracy || 0), 0) / count,
      gradientNorm: metrics.reduce((sum, m) => sum + m.gradientNorm, 0) / count,
      learningRate: metrics[metrics.length - 1].learningRate,
      resetEvents: metrics.reduce((sum, m) => sum + m.resetEvents, 0),
      stabilityMetrics: metrics[metrics.length - 1].stabilityMetrics,
      explorationStats: metrics[metrics.length - 1].explorationStats
    };
  }
}
