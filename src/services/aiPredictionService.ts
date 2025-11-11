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
      // Use real AI prediction from backend
      const response = await fetch('/api/ai/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.prediction) {
          return {
            symbol,
            bullishProbability: data.prediction.bullishProbability || data.prediction.probabilities?.bull || 0.33,
            bearishProbability: data.prediction.bearishProbability || data.prediction.probabilities?.bear || 0.33,
            neutralProbability: data.prediction.neutralProbability || data.prediction.probabilities?.hold || 0.34,
            confidence: data.prediction.confidence || 0.5,
            prediction: data.prediction.direction || 'NEUTRAL',
            riskScore: data.prediction.riskScore || 0.3,
            timestamp: data.prediction.timestamp || Date.now()
          };
        }
      }
    } catch (error) {
      logger.error('Failed to fetch real AI prediction:', {}, error);
    }
    
    // Fallback: return neutral prediction if API fails (don't simulate)
    return {
      symbol,
      bullishProbability: 0.33,
      bearishProbability: 0.33,
      neutralProbability: 0.34,
      confidence: 0.5,
      prediction: 'NEUTRAL',
      riskScore: 0.3,
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