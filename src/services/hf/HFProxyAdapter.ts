/**
 * HuggingFace Proxy Adapter
 *
 * HFProxyAdapter is a placeholder for potential proxy-style integrations via the HF Data Engine.
 * In this build, direct provider clients are used instead; proxy methods are intentionally not implemented.
 * See docs/hf-engine-scope.md for the current integration model.
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
   * This proxy method is intentionally not implemented; direct provider clients are used instead.
   */
  async getNews(symbol?: string, limit: number = 10): Promise<AdapterResponse<any[]>> {
    const endpoint = '/proxy/news';

    // This proxy method is intentionally not implemented; direct provider clients are used instead.
    return this.createError(
      endpoint,
      'News aggregation via HuggingFace is not yet implemented. Use alternative news services.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Get Fear & Greed Index
   * This proxy method is intentionally not implemented; direct provider clients are used instead.
   */
  async getFearGreedIndex(): Promise<AdapterResponse<any>> {
    const endpoint = '/proxy/fear-greed';

    // This proxy method is intentionally not implemented; direct provider clients are used instead.
    return this.createError(
      endpoint,
      'Fear & Greed Index via HuggingFace is not yet implemented. Use Alternative.me API.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Get social sentiment data
   * This proxy method is intentionally not implemented; direct provider clients are used instead.
   */
  async getSocialSentiment(symbol: string): Promise<AdapterResponse<any>> {
    const endpoint = '/proxy/social-sentiment';

    // This proxy method is intentionally not implemented; direct provider clients are used instead.
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
