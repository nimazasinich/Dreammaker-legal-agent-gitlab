/**
 * Unified Data Source Controller
 * 
 * API controller for unified data source management
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { unifiedDataSourceManager } from '../services/UnifiedDataSourceManager.js';

const logger = Logger.getInstance();

export class UnifiedDataSourceController {
  /**
   * GET /api/unified-data/config
   * Get current configuration
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        mode: unifiedDataSourceManager.getMode(),
        cacheStats: unifiedDataSourceManager.getCacheStats(),
        metrics: unifiedDataSourceManager.getMetrics()
      };

      res.json({
        success: true,
        data: config,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to get config', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/unified-data/config
   * Update configuration
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { mode } = req.body;

      if (mode && ['direct', 'huggingface', 'mixed'].includes(mode)) {
        unifiedDataSourceManager.setMode(mode);
      }

      res.json({
        success: true,
        data: {
          mode: unifiedDataSourceManager.getMode()
        },
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to update config', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/unified-data/market/:symbol
   * Fetch market data
   */
  async getMarketData(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const {
        timeframe = '1h',
        limit = 100,
        timeout = 5000,
        fallbackEnabled = true,
        cacheEnabled = true
      } = req.query;

      const result = await unifiedDataSourceManager.fetchMarketData(
        {
          symbol,
          timeframe: timeframe as string,
          limit: Number(limit)
        },
        {
          timeout: Number(timeout),
          fallbackEnabled: fallbackEnabled === 'true',
          cacheEnabled: cacheEnabled === 'true'
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          fromCache: result.fromCache,
          fallbackUsed: result.fallbackUsed,
          latency: result.latency,
          timestamp: result.timestamp
        });
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      logger.error('Failed to fetch market data', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/unified-data/sentiment
   * Fetch sentiment analysis
   */
  async getSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, text } = req.body;
      const {
        timeout = 15000,
        fallbackEnabled = true,
        cacheEnabled = true
      } = req.query;

      const result = await unifiedDataSourceManager.fetchSentiment(
        { symbol, text },
        {
          timeout: Number(timeout),
          fallbackEnabled: fallbackEnabled === 'true',
          cacheEnabled: cacheEnabled === 'true'
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          fromCache: result.fromCache,
          fallbackUsed: result.fallbackUsed,
          latency: result.latency,
          timestamp: result.timestamp
        });
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      logger.error('Failed to fetch sentiment', { body: req.body }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/unified-data/prediction
   * Fetch price prediction
   */
  async getPrediction(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframes = ['1h', '24h', '7d'] } = req.body;
      const {
        timeout = 15000,
        cacheEnabled = true
      } = req.query;

      const result = await unifiedDataSourceManager.fetchPricePrediction(
        { symbol, timeframes },
        {
          timeout: Number(timeout),
          cacheEnabled: cacheEnabled === 'true'
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          fromCache: result.fromCache,
          latency: result.latency,
          timestamp: result.timestamp
        });
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      logger.error('Failed to fetch prediction', { body: req.body }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/unified-data/metrics
   * Get performance metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = unifiedDataSourceManager.getMetrics();

      res.json({
        success: true,
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to get metrics', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/unified-data/report
   * Generate system report
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const report = unifiedDataSourceManager.generateReport();

      res.json({
        success: true,
        data: report,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to generate report', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate report',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/unified-data/health
   * Check health of all data sources
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await unifiedDataSourceManager.checkHealth();

      res.json({
        success: true,
        data: health,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to check health', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to check health',
        timestamp: new Date()
      });
    }
  }

  /**
   * DELETE /api/unified-data/cache
   * Clear cache
   */
  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      unifiedDataSourceManager.clearCache();

      res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to clear cache', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        timestamp: new Date()
      });
    }
  }

  /**
   * POST /api/unified-data/metrics/reset
   * Reset metrics
   */
  async resetMetrics(req: Request, res: Response): Promise<void> {
    try {
      unifiedDataSourceManager.resetMetrics();

      res.json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to reset metrics', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset metrics',
        timestamp: new Date()
      });
    }
  }

  /**
   * GET /api/unified-data/stored
   * Query stored data
   */
  async getStoredData(req: Request, res: Response): Promise<void> {
    try {
      const {
        symbol,
        source,
        dataType,
        limit = 100
      } = req.query;

      const results = unifiedDataSourceManager.queryStoredData({
        symbol: symbol as string,
        source: source as any,
        dataType: dataType as string,
        limit: Number(limit)
      });

      res.json({
        success: true,
        data: results,
        count: results.length,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to query stored data', { query: req.query }, error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to query stored data',
        timestamp: new Date()
      });
    }
  }
}

// Export singleton instance
export const unifiedDataSourceController = new UnifiedDataSourceController();
