/**
 * HuggingFace Data Engine Adapter
 *
 * Adapts HuggingFace Data Engine responses to match the backend's expected format.
 * This service sits between the backend routes and the HF Data Engine Client,
 * ensuring compatibility with existing frontend expectations.
 */

import { Logger } from '../core/Logger.js';
import {
  HFDataEngineClient,
  HFErrorResponse,
  HFCryptoPrice,
  HFMarketOverview,
  HFCategory,
  HFProvider,
  HFRateLimit,
  HFLogEntry,
  HFAlert
} from './HFDataEngineClient.js';
import { getPrimarySource, isHuggingFaceEnabled } from '../config/dataSource.js';

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  source?: string;
  timestamp?: string;
}

/**
 * Market data for frontend
 */
export interface MarketPrice {
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
 * System health status
 */
export interface SystemHealth {
  backend: string;
  engine: string;
  providers?: HFProvider[];
  timestamp: string;
  uptime?: number;
}

/**
 * HuggingFace Data Engine Adapter
 */
export class HFDataEngineAdapter {
  private static instance: HFDataEngineAdapter;
  private logger = Logger.getInstance();
  private client: HFDataEngineClient;

  private constructor() {
    this.client = HFDataEngineClient.getInstance();
    this.logger.info('HF Data Engine Adapter initialized');
  }

  static getInstance(): HFDataEngineAdapter {
    if (!HFDataEngineAdapter.instance) {
      HFDataEngineAdapter.instance = new HFDataEngineAdapter();
    }
    return HFDataEngineAdapter.instance;
  }

  /**
   * Check if HuggingFace should be used based on configuration
   */
  private shouldUseHF(): boolean {
    const primarySource = getPrimarySource();
    const hfEnabled = isHuggingFaceEnabled();
    return hfEnabled && (primarySource === 'huggingface' || primarySource === 'mixed');
  }

  /**
   * Convert HF error response to API response
   */
  private errorToAPIResponse(error: HFErrorResponse): APIResponse {
    return {
      success: false,
      error: {
        message: error.message,
        code: `HF_${error.status}`,
        details: error.error
      },
      source: error.source,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Wrap successful data in API response
   */
  private successAPIResponse<T>(data: T, source: string = 'hf_engine'): APIResponse<T> {
    return {
      success: true,
      data,
      source,
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // Health & Status
  // ============================================================================

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<APIResponse<SystemHealth>> {
    try {
      const health = await this.client.getHealth();

      if (HFDataEngineClient.isError(health)) {
        return this.errorToAPIResponse(health);
      }

      // Also get providers for more detailed status
      const providers = await this.client.getProviders();
      const providersList = HFDataEngineClient.isError(providers) ? [] : providers;

      const systemHealth: SystemHealth = {
        backend: 'up',
        engine: health.status || 'up',
        providers: providersList,
        timestamp: health.timestamp,
        uptime: health.uptime
      };

      return this.successAPIResponse(systemHealth);
    } catch (error) {
      this.logger.error('Failed to get system health', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve system health',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get data providers
   */
  async getProviders(): Promise<APIResponse<HFProvider[]>> {
    try {
      const providers = await this.client.getProviders();

      if (HFDataEngineClient.isError(providers)) {
        return this.errorToAPIResponse(providers);
      }

      return this.successAPIResponse(providers);
    } catch (error) {
      this.logger.error('Failed to get providers', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve data providers',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  /**
   * Get top cryptocurrency prices
   */
  async getTopPrices(limit: number = 50): Promise<APIResponse<MarketPrice[]>> {
    if (!this.shouldUseHF()) {
      return {
        success: false,
        error: {
          message: 'HuggingFace data source is not enabled',
          code: 'HF_DISABLED'
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const prices = await this.client.getTopPrices(limit);

      if (HFDataEngineClient.isError(prices)) {
        return this.errorToAPIResponse(prices);
      }

      // Map HF format to our MarketPrice format (they're already compatible)
      const mappedPrices: MarketPrice[] = prices.map((p: HFCryptoPrice) => ({
        symbol: p.symbol,
        name: p.name,
        price: p.price,
        change_24h: p.change_24h,
        volume_24h: p.volume_24h,
        market_cap: p.market_cap,
        rank: p.rank,
        last_updated: p.last_updated
      }));

      return this.successAPIResponse(mappedPrices);
    } catch (error) {
      this.logger.error('Failed to get top prices', { limit }, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve cryptocurrency prices',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get market overview
   */
  async getMarketOverview(): Promise<APIResponse<HFMarketOverview>> {
    if (!this.shouldUseHF()) {
      return {
        success: false,
        error: {
          message: 'HuggingFace data source is not enabled',
          code: 'HF_DISABLED'
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const overview = await this.client.getMarketOverview();

      if (HFDataEngineClient.isError(overview)) {
        return this.errorToAPIResponse(overview);
      }

      return this.successAPIResponse(overview);
    } catch (error) {
      this.logger.error('Failed to get market overview', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve market overview',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get cryptocurrency categories
   */
  async getCategories(): Promise<APIResponse<HFCategory[]>> {
    if (!this.shouldUseHF()) {
      return {
        success: false,
        error: {
          message: 'HuggingFace data source is not enabled',
          code: 'HF_DISABLED'
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }

    try {
      const categories = await this.client.getCategories();

      if (HFDataEngineClient.isError(categories)) {
        return this.errorToAPIResponse(categories);
      }

      return this.successAPIResponse(categories);
    } catch (error) {
      this.logger.error('Failed to get categories', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve categories',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // Observability
  // ============================================================================

  /**
   * Get rate limits
   */
  async getRateLimits(): Promise<APIResponse<HFRateLimit[]>> {
    try {
      const rateLimits = await this.client.getRateLimits();

      if (HFDataEngineClient.isError(rateLimits)) {
        return this.errorToAPIResponse(rateLimits);
      }

      return this.successAPIResponse(rateLimits);
    } catch (error) {
      this.logger.error('Failed to get rate limits', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve rate limits',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get system logs
   */
  async getLogs(limit: number = 100): Promise<APIResponse<HFLogEntry[]>> {
    try {
      const logs = await this.client.getLogs(limit);

      if (HFDataEngineClient.isError(logs)) {
        return this.errorToAPIResponse(logs);
      }

      return this.successAPIResponse(logs);
    } catch (error) {
      this.logger.error('Failed to get logs', { limit }, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve logs',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get alerts
   */
  async getAlerts(): Promise<APIResponse<HFAlert[]>> {
    try {
      const alerts = await this.client.getAlerts();

      if (HFDataEngineClient.isError(alerts)) {
        return this.errorToAPIResponse(alerts);
      }

      return this.successAPIResponse(alerts);
    } catch (error) {
      this.logger.error('Failed to get alerts', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve alerts',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // HuggingFace Integration
  // ============================================================================

  /**
   * Get HuggingFace health
   */
  async getHfHealth(): Promise<APIResponse> {
    try {
      const health = await this.client.getHfHealth();

      if (HFDataEngineClient.isError(health)) {
        return this.errorToAPIResponse(health);
      }

      return this.successAPIResponse(health);
    } catch (error) {
      this.logger.error('Failed to get HF health', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve HuggingFace health',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Refresh HuggingFace data
   */
  async refreshHfData(): Promise<APIResponse> {
    try {
      const result = await this.client.refreshHfData();

      if (HFDataEngineClient.isError(result)) {
        return this.errorToAPIResponse(result);
      }

      return this.successAPIResponse(result);
    } catch (error) {
      this.logger.error('Failed to refresh HF data', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to refresh HuggingFace data',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get HuggingFace registry
   */
  async getHfRegistry(): Promise<APIResponse> {
    try {
      const registry = await this.client.getHfRegistry();

      if (HFDataEngineClient.isError(registry)) {
        return this.errorToAPIResponse(registry);
      }

      return this.successAPIResponse(registry);
    } catch (error) {
      this.logger.error('Failed to get HF registry', {}, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to retrieve HuggingFace registry',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Run sentiment analysis
   */
  async runSentimentAnalysis(text: string): Promise<APIResponse> {
    try {
      const result = await this.client.runHfSentiment(text);

      if (HFDataEngineClient.isError(result)) {
        return this.errorToAPIResponse(result);
      }

      return this.successAPIResponse(result);
    } catch (error) {
      this.logger.error('Failed to run sentiment analysis', { textLength: text.length }, error as Error);
      return {
        success: false,
        error: {
          message: 'Failed to run sentiment analysis',
          details: error
        },
        source: 'adapter',
        timestamp: new Date().toISOString()
      };
    }
  }

  // ============================================================================
  // Unified Controller Interface (Phase 2)
  // These methods provide a consistent interface for controllers regardless
  // of the underlying data source (HuggingFace, Binance, KuCoin, etc.)
  // ============================================================================

  /**
   * Get market prices - unified method for controllers
   * Delegates to the primary data source configured in dataSource.ts
   */
  async getMarketPrices(limit: number = 50): Promise<APIResponse<MarketPrice[]>> {
    const primarySource = getPrimarySource();

    // If primary source is HuggingFace or mixed, use HF
    if (primarySource === 'huggingface' || primarySource === 'mixed') {
      return this.getTopPrices(limit);
    }

    // For Binance/KuCoin sources, return NOT_IMPLEMENTED error
    return {
      success: false,
      error: {
        message: `Primary data source is set to ${primarySource} but only HuggingFace is implemented in this phase.`,
        code: 'NOT_IMPLEMENTED',
        details: {
          primarySource,
          availableSources: ['huggingface', 'mixed']
        }
      },
      source: 'adapter',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get health summary - combines health check with provider status
   * This is the primary health endpoint for controllers
   */
  async getHealthSummary(): Promise<APIResponse<SystemHealth>> {
    const primarySource = getPrimarySource();

    // If primary source is HuggingFace or mixed, use HF
    if (primarySource === 'huggingface' || primarySource === 'mixed') {
      return this.getSystemHealth();
    }

    // For Binance/KuCoin sources, return basic health with NOT_IMPLEMENTED note
    return {
      success: true,
      data: {
        backend: 'up',
        engine: 'not_implemented',
        timestamp: new Date().toISOString()
      },
      source: 'adapter',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get sentiment analysis result - unified method for controllers
   */
  async getSentiment(text: string): Promise<APIResponse> {
    const primarySource = getPrimarySource();

    // If primary source is HuggingFace or mixed, use HF
    if (primarySource === 'huggingface' || primarySource === 'mixed') {
      return this.runSentimentAnalysis(text);
    }

    // For Binance/KuCoin sources, return NOT_IMPLEMENTED error
    return {
      success: false,
      error: {
        message: `Sentiment analysis requires HuggingFace but primary source is ${primarySource}`,
        code: 'NOT_IMPLEMENTED',
        details: {
          primarySource,
          requiredSource: 'huggingface'
        }
      },
      source: 'adapter',
      timestamp: new Date().toISOString()
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Test connection to HF Data Engine
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Get current data source status
   */
  getDataSourceStatus(): {
    enabled: boolean;
    primarySource: string;
    baseUrl: string;
  } {
    return {
      enabled: isHuggingFaceEnabled(),
      primarySource: getPrimarySource(),
      baseUrl: this.client.getBaseUrl()
    };
  }
}

// Export singleton instance
export const hfDataEngineAdapter = HFDataEngineAdapter.getInstance();
