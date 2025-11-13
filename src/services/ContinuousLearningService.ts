/**
 * ContinuousLearningService
 * Background AI training service with automatic model rollback
 */

import { Logger } from '../core/Logger.js';
import { TrainingEngine } from '../ai/TrainingEngine.js';
import { BullBearAgent } from '../ai/BullBearAgent.js';
import { Database } from '../data/Database.js';
import { SMCAnalyzer } from './SMCAnalyzer.js';
import { ElliottWaveAnalyzer } from './ElliottWaveAnalyzer.js';
import { HarmonicPatternDetector } from './HarmonicPatternDetector.js';
import { SentimentAnalysisService } from './SentimentAnalysisService.js';
import { WhaleTrackerService } from './WhaleTrackerService.js';
import { FeatureEngineering } from '../ai/FeatureEngineering.js';

interface ContinuousLearningConfig {
  enabled: boolean;
  autoFetchIntervalMinutes: number;
  onlineLearningBatchSize: number;
  performanceCheckInterval: number;
  accuracyDropThreshold: number;
  autoRollbackEnabled: boolean;
  maxRollbackAttempts: number;
  marketHoursOnly: boolean;
  symbols: string[];
  goal: string;
}

interface LearningProgress {
  cycle: number;
  timestamp: number;
  dataPointsProcessed: number;
  accuracyBefore: number;
  accuracyAfter: number;
  modelRolledBack: boolean;
  status: 'TRAINING' | 'SUCCESS' | 'ROLLBACK' | 'ERROR';
  error?: string;
}

export class ContinuousLearningService {
  private static instance: ContinuousLearningService;
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private trainingEngine = TrainingEngine.getInstance();
  private bullBearAgent = BullBearAgent.getInstance();
  private smcAnalyzer = SMCAnalyzer.getInstance();
  private elliottAnalyzer = ElliottWaveAnalyzer.getInstance();
  private harmonicDetector = HarmonicPatternDetector.getInstance();
  private sentimentAnalysis = SentimentAnalysisService.getInstance();
  private whaleTracker = WhaleTrackerService.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();

  private config: ContinuousLearningConfig;
  private isRunning: boolean = false;
  private learningCycle: number = 0;
  private baselineAccuracy: number = 0;
  private rollbackCount: number = 0;
  private checkpointParameters: any = null;
  private intervalId: NodeJS.Timeout | null = null;
  private progressHistory: LearningProgress[] = [];

  private constructor() {
    this.config = {
      enabled: false,
      autoFetchIntervalMinutes: 5,
      onlineLearningBatchSize: 100,
      performanceCheckInterval: 10,
      accuracyDropThreshold: 0.05,
      autoRollbackEnabled: true,
      maxRollbackAttempts: 3,
      marketHoursOnly: false,
      symbols: ['BTCUSDT', 'ETHUSDT'],
      goal: 'crypto_bull_bear'
    };
  }

  static getInstance(): ContinuousLearningService {
    if (!ContinuousLearningService.instance) {
      ContinuousLearningService.instance = new ContinuousLearningService();
    }
    return ContinuousLearningService.instance;
  }

  configure(config: Partial<ContinuousLearningConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Continuous learning configured', { config: this.config });
  }

  getConfig(): ContinuousLearningConfig {
    return { ...this.config };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Continuous learning already running');
      return;
    }

    this.config.enabled = true;
    this.isRunning = true;
    this.learningCycle = 0;
    this.rollbackCount = 0;

    this.logger.info('Starting continuous learning service', {
      interval: this.config.autoFetchIntervalMinutes,
      symbols: this.config.symbols
    });

    // Initialize network if needed
    try {
      await this.ensureNetworkInitialized();
      
      // Establish baseline accuracy
      this.baselineAccuracy = await this.measureCurrentAccuracy();
      this.logger.info('Baseline accuracy established', { accuracy: this.baselineAccuracy });

      // Start periodic learning cycle
      await this.runLearningCycle();
      this.intervalId = setInterval(
        () => this.runLearningCycle(),
        this.config.autoFetchIntervalMinutes * 60 * 1000
      );
    } catch (error) {
      this.logger.error('Failed to start continuous learning', {}, error as Error);
      this.isRunning = false;
      throw error;
    }
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.config.enabled = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.logger.info('Continuous learning service stopped', {
      cyclesCompleted: this.learningCycle,
      rollbacks: this.rollbackCount
    });
  }

  isEnabled(): boolean {
    return this.isRunning;
  }

  getProgress(): LearningProgress[] {
    return [...this.progressHistory];
  }

  private async ensureNetworkInitialized(): Promise<void> {
    const inputFeatures = 50; // Estimated feature count
    const outputSize = 3; // Bull/Bear/Neutral

    try {
      await this.trainingEngine.initializeNetwork(
        'hybrid',
        inputFeatures,
        outputSize
      );
      this.logger.info('Network initialized for continuous learning');
    } catch (error) {
      this.logger.error('Failed to initialize network', {}, error as Error);
      throw error;
    }
  }

  private async measureCurrentAccuracy(): Promise<number> {
    try {
      // Get recent historical data for accuracy measurement
      const symbol = this.config.symbols[0];
      const historicalData = await this.database.getMarketData(
        symbol,
        '1h',
        100
      );

      if (historicalData.length < 50) {
        return 0.5; // Default accuracy if insufficient data
      }

      // Create experiences from historical data
      const experiences = [];
      for (let i = 50; i < historicalData.length; i++) {
        const state = await this.featureEngineering.extractFeatures(
          historicalData.slice(i - 50, i + 1)
        );
        const nextPrice = historicalData[i].close;
        const prevPrice = historicalData[i - 1].close;
        const action = nextPrice > prevPrice ? 'BULLISH' : 'BEARISH';
        const reward = Math.abs(nextPrice - prevPrice) / prevPrice;

        experiences.push({
          state: state.technicalIndicators || state.rawFeatures,
          action,
          reward,
          nextState: state.rawFeatures,
          done: i === historicalData.length - 1
        });
      }

      if (experiences.length === 0) {
        return 0.5;
      }

      // Measure accuracy using small batch
      const batchSize = Math.min(20, experiences.length);
      const batch = experiences.slice(0, batchSize);

      // Calculate directional accuracy
      let correct = 0;
      for (const exp of batch) {
        // Need to reconstruct market data from experience for prediction
        // For now, use a simplified approach: get market data slice
        const marketDataSlice = historicalData.slice(
          Math.max(0, historicalData.length - batch.length),
          historicalData.length
        );
        
        if (marketDataSlice.length < 50) {
          continue; // Skip if insufficient data
        }
        
        const prediction = await this.bullBearAgent.predict(
          marketDataSlice,
          this.config.goal
        );
        
        // Map prediction action to BULLISH/BEARISH
        const predictedDirection = prediction.action === 'LONG' ? 'BULLISH' :
                                   prediction.action === 'SHORT' ? 'BEARISH' : 'NEUTRAL';
        const actualDirection = exp.action; // Already 'BULLISH' or 'BEARISH'

        // Only count non-neutral predictions
        if (predictedDirection !== 'NEUTRAL' && predictedDirection === actualDirection) {
          correct++;
        }
      }

      return correct / batchSize;
    } catch (error) {
      this.logger.error('Failed to measure accuracy', {}, error as Error);
      return 0.5;
    }
  }

  private async runLearningCycle(): Promise<void> {
    if (!this.config.enabled || !this.isRunning) {
      return;
    }

    const cycle = this.learningCycle++;
    this.logger.info('Starting continuous learning cycle', { cycle });

    const progress: LearningProgress = {
      cycle,
      timestamp: Date.now(),
      dataPointsProcessed: 0,
      accuracyBefore: this.baselineAccuracy,
      accuracyAfter: this.baselineAccuracy,
      modelRolledBack: false,
      status: 'TRAINING'
    };

    try {
      // Save checkpoint before training
      if (this.config.autoRollbackEnabled) {
        this.checkpointParameters = this.trainingEngine.getParameters();
      }

      // Fetch new market data
      const newData = await this.fetchAndProcessNewData();
      progress.dataPointsProcessed = newData.length;

      if (newData.length < this.config.onlineLearningBatchSize) {
        this.logger.info('Insufficient new data for learning cycle', {
          available: newData.length,
          required: this.config.onlineLearningBatchSize
        });
        progress.status = 'SUCCESS';
        this.progressHistory.push(progress);
        return;
      }

      // Online learning: update model with new data
      const experiences = await this.prepareExperiences(newData);
      
      for (let i = 0; i < experiences.length; i += this.config.onlineLearningBatchSize) {
        const batch = experiences.slice(i, i + this.config.onlineLearningBatchSize);
        await this.trainingEngine.trainStep(batch);
      }

      // Check performance after training
      const newAccuracy = await this.measureCurrentAccuracy();
      progress.accuracyAfter = newAccuracy;

      const accuracyDrop = this.baselineAccuracy - newAccuracy;

      if (accuracyDrop > this.config.accuracyDropThreshold && this.config.autoRollbackEnabled) {
        // Accuracy dropped significantly - rollback model
        if (this.rollbackCount < this.config.maxRollbackAttempts) {
          this.logger.warn('Accuracy drop detected, rolling back model', {
            before: this.baselineAccuracy,
            after: newAccuracy,
            drop: accuracyDrop
          });

          if (this.checkpointParameters) {
            this.trainingEngine.setParameters(this.checkpointParameters);
            progress.modelRolledBack = true;
            progress.accuracyAfter = this.baselineAccuracy;
            this.rollbackCount++;
          }

          progress.status = 'ROLLBACK';
        } else {
          this.logger.error('Max rollback attempts exceeded', {
            rollbackCount: this.rollbackCount
          });
          progress.status = 'ERROR';
          progress.error = 'Max rollback attempts exceeded';
        }
      } else {
        // Training successful - update baseline
        this.baselineAccuracy = newAccuracy;
        this.rollbackCount = 0; // Reset rollback counter on success
        progress.status = 'SUCCESS';
        
        this.logger.info('Continuous learning cycle completed successfully', {
          cycle,
          accuracy: newAccuracy,
          improvement: accuracyDrop < 0 ? Math.abs(accuracyDrop) : 0
        });
      }

      // Persist progress to database
      await this.persistProgress(progress);
      this.progressHistory.push(progress);

      // Keep history bounded
      if ((this.progressHistory?.length || 0) > 100) {
        this.progressHistory = this.progressHistory.slice(-100);
      }

    } catch (error) {
      this.logger.error('Continuous learning cycle failed', { cycle }, error as Error);
      progress.status = 'ERROR';
      progress.error = (error as Error).message;
      this.progressHistory.push(progress);
      
      // Attempt rollback on error
      if (this.checkpointParameters && this.config.autoRollbackEnabled) {
        this.trainingEngine.setParameters(this.checkpointParameters);
        progress.modelRolledBack = true;
      }
    }
  }

  private async fetchAndProcessNewData(): Promise<any[]> {
    const allData: any[] = [];

    for (const symbol of this.config.symbols) {
      try {
        // Fetch recent data from database (already ingested by main pipeline)
        const recentData = await this.database.getMarketData(symbol, '1h', 200);
        
        // Filter for data we haven't seen yet (rough heuristic based on timestamp)
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const newData = recentData.filter(d => {
          const timestampMs = typeof d.timestamp === 'number' ? d.timestamp : d.timestamp.getTime();
          return timestampMs > hourAgo;
        });
        
        allData.push(...newData);
      } catch (error) {
        this.logger.error(`Failed to fetch data for ${symbol}`, {}, error as Error);
      }
    }

    return allData;
  }

  private async prepareExperiences(marketData: any[]): Promise<any[]> {
    const experiences = [];

    for (let i = 50; i < marketData.length; i++) {
      const state = await this.featureEngineering.extractFeatures(
        marketData.slice(Math.max(0, i - 50), i + 1)
      );
      
      const nextPrice = marketData[i].close;
      const prevPrice = marketData[Math.max(0, i - 1)].close;
      const action = nextPrice > prevPrice ? 'BULLISH' : 'BEARISH';
      const reward = Math.abs(nextPrice - prevPrice) / prevPrice;

      experiences.push({
        state: state.technicalIndicators || state.rawFeatures,
        action,
        reward,
        nextState: state.rawFeatures,
        done: i === marketData.length - 1
      });
    }

    return experiences;
  }

  private async persistProgress(progress: LearningProgress): Promise<void> {
    try {
      await this.database.saveContinuousLearningProgress(progress);
    } catch (error) {
      this.logger.error('Failed to persist learning progress', {}, error as Error);
    }
  }

  getStatistics(): {
    isRunning: boolean;
    cyclesCompleted: number;
    rollbacks: number;
    baselineAccuracy: number;
    lastCycle?: LearningProgress;
  } {
    return {
      isRunning: this.isRunning,
      cyclesCompleted: this.learningCycle,
      rollbacks: this.rollbackCount,
      baselineAccuracy: this.baselineAccuracy,
      lastCycle: this.progressHistory[this.progressHistory.length - 1]
    };
  }
}

