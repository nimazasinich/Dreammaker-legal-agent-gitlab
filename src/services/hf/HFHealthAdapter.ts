/**
 * HuggingFace Health Adapter
 *
 * Handles health check and status routes
 */

import { Logger } from '../../core/Logger.js';
import { HFDataEngineClient, HFHealthResponse, HFProvider } from '../HFDataEngineClient.js';
import { getPrimarySource, isHuggingFaceEnabled } from '../../config/dataSource.js';
import { providerLatencyTracker } from '../../core/providerLatencyTracker.js';
import { providerRecoveryTracker } from '../../core/providerRecoveryTracker.js';
import { providerErrorLog } from '../../core/providerErrorLog.js';
import type { AdapterErrorResponse, AdapterSuccessResponse, AdapterResponse } from './HFMarketAdapter.js';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  backend: {
    status: string;
    uptime: number;
  };
  dataEngine: {
    status: string;
    available: boolean;
    uptime?: number;
    version?: string;
  };
  providers?: HFProvider[];
  primarySource: string;
  timestamp: string;
}

/**
 * HuggingFace Health Adapter
 */
export class HFHealthAdapter {
  private static instance: HFHealthAdapter;
  private logger = Logger.getInstance();
  private hfClient: HFDataEngineClient;
  private backendStartTime: number;

  private constructor() {
    this.hfClient = HFDataEngineClient.getInstance();
    this.backendStartTime = Date.now();
    this.logger.info('HF Health Adapter initialized');
  }

  static getInstance(): HFHealthAdapter {
    if (!HFHealthAdapter.instance) {
      HFHealthAdapter.instance = new HFHealthAdapter();
    }
    return HFHealthAdapter.instance;
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
   * Get comprehensive system health
   */
  async getSystemHealth(): Promise<AdapterResponse<SystemHealth>> {
    const endpoint = '/status/health';
    const hfEnabled = isHuggingFaceEnabled();
    const primarySource = getPrimarySource();

    try {
      let engineHealth: HFHealthResponse | null = null;
      let providers: HFProvider[] | null = null;
      let dataEngineAvailable = false;

      // Only check HF health if it's enabled
      if (hfEnabled) {
        try {
          const healthResult = await providerLatencyTracker.measure('huggingface', async () => {
            return await this.hfClient.getHealth();
          });

          if (!HFDataEngineClient.isError(healthResult)) {
            engineHealth = healthResult;
            dataEngineAvailable = true;
            providerRecoveryTracker.recordSuccess('huggingface');

            // Also get providers
            const providersResult = await this.hfClient.getProviders();
            if (!HFDataEngineClient.isError(providersResult)) {
              providers = providersResult;
            }
          } else {
            providerRecoveryTracker.recordFailure('huggingface');
            this.logger.warn('HF Data Engine health check failed', { error: healthResult.message });
          }
        } catch (error: any) {
          providerRecoveryTracker.recordFailure('huggingface');
          this.logger.error('Failed to check HF Data Engine health', {}, error);
        }
      }

      // Determine overall system status
      let systemStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (primarySource === 'huggingface' && !dataEngineAvailable) {
        systemStatus = 'unhealthy';
      } else if (primarySource === 'mixed' && !dataEngineAvailable) {
        systemStatus = 'degraded';
      }

      const backendUptime = Math.floor((Date.now() - this.backendStartTime) / 1000);

      const health: SystemHealth = {
        status: systemStatus,
        backend: {
          status: 'up',
          uptime: backendUptime
        },
        dataEngine: {
          status: engineHealth?.status || 'unknown',
          available: dataEngineAvailable,
          uptime: engineHealth?.uptime,
          version: engineHealth?.version
        },
        providers: providers || undefined,
        primarySource,
        timestamp: new Date().toISOString()
      };

      return this.createSuccess(health);
    } catch (error: any) {
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get HF engine health only
   */
  async getHfHealth(): Promise<AdapterResponse<HFHealthResponse>> {
    const endpoint = '/api/hf-engine/health';

    if (!isHuggingFaceEnabled()) {
      return this.createError(endpoint, 'HuggingFace is not enabled', 400, 'NOT_ENABLED');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.getHealth();
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
   * Test connection to HF Data Engine
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.hfClient.testConnection();
      if (result) {
        providerRecoveryTracker.recordSuccess('huggingface');
      } else {
        providerRecoveryTracker.recordFailure('huggingface');
      }
      return result;
    } catch (error) {
      providerRecoveryTracker.recordFailure('huggingface');
      return false;
    }
  }
}

// Export singleton instance
export const hfHealthAdapter = HFHealthAdapter.getInstance();
