/**
 * DataSourceController
 * 
 * REST API controller for the Unified Data Source Manager
 * Provides endpoints for data fetching, health monitoring, and configuration
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { unifiedDataSourceManager, DataSourceMode } from '../services/UnifiedDataSourceManager.js';

export class DataSourceController {
  private logger = Logger.getInstance();

  /**
   * GET /api/data-sources/market
   * Fetch market data with fallback support
   */
  async getMarketData(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, timeframe, limit, mode, timeout } = req.query;

      if (!symbol || typeof symbol !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Symbol is required'
        });
        return;
      }

      const result = await unifiedDataSourceManager.fetchMarketData(
        {
          symbol,
          timeframe: timeframe as string,
          limit: limit ? parseInt(limit as string) : undefined
        },
        {
          mode: mode as DataSourceMode,
          timeout: timeout ? parseInt(timeout as string) : undefined
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          sourceType: result.sourceType,
          fromCache: result.fromCache,
          fallbackUsed: result.fallbackUsed,
          responseTime: result.responseTime,
          timestamp: result.timestamp
        });
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          source: result.source,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      this.logger.error('Failed to fetch market data', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/sentiment
   * Fetch sentiment data with fallback support
   */
  async getSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, keyword, mode, timeout } = req.query;

      const result = await unifiedDataSourceManager.fetchSentiment(
        {
          symbol: symbol as string,
          keyword: keyword as string
        },
        {
          mode: mode as DataSourceMode,
          timeout: timeout ? parseInt(timeout as string) : undefined
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          sourceType: result.sourceType,
          fromCache: result.fromCache,
          fallbackUsed: result.fallbackUsed,
          responseTime: result.responseTime,
          timestamp: result.timestamp
        });
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          source: result.source,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      this.logger.error('Failed to fetch sentiment', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/news
   * Fetch news data with fallback support
   */
  async getNews(req: Request, res: Response): Promise<void> {
    try {
      const { limit, keyword, source, mode, timeout } = req.query;

      const result = await unifiedDataSourceManager.fetchNews(
        {
          limit: limit ? parseInt(limit as string) : undefined,
          keyword: keyword as string,
          source: source as string
        },
        {
          mode: mode as DataSourceMode,
          timeout: timeout ? parseInt(timeout as string) : undefined
        }
      );

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
          sourceType: result.sourceType,
          fromCache: result.fromCache,
          fallbackUsed: result.fallbackUsed,
          responseTime: result.responseTime,
          timestamp: result.timestamp
        });
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          source: result.source,
          timestamp: result.timestamp
        });
      }
    } catch (error) {
      this.logger.error('Failed to fetch news', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/huggingface/extended
   * Fetch extended HuggingFace data (price, sentiment, prediction)
   */
  async getHuggingFaceExtended(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.query;

      if (!symbol || typeof symbol !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Symbol is required'
        });
        return;
      }

      const result = await unifiedDataSourceManager.fetchHuggingFaceExtended(symbol);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          source: result.source,
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
      this.logger.error('Failed to fetch HuggingFace extended data', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/health
   * Get health status of all data sources
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const { source } = req.query;

      const health = unifiedDataSourceManager.getSourceHealth(
        source as string | undefined
      );

      res.json({
        success: true,
        health,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get source health', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/stats
   * Get statistics and metrics for data sources
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = unifiedDataSourceManager.getStats();

      res.json({
        success: true,
        stats,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get stats', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * POST /api/data-sources/mode
   * Set data source mode (direct, huggingface, mixed)
   */
  async setMode(req: Request, res: Response): Promise<void> {
    try {
      const { mode } = req.body;

      if (!mode || !['direct', 'huggingface', 'mixed'].includes(mode)) {
        res.status(400).json({
          success: false,
          error: 'Invalid mode. Must be: direct, huggingface, or mixed'
        });
        return;
      }

      unifiedDataSourceManager.setMode(mode as DataSourceMode);

      res.json({
        success: true,
        mode,
        message: `Data source mode set to ${mode}`,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to set mode', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/mode
   * Get current data source mode
   */
  async getMode(req: Request, res: Response): Promise<void> {
    try {
      const mode = unifiedDataSourceManager.getMode();

      res.json({
        success: true,
        mode,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get mode', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * POST /api/data-sources/:sourceName/disable
   * Disable a specific data source
   */
  async disableSource(req: Request, res: Response): Promise<void> {
    try {
      const { sourceName } = req.params;
      const { durationMs } = req.body;

      unifiedDataSourceManager.disableSource(
        sourceName,
        durationMs ? parseInt(durationMs) : undefined
      );

      res.json({
        success: true,
        message: `Source ${sourceName} disabled`,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to disable source', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * POST /api/data-sources/:sourceName/enable
   * Enable a specific data source
   */
  async enableSource(req: Request, res: Response): Promise<void> {
    try {
      const { sourceName } = req.params;

      unifiedDataSourceManager.enableSource(sourceName);

      res.json({
        success: true,
        message: `Source ${sourceName} enabled`,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to enable source', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/data-sources/test
   * Test data source system with all modes
   */
  async testDataSources(req: Request, res: Response): Promise<void> {
    try {
      const testSymbol = 'BTC';

      // Test all modes
      const [directResult, hfResult, mixedResult] = await Promise.allSettled([
        unifiedDataSourceManager.fetchMarketData(
          { symbol: testSymbol },
          { mode: 'direct', timeout: 5000 }
        ),
        unifiedDataSourceManager.fetchMarketData(
          { symbol: testSymbol },
          { mode: 'huggingface', timeout: 5000 }
        ),
        unifiedDataSourceManager.fetchMarketData(
          { symbol: testSymbol },
          { mode: 'mixed', timeout: 5000 }
        )
      ]);

      const results = {
        direct: directResult.status === 'fulfilled' ? directResult.value : { success: false, error: 'Failed' },
        huggingface: hfResult.status === 'fulfilled' ? hfResult.value : { success: false, error: 'Failed' },
        mixed: mixedResult.status === 'fulfilled' ? mixedResult.value : { success: false, error: 'Failed' }
      };

      const stats = unifiedDataSourceManager.getStats();

      res.json({
        success: true,
        test: {
          symbol: testSymbol,
          results,
          stats
        },
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to test data sources', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }
}
