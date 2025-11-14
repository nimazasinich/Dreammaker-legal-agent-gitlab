/**
 * HuggingFace Proxy Adapter
 *
 * Handles proxy routes for external data (news, fear & greed index, etc.)
 * HF Data Engine may aggregate news/sentiment from multiple sources
 */

import { Logger } from '../../core/Logger.js';
import { HFDataEngineClient } from '../HFDataEngineClient.js';
import { getPrimarySource } from '../../config/dataSource.js';
import { providerLatencyTracker } from '../../core/providerLatencyTracker.js';
import { providerRecoveryTracker } from '../../core/providerRecoveryTracker.js';
import { providerErrorLog } from '../../core/providerErrorLog.js';
import type { AdapterErrorResponse, AdapterSuccessResponse, AdapterResponse } from './HFMarketAdapter.js';

/**
 * HuggingFace Proxy Adapter
 */
export class HFProxyAdapter {
  private static instance: HFProxyAdapter;
  private logger = Logger.getInstance();
  private hfClient: HFDataEngineClient;

  private constructor() {
    this.hfClient = HFDataEngineClient.getInstance();
    this.logger.info('HF Proxy Adapter initialized');
  }

  static getInstance(): HFProxyAdapter {
    if (!HFProxyAdapter.instance) {
      HFProxyAdapter.instance = new HFProxyAdapter();
    }
    return HFProxyAdapter.instance;
  }

  /**
   * Create error response
   */
  private createError(
    endpoint: string,
    message: string,
    status: number = 503,
    reason: string = 'SERVICE_UNAVAILABLE'
  ): AdapterErrorResponse {
    providerErrorLog.logError('huggingface', message, endpoint, status);
    return {
      ok: false,
      provider: 'huggingface',
      status,
      reason,
      message,
      endpoint
    };
  }

  /**
   * Create success response
   */
  private createSuccess<T>(data: T): AdapterSuccessResponse<T> {
    return {
      ok: true,
      provider: 'huggingface',
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if should use HuggingFace
   */
  private shouldUseHF(): boolean {
    const primarySource = getPrimarySource();
    return primarySource === 'huggingface' || primarySource === 'mixed';
  }

  /**
   * Get cryptocurrency news
   * Note: News aggregation via HF is not yet implemented
   */
  async getNews(symbol?: string, limit: number = 10): Promise<AdapterResponse<any[]>> {
    const endpoint = '/proxy/news';

    return this.createError(
      endpoint,
      'News aggregation via HuggingFace is not yet implemented. Use alternative news services.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Get Fear & Greed Index
   * Note: Fear & Greed data via HF is not yet implemented
   */
  async getFearGreedIndex(): Promise<AdapterResponse<any>> {
    const endpoint = '/proxy/fear-greed';

    return this.createError(
      endpoint,
      'Fear & Greed Index via HuggingFace is not yet implemented. Use Alternative.me API.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Get social sentiment data
   * Note: Could be implemented using HF sentiment models
   */
  async getSocialSentiment(symbol: string): Promise<AdapterResponse<any>> {
    const endpoint = '/proxy/social-sentiment';

    return this.createError(
      endpoint,
      'Social sentiment aggregation via HuggingFace is not yet implemented.',
      501,
      'NOT_IMPLEMENTED'
    );
  }
}

// Export singleton instance
export const hfProxyAdapter = HFProxyAdapter.getInstance();
