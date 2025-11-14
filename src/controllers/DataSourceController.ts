/**
 * Data Source Controller
 *
 * Handles API requests for managing data source configuration.
 * Allows frontend to query and (optionally) change the active data source.
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import {
  getDataSourceConfig,
  getPrimarySource,
  setPrimarySource,
  DataSourceType
} from '../config/dataSource.js';
import { sendStructuredError } from '../utils/errorResponse.js';

export class DataSourceController {
  private static instance: DataSourceController;
  private logger = Logger.getInstance();

  private constructor() {
    this.logger.info('DataSource Controller initialized');
  }

  static getInstance(): DataSourceController {
    if (!DataSourceController.instance) {
      DataSourceController.instance = new DataSourceController();
    }
    return DataSourceController.instance;
  }

  /**
   * GET /api/config/data-source
   * Returns current data source configuration
   */
  getDataSourceConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = getDataSourceConfig();

      res.json({
        ok: true,
        primarySource: config.primarySource,
        availableSources: ['huggingface', 'binance', 'kucoin', 'mixed'] as DataSourceType[],
        huggingface: {
          enabled: config.huggingface.enabled,
          baseUrl: config.huggingface.baseUrl,
          timeout: config.huggingface.timeout
        },
        exchanges: {
          binance: {
            enabled: config.exchanges.binance.enabled
          },
          kucoin: {
            enabled: config.exchanges.kucoin.enabled
          }
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to get data source config', {}, error as Error);
      sendStructuredError(
        res,
        500,
        'internal',
        'UNKNOWN_ERROR',
        'Failed to retrieve data source configuration',
        {},
        error
      );
    }
  };

  /**
   * POST /api/config/data-source
   * Updates the primary data source (runtime override)
   *
   * Body: { primarySource: 'huggingface' | 'binance' | 'kucoin' | 'mixed' }
   */
  setDataSourceConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const { primarySource } = req.body;

      // Validate input
      if (!primarySource) {
        sendStructuredError(
          res,
          400,
          'internal',
          'DATA_INVALID',
          'Missing required field: primarySource',
          { received: req.body }
        );
        return;
      }

      const validSources: DataSourceType[] = ['huggingface', 'binance', 'kucoin', 'mixed'];
      if (!validSources.includes(primarySource)) {
        sendStructuredError(
          res,
          400,
          'internal',
          'DATA_INVALID',
          `Invalid primarySource. Must be one of: ${validSources.join(', ')}`,
          {
            received: primarySource,
            valid: validSources
          }
        );
        return;
      }

      // For Phase 2, we only fully support HuggingFace and mixed mode
      // Binance and KuCoin will return NOT_IMPLEMENTED errors when used
      if (primarySource === 'binance' || primarySource === 'kucoin') {
        this.logger.warn(`Setting primary source to ${primarySource}, but only HuggingFace is fully implemented`, {
          requestedSource: primarySource
        });
      }

      // Set the primary source (runtime override)
      setPrimarySource(primarySource);

      this.logger.info('Primary data source updated', {
        newSource: primarySource,
        previousSource: getPrimarySource()
      });

      res.json({
        ok: true,
        message: 'Primary data source updated successfully',
        primarySource,
        note: (primarySource === 'binance' || primarySource === 'kucoin')
          ? 'Only HuggingFace is fully implemented. Other sources may return NOT_IMPLEMENTED errors.'
          : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Failed to set data source config', {}, error as Error);
      sendStructuredError(
        res,
        500,
        'internal',
        'UNKNOWN_ERROR',
        'Failed to update data source configuration',
        {},
        error
      );
    }
  };
}

// Export singleton instance
export const dataSourceController = DataSourceController.getInstance();
