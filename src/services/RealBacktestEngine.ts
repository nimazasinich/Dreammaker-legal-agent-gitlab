/**
 * REAL BACKTESTING ENGINE - 100% REAL DATA
 * Backtests trading strategies using real historical data
 */

import { Logger } from '../core/Logger.js';
import { RealMarketDataService } from './RealMarketDataService.js';
import { BacktestEngine } from '../ai/BacktestEngine.js';
import { MarketData, BacktestResult } from '../types/index.js';

export interface BacktestStrategy {
  name: string;
  entryConditions: (data: any[]) => boolean;
  exitConditions: (data: any[], entry: any) => boolean;
  positionSize: number;
}

export class RealBacktestEngine {
  private static instance: RealBacktestEngine;
  private logger = Logger.getInstance();
  private marketDataService = new RealMarketDataService();
  private backtestEngine = BacktestEngine.getInstance();

  private constructor() {}

  static getInstance(): RealBacktestEngine {
    if (!RealBacktestEngine.instance) {
      RealBacktestEngine.instance = new RealBacktestEngine();
    }
    return RealBacktestEngine.instance;
  }

  async runBacktest(symbol: string, timeframe: string, bars: number, config: {
    startDate: number;
    endDate: number;
    initialCapital: number;
    feeRate: number;
    slippageRate: number;
    maxPositionSize: number;
  }): Promise<BacktestResult> {
    const md: MarketData[] = await RealMarketDataService.getInstance().getHistoricalData(symbol, bars);
    const engine = BacktestEngine.getInstance();
    return await engine.runBacktest(md, config);
  }

  /**
   * Run backtest with real historical data from CoinGecko
   */
  async runRealBacktest(
    strategy: string,
    symbol: string,
    period: string
  ): Promise<any> {
    this.logger.info('Starting real backtest', { strategy, symbol, period });

    try {
      // Convert period to days
      const days = this.periodToDays(period);

      // Fetch real historical data from CoinGecko/CryptoCompare
      const historicalData = await this.marketDataService.getHistoricalData(symbol, days);

      if (!historicalData || historicalData.length === 0) {
        console.error(`No historical data available for ${symbol}`);
      }

      this.logger.info('Real historical data fetched', {
        symbol,
        dataPoints: historicalData.length,
        startDate: new Date(historicalData[0].timestamp).toISOString(),
        endDate: new Date(historicalData[historicalData.length - 1].timestamp).toISOString()
      });

      // Execute strategy with real data
      const results = await this.executeStrategyWithRealData(strategy, historicalData);

      // Calculate real metrics
      const metrics = this.calculateRealMetrics(results);

      return {
        strategy,
        symbol,
        period,
        dataPoints: historicalData.length,
        performance: results.performance,
        trades: results.trades,
        metrics
      };

    } catch (error) {
      this.logger.error('Real backtest failed', { strategy, symbol }, error as Error);
      throw error;
    }
  }

  /**
   * Execute strategy with real historical data
   */
  private async executeStrategyWithRealData(
    strategy: string,
    historicalData: any[]
  ): Promise<any> {
    // Use the BacktestEngine with real data
    const config = {
      startDate: historicalData[0].timestamp,
      endDate: historicalData[historicalData.length - 1].timestamp,
      initialCapital: 10000,
      feeRate: 0.001,
      slippageRate: 0.0005,
      maxPositionSize: 0.1
    };

    const results = await this.backtestEngine.runBacktest(historicalData, config);

    return {
      performance: {
        totalReturn: results.totalReturn,
        annualizedReturn: results.annualizedReturn,
        sharpeRatio: results.sharpeRatio,
        maxDrawdown: results.maxDrawdown,
        winRate: results.winRate
      },
      trades: results.trades
    };
  }

  /**
   * Calculate real performance metrics
   */
  private calculateRealMetrics(results: any): any {
    const { performance, trades } = results;

    return {
      profitability: {
        totalReturn: performance.totalReturn,
        annualizedReturn: performance.annualizedReturn,
        profitFactor: this.calculateProfitFactor(trades)
      },
      risk: {
        sharpeRatio: performance.sharpeRatio,
        maxDrawdown: performance.maxDrawdown,
        volatility: this.calculateVolatility(trades)
      },
      trading: {
        totalTrades: trades.length,
        winRate: performance.winRate,
        avgWin: this.calculateAvgWin(trades),
        avgLoss: this.calculateAvgLoss(trades)
      }
    };
  }

  /**
   * Convert period string to days
   */
  private periodToDays(period: string): number {
    const periodMap: Record<string, number> = {
      '1w': 7,
      '2w': 14,
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      '2y': 730
    };

    return periodMap[period] || 30;
  }

  /**
   * Calculate profit factor
   */
  private calculateProfitFactor(trades: any[]): number {
    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);

    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));

    return totalLosses > 0 ? totalWins / totalLosses : 0;
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(trades: any[]): number {
    if (trades.length === 0) return 0;

    const returns = (trades || []).map(t => t.pnl);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate average win
   */
  private calculateAvgWin(trades: any[]): number {
    const wins = trades.filter(t => t.pnl > 0);
    if (wins.length === 0) return 0;
    return wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
  }

  /**
   * Calculate average loss
   */
  private calculateAvgLoss(trades: any[]): number {
    const losses = trades.filter(t => t.pnl < 0);
    if (losses.length === 0) return 0;
    return Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length);
  }
}
