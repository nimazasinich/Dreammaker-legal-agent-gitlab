// src/services/DatasourceClient.ts
// UNIVERSAL DATA SOURCE CLIENT - THE SINGLE SOURCE OF TRUTH
// All data flows through this client to the local server proxy

interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume: number;
  marketCap?: number;
  timestamp: number;
}

interface PriceChart {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MarketStats {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  activeCoins: number;
  timestamp: number;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: string;
}

interface MarketSentiment {
  fearGreedIndex: number;
  classification: string;
  timestamp: number;
  indicators: {
    volatility: number;
    marketMomentum: number;
    socialSentiment: number;
    surveys: number;
    dominance: number;
    trends: number;
  };
}

interface AIPrediction {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price: number;
  timeframe: string;
  indicators: Record<string, number>;
  timestamp: number;
}

interface PortfolioPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  allocation: number;
}

interface PortfolioData {
  positions: PortfolioPosition[];
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
}

interface ScoringSnapshot {
  timestamp: string;
  symbol: string;
  judicialProceedings: {
    supremeVerdict: {
      direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
      quantumScore: number;
      action: string;
      conviction: number;
    };
    timeframeCourts: Array<{
      tf: string;
      direction: string;
      final_score: number;
    }>;
  };
  detectorPerformance: Array<{
    detector: string;
    currentScore: number;
    historicalAccuracy: number;
    confidenceLevel: number;
  }>;
}

interface ScoringWeights {
  detector_weights: {
    technical_analysis: Record<string, number>;
    fundamental_analysis: Record<string, number>;
  };
  timeframe_weights: Record<string, number>;
}

interface TrainingJobResponse {
  job_id: string;
  status: string;
  message: string;
}

interface TrainingStatusResponse {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  metrics?: {
    epoch: number;
    loss: number;
    accuracy: number;
  };
}

export class DatasourceClient {
  private static instance: DatasourceClient;
  private baseUrl: string;

  private constructor() {
    // Safely handle both Node.js (process.env) and Vite (import.meta.env) environments
    let apiBase = 'http://localhost:8001';
    
    try {
      // Try Vite environment first (browser/frontend)
      if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) {
        apiBase = import.meta.env.VITE_API_BASE;
      }
    } catch (e) {
      // Not in Vite environment, try Node.js
      try {
        if (typeof process !== 'undefined' && process.env?.VITE_API_BASE) {
          apiBase = process.env.VITE_API_BASE;
        }
      } catch (e2) {
        // Neither environment available, use default
        console.warn('DatasourceClient: Could not access environment variables, using default:', apiBase);
      }
    }
    
    this.baseUrl = apiBase;
    console.info(`DatasourceClient initialized with baseUrl: ${this.baseUrl}`);
  }

  public static getInstance(): DatasourceClient {
    if (!DatasourceClient.instance) {
      DatasourceClient.instance = new DatasourceClient();
    }
    return DatasourceClient.instance;
  }

  // Helper method for fetch requests with error handling
  private async fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('DatasourceClient fetch error:', error);
      throw error;
    }
  }

  // Get top coins with real-time prices
  async getTopCoins(limit = 10, symbols?: string[]): Promise<MarketPrice[]> {
    try {
      let url = `${this.baseUrl}/api/market?limit=${limit}`;
      if (symbols && symbols.length > 0) {
        url += `&symbol=${symbols.join(',')}`;
      }
      
      const data = await this.fetchJSON<MarketPrice[]>(url);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('getTopCoins error:', error);
      return [];
    }
  }

  // Get price chart data (OHLCV)
  async getPriceChart(symbol: string, timeframe = '1h', limit = 100): Promise<PriceChart[]> {
    try {
      const url = `${this.baseUrl}/api/market/history?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
      const data = await this.fetchJSON<PriceChart[]>(url);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('getPriceChart error:', error);
      return [];
    }
  }

  // Get market statistics
  async getMarketStats(): Promise<MarketStats | null> {
    try {
      const url = `${this.baseUrl}/api/stats`;
      return await this.fetchJSON<MarketStats>(url);
    } catch (error) {
      console.error('getMarketStats error:', error);
      return null;
    }
  }

  // Get latest news
  async getLatestNews(limit = 20): Promise<NewsItem[]> {
    try {
      const url = `${this.baseUrl}/api/news/latest?limit=${limit}`;
      const response = await this.fetchJSON<{ success: boolean; news: NewsItem[] }>(url);
      return response?.news || [];
    } catch (error) {
      console.error('getLatestNews error:', error);
      return [];
    }
  }

  // Get market sentiment
  async getMarketSentiment(): Promise<MarketSentiment | null> {
    try {
      const url = `${this.baseUrl}/api/sentiment`;
      return await this.fetchJSON<MarketSentiment>(url);
    } catch (error) {
      console.error('getMarketSentiment error:', error);
      return null;
    }
  }

  // Get AI prediction
  async getAIPrediction(symbol: string, timeframe = '1h'): Promise<AIPrediction | null> {
    try {
      const url = `${this.baseUrl}/api/ai/predict`;
      const response = await this.fetchJSON<AIPrediction>(url, {
        method: 'POST',
        body: JSON.stringify({ symbol, timeframe })
      });
      return response;
    } catch (error) {
      console.error('getAIPrediction error:', error);
      return null;
    }
  }

  // Convenience methods for specific use cases
  async getBitcoinPrice(): Promise<number> {
    const coins = await this.getTopCoins(1, ['BTC']);
    return coins.length > 0 ? coins[0].price : 0;
  }

  async getTopGainers(limit = 5): Promise<MarketPrice[]> {
    const coins = await this.getTopCoins(50);
    return coins
      .filter(coin => coin.changePercent24h > 0)
      .sort((a, b) => b.changePercent24h - a.changePercent24h)
      .slice(0, limit);
  }

  async getTopLosers(limit = 5): Promise<MarketPrice[]> {
    const coins = await this.getTopCoins(50);
    return coins
      .filter(coin => coin.changePercent24h < 0)
      .sort((a, b) => a.changePercent24h - b.changePercent24h)
      .slice(0, limit);
  }

  // Check if the datasource is available
  async isAvailable(): Promise<boolean> {
    try {
      const stats = await this.getMarketStats();
      return stats !== null;
    } catch {
      return false;
    }
  }

  // Portfolio Management
  async getPortfolio(): Promise<PortfolioData | null> {
    try {
      const url = `${this.baseUrl}/api/trading/portfolio`;
      const response = await this.fetchJSON<{ success: boolean; portfolio: PortfolioData }>(url);
      return response.success ? response.portfolio : null;
    } catch (error) {
      console.error('getPortfolio error:', error);
      return null;
    }
  }

  // Scoring System
  async getScoringSnapshot(symbol: string): Promise<ScoringSnapshot | null> {
    try {
      const url = `${this.baseUrl}/api/scoring/snapshot?symbol=${symbol}`;
      const response = await this.fetchJSON<{ success: boolean; snapshot: ScoringSnapshot }>(url);
      return response.success ? response.snapshot : null;
    } catch (error) {
      console.error('getScoringSnapshot error:', error);
      return null;
    }
  }

  async getScoringWeights(): Promise<ScoringWeights | null> {
    try {
      const url = `${this.baseUrl}/api/scoring/weights`;
      const response = await this.fetchJSON<{ success: boolean; weights: ScoringWeights }>(url);
      return response.success ? response.weights : null;
    } catch (error) {
      console.error('getScoringWeights error:', error);
      return null;
    }
  }

  async updateScoringWeights(weights: ScoringWeights): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/scoring/weights`;
      const response = await this.fetchJSON<{ success: boolean }>(url, {
        method: 'POST',
        body: JSON.stringify(weights)
      });
      return response.success;
    } catch (error) {
      console.error('updateScoringWeights error:', error);
      return false;
    }
  }

  async resetScoringWeights(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/scoring/weights/reset`;
      const response = await this.fetchJSON<{ success: boolean }>(url, {
        method: 'POST'
      });
      return response.success;
    } catch (error) {
      console.error('resetScoringWeights error:', error);
      return false;
    }
  }

  // AI Training
  async startTraining(config: {
    dataset: string;
    symbols: string[];
    timeframe: string;
    task: 'classification' | 'regression';
    model: string;
  }): Promise<TrainingJobResponse | null> {
    try {
      const url = `${this.baseUrl}/api/ai/train-epoch`;
      const response = await this.fetchJSON<TrainingJobResponse>(url, {
        method: 'POST',
        body: JSON.stringify(config)
      });
      return response;
    } catch (error) {
      console.error('startTraining error:', error);
      return null;
    }
  }

  async getTrainingStatus(jobId: string): Promise<TrainingStatusResponse | null> {
    try {
      const url = `${this.baseUrl}/api/ai/training-status?job_id=${jobId}`;
      const response = await this.fetchJSON<TrainingStatusResponse>(url);
      return response;
    } catch (error) {
      console.error('getTrainingStatus error:', error);
      return null;
    }
  }

  async getTrainingMetrics(): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/training-metrics`;
      const response = await this.fetchJSON<{ metrics: any[] }>(url);
      return response.metrics || [];
    } catch (error) {
      console.error('getTrainingMetrics error:', error);
      return [];
    }
  }

  // Historical Market Data (for AI training and analysis)
  async getHistoricalData(symbol: string, timeframe: string, limit: number): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/api/market/historical?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
      const response = await this.fetchJSON<any[]>(url);
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('getHistoricalData error:', error);
      return [];
    }
  }
}

// Export singleton instance for convenience
export default DatasourceClient.getInstance();