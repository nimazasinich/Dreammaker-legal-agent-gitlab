import { MarketData, BacktestResult, BacktestTrade, TradingDecision } from '../types';
import { Logger } from '../core/Logger.js';
import { aiService } from './aiService';

interface BacktestConfig {
  symbol: string;
  timeframe: string;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  positionSize: number;
  commission: number;
  slippage: number;
  walkForward: {
    trainingPeriod: number;
    testingPeriod: number;
    stepSize: number;
  };
}

interface BacktestPeriod {
  trainingData: MarketData[];
  testingData: MarketData[];
  startDate: Date;
  endDate: Date;
}

interface EquityPoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
}

interface BacktestStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  directionalAccuracy: number;
  var95: number;
  cvar95: number;
  precisionBull: number;
  precisionBear: number;
  recallBull: number;
  recallBear: number;
  f1ScoreBull: number;
  f1ScoreBear: number;
  expectedCalibrationError: number;
  brierScore: number;
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  calmarRatio: number;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  confidence: number;
  predictedDirection: 'BULL' | 'BEAR' | 'NEUTRAL';
  actualDirection: 'BULL' | 'BEAR' | 'NEUTRAL';
  holdingPeriod: number;
}

interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  quantity: number;
  entryPrice: number;
  entryTime: Date;
  confidence: number;
  predictedDirection: 'BULL' | 'BEAR' | 'NEUTRAL';
}

const ACCEPTANCE_CRITERIA = {
  minDirectionalAccuracy: 0.70,
  maxDrawdown: 0.20,
  minSharpeRatio: 1.0
};

export class BacktestService {
  private readonly logger = Logger.getInstance();

  private trades: Trade[] = [];
  private equity: EquityPoint[] = [];
  private currentPosition: Position | null = null;

  async runWalkForwardBacktest(
    data: MarketData[],
    symbol: string,
    timeframe: string,
    config?: Partial<BacktestConfig>
  ): Promise<BacktestResult> {
    const firstTimestamp = data[0]?.timestamp;
    const lastTimestamp = data[data.length - 1]?.timestamp;

    const defaultConfig: BacktestConfig = {
      symbol,
      timeframe,
      startDate: firstTimestamp instanceof Date ? firstTimestamp : new Date(firstTimestamp || Date.now()),
      endDate: lastTimestamp instanceof Date ? lastTimestamp : new Date(lastTimestamp || Date.now()),
      initialBalance: 10000,
      positionSize: 0.1,
      commission: 0.001,
      slippage: 0.0005,
      walkForward: {
        trainingPeriod: 30,
        testingPeriod: 7,
        stepSize: 7
      }
    };

    const finalConfig = { ...defaultConfig, ...config };

    this.logger.info(`Starting walk-forward backtest for ${symbol} on ${timeframe}`);
    this.logger.info(`Data points: ${data.length}, Period: ${finalConfig.startDate.toISOString()} to ${finalConfig.endDate.toISOString()}`);

    this.trades = [];
    this.equity = [];
    this.currentPosition = null;

    const periods = this.createWalkForwardPeriods(data, finalConfig);
    this.logger.info(`Created ${periods.length} walk-forward periods`);

    let currentBalance = finalConfig.initialBalance;
    let maxBalance = finalConfig.initialBalance;

    this.equity.push({
      timestamp: finalConfig.startDate,
      equity: currentBalance,
      drawdown: 0
    });

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      this.logger.info(`Processing period ${i + 1}/${periods.length}: ${period.startDate.toISOString()} to ${period.endDate.toISOString()}`);

      if ((period.trainingData?.length || 0) > 50) {
        try {
          await aiService.trainModel(period.trainingData);
          this.logger.info(`Model trained on ${period.trainingData.length} data points`);
        } catch (error) {
          this.logger.error(`Training failed for period ${i + 1}:`, {}, error);
          continue;
        }
      }

      for (let j = 1; j < period.testingData.length; j++) {
        const currentCandle = period.testingData[j];
        const historicalData = [
          ...period.trainingData.slice(-100),
          ...period.testingData.slice(0, j + 1)
        ];

        try {
          const decision = await aiService.predict(historicalData.slice(-50));
          
          const { newBalance, newMaxBalance } = await this.executeTradingLogic(
            currentCandle,
            decision,
            currentBalance,
            maxBalance,
            finalConfig
          );

          currentBalance = newBalance;
          maxBalance = newMaxBalance;

          const drawdown = maxBalance > 0 ? (maxBalance - currentBalance) / maxBalance : 0;
          this.equity.push({
            timestamp: currentCandle.timestamp instanceof Date ? currentCandle.timestamp : new Date(currentCandle.timestamp),
            equity: currentBalance,
            drawdown
          });

        } catch (error) {
          this.logger.error(`Prediction failed for ${currentCandle.timestamp}:`, {}, error);
        }
      }
    }

    if (this.currentPosition && (data?.length || 0) > 0) {
      const lastCandle = data[data.length - 1];
      await this.closePosition(lastCandle, currentBalance, finalConfig);
    }

    const statistics = this.calculateStatistics(this.trades, this.equity, finalConfig);
    const acceptanceCriteriaMet = this.validateAcceptanceCriteria(statistics);

    this.logger.info(`Backtest completed: ${this.trades.length} trades, ${(statistics.winRate * 100).toFixed(1)}% win rate`);
    this.logger.info(`Directional accuracy: ${(statistics.directionalAccuracy * 100).toFixed(1)}%`);
    this.logger.info(`Max drawdown: ${(statistics.maxDrawdown * 100).toFixed(1)}%`);
    this.logger.info(`Sharpe ratio: ${statistics.sharpeRatio.toFixed(2)}`);
    this.logger.info(`Acceptance criteria met: ${acceptanceCriteriaMet}`);

    return {
      runId: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: finalConfig.symbol,
      timeframe: finalConfig.timeframe,
      startDate: finalConfig.startDate,
      endDate: finalConfig.endDate,
      totalTrades: statistics.totalTrades,
      winRate: statistics.winRate,
      profitFactor: statistics.profitFactor,
      sharpeRatio: statistics.sharpeRatio,
      sortinoRatio: statistics.sortinoRatio,
      maxDrawdown: statistics.maxDrawdown,
      directionalAccuracy: statistics.directionalAccuracy,
      var95: statistics.var95,
      trades: (this.trades || []).map(trade => ({
        id: trade.id,
        runId: `backtest_${Date.now()}`,
        symbol: trade.symbol,
        timeframe: finalConfig.timeframe,
        entryTime: trade.entryTime,
        exitTime: trade.exitTime,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        side: trade.side,
        confidence: trade.confidence,
        regime: trade.predictedDirection,
        pnl: trade.pnl,
        drawdown: this.equity.find(e => e.timestamp >= trade.exitTime)?.drawdown || 0
      }))
    };
  }

  private createWalkForwardPeriods(data: MarketData[], config: BacktestConfig): BacktestPeriod[] {
    const periods: BacktestPeriod[] = [];
    const msPerDay = 24 * 60 * 60 * 1000;
    
    const trainingMs = config.walkForward.trainingPeriod * msPerDay;
    const testingMs = config.walkForward.testingPeriod * msPerDay;
    const stepMs = config.walkForward.stepSize * msPerDay;

    let currentStart = config.startDate.getTime();
    const endTime = config.endDate.getTime();

    while (currentStart + trainingMs + testingMs <= endTime) {
      const trainingEnd = currentStart + trainingMs;
      const testingEnd = trainingEnd + testingMs;

      const trainingData = data.filter(d => {
        const timestampMs = typeof d.timestamp === 'number' ? d.timestamp : d.timestamp.getTime();
        return timestampMs >= currentStart && timestampMs < trainingEnd;
      });

      const testingData = data.filter(d => {
        const timestampMs = typeof d.timestamp === 'number' ? d.timestamp : d.timestamp.getTime();
        return timestampMs >= trainingEnd && timestampMs < testingEnd;
      });

      if ((trainingData?.length || 0) > 50 && (testingData?.length || 0) > 0) {
        periods.push({
          trainingData,
          testingData,
          startDate: new Date(currentStart),
          endDate: new Date(testingEnd)
        });
      }

      currentStart += stepMs;
    }

    return periods;
  }

  private async executeTradingLogic(
    candle: MarketData,
    decision: TradingDecision,
    currentBalance: number,
    maxBalance: number,
    config: BacktestConfig
  ): Promise<{ newBalance: number; newMaxBalance: number }> {
    let newBalance = currentBalance;
    let newMaxBalance = maxBalance;

    if (this.currentPosition) {
      const shouldClose = this.shouldClosePosition(decision, candle, config);
      if (shouldClose) {
        newBalance = await this.closePosition(candle, newBalance, config);
        newMaxBalance = Math.max(newMaxBalance, newBalance);
      }
    }

    if (!this.currentPosition && decision.action !== 'FLAT' && decision.riskGate) {
      if (decision.confidence >= 0.6) {
        newBalance = await this.openPosition(candle, decision, newBalance, config);
        newMaxBalance = Math.max(newMaxBalance, newBalance);
      }
    }

    return { newBalance, newMaxBalance };
  }

  private shouldClosePosition(decision: TradingDecision, candle: MarketData, config: BacktestConfig): boolean {
    if (!this.currentPosition) return false;

    if (decision.confidence > 0.7) {
      if (this.currentPosition.side === 'LONG' && decision.action === 'SHORT') return true;
      if (this.currentPosition.side === 'SHORT' && decision.action === 'LONG') return true;
    }

    const currentPrice = candle.close;
    const entryPrice = this.currentPosition.entryPrice;
    
    if (this.currentPosition.side === 'LONG') {
      const loss = (entryPrice - currentPrice) / entryPrice;
      if (loss > 0.03) return true;
    } else {
      const loss = (currentPrice - entryPrice) / entryPrice;
      if (loss > 0.03) return true;
    }

    if (this.currentPosition.side === 'LONG') {
      const profit = (currentPrice - entryPrice) / entryPrice;
      if (profit > 0.05) return true;
    } else {
      const profit = (entryPrice - currentPrice) / entryPrice;
      if (profit > 0.05) return true;
    }

    const candleTimestampMs = typeof candle.timestamp === 'number' ? candle.timestamp : candle.timestamp.getTime();
    const entryTimestampMs = typeof this.currentPosition.entryTime === 'number' ? this.currentPosition.entryTime : this.currentPosition.entryTime.getTime();
    const holdingTime = candleTimestampMs - entryTimestampMs;
    const maxHoldingTime = 24 * 60 * 60 * 1000;
    if (holdingTime > maxHoldingTime) return true;

    return false;
  }

  private async openPosition(
    candle: MarketData,
    decision: TradingDecision,
    balance: number,
    config: BacktestConfig
  ): Promise<number> {
    const positionValue = balance * config.positionSize;
    const price = candle.close * (1 + (decision.action === 'LONG' ? config.slippage : -config.slippage));
    const quantity = positionValue / price;
    const commission = positionValue * config.commission;

    this.currentPosition = {
      symbol: config.symbol,
      side: decision.action as 'LONG' | 'SHORT',
      quantity,
      entryPrice: price,
      entryTime: candle.timestamp instanceof Date ? candle.timestamp : new Date(candle.timestamp),
      confidence: decision.confidence,
      predictedDirection: decision.bullProbability > decision.bearProbability ? 'BULL' :
                         decision.bearProbability > decision.bullProbability ? 'BEAR' : 'NEUTRAL'
    };

    this.logger.info(`Opened ${decision.action} position: ${quantity.toFixed(4)} @ ${price.toFixed(2)} (confidence: ${(decision.confidence * 100).toFixed(1)}%)`);

    return balance - commission;
  }

  private async closePosition(
    candle: MarketData,
    balance: number,
    config: BacktestConfig
  ): Promise<number> {
    if (!this.currentPosition) return balance;

    const exitPrice = candle.close * (1 + (this.currentPosition.side === 'LONG' ? -config.slippage : config.slippage));
    const positionValue = this.currentPosition.quantity * exitPrice;
    const commission = positionValue * config.commission;

    let pnl: number;
    if (this.currentPosition.side === 'LONG') {
      pnl = (exitPrice - this.currentPosition.entryPrice) * this.currentPosition.quantity;
    } else {
      pnl = (this.currentPosition.entryPrice - exitPrice) * this.currentPosition.quantity;
    }

    const netPnl = pnl - commission;
    const pnlPercent = netPnl / (this.currentPosition.entryPrice * this.currentPosition.quantity);

    const priceChange = (exitPrice - this.currentPosition.entryPrice) / this.currentPosition.entryPrice;
    const actualDirection: 'BULL' | 'BEAR' | 'NEUTRAL' =
      priceChange > 0.01 ? 'BULL' : priceChange < -0.01 ? 'BEAR' : 'NEUTRAL';

    const candleTimestampMs = typeof candle.timestamp === 'number' ? candle.timestamp : candle.timestamp.getTime();
    const entryTimestampMs = typeof this.currentPosition.entryTime === 'number' ? this.currentPosition.entryTime : this.currentPosition.entryTime.getTime();
    const holdingPeriod = (candleTimestampMs - entryTimestampMs) / (1000 * 60 * 60);

    const trade: Trade = {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol: this.currentPosition.symbol,
      side: this.currentPosition.side,
      entryTime: this.currentPosition.entryTime,
      exitTime: candle.timestamp instanceof Date ? candle.timestamp : new Date(candle.timestamp),
      entryPrice: this.currentPosition.entryPrice,
      exitPrice,
      quantity: this.currentPosition.quantity,
      pnl: netPnl,
      pnlPercent,
      commission,
      slippage: Math.abs(exitPrice - candle.close),
      confidence: this.currentPosition.confidence,
      predictedDirection: this.currentPosition.predictedDirection,
      actualDirection,
      holdingPeriod
    };

    this.trades.push(trade);

    this.logger.info(`Closed ${this.currentPosition.side} position: PnL = ${netPnl.toFixed(2)} (${(pnlPercent * 100).toFixed(2)}%)`);

    this.currentPosition = null;
    return balance + positionValue - commission;
  }

  private calculateStatistics(trades: Trade[], equity: EquityPoint[], config: BacktestConfig): BacktestStatistics {
    if (trades.length === 0) {
      return this.getEmptyStatistics();
    }

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = winningTrades / totalTrades;

    const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const initialEquity = equity[0]?.equity || config.initialBalance;
    const finalEquity = equity[equity.length - 1]?.equity || config.initialBalance;
    const totalReturn = (finalEquity - initialEquity) / initialEquity;

    const returns = equity.slice(1).map((point, i) => 
      (point.equity - equity[i].equity) / equity[i].equity
    ).filter(r => isFinite(r));

    const tradingDays = (config.endDate.getTime() - config.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / tradingDays) - 1;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 365);

    const maxDrawdown = Math.max(...(equity || []).map(e => e.drawdown));

    const sharpeRatio = volatility > 0 ? annualizedReturn / volatility : 0;

    const negativeReturns = returns.filter(r => r < 0);
    const downsideVariance = (negativeReturns?.length || 0) > 0 ? 
      negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length : 0;
    const downsideDeviation = Math.sqrt(downsideVariance * 365);
    const sortinoRatio = downsideDeviation > 0 ? annualizedReturn / downsideDeviation : 0;

    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(sortedReturns.length * 0.05);
    const var95 = (sortedReturns?.length || 0) > 0 ? Math.abs(sortedReturns[var95Index] || 0) : 0;
    const cvar95 = (sortedReturns?.length || 0) > 0 ? 
      Math.abs(sortedReturns.slice(0, var95Index + 1).reduce((sum, r) => sum + r, 0) / (var95Index + 1)) : 0;

    const correctDirections = trades.filter(t => 
      (t.predictedDirection === 'BULL' && t.actualDirection === 'BULL') ||
      (t.predictedDirection === 'BEAR' && t.actualDirection === 'BEAR') ||
      (t.predictedDirection === 'NEUTRAL' && t.actualDirection === 'NEUTRAL')
    ).length;
    const directionalAccuracy = correctDirections / totalTrades;

    const bullTrades = trades.filter(t => t.predictedDirection === 'BULL');
    const bearTrades = trades.filter(t => t.predictedDirection === 'BEAR');
    
    const trueBullTrades = trades.filter(t => t.actualDirection === 'BULL');
    const trueBearTrades = trades.filter(t => t.actualDirection === 'BEAR');

    const correctBullPredictions = trades.filter(t => 
      t.predictedDirection === 'BULL' && t.actualDirection === 'BULL'
    ).length;
    const correctBearPredictions = trades.filter(t => 
      t.predictedDirection === 'BEAR' && t.actualDirection === 'BEAR'
    ).length;

    const precisionBull = (bullTrades?.length || 0) > 0 ? correctBullPredictions / bullTrades.length : 0;
    const precisionBear = (bearTrades?.length || 0) > 0 ? correctBearPredictions / bearTrades.length : 0;
    const recallBull = (trueBullTrades?.length || 0) > 0 ? correctBullPredictions / trueBullTrades.length : 0;
    const recallBear = (trueBearTrades?.length || 0) > 0 ? correctBearPredictions / trueBearTrades.length : 0;

    const f1ScoreBull = (precisionBull + recallBull) > 0 ? 
      2 * (precisionBull * recallBull) / (precisionBull + recallBull) : 0;
    const f1ScoreBear = (precisionBear + recallBear) > 0 ? 
      2 * (precisionBear * recallBear) / (precisionBear + recallBear) : 0;

    const expectedCalibrationError = this.calculateECE(trades);
    const brierScore = this.calculateBrierScore(trades);

    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      directionalAccuracy,
      var95,
      cvar95,
      precisionBull,
      precisionBear,
      recallBull,
      recallBear,
      f1ScoreBull,
      f1ScoreBear,
      expectedCalibrationError,
      brierScore,
      totalReturn,
      annualizedReturn,
      volatility,
      calmarRatio
    };
  }

  private calculateECE(trades: Trade[]): number {
    const bins = 10;
    const binSize = 1.0 / bins;
    let ece = 0;

    for (let i = 0; i < bins; i++) {
      const binLower = i * binSize;
      const binUpper = (i + 1) * binSize;
      
      const binTrades = trades.filter(t => 
        t.confidence >= binLower && t.confidence < binUpper
      );

      if (binTrades.length === 0) continue;

      const avgConfidence = binTrades.reduce((sum, t) => sum + t.confidence, 0) / binTrades.length;
      const accuracy = binTrades.filter(t => t.pnl > 0).length / binTrades.length;
      
      ece += (binTrades.length / trades.length) * Math.abs(avgConfidence - accuracy);
    }

    return ece;
  }

  private calculateBrierScore(trades: Trade[]): number {
    let score = 0;
    
    for (const trade of trades) {
      const predicted = trade.confidence;
      const actual = trade.pnl > 0 ? 1 : 0;
      score += Math.pow(predicted - actual, 2);
    }

    return score / trades.length;
  }

  private validateAcceptanceCriteria(statistics: BacktestStatistics): boolean {
    return (
      statistics.directionalAccuracy >= ACCEPTANCE_CRITERIA.minDirectionalAccuracy &&
      statistics.maxDrawdown <= ACCEPTANCE_CRITERIA.maxDrawdown &&
      statistics.sharpeRatio >= ACCEPTANCE_CRITERIA.minSharpeRatio
    );
  }

  private getEmptyStatistics(): BacktestStatistics {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      directionalAccuracy: 0,
      var95: 0,
      cvar95: 0,
      precisionBull: 0,
      precisionBear: 0,
      recallBull: 0,
      recallBear: 0,
      f1ScoreBull: 0,
      f1ScoreBear: 0,
      expectedCalibrationError: 0,
      brierScore: 0,
      totalReturn: 0,
      annualizedReturn: 0,
      volatility: 0,
      calmarRatio: 0
    };
  }

  async generateReport(result: BacktestResult): Promise<string> {
    const report = `
# Backtest Report

## Summary
- **Symbol**: ${result.symbol}
- **Timeframe**: ${result.timeframe}
- **Period**: ${result.startDate.toISOString()} to ${result.endDate.toISOString()}
- **Total Trades**: ${result.totalTrades}
- **Win Rate**: ${(result.winRate * 100).toFixed(2)}%
- **Directional Accuracy**: ${(result.directionalAccuracy * 100).toFixed(2)}%

## Performance Metrics
- **Sharpe Ratio**: ${result.sharpeRatio.toFixed(3)}
- **Sortino Ratio**: ${result.sortinoRatio.toFixed(3)}
- **Maximum Drawdown**: ${(result.maxDrawdown * 100).toFixed(2)}%
- **Profit Factor**: ${result.profitFactor.toFixed(3)}
- **VaR (95%)**: ${(result.var95 * 100).toFixed(2)}%

## Acceptance Criteria
- **Directional Accuracy ≥ 70%**: ${result.directionalAccuracy >= 0.70 ? '✅ PASS' : '❌ FAIL'} (${(result.directionalAccuracy * 100).toFixed(2)}%)
- **Max Drawdown ≤ 20%**: ${result.maxDrawdown <= 0.20 ? '✅ PASS' : '❌ FAIL'} (${(result.maxDrawdown * 100).toFixed(2)}%)
- **Sharpe Ratio ≥ 1.0**: ${result.sharpeRatio >= 1.0 ? '✅ PASS' : '❌ FAIL'} (${result.sharpeRatio.toFixed(3)})

## Overall Status
**${result.directionalAccuracy >= 0.70 && result.maxDrawdown <= 0.20 && result.sharpeRatio >= 1.0 ? 'ACCEPTED ✅' : 'NEEDS IMPROVEMENT ❌'}**

Generated on: ${new Date().toISOString()}
    `;

    return report.trim();
  }

  async exportResults(result: BacktestResult, format: 'csv' | 'excel' | 'pdf'): Promise<Blob> {
    switch (format) {
      case 'csv':
        return this.exportToCSV(result);
      case 'excel':
        console.error('Excel export not implemented in browser environment');
        throw new Error('Excel export not implemented in browser environment');
      case 'pdf':
        console.error('PDF export not implemented in browser environment');
        throw new Error('PDF export not implemented in browser environment');
      default:
        console.error('Unsupported export format: ' + format);
        throw new Error('Unsupported export format: ' + format);
    }
  }

  private exportToCSV(result: BacktestResult): Blob {
    const headers = [
      'Trade ID', 'Symbol', 'Side', 'Entry Time', 'Exit Time',
      'Entry Price', 'Exit Price', 'PnL', 'Confidence', 'Regime'
    ];

    const rows = (result.trades || []).map(trade => [
      trade.id || 'N/A',
      trade.symbol,
      trade.side,
      trade.entryTime instanceof Date ? trade.entryTime.toISOString() : new Date(trade.entryTime).toISOString(),
      trade.exitTime instanceof Date ? trade.exitTime.toISOString() : new Date(trade.exitTime).toISOString(),
      trade.entryPrice.toFixed(6),
      trade.exitPrice.toFixed(6),
      trade.pnl.toFixed(2),
      (trade.confidence * 100).toFixed(2) + '%',
      trade.regime
    ]);

    const csvContent = [headers, ...rows]
      .map(row => (row || []).map(cell => `"${cell}"`).join(','))
      .join('\n');

    return new Blob([csvContent], { type: 'text/csv' });
  }
}

export const backtestService = new BacktestService();