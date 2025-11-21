// src/services/RealTradingService.ts
// REFACTORED: Now uses DatasourceClient instead of RealMarketDataService
import { Logger } from '../core/Logger.js';

export class RealTradingService {
  private logger = Logger.getInstance();
  private positions: Map<string, any> = new Map();
  private datasourceClient: any = null;

  constructor() {
    // Load DatasourceClient lazily to avoid circular dependencies
  }

  private async loadDatasourceClient(): Promise<any> {
    if (!this.datasourceClient) {
      const module = await import('./DatasourceClient.js');
      this.datasourceClient = module.default;
    }
    return this.datasourceClient;
  }

  // Market analysis with real data
  async analyzeMarket(symbol: string): Promise<any> {
    const datasource = await this.loadDatasourceClient();
    
    // Get current price
    const priceData = await datasource.getTopCoins(1, [symbol.replace('USDT', '')]);
    const currentPrice = priceData.length > 0 ? priceData[0].price : 0;
    
    // Get historical data
    const historicalData = await datasource.getPriceChart(symbol, '1h', 168); // 7 days * 24 hours
    
    // Get sentiment
    const sentiment = await datasource.getMarketSentiment();

    // Technical analysis
    const analysis = {
      symbol,
      currentPrice,
      trend: this.calculateTrend(historicalData),
      support: this.calculateSupportResistance(historicalData),
      rsi: this.calculateRSI(historicalData),
      sentiment: sentiment,
      recommendation: this.generateRecommendation(currentPrice, historicalData, sentiment),
      timestamp: Date.now()
    };

    return analysis;
  }

  // Trade simulation with real data (without actual execution)
  async simulateTrade(symbol: string, side: 'BUY' | 'SELL', amount: number): Promise<any> {
    const datasource = await this.loadDatasourceClient();
    const priceData = await datasource.getTopCoins(1, [symbol.replace('USDT', '')]);
    const currentPrice = priceData.length > 0 ? priceData[0].price : 0;

    const trade = {
      id: `sim-${Date.now()}`,
      symbol,
      side,
      amount,
      entryPrice: currentPrice,
      timestamp: Date.now(),
      status: 'EXECUTED',
      simulated: true,
      analysis: await this.analyzeMarket(symbol)
    };

    // Save in simulated positions
    if (side === 'BUY') {
      this.positions.set(trade.id, trade);
    }

    return trade;
  }

  // Calculate technical indicators with real data
  private calculateTrend(historicalData: any[]): string {
    if (historicalData.length < 2) return 'NEUTRAL';

    const firstPrice = historicalData[0].close || historicalData[0].price;
    const lastPrice = historicalData[historicalData.length - 1].close || historicalData[historicalData.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    if (change > 2) return 'BULLISH';
    if (change < -2) return 'BEARISH';
    return 'NEUTRAL';
  }

  private calculateSupportResistance(historicalData: any[]): { support: number; resistance: number } {
    if (historicalData.length === 0) {
      return { support: 0, resistance: 0 };
    }

    const prices = (historicalData || []).map(d => d.close || d.price || 0);
    return {
      support: Math.min(...prices) * 0.98,
      resistance: Math.max(...prices) * 1.02
    };
  }

  private calculateRSI(historicalData: any[]): number {
    // Simple RSI calculation
    if (historicalData.length < 14) return 50;

    const changes: number[] = [];
    for (let i = 1; i < historicalData.length; i++) {
      const currentPrice = historicalData[i].close || historicalData[i].price || 0;
      const previousPrice = historicalData[i - 1].close || historicalData[i - 1].price || 0;
      changes.push(currentPrice - previousPrice);
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

    const datasource = await this.loadDatasourceClient();

    for (const position of positionsArray) {
      try {
        const priceData = await datasource.getTopCoins(1, [position.symbol.replace('USDT', '')]);
        const currentPrice = priceData.length > 0 ? priceData[0].price : position.entryPrice;
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
      positions: (positionsArray || []).map(p => ({
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

