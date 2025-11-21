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
}

// Export singleton instance for convenience
export default DatasourceClient.getInstance();