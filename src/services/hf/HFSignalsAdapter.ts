/**
 * HuggingFace Signals Adapter
 *
 * Handles trading signal routes
 * Note: Signals are typically generated locally using technical analysis,
 * but this adapter provides integration points for HF-based signals
 */

import { Logger } from '../../core/Logger.js';
import { HFDataEngineClient } from '../HFDataEngineClient.js';
import { getPrimarySource } from '../../config/dataSource.js';
import { providerLatencyTracker } from '../../core/providerLatencyTracker.js';
import { providerRecoveryTracker } from '../../core/providerRecoveryTracker.js';
import { providerErrorLog } from '../../core/providerErrorLog.js';
import type { AdapterErrorResponse, AdapterSuccessResponse, AdapterResponse } from './HFMarketAdapter.js';

/**
 * HuggingFace Signals Adapter
 */
export class HFSignalsAdapter {
  private static instance: HFSignalsAdapter;
  private logger = Logger.getInstance();
  private hfClient: HFDataEngineClient;

  private constructor() {
    this.hfClient = HFDataEngineClient.getInstance();
    this.logger.info('HF Signals Adapter initialized');
  }

  static getInstance(): HFSignalsAdapter {
    if (!HFSignalsAdapter.instance) {
      HFSignalsAdapter.instance = new HFSignalsAdapter();
    }
    return HFSignalsAdapter.instance;
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
   * Get signal history
   * Note: Signals are typically stored locally, not in HF
   */
  async getSignalHistory(
    symbol?: string,
    limit: number = 100
  ): Promise<AdapterResponse<any[]>> {
    const endpoint = '/signals/history';

    return this.createError(
      endpoint,
      'Signal history via HuggingFace is not implemented. Signals are stored locally.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Get signals for a specific symbol
   * Note: Signals are typically generated locally using technical analysis
   */
  async getSignalsForSymbol(symbol: string): Promise<AdapterResponse<any>> {
    const endpoint = `/signals/${symbol}`;

    return this.createError(
      endpoint,
      'Signal generation via HuggingFace is not implemented. Use local signal generation services.',
      501,
      'NOT_IMPLEMENTED'
    );
  }

  /**
   * Analyze symbol and generate signals
   * Note: This would require implementing ML-based signal generation in HF
   */
  async analyzeAndGenerateSignals(
    symbol: string,
    timeframe: string = '1h'
  ): Promise<AdapterResponse<any>> {
    const endpoint = '/api/signals/analyze';

    return this.createError(
      endpoint,
      'ML-based signal generation via HuggingFace is not yet implemented.',
      501,
      'NOT_IMPLEMENTED'
    );
  }
}

// Export singleton instance
export const hfSignalsAdapter = HFSignalsAdapter.getInstance();
