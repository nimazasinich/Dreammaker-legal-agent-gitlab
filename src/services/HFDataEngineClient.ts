/**
 * HuggingFace Data Engine Client
 *
 * HTTP client for communicating with the HuggingFace Data Source Space.
 * This client handles all interactions with the data engine API.
 *
 * Space URL: https://huggingface.co/spaces/Really-amin/Datasourceforcryptocurrency
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from '../core/Logger.js';
import { getHuggingFaceBaseUrl, getHuggingFaceTimeout } from '../config/dataSource.js';

/**
 * Health check response
 */
export interface HFHealthResponse {
  status: string;
  timestamp: string;
  uptime?: number;
  version?: string;
}

/**
 * System info response
 */
export interface HFInfoResponse {
  name: string;
  version: string;
  description: string;
  endpoints: string[];
}

/**
 * Provider information
 */
export interface HFProvider {
  name: string;
  enabled: boolean;
  priority?: number;
  status?: string;
  rate_limit?: {
    requests: number;
    period: string;
  };
}

/**
 * Cryptocurrency price data
 */
export interface HFCryptoPrice {
  symbol: string;
  name: string;
  price: number;
  change_24h: number;
  volume_24h: number;
  market_cap?: number;
  rank?: number;
  last_updated?: string;
}

/**
 * Market overview data
 */
export interface HFMarketOverview {
  total_market_cap: number;
  total_volume_24h: number;
  btc_dominance: number;
  eth_dominance?: number;
  market_cap_change_24h: number;
  active_cryptocurrencies?: number;
  upcoming_icos?: number;
  ongoing_icos?: number;
  ended_icos?: number;
  markets?: number;
}

/**
 * Category information
 */
export interface HFCategory {
  id: string;
  name: string;
  market_cap?: number;
  market_cap_change_24h?: number;
  volume_24h?: number;
  top_3_coins?: string[];
}

/**
 * Rate limit information
 */
export interface HFRateLimit {
  provider: string;
  limit: number;
  remaining: number;
  reset_at?: string;
}

/**
 * Log entry
 */
export interface HFLogEntry {
  timestamp: string;
  level: string;
  message: string;
  provider?: string;
  endpoint?: string;
}

/**
 * Alert information
 */
export interface HFAlert {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  resolved?: boolean;
}

/**
 * HuggingFace sentiment analysis result
 */
export interface HFSentimentResult {
  text: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence?: number;
}

/**
 * Standard error response format
 */
export interface HFErrorResponse {
  ok: false;
  source: string;
  endpoint: string;
  message: string;
  status: number;
  error?: any;
}

/**
 * HuggingFace Data Engine Client
 */
export class HFDataEngineClient {
  private static instance: HFDataEngineClient;
  private logger = Logger.getInstance();
  private client: AxiosInstance;
  private baseUrl: string;

  private constructor() {
    this.baseUrl = getHuggingFaceBaseUrl();
    const timeout = getHuggingFaceTimeout();

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DreammakerCrypto/1.0'
      },
      // Don't throw on non-2xx status codes
      validateStatus: () => true
    });

    this.logger.info('HF Data Engine Client initialized', {
      baseUrl: this.baseUrl,
      timeout
    });
  }

  static getInstance(): HFDataEngineClient {
    if (!HFDataEngineClient.instance) {
      HFDataEngineClient.instance = new HFDataEngineClient();
    }
    return HFDataEngineClient.instance;
  }

  /**
   * Handle errors and return standardized error response
   */
  private handleError(endpoint: string, error: any): HFErrorResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 503;
      const message = axiosError.message || 'HuggingFace data engine is not reachable';

      this.logger.error('HF Data Engine request failed', {
        endpoint,
        status,
        message
      }, error);

      return {
        ok: false,
        source: 'hf_engine',
        endpoint,
        message,
        status,
        error: axiosError.response?.data
      };
    }

    this.logger.error('Unexpected error in HF Data Engine client', { endpoint }, error);
    return {
      ok: false,
      source: 'hf_engine',
      endpoint,
      message: error?.message || 'Unknown error occurred',
      status: 500,
      error
    };
  }

  /**
   * Make a GET request with error handling
   */
  private async get<T>(endpoint: string): Promise<T | HFErrorResponse> {
    try {
      const response = await this.client.get(endpoint);

      if (response.status >= 200 && response.status < 300) {
        return response.data as T;
      }

      // Non-success status
      return {
        ok: false,
        source: 'hf_engine',
        endpoint,
        message: `Request failed with status ${response.status}`,
        status: response.status,
        error: response.data
      };
    } catch (error) {
      return this.handleError(endpoint, error);
    }
  }

  /**
   * Make a POST request with error handling
   */
  private async post<T>(endpoint: string, data: any): Promise<T | HFErrorResponse> {
    try {
      const response = await this.client.post(endpoint, data);

      if (response.status >= 200 && response.status < 300) {
        return response.data as T;
      }

      // Non-success status
      return {
        ok: false,
        source: 'hf_engine',
        endpoint,
        message: `Request failed with status ${response.status}`,
        status: response.status,
        error: response.data
      };
    } catch (error) {
      return this.handleError(endpoint, error);
    }
  }

  // ============================================================================
  // Health & Status Endpoints
  // ============================================================================

  /**
   * Get health status of the data engine
   */
  async getHealth(): Promise<HFHealthResponse | HFErrorResponse> {
    return this.get<HFHealthResponse>('/health');
  }

  /**
   * Get system information
   */
  async getInfo(): Promise<HFInfoResponse | HFErrorResponse> {
    return this.get<HFInfoResponse>('/info');
  }

  // ============================================================================
  // Provider Endpoints
  // ============================================================================

  /**
   * Get list of available data providers
   */
  async getProviders(): Promise<HFProvider[] | HFErrorResponse> {
    return this.get<HFProvider[]>('/api/providers');
  }

  // ============================================================================
  // Market Data Endpoints
  // ============================================================================

  /**
   * Get top cryptocurrency prices
   * @param limit Number of cryptocurrencies to return (default: 50)
   */
  async getTopPrices(limit: number = 50): Promise<HFCryptoPrice[] | HFErrorResponse> {
    return this.get<HFCryptoPrice[]>(`/api/crypto/prices/top?limit=${limit}`);
  }

  /**
   * Get market overview statistics
   */
  async getMarketOverview(): Promise<HFMarketOverview | HFErrorResponse> {
    return this.get<HFMarketOverview>('/api/crypto/market-overview');
  }

  /**
   * Get cryptocurrency categories
   */
  async getCategories(): Promise<HFCategory[] | HFErrorResponse> {
    return this.get<HFCategory[]>('/api/categories');
  }

  // ============================================================================
  // Rate Limits & Observability Endpoints
  // ============================================================================

  /**
   * Get rate limit information for all providers
   */
  async getRateLimits(): Promise<HFRateLimit[] | HFErrorResponse> {
    return this.get<HFRateLimit[]>('/api/rate-limits');
  }

  /**
   * Get system logs
   * @param limit Number of log entries to return (default: 100)
   */
  async getLogs(limit: number = 100): Promise<HFLogEntry[] | HFErrorResponse> {
    return this.get<HFLogEntry[]>(`/api/logs?limit=${limit}`);
  }

  /**
   * Get active alerts
   */
  async getAlerts(): Promise<HFAlert[] | HFErrorResponse> {
    return this.get<HFAlert[]>('/api/alerts');
  }

  // ============================================================================
  // HuggingFace Integration Endpoints
  // ============================================================================

  /**
   * Get HuggingFace integration health
   */
  async getHfHealth(): Promise<any | HFErrorResponse> {
    return this.get<any>('/api/hf/health');
  }

  /**
   * Refresh HuggingFace data
   */
  async refreshHfData(): Promise<any | HFErrorResponse> {
    return this.post<any>('/api/hf/refresh', {});
  }

  /**
   * Get HuggingFace model registry
   */
  async getHfRegistry(): Promise<any | HFErrorResponse> {
    return this.get<any>('/api/hf/registry');
  }

  /**
   * Run sentiment analysis on text
   * @param text Text to analyze
   */
  async runHfSentiment(text: string): Promise<HFSentimentResult | HFErrorResponse> {
    return this.post<HFSentimentResult>('/api/hf/run-sentiment', { text });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if a response is an error
   */
  static isError(response: any): response is HFErrorResponse {
    return response && response.ok === false;
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Test connection to the data engine
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return !HFDataEngineClient.isError(health);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const hfDataEngineClient = HFDataEngineClient.getInstance();
