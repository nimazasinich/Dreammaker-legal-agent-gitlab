/**
 * SignalGeneratorService
 * Real-time signal generation with confidence filtering and multi-timeframe confluence
 */

import { Logger } from '../core/Logger.js';
import { BullBearAgent } from '../ai/BullBearAgent.js';
import { Database } from '../data/Database.js';
import { FeatureEngineering } from '../ai/FeatureEngineering.js';
import { DynamicWeightingService } from './DynamicWeightingService.js';

export interface Signal {
  id: string;
  symbol: string;
  timestamp: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string[];
  featureAttribution: Record<string, number>;
  timeframes: {
    '1m': { action: string; confidence: number } | null;
    '5m': { action: string; confidence: number } | null;
    '15m': { action: string; confidence: number } | null;
    '1h': { action: string; confidence: number } | null;
  };
  targetPrice?: number;
  stopLoss?: number;
  source: 'AI_SIGNAL' | 'PATTERN' | 'CONFLUENCE';
}

interface SignalConfig {
  enabled: boolean;
  symbols: string[];
  confidenceThreshold: number;
  confluenceRequired: boolean;
  confluenceThreshold: number;
  rateLimitMinutes: number;
  rateLimitWindow: number;
  subscribers: Array<(signal: Signal) => void>;
}

interface SignalStatistics {
  totalGenerated: number;
  buySignals: number;
  sellSignals: number;
  holdSignals: number;
  highConfidenceSignals: number;
  confluenceSignals: number;
  averageConfidence: number;
  signalsBySymbol: Record<string, number>;
  lastSignalTime: Record<string, number>;
}

export class SignalGeneratorService {
  private static instance: SignalGeneratorService;
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private bullBearAgent = BullBearAgent.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();
  private dynamicWeighting = DynamicWeightingService.getInstance();

  private config: SignalConfig = {
    enabled: false,
    symbols: ['BTCUSDT', 'ETHUSDT'],
    confidenceThreshold: 0.65,
    confluenceRequired: false,
    confluenceThreshold: 0.6,
    rateLimitMinutes: 15,
    rateLimitWindow: 60,
    subscribers: []
  };

  private statistics: SignalStatistics = {
    totalGenerated: 0,
    buySignals: 0,
    sellSignals: 0,
    holdSignals: 0,
    highConfidenceSignals: 0,
    confluenceSignals: 0,
    averageConfidence: 0,
    signalsBySymbol: {},
    lastSignalTime: {}
  };

  private intervalId: NodeJS.Timeout | null = null;
  private signalHistory: Signal[] = [];

  private constructor() {}

  static getInstance(): SignalGeneratorService {
    if (!SignalGeneratorService.instance) {
      SignalGeneratorService.instance = new SignalGeneratorService();
    }
    return SignalGeneratorService.instance;
  }

  configure(config: Partial<SignalConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Signal generator configured', { config: this.config });
  }

  getConfig(): SignalConfig {
    return { ...this.config };
  }

  async start(): Promise<void> {
    if (this.intervalId) {
      this.logger.warn('Signal generator already running');
      return;
    }

    this.config.enabled = true;
    this.logger.info('Starting signal generator', {
      symbols: this.config.symbols,
      confidenceThreshold: this.config.confidenceThreshold
    });

    // Generate initial signals
    await this.generateSignalsForSymbols();

    // Set up periodic signal generation (every minute)
    this.intervalId = setInterval(
      () => this.generateSignalsForSymbols(),
      60 * 1000
    );
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.config.enabled = false;
    this.logger.info('Signal generator stopped');
  }

  isEnabled(): boolean {
    return this.config.enabled && this.intervalId !== null;
  }

  subscribe(callback: (signal: Signal) => void): () => void {
    this.config.subscribers.push(callback);
    return () => {
      const index = this.config.subscribers.indexOf(callback);
      if (index > -1) {
        this.config.subscribers.splice(index, 1);
      }
    };
  }

  getSignalHistory(limit: number = 100): Signal[] {
    return [...this.signalHistory].slice(0, limit);
  }

  getStatistics(): SignalStatistics {
    return { ...this.statistics };
  }

  async generateSignals(symbols: string[]): Promise<Signal[]> {
    const signals: Signal[] = [];
    for (const symbol of symbols) {
      try {
        const signal = await this.generateSignal(symbol);
        if (signal) {
          signals.push(signal);
        }
      } catch (error) {
        this.logger.error(`Failed to generate signal for ${symbol}`, {}, error as Error);
      }
    }
    return signals;
  }

  private async generateSignalsForSymbols(): Promise<void> {
    for (const symbol of this.config.symbols) {
      try {
        await this.generateSignal(symbol);
      } catch (error) {
        this.logger.error(`Failed to generate signal for ${symbol}`, {}, error as Error);
      }
    }
  }

  private async generateSignal(symbol: string): Promise<Signal | null> {
    try {
      // Check rate limiting
      const now = Date.now();
      const lastSignal = this.statistics.lastSignalTime[symbol] || 0;
      const timeSinceLastSignal = (now - lastSignal) / (60 * 1000); // minutes

      if (timeSinceLastSignal < this.config.rateLimitMinutes) {
        return null;
      }

      // Get market data for all timeframes
      const timeframeData = await this.fetchMultiTimeframeData(symbol);

      // Generate predictions for each timeframe
      const timeframePredictions = await this.predictAllTimeframes(symbol, timeframeData);

      // Check confluence
      const confluence = this.calculateConfluence(timeframePredictions);

      // Decide on final signal based on confluence or primary timeframe
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      let confidence = 0;

      if (this.config.confluenceRequired) {
        if (confluence.score >= this.config.confluenceThreshold) {
          action = confluence.dominantAction;
          confidence = confluence.score;
        } else {
          return null; // Not enough confluence
        }
      } else {
        // Use primary timeframe (1h) prediction
        const primary = timeframePredictions['1h'];
        if (primary && primary.confidence >= this.config.confidenceThreshold) {
          action = primary.action;
          confidence = primary.confidence;
        } else {
          return null; // Below threshold
        }
      }

      // Calculate entry/exit levels
      const currentPrice = timeframeData['1h']?.[timeframeData['1h'].length - 1]?.close || 0;
      const { targetPrice, stopLoss } = this.calculateEntryExit(action, currentPrice);

      // Generate reasoning
      const reasoning = this.generateReasoning(timeframePredictions, confluence);

      // Create signal
      const signal: Signal = {
        id: this.generateSignalId(),
        symbol,
        timestamp: now,
        action,
        confidence,
        reasoning,
        featureAttribution: await this.getFeatureAttribution(symbol),
        timeframes: {
          '1m': timeframePredictions['1m'],
          '5m': timeframePredictions['5m'],
          '15m': timeframePredictions['15m'],
          '1h': timeframePredictions['1h']
        },
        targetPrice,
        stopLoss,
        source: confluence.score >= this.config.confluenceThreshold ? 'CONFLUENCE' : 'AI_SIGNAL'
      };

      // Update statistics
      this.updateStatistics(signal);

      // Save to database
      await this.saveSignal(signal);

      // Add to history
      this.signalHistory.unshift(signal);
      if ((this.signalHistory?.length || 0) > 1000) {
        this.signalHistory = this.signalHistory.slice(0, 1000);
      }

      // Notify subscribers
      this.notifySubscribers(signal);

      // Send Telegram notification if enabled
      try {
        const { TelegramService } = await import('./TelegramService.js');
        const telegramService = TelegramService.getInstance();
        if (telegramService.isConfigured() && signal.confidence >= 0.7) {
          await telegramService.notifySignal(signal as any);
        }
      } catch (error) {
        // Silently fail - Telegram notification is optional
      }

      // Update last signal time
      this.statistics.lastSignalTime[symbol] = now;

      this.logger.info('Signal generated', {
        symbol,
        action,
        confidence: confidence.toFixed(3),
        source: signal.source
      });

      return signal;
    } catch (error) {
      this.logger.error('Failed to generate signal', { symbol }, error as Error);
      return null;
    }
  }

  private async fetchMultiTimeframeData(symbol: string): Promise<Record<string, any[]>> {
    const timeframes = ['1m', '5m', '15m', '1h'];
    const data: Record<string, any[]> = {};

    for (const timeframe of timeframes) {
      try {
        const marketData = await this.database.getMarketData(symbol, timeframe, 100);
        data[timeframe] = marketData;
      } catch (error) {
        this.logger.error(`Failed to fetch ${timeframe} data for ${symbol}`, {}, error as Error);
        data[timeframe] = [];
      }
    }

    return data;
  }

  private async predictAllTimeframes(
    symbol: string,
    timeframeData: Record<string, any[]>
  ): Promise<Record<string, { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } | null>> {
    const predictions: Record<string, { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } | null> = {};

    for (const [timeframe, data] of Object.entries(timeframeData)) {
      if (data.length < 50) {
        predictions[timeframe] = null;
        continue;
      }

      try {
        // Get prediction directly from market data (agent handles feature extraction internally)
        const prediction = await this.bullBearAgent.predict(data, 'crypto_bull_bear');

        // Map action from LONG/SHORT/HOLD to BUY/SELL/HOLD
        let action: 'BUY' | 'SELL' | 'HOLD';
        if (prediction.action === 'LONG') {
          action = 'BUY';
        } else if (prediction.action === 'SHORT') {
          action = 'SELL';
        } else {
          action = 'HOLD';
        }

        predictions[timeframe] = {
          action,
          confidence: prediction.confidence || 0
        };
      } catch (error) {
        this.logger.error(`Failed to predict for ${timeframe}`, {}, error as Error);
        predictions[timeframe] = null;
      }
    }

    return predictions;
  }

  private calculateConfluence(
    predictions: Record<string, { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } | null>
  ): {
    score: number;
    dominantAction: 'BUY' | 'SELL' | 'HOLD';
    agreement: number;
  } {
    const actions = Object.values(predictions).filter(p => p !== null) as Array<{ action: string; confidence: number }>;
    
    if (actions.length === 0) {
      return { score: 0, dominantAction: 'HOLD', agreement: 0 };
    }

    // Get dynamic weights for signal generation sources
    // Note: Timeframe weights could be added here, for now we weight by confidence
    const weights = this.dynamicWeighting.calculateWeights(['technical', 'sentiment', 'whale', 'ai']);
    
    // Use AI weight for now (since predictions come from AI)
    // In future, we can split predictions by source type
    const aiWeight = weights.ai || 1.0;

    // Count actions
    const buyCount = actions.filter(a => a.action === 'BUY').length;
    const sellCount = actions.filter(a => a.action === 'SELL').length;

    // Calculate agreement percentage
    const totalActions = actions.length;
    const agreement = Math.max(buyCount, sellCount) / totalActions;

    // Calculate weighted confidence score using dynamic weights
    // Weight each prediction by its confidence and the AI source weight
    const weightedConfidenceSum = actions.reduce(
      (sum, a) => sum + (a.confidence * aiWeight), 
      0
    );
    const totalWeight = actions.length * aiWeight;
    const averageConfidence = totalWeight > 0 ? weightedConfidenceSum / totalWeight : 0;

    // Determine dominant action
    const dominantAction = buyCount > sellCount ? 'BUY' : 'SELL';

    // Final confluence score (agreement * weighted confidence)
    const score = agreement * averageConfidence;

    // Record performance for dynamic weighting (simplified - in production would track actual outcomes)
    // For now, we track based on signal generation success
    this.dynamicWeighting.recordSuccess('ai');

    return { score, dominantAction, agreement };
  }

  private calculateEntryExit(action: 'BUY' | 'SELL' | 'HOLD', currentPrice: number): {
    targetPrice: number;
    stopLoss: number;
  } {
    // Simple risk/reward calculation (can be enhanced with volatility-based ATR)
    const riskRewardRatio = 2; // 2:1 R/R

    if (action === 'BUY') {
      const stopLoss = currentPrice * 0.98; // 2% stop loss
      const targetPrice = currentPrice + ((currentPrice - stopLoss) * riskRewardRatio);
      return { targetPrice, stopLoss };
    } else if (action === 'SELL') {
      const stopLoss = currentPrice * 1.02; // 2% stop loss
      const targetPrice = currentPrice - ((stopLoss - currentPrice) * riskRewardRatio);
      return { targetPrice, stopLoss };
    }

    return { targetPrice: currentPrice, stopLoss: currentPrice };
  }

  private generateReasoning(
    predictions: Record<string, { action: 'BUY' | 'SELL' | 'HOLD'; confidence: number } | null>,
    confluence: { score: number; dominantAction: 'BUY' | 'SELL' | 'HOLD'; agreement: number }
  ): string[] {
    const reasoning: string[] = [];

    // Add confluence reasoning if applicable
    if (this.config.confluenceRequired && confluence.score >= this.config.confluenceThreshold) {
      reasoning.push(
        `Strong ${confluence.dominantAction} confluence across ${Math.round(confluence.agreement * 4)} timeframes (${(confluence.score * 100).toFixed(1)}% confidence)`
      );
    }

    // Add per-timeframe reasoning
    for (const [timeframe, pred] of Object.entries(predictions)) {
      if (pred && pred.confidence >= this.config.confidenceThreshold) {
        reasoning.push(
          `${timeframe}: ${pred.action} signal (${(pred.confidence * 100).toFixed(1)}% confidence)`
        );
      }
    }

    return reasoning;
  }

  private async getFeatureAttribution(symbol: string): Promise<Record<string, number>> {
    try {
      const marketData = await this.database.getMarketData(symbol, '1h', 100);
      if (marketData.length < 50) {
        return {};
      }

      const features = await this.featureEngineering.extractFeatures(marketData);
      return features.technicalIndicators || {};
    } catch (error) {
      this.logger.error('Failed to get feature attribution', {}, error as Error);
      return {};
    }
  }

  private updateStatistics(signal: Signal): void {
    this.statistics.totalGenerated++;

    if (signal.action === 'BUY') {
      this.statistics.buySignals++;
    } else if (signal.action === 'SELL') {
      this.statistics.sellSignals++;
    } else {
      this.statistics.holdSignals++;
    }

    if (signal.confidence >= this.config.confidenceThreshold) {
      this.statistics.highConfidenceSignals++;
    }

    if (signal.source === 'CONFLUENCE') {
      this.statistics.confluenceSignals++;
    }

    // Update average confidence
    const totalConf = this.statistics.averageConfidence * (this.statistics.totalGenerated - 1);
    this.statistics.averageConfidence = (totalConf + signal.confidence) / this.statistics.totalGenerated;

    // Update per-symbol count
    this.statistics.signalsBySymbol[signal.symbol] = 
      (this.statistics.signalsBySymbol[signal.symbol] || 0) + 1;
  }

  private async saveSignal(signal: Signal): Promise<void> {
    try {
      await this.database.saveSignal(signal);
    } catch (error) {
      this.logger.error('Failed to save signal', {}, error as Error);
    }
  }

  private notifySubscribers(signal: Signal): void {
    this.config.subscribers.forEach(callback => {
      try {
        callback(signal);
      } catch (error) {
        this.logger.error('Error in signal subscriber', {}, error as Error);
      }
    });
  }

  private generateSignalId(): string {
    return `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

