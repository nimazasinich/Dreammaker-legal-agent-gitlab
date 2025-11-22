import { PredictionData, TrainingMetrics } from '../types';

import { Logger } from '../core/Logger.js';
class AIPredictionService {
  private isTraining = false;
  private currentEpoch = 0;
  private trainingHistory: TrainingMetrics[] = [];
  private subscribers: ((prediction: PredictionData) => void)[] = [];
  private trainingSubscribers: ((metrics: TrainingMetrics) => void)[] = [];
  private predictionIntervalId?: NodeJS.Timeout;

  async initialize(): Promise<void> {
    // Initialize AI prediction service
    this.startPredictionLoop();
  }

  private startPredictionLoop(): void {
    // Disable demo generators in online mode
    if (import.meta.env.VITE_APP_MODE === 'online' && import.meta.env.VITE_STRICT_REAL_DATA === 'true') {
      logger.info('Demo prediction loop disabled in online mode');
      return;
    }

    this.predictionIntervalId = setInterval(() => {
      if (!this.isTraining) {
        this.generatePredictions();
      }
    }, 5000); // Generate predictions every 5 seconds
  }

  stop(): void {
    if (this.predictionIntervalId) {
      clearInterval(this.predictionIntervalId);
      this.predictionIntervalId = undefined;
    }
  }

  private async generatePredictions(): Promise<void> {
    const symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'];
    
    // Generate predictions asynchronously
    const predictions = await Promise.all(
      (symbols || []).map(symbol => this.generatePrediction(symbol))
    );
    
    predictions.forEach(prediction => {
      this.subscribers.forEach(callback => callback(prediction));
    });
  }

  private async generatePrediction(symbol: string): Promise<PredictionData> {
    try {
      // Validate input
      if (!symbol || typeof symbol !== 'string') {
        logger.error('AI_PREDICTION_INVALID_INPUT', { error: 'Invalid symbol provided' });
        return this.getSafeFallbackPrediction(symbol || 'UNKNOWN', 'INVALID_INPUT');
      }

      // Use real AI prediction from backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          logger.error('AI_PREDICTION_INVALID_RESPONSE', { error: 'Invalid response format', symbol });
          return this.getSafeFallbackPrediction(symbol, 'INVALID_RESPONSE');
        }

        if (data.success && data.prediction) {
          // Validate prediction data
          const prediction = data.prediction;
          const isValid = this.validatePredictionData(prediction);
          
          if (!isValid) {
            logger.error('AI_PREDICTION_DATA_VALIDATION_FAILED', { 
              error: 'Prediction data validation failed', 
              symbol,
              prediction 
            });
            return this.getSafeFallbackPrediction(symbol, 'VALIDATION_FAILED');
          }

          return {
            symbol,
            bullishProbability: prediction.bullishProbability ?? prediction.probabilities?.bull ?? 0.33,
            bearishProbability: prediction.bearishProbability ?? prediction.probabilities?.bear ?? 0.33,
            neutralProbability: prediction.neutralProbability ?? prediction.probabilities?.hold ?? 0.34,
            confidence: prediction.confidence ?? 0.5,
            prediction: prediction.direction ?? 'NEUTRAL',
            riskScore: prediction.riskScore ?? 0.3,
            timestamp: prediction.timestamp ?? Date.now()
          };
        } else {
          // Check if insufficient data error
          if (data.error?.includes('insufficient data') || data.error?.includes('not enough data')) {
            logger.warn('AI_DATA_TOO_SMALL', { 
              error: 'Insufficient historical data for prediction', 
              symbol,
              suggestion: 'Consider fetching more historical data' 
            });
            // Attempt to fetch more data
            await this.attemptDataFetch(symbol);
          } else {
            logger.error('AI_PREDICTION_API_ERROR', { error: data.error || 'Unknown error', symbol });
          }
          return this.getSafeFallbackPrediction(symbol, 'API_ERROR');
        }
      } else {
        logger.error('AI_PREDICTION_HTTP_ERROR', { 
          error: `HTTP ${response.status}`, 
          symbol,
          statusText: response.statusText 
        });
        return this.getSafeFallbackPrediction(symbol, `HTTP_${response.status}`);
      }
    } catch (error: any) {
      // Structured error handling
      if (error.name === 'AbortError') {
        logger.error('AI_PREDICTION_TIMEOUT', { error: 'Request timeout after 10s', symbol });
        return this.getSafeFallbackPrediction(symbol, 'TIMEOUT');
      } else if (error.message?.includes('fetch')) {
        logger.error('AI_PREDICTION_NETWORK_ERROR', { error: error.message, symbol });
        return this.getSafeFallbackPrediction(symbol, 'NETWORK_ERROR');
      } else {
        logger.error('AI_PREDICTION_UNKNOWN_ERROR', { error: error.message, symbol }, error);
        return this.getSafeFallbackPrediction(symbol, 'UNKNOWN_ERROR');
      }
    }
  }

  /**
   * Validate prediction data structure
   */
  private validatePredictionData(prediction: any): boolean {
    if (!prediction || typeof prediction !== 'object') return false;
    
    // Check for required fields or valid probability fields
    const hasValidProbs = 
      (typeof prediction.bullishProbability === 'number' && 
       typeof prediction.bearishProbability === 'number') ||
      (prediction.probabilities && 
       typeof prediction.probabilities.bull === 'number');
    
    return hasValidProbs;
  }

  /**
   * Attempt to fetch additional historical data for better predictions
   */
  private async attemptDataFetch(symbol: string): Promise<void> {
    try {
      logger.info('AI_DATA_FETCH_ATTEMPT', { symbol, message: 'Attempting to fetch additional historical data' });
      
      // Trigger data ingestion endpoint if available
      const response = await fetch('/api/data/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol, 
          intervals: ['1h', '4h', '1d'],
          limit: 500 // Fetch more data
        })
      }).catch(() => null);

      if (response?.ok) {
        logger.info('AI_DATA_FETCH_SUCCESS', { symbol });
      } else {
        logger.warn('AI_DATA_FETCH_FAILED', { symbol, message: 'Could not fetch additional data' });
      }
    } catch (error) {
      logger.warn('AI_DATA_FETCH_ERROR', { symbol }, error as Error);
    }
  }

  /**
   * Get a safe fallback prediction - NEVER returns undefined/null
   */
  private getSafeFallbackPrediction(symbol: string, reason: string): PredictionData {
    logger.info('AI_PREDICTION_FALLBACK', { symbol, reason });
    
    return {
      symbol,
      bullishProbability: 0.33,
      bearishProbability: 0.33,
      neutralProbability: 0.34,
      confidence: 0.0, // Zero confidence indicates fallback
      prediction: 'NEUTRAL',
      riskScore: 0.5, // Medium risk for unknown state
      timestamp: Date.now()
    };
  }

  async startTraining(): Promise<void> {
    if (this.isTraining) return;
    
    this.isTraining = true;
    this.currentEpoch = 0;
    
    const trainingLoop = async () => {
      while (this.isTraining && this.currentEpoch < 1000) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms per epoch
        
        this.currentEpoch++;
        
        // Simulate training metrics with stability features
        const resetEvent = Math.random() < 0.02; // 2% chance of reset
        const metrics: TrainingMetrics = {
          epoch: this.currentEpoch,
          mse: this.calculateMSE(),
          mae: this.calculateMAE(),
          r2: this.calculateR2(),
          learningRate: this.calculateLearningRate(resetEvent),
          gradientNorm: this.calculateGradientNorm(resetEvent),
          resetEvents: resetEvent ? this.getResetCount() + 1 : this.getResetCount(),
          timestamp: Date.now()
        };

        this.trainingHistory.push(metrics);
        this.trainingSubscribers.forEach(callback => callback(metrics));

        // Early stopping condition
        if (metrics.r2 > 0.85) {
          this.isTraining = false;
          break;
        }
      }
      
      this.isTraining = false;
    };

    trainingLoop();
  }

  stopTraining(): void {
    this.isTraining = false;
  }

  private calculateMSE(): number {
    const baseMSE = 0.1;
    const improvement = Math.min(this.currentEpoch / 100, 1);
    return baseMSE * (1 - improvement * 0.8) + Math.random() * 0.02;
  }

  private calculateMAE(): number {
    const baseMAE = 0.08;
    const improvement = Math.min(this.currentEpoch / 100, 1);
    return baseMAE * (1 - improvement * 0.7) + Math.random() * 0.015;
  }

  private calculateR2(): number {
    const baseR2 = 0.3;
    const improvement = Math.min(this.currentEpoch / 200, 1);
    return Math.min(baseR2 + improvement * 0.6 + Math.random() * 0.1, 0.95);
  }

  private calculateLearningRate(resetEvent: boolean): number {
    const baseLR = 0.001;
    if (resetEvent) return baseLR * 0.5;
    return baseLR * Math.pow(0.95, this.currentEpoch / 50);
  }

  private calculateGradientNorm(resetEvent: boolean): number {
    if (resetEvent) return 5.0 + Math.random() * 3.0; // Spike indicating instability
    return 0.5 + Math.random() * 1.0;
  }

  private getResetCount(): number {
    return this?.trainingHistory?.filter(m => m.resetEvents > 0).length;
  }

  subscribeToPredictions(callback: (prediction: PredictionData) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this?.subscribers?.filter(sub => sub !== callback);
    };
  }

  subscribeToTraining(callback: (metrics: TrainingMetrics) => void): () => void {
    this.trainingSubscribers.push(callback);
    return () => {
      this.trainingSubscribers = this?.trainingSubscribers?.filter(sub => sub !== callback);
    };
  }

  getTrainingHistory(): TrainingMetrics[] {
    return this.trainingHistory;
  }

  getIsTraining(): boolean {
    return this.isTraining;
  }
}


const logger = Logger.getInstance();

export const aiPredictionService = new AIPredictionService();