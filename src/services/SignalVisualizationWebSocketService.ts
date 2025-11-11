// SignalVisualizationWebSocketService.ts - WebSocket service for real-time signal visualization
import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '../core/Logger.js';
import { SignalGeneratorService, Signal } from '../services/SignalGeneratorService.js';
import { SMCAnalyzer } from '../services/SMCAnalyzer.js';
import { ElliottWaveAnalyzer } from '../services/ElliottWaveAnalyzer.js';
import { HarmonicPatternDetector } from '../services/HarmonicPatternDetector.js';
import { FeatureEngineering } from '../ai/FeatureEngineering.js';
import { Database } from '../data/Database.js';

interface SignalVisualizationData {
  timestamp: string;
  symbol: string;
  price: number;
  stages: {
    stage1: { status: string; progress: number; data?: any };
    stage2: { status: string; progress: number; data?: any };
    stage3: { status: string; progress: number; detectors?: Record<string, number> };
    stage4: { status: string; progress: number; rsi?: number; macd?: number; gate?: string };
    stage5: { status: string; progress: number; detectorScore?: number; aiBoost?: number; finalScore?: number };
    stage6: { status: string; progress: number; consensus?: Record<string, { action: string; confidence: number }> };
    stage7: { status: string; progress: number; atr?: number; riskLevel?: string };
    stage8: { status: string; progress: number; signal?: string; confidence?: number };
  };
  technicals?: {
    support?: number[];
    resistance?: number[];
    orderBlocks?: Array<{ price: number; type: string; strength: number }>;
    fibonacci?: { levels: number[] };
    elliottWaves?: any;
    harmonicPatterns?: any;
  };
  decision?: {
    signal: 'LONG' | 'SHORT' | 'HOLD';
    confidence: number;
    reason: string;
  };
}

interface ClientSubscription {
  ws: WebSocket;
  symbol: string;
}

export class SignalVisualizationWebSocketService {
  private static instance: SignalVisualizationWebSocketService;
  private logger = Logger.getInstance();
  private signalGenerator = SignalGeneratorService.getInstance();
  private smcAnalyzer = SMCAnalyzer.getInstance();
  private elliottWaveAnalyzer = ElliottWaveAnalyzer.getInstance();
  private harmonicDetector = HarmonicPatternDetector.getInstance();
  private featureEngineering = FeatureEngineering.getInstance();
  private database = Database.getInstance();
  
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, string>(); // Map WebSocket to subscribed symbol
  private updateIntervals = new Map<WebSocket, NodeJS.Timeout>();
  private isProcessing = new Map<string, boolean>(); // Track if we're processing a symbol

  private constructor() {}

  static getInstance(): SignalVisualizationWebSocketService {
    if (!SignalVisualizationWebSocketService.instance) {
      SignalVisualizationWebSocketService.instance = new SignalVisualizationWebSocketService();
    }
    return SignalVisualizationWebSocketService.instance;
  }

  initialize(server: any, path: string = '/ws/signals/live'): void {
    this.wss = new WebSocketServer({ server, path });
    
    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    // Subscribe to signal generator for real-time updates
    this.signalGenerator.subscribe((signal: Signal) => {
      this.broadcastSignal(signal);
    });

    this.logger.info('Signal Visualization WebSocket server initialized', { path });
  }

  private handleConnection(ws: WebSocket): void {
    this.logger.info('New signal visualization WebSocket connection');

    ws.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'subscribe' && data.symbol) {
          await this.handleSubscribe(ws, data.symbol);
        } else if (data.type === 'unsubscribe') {
          this.handleUnsubscribe(ws);
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (error) {
        this.logger.error('Failed to parse WebSocket message', {}, error as Error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      this.handleUnsubscribe(ws);
      this.logger.info('Signal visualization WebSocket connection closed');
    });

    ws.on('error', (error) => {
      this.logger.error('Signal visualization WebSocket error', {}, error as Error);
    });

    ws.send(JSON.stringify({
      type: 'connection',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  }

  private async handleSubscribe(ws: WebSocket, symbol: string): Promise<void> {
    this.clients.set(ws, symbol);
    this.logger.info('Client subscribed to signal visualization', { symbol });

    // Send initial state
    await this.sendInitialState(ws, symbol);

    // Start periodic updates
    this.startPeriodicUpdates(ws, symbol);
  }

  private handleUnsubscribe(ws: WebSocket): void {
    const symbol = this.clients.get(ws);
    if (symbol) {
      this.clients.delete(ws);
      this.logger.info('Client unsubscribed from signal visualization', { symbol });
    }

    // Clear update interval
    const interval = this.updateIntervals.get(ws);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(ws);
    }
  }

  private async sendInitialState(ws: WebSocket, symbol: string): Promise<void> {
    try {
      const data = await this.generateSignalVisualizationData(symbol, 'idle');
      ws.send(JSON.stringify(data));
    } catch (error) {
      this.logger.error('Failed to send initial state', { symbol }, error as Error);
    }
  }

  private startPeriodicUpdates(ws: WebSocket, symbol: string): void {
    // Clear any existing interval
    const existingInterval = this.updateIntervals.get(ws);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Send updates every second (simulating real-time processing)
    const interval = setInterval(async () => {
      if (ws.readyState === WebSocket.OPEN && this.clients.get(ws) === symbol) {
        try {
          // Check if we're currently processing
          if (!this.isProcessing.get(symbol)) {
            const data = await this.generateSignalVisualizationData(symbol, 'idle');
            ws.send(JSON.stringify(data));
          }
        } catch (error) {
          this.logger.error('Failed to send periodic update', { symbol }, error as Error);
        }
      } else {
        clearInterval(interval);
        this.updateIntervals.delete(ws);
      }
    }, 1000); // Update every second

    this.updateIntervals.set(ws, interval);
  }

  private async broadcastSignal(signal: Signal): Promise<void> {
    // Find all clients subscribed to this symbol
    for (const [ws, symbol] of this.clients.entries()) {
      if (symbol === signal.symbol && ws.readyState === WebSocket.OPEN) {
        try {
          const data = await this.generateSignalVisualizationData(symbol, 'completed', signal);
          ws.send(JSON.stringify(data));
        } catch (error) {
          this.logger.error('Failed to broadcast signal', { symbol }, error as Error);
        }
      }
    }
  }

  async generateSignalVisualizationData(
    symbol: string,
    overallStatus: 'idle' | 'active' | 'completed',
    signal?: Signal
  ): Promise<SignalVisualizationData> {
    // Get current market data
    const marketData = await this.database.getMarketData(symbol, '1h', 1);
    const currentPrice = (marketData?.length || 0) > 0 ? marketData[marketData.length - 1].close : 0;
    const currentVolume = (marketData?.length || 0) > 0 ? marketData[marketData.length - 1].volume : 0;

    // Get multi-timeframe data
    const timeframeData: Record<string, any[]> = {};
    const timeframes = ['1m', '5m', '15m', '1h'];
    for (const timeframe of timeframes) {
      try {
        const marketData = await this.database.getMarketData(symbol, timeframe, 100);
        timeframeData[timeframe] = marketData;
      } catch (error) {
        this.logger.error(`Failed to fetch ${timeframe} data`, { symbol }, error as Error);
        timeframeData[timeframe] = [];
      }
    }

    // Get predictions for each timeframe
    const timeframePredictions: Record<string, { action: string; confidence: number } | null> = {};
    const bullBearAgent = await import('../ai/BullBearAgent.js').then(m => m.BullBearAgent.getInstance());
    
    for (const [timeframe, data] of Object.entries(timeframeData)) {
      if (data.length < 50) {
        timeframePredictions[timeframe] = null;
        continue;
      }
      try {
        const prediction = await bullBearAgent.predict(data, 'crypto_bull_bear');
        let action: string;
        if (prediction.action === 'LONG') {
          action = 'BUY';
        } else if (prediction.action === 'SHORT') {
          action = 'SELL';
        } else {
          action = 'HOLD';
        }
        timeframePredictions[timeframe] = {
          action,
          confidence: prediction.confidence || 0
        };
      } catch (error) {
        this.logger.error(`Failed to predict for ${timeframe}`, {}, error as Error);
        timeframePredictions[timeframe] = null;
      }
    }

    // Get technical indicators
    const features = await this.featureEngineering.extractFeatures(timeframeData['1h'] || []);
    const rsi = features.technicalIndicators?.rsi || 50;
    const macd = features.technicalIndicators?.macd || 0;

    // Get detector scores
    const detectorScores = await this.getDetectorScores(symbol, timeframeData['1h'] || []);

    // Calculate ATR
    const atr = this.calculateATR(timeframeData['1h'] || []);

    // Determine gate status
    const gate = this.determineGateStatus(rsi, macd, timeframePredictions);

    // Calculate final score
    const detectorScore = Object.values(detectorScores).reduce((sum, score) => sum + score, 0) / Object.keys(detectorScores).length || 0;
    const aiBoost = signal ? signal.confidence - detectorScore : 0;
    const finalScore = detectorScore + aiBoost;

    // Calculate consensus
    const consensus: Record<string, { action: string; confidence: number }> = {};
    for (const [tf, pred] of Object.entries(timeframePredictions)) {
      if (pred) {
        consensus[tf] = {
          action: pred.action === 'BUY' ? 'BUY' : pred.action === 'SELL' ? 'SELL' : 'HOLD',
          confidence: pred.confidence
        };
      }
    }

    // Get technical analysis data
    const technicals = await this.getTechnicalAnalysis(symbol, timeframeData['1h'] || []);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(atr, currentPrice);

    // Generate stages data
    const stages = {
      stage1: {
        status: overallStatus === 'completed' ? 'completed' : 'active',
        progress: overallStatus === 'completed' ? 100 : 100,
        data: {
          price: currentPrice,
          volume: currentVolume
        }
      },
      stage2: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? 100 : 0
      },
      stage3: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? Math.round(Object.keys(detectorScores).length / 9 * 100) : 0,
        detectors: detectorScores
      },
      stage4: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? 100 : 0,
        rsi: rsi,
        macd: macd,
        gate: gate
      },
      stage5: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? 100 : 0,
        detectorScore: detectorScore,
        aiBoost: aiBoost,
        finalScore: finalScore
      },
      stage6: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? 100 : 0,
        consensus: consensus
      },
      stage7: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? 100 : 0,
        atr: atr,
        riskLevel: riskLevel
      },
      stage8: {
        status: overallStatus === 'completed' ? 'completed' : overallStatus === 'active' ? 'active' : 'idle',
        progress: overallStatus === 'completed' ? 100 : overallStatus === 'active' ? 100 : 0,
        signal: signal ? (signal.action === 'BUY' ? 'LONG' : signal.action === 'SELL' ? 'SHORT' : 'HOLD') : undefined,
        confidence: signal ? signal.confidence : undefined
      }
    };

    return {
      timestamp: new Date().toISOString(),
      symbol: symbol,
      price: currentPrice,
      stages,
      technicals,
      decision: signal ? {
        signal: signal.action === 'BUY' ? 'LONG' : signal.action === 'SELL' ? 'SHORT' : 'HOLD',
        confidence: signal.confidence,
        reason: signal.reasoning.join('; ')
      } : undefined
    };
  }

  private async getDetectorScores(symbol: string, marketData: any[]): Promise<Record<string, number>> {
    const scores: Record<string, number> = {};

    try {
      // SMC Analysis
      const smcResult = await this.smcAnalyzer.analyzeFullSMC(marketData);
      scores.smc = smcResult.strength || 0;

      // Elliott Wave Analysis
      const elliottResult = await this.elliottWaveAnalyzer.analyzeElliottWaves(marketData);
      scores.elliott = elliottResult.confidence || 0;

      // Harmonic Pattern Detection
      const harmonicResult = await this.harmonicDetector.detectHarmonicPatterns(marketData);
      scores.harmonic = (harmonicResult?.length || 0) > 0 ? harmonicResult[0].confidence : 0;

      // Feature Engineering gives us other indicators
      const features = await this.featureEngineering.extractFeatures(marketData);
      scores.priceAction = features.technicalIndicators?.rsi ? (features.technicalIndicators.rsi > 30 && features.technicalIndicators.rsi < 70 ? 0.7 : 0.5) : 0.5;
      scores.volume = features.technicalIndicators?.volumeProfile ? 0.6 : 0.5;
      scores.trend = features.technicalIndicators?.sma ? 0.65 : 0.5;
      scores.momentum = features.technicalIndicators?.macd ? Math.abs(features.technicalIndicators.macd) : 0.5;
      scores.volatility = features.technicalIndicators?.atr ? 0.6 : 0.5;
    } catch (error) {
      this.logger.error('Failed to get detector scores', { symbol }, error as Error);
    }

    return scores;
  }

  private async getTechnicalAnalysis(symbol: string, marketData: any[]): Promise<any> {
    try {
      const prices = (marketData || []).map(d => d.close);
      const highs = (marketData || []).map(d => d.high);
      const lows = (marketData || []).map(d => d.low);

      // Support/Resistance levels (simplified - using recent highs/lows)
      const support = [...new Set(lows.sort((a, b) => a - b).slice(0, 3))];
      const resistance = [...new Set(highs.sort((a, b) => b - a).slice(0, 3))];

      // Order Blocks from SMC
      const smcResult = await this.smcAnalyzer.analyzeFullSMC(marketData);
      const orderBlocks = (smcResult.orderBlocks || []).slice(0, 5).map((ob: any) => ({
        price: ob.price || ob.high || 0,
        type: ob.type === 'BULLISH' ? 'bullish' : 'bearish',
        strength: ob.strength || 0.5
      }));

      // Fibonacci levels
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 1.0];

      return {
        support,
        resistance,
        orderBlocks,
        fibonacci: {
          levels: fibLevels
        }
      };
    } catch (error) {
      this.logger.error('Failed to get technical analysis', { symbol }, error as Error);
      return {};
    }
  }

  private calculateATR(marketData: any[]): number {
    if (marketData.length < 14) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < marketData.length; i++) {
      const high = marketData[i].high;
      const low = marketData[i].low;
      const prevClose = marketData[i - 1].close;
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }

    return trueRanges.slice(-14).reduce((a, b) => a + b, 0) / 14;
  }

  private determineGateStatus(
    rsi: number,
    macd: number,
    timeframePredictions: Record<string, { action: string; confidence: number } | null>
  ): string {
    // Count BUY vs SELL predictions
    const buyCount = Object.values(timeframePredictions).filter(p => p?.action === 'BUY').length;
    const sellCount = Object.values(timeframePredictions).filter(p => p?.action === 'SELL').length;

    // RSI gate: RSI < 30 = oversold (LONG), RSI > 70 = overbought (SHORT)
    const rsiGate = rsi < 30 ? 'LONG' : rsi > 70 ? 'SHORT' : 'HOLD';

    // MACD gate: Positive MACD = bullish (LONG), Negative = bearish (SHORT)
    const macdGate = macd > 0 ? 'LONG' : macd < 0 ? 'SHORT' : 'HOLD';

    // Consensus gate
    const consensusGate = buyCount > sellCount ? 'LONG' : sellCount > buyCount ? 'SHORT' : 'HOLD';

    // If all agree, use that; otherwise HOLD
    if (rsiGate === consensusGate && macdGate === consensusGate) {
      return rsiGate;
    }

    return 'HOLD';
  }

  private determineRiskLevel(atr: number, currentPrice: number): string {
    const atrPercent = (atr / currentPrice) * 100;
    if (atrPercent < 1) return 'LOW';
    if (atrPercent < 3) return 'MEDIUM';
    return 'HIGH';
  }
}

