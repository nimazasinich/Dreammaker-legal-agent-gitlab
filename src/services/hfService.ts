/**
 * Hugging Face Service - Frontend
 * Provides typed API calls to HF endpoints for OHLCV and Sentiment data
 */

const API_BASE_URL = '/api/hf';

export interface HFOHLCVBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
}

export interface HFOHLCVResponse {
  success: boolean;
  symbol: string;
  timeframe: string;
  rows: number;
  data: HFOHLCVBar[];
  source: string;
  timestamp: number;
  error?: string;
}

export interface HFSentimentResult {
  text: string;
  sentiment: number; // -1 to 1
  label: string;
  confidence: number;
  rawScores: Array<{ label: string; score: number }>;
}

export interface HFSentimentBatch {
  results: HFSentimentResult[];
  aggregate: {
    average: number;
    positive: number;
    negative: number;
    neutral: number;
    vote: number;
  };
}

export interface HFSentimentResponse {
  success: boolean;
  textCount?: number;
  result: HFSentimentBatch | HFSentimentResult;
  source: string;
  models: string[];
  timestamp: number;
  error?: string;
}

export interface HFRegistrySource {
  name: string;
  baseUrl: string;
  key?: string;
  type: 'primary' | 'fallback';
}

export interface HFRegistryResponse {
  success: boolean;
  category?: string;
  sources?: HFRegistrySource[] | {
    market: HFRegistrySource[];
    news: HFRegistrySource[];
    sentiment: HFRegistrySource[];
    blockchain: HFRegistrySource[];
    whale: HFRegistrySource[];
    onchain: HFRegistrySource[];
  };
  stats?: Record<string, number>;
  timestamp: number;
  error?: string;
}

/**
 * Get OHLCV data from Hugging Face datasets
 */
export async function hfOHLCV(options: {
  symbol: string;
  timeframe?: string;
  limit?: number;
}): Promise<HFOHLCVResponse> {
  const { symbol, timeframe = '1h', limit = 1000 } = options;

  const params = new URLSearchParams({
    symbol,
    timeframe,
    limit: String(limit)
  });

  const response = await fetch(`${API_BASE_URL}/ohlcv?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to fetch HF OHLCV: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get OHLCV data in MarketData format (for compatibility with existing services)
 */
export async function hfOHLCVMarketData(options: {
  symbol: string;
  timeframe?: string;
  limit?: number;
}): Promise<HFOHLCVResponse> {
  const { symbol, timeframe = '1h', limit = 1000 } = options;

  const params = new URLSearchParams({
    symbol,
    timeframe,
    limit: String(limit)
  });

  const response = await fetch(`${API_BASE_URL}/ohlcv/market-data?${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to fetch HF OHLCV MarketData: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Analyze sentiment of multiple texts using HF CryptoBERT models
 */
export async function hfSentiment(
  texts: string[],
  useCache: boolean = true
): Promise<HFSentimentResponse> {
  const response = await fetch(`${API_BASE_URL}/sentiment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ texts, useCache })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to analyze sentiment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Analyze sentiment of a single text
 */
export async function hfSentimentSingle(
  text: string,
  useCache: boolean = true
): Promise<HFSentimentResponse> {
  const response = await fetch(`${API_BASE_URL}/sentiment/single`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, useCache })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to analyze sentiment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get HF service health status
 */
export async function hfHealth(): Promise<{
  success: boolean;
  services: {
    ohlcv: string;
    sentiment: string;
  };
  datasets: string[];
  models: string[];
  timestamp: number;
}> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to get HF health: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Clear HF service caches
 */
export async function hfClearCache(): Promise<{
  success: boolean;
  message: string;
  timestamp: number;
}> {
  const response = await fetch(`${API_BASE_URL}/clear-cache`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to clear HF cache: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get alternate API sources registry
 */
export async function hfRegistry(category?: 'market' | 'news' | 'sentiment' | 'blockchain' | 'whale' | 'onchain'): Promise<HFRegistryResponse> {
  const params = category ? `?category=${category}` : '';

  const response = await fetch(`${API_BASE_URL}/registry${params}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error(errorData.error || `Failed to get registry: ${response.statusText}`);
  }

  return response.json();
}

/**
 * HF Service utilities
 */
export const hfUtils = {
  /**
   * Check if a symbol is supported by HF datasets
   */
  isSupportedSymbol(symbol: string): boolean {
    const supportedSymbols = ['BTC', 'ETH', 'SOL', 'XRP'];
    const normalized = symbol.replace('USDT', '').replace('USD', '').toUpperCase();
    return supportedSymbols.includes(normalized);
  },

  /**
   * Normalize sentiment vote to percentage
   */
  sentimentToPercentage(vote: number): number {
    // Convert from [-1, 1] to [0, 100]
    return Math.round(((vote + 1) / 2) * 100);
  },

  /**
   * Get sentiment label from vote
   */
  sentimentLabel(vote: number): string {
    if (vote > 0.3) return 'Bullish';
    if (vote < -0.3) return 'Bearish';
    return 'Neutral';
  },

  /**
   * Get sentiment color for UI
   */
  sentimentColor(vote: number): string {
    if (vote > 0.3) return 'green';
    if (vote < -0.3) return 'red';
    return 'gray';
  }
};

// Export as default for convenience
export default {
  ohlcv: hfOHLCV,
  ohlcvMarketData: hfOHLCVMarketData,
  sentiment: hfSentiment,
  sentimentSingle: hfSentimentSingle,
  health: hfHealth,
  clearCache: hfClearCache,
  registry: hfRegistry,
  utils: hfUtils
};
