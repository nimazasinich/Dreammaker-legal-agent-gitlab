/**
 * Strategy Pipeline Service
 *
 * Frontend service for interacting with the Strategy Pipeline API
 * Handles data fetching and error handling for Strategy 1 → 2 → 3 execution
 */

import axios from 'axios';
import { Logger } from '../core/Logger';
import {
  StrategyPipelineResult,
  StrategyPipelineParams,
  StrategyPipelineResponse
} from '../types/strategyPipeline';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

export class StrategyPipelineService {
  private static instance: StrategyPipelineService;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): StrategyPipelineService {
    if (!StrategyPipelineService.instance) {
      StrategyPipelineService.instance = new StrategyPipelineService();
    }
    return StrategyPipelineService.instance;
  }

  /**
   * Run the complete Strategy 1 → 2 → 3 pipeline
   */
  async runPipeline(params?: StrategyPipelineParams): Promise<StrategyPipelineResult> {
    this.logger.info('Running strategy pipeline', { params });

    try {
      const response = await axios.post<StrategyPipelineResponse>(
        `${API_BASE_URL}/api/strategies/pipeline/run`,
        params || {},
        {
          timeout: 120000, // 2 minutes timeout (pipeline can take time)
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error || 'Pipeline execution failed');
      }

      this.logger.info('Strategy pipeline completed successfully', {
        s1Count: response.data.data.strategy1.symbols.length,
        s2Count: response.data.data.strategy2.symbols.length,
        s3Count: response.data.data.strategy3.symbols.length
      });

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || error.message;
        this.logger.error('Strategy pipeline API error', { message }, error);
        throw new Error(`Pipeline execution failed: ${message}`);
      }

      this.logger.error('Strategy pipeline error', {}, error as Error);
      throw error;
    }
  }

  /**
   * Run pipeline with default parameters
   * Uses top 20 symbols, standard timeframes, offline mode
   */
  async runDefaultPipeline(): Promise<StrategyPipelineResult> {
    return this.runPipeline({
      timeframes: ['15m', '1h', '4h'],
      limit: 20,
      mode: 'offline'
    });
  }

  /**
   * Run pipeline for specific symbols
   */
  async runPipelineForSymbols(symbols: string[]): Promise<StrategyPipelineResult> {
    return this.runPipeline({
      symbols,
      timeframes: ['15m', '1h', '4h'],
      mode: 'offline'
    });
  }

  /**
   * Get pipeline status / health check
   */
  async getStatus(): Promise<{
    status: string;
    adaptiveScoring: boolean;
    availableTimeframes: string[];
  }> {
    try {
      const response = await axios.get<{
        success: boolean;
        status: string;
        adaptiveScoring: boolean;
        availableTimeframes: string[];
      }>(`${API_BASE_URL}/api/strategies/pipeline/status`, {
        timeout: 10000
      });

      if (!response.data.success) {
        throw new Error('Failed to get pipeline status');
      }

      return {
        status: response.data.status,
        adaptiveScoring: response.data.adaptiveScoring,
        availableTimeframes: response.data.availableTimeframes
      };
    } catch (error) {
      this.logger.error('Failed to get pipeline status', {}, error as Error);
      throw error;
    }
  }
}

// Export singleton instance
export const strategyPipelineService = StrategyPipelineService.getInstance();
