// src/services/RealTradingService.ts
import { Logger } from '../core/Logger.js';
import { RealMarketDataService } from './RealMarketDataService.js';

export class RealTradingService {
  private logger = Logger.getInstance();
  private marketDataService: RealMarketDataService;
  private positions: Map<string, any> = new Map();

  constructor() {
    this.marketDataService = new RealMarketDataService();
  }

  // آنالیز بازار با داده‌های واقعی
  async analyzeMarket(symbol: string): Promise<any> {
    const marketData = await this.marketDataService.getRealTimePrice(symbol);
    const historicalData = await this.marketDataService.getHistoricalData(symbol, 7);
    const sentiment = await this.marketDataService.getMarketSentiment() || { value: 50, label: 'NEUTRAL' };

    // Extract price from marketData
    const currentPrice = typeof marketData === 'number' ? marketData : (marketData as any).price || 0;

    // تحلیل تکنیکال با داده‌های واقعی
    const analysis = {
      symbol,
      currentPrice,
      trend: this.calculateTrend(historicalData),
      support: this.calculateSupportResistance(historicalData),
      rsi: this.calculateRSI(historicalData),
      sentiment: sentiment,
      recommendation: this.generateRecommendation(marketData, historicalData, sentiment),
      timestamp: Date.now()
    };

    return analysis;
  }

  // شبیه‌سازی تریدینگ با داده‌های واقعی (بدون اجرای واقعی)
  async simulateTrade(symbol: string, side: 'BUY' | 'SELL', amount: number): Promise<any> {
    const marketData = await this.marketDataService.getRealTimePrice(symbol);
    const price = typeof marketData === 'number' ? marketData : (marketData as any).price || 0;

    const trade = {
      id: `sim-${Date.now()}`,
      symbol,
      side,
      amount,
      entryPrice: price,
      timestamp: Date.now(),
      status: 'EXECUTED',
      simulated: true,
      analysis: await this.analyzeMarket(symbol)
    };

    // ذخیره در پوزیشن‌های شبیه‌سازی شده
    if (side === 'BUY') {
      this.positions.set(trade.id, trade);
    }

    return trade;
  }

  // محاسبه اندیکاتورهای تکنیکال با داده‌های واقعی
  private calculateTrend(historicalData: any[]): string {
    if (historicalData.length < 2) return 'NEUTRAL';

    const firstPrice = historicalData[0].price;
    const lastPrice = historicalData[historicalData.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (change > 2) return 'BULLISH';
    if (change < -2) return 'BEARISH';
    return 'NEUTRAL';
  }

  private calculateSupportResistance(historicalData: any[]): { support: number; resistance: number } {
    if (historicalData.length === 0) {
      return { support: 0, resistance: 0 };
    }

    const prices = historicalData.map(d => d.price);
    return {
      support: Math.min(...prices) * 0.98,
      resistance: Math.max(...prices) * 1.02
    };
  }

  private calculateRSI(historicalData: any[]): number {
    // محاسبه RSI ساده
    if (historicalData.length < 14) return 50;

    const changes: number[] = [];
    for (let i = 1; i < historicalData.length; i++) {
      changes.push(historicalData[i].price - historicalData[i - 1].price);
    }

    const gains = changes.filter(c => c > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(changes.filter(c => c < 0).reduce((a, b) => a + b, 0));

    if (losses === 0) return 100;

    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
  }

  private generateRecommendation(
    marketData: any, 
    historicalData: any[], 
    sentiment: any
  ): string {
    const trend = this.calculateTrend(historicalData);
    const rsi = this.calculateRSI(historicalData);

    if (trend === 'BULLISH' && rsi < 70 && sentiment.value > 40) {
      return 'STRONG_BUY';
    } else if (trend === 'BEARISH' && rsi > 30 && sentiment.value < 60) {
      return 'STRONG_SELL';
    } else {
      return 'HOLD';
    }
  }

  async getPortfolioAnalysis(): Promise<any> {
    const positionsArray = Array.from(this.positions.values());
    let totalValue = 0;
    let totalPnL = 0;

    for (const position of positionsArray) {
      try {
        const currentData = await this.marketDataService.getRealTimePrice(position.symbol);
        const currentPrice = typeof currentData === 'number' ? currentData : (currentData as any).price || 0;
        const currentValue = position.amount * currentPrice;
        const entryValue = position.amount * position.entryPrice;
        const pnl = currentValue - entryValue;

        totalValue += currentValue;
        totalPnL += pnl;
      } catch (error) {
        this.logger.warn(`Failed to get current price for ${position.symbol}:`, {}, error as Error);
      }
    }

    return {
      totalPositions: positionsArray.length,
      totalValue,
      totalPnL,
      positions: positionsArray.map(p => ({
        ...p,
        currentPrice: undefined // Will be updated in real-time
      }))
    };
  }

  getPositions(): any[] {
    return Array.from(this.positions.values());
  }

  closePosition(positionId: string): void {
    this.positions.delete(positionId);
    this.logger.info(`Closed position: ${positionId}`);
  }
}

