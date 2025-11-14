/**
 * HuggingFace Analysis Adapter
 *
 * Handles analysis-related routes (SMC, Elliott Wave, sentiment, etc.)
 * Note: Most technical analysis is done locally, but HF provides sentiment analysis
 */

import { Logger } from '../../core/Logger.js';
import { HFDataEngineClient, HFSentimentResult } from '../HFDataEngineClient.js';
import { getPrimarySource } from '../../config/dataSource.js';
import { providerLatencyTracker } from '../../core/providerLatencyTracker.js';
import { providerRecoveryTracker } from '../../core/providerRecoveryTracker.js';
import { providerErrorLog } from '../../core/providerErrorLog.js';
import type { AdapterErrorResponse, AdapterSuccessResponse, AdapterResponse } from './HFMarketAdapter.js';

/**
 * HuggingFace Analysis Adapter
 */
export class HFAnalysisAdapter {
  private static instance: HFAnalysisAdapter;
  private logger = Logger.getInstance();
  private hfClient: HFDataEngineClient;

  private constructor() {
    this.hfClient = HFDataEngineClient.getInstance();
    this.logger.info('HF Analysis Adapter initialized');
  }

  static getInstance(): HFAnalysisAdapter {
    if (!HFAnalysisAdapter.instance) {
      HFAnalysisAdapter.instance = new HFAnalysisAdapter();
    }
    return HFAnalysisAdapter.instance;
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
   * Run sentiment analysis on text
   */
  async analyzeSentiment(text: string): Promise<AdapterResponse<HFSentimentResult>> {
    const endpoint = '/api/hf/run-sentiment';

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    if (!text || text.trim().length === 0) {
      return this.createError(endpoint, 'Text is required for sentiment analysis', 400, 'INVALID_INPUT');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.runHfSentiment(text);
      });

      if (HFDataEngineClient.isError(result)) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(endpoint, result.message, result.status, 'HF_ENGINE_ERROR');
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * SMC (Smart Money Concepts) Analysis
   * Note: This is typically done locally with technical indicators,
   * but we provide a placeholder that returns NOT_IMPLEMENTED
   */
  async analyzeSMC(symbol: string, timeframe: string): Promise<AdapterResponse<any>> {
    const endpoint = '/analysis/smc';

    return this.createError(
      endpoint,
      'SMC analysis via HuggingFace is not implemented. Use local technical analysis services.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Elliott Wave Analysis
   * Note: This is typically done locally with pattern recognition,
   * but we provide a placeholder that returns NOT_IMPLEMENTED
   */
  async analyzeElliott(symbol: string, timeframe: string): Promise<AdapterResponse<any>> {
    const endpoint = '/analysis/elliott';

    return this.createError(
      endpoint,
      'Elliott Wave analysis via HuggingFace is not implemented. Use local technical analysis services.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Get HuggingFace model registry (for debugging/diagnostics)
   */
  async getHfRegistry(): Promise<AdapterResponse<any>> {
    const endpoint = '/api/hf/registry';

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.getHfRegistry();
      });

      if (HFDataEngineClient.isError(result)) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(endpoint, result.message, result.status, 'HF_ENGINE_ERROR');
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }
}

// Export singleton instance
export const hfAnalysisAdapter = HFAnalysisAdapter.getInstance();
