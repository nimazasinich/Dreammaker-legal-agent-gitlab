/**
 * HuggingFace Data Engine Controller
 *
 * Express route handlers for HuggingFace Data Engine endpoints.
 * This controller integrates HF Data Engine with the existing backend architecture.
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { hfDataEngineAdapter } from '../services/HFDataEngineAdapter.js';

export class HFDataEngineController {
  private static instance: HFDataEngineController;
  private logger = Logger.getInstance();

  private constructor() {
    this.logger.info('HF Data Engine Controller initialized');
  }

  static getInstance(): HFDataEngineController {
    if (!HFDataEngineController.instance) {
      HFDataEngineController.instance = new HFDataEngineController();
    }
    return HFDataEngineController.instance;
  }

  /**
   * GET /api/hf-engine/health
   * Get system health status from HF Data Engine
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getSystemHealth();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(response.error?.code === 'HF_DISABLED' ? 503 : 500).json({
          error: response.error?.message || 'Failed to get health status',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getHealth', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/providers
   * Get list of available data providers
   */
  async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getProviders();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to get providers',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getProviders', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/prices
   * Get top cryptocurrency prices
   * Query params: limit (default: 50)
   */
  async getPrices(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const response = await hfDataEngineAdapter.getTopPrices(limit);

      if (response.success) {
        res.json({
          success: true,
          prices: response.data,
          timestamp: response.timestamp
        });
      } else {
        res.status(response.error?.code === 'HF_DISABLED' ? 503 : 500).json({
          success: false,
          error: response.error?.message || 'Failed to get prices',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getPrices', {}, error as Error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/market/overview
   * Get market overview statistics
   */
  async getMarketOverview(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getMarketOverview();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(response.error?.code === 'HF_DISABLED' ? 503 : 500).json({
          error: response.error?.message || 'Failed to get market overview',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getMarketOverview', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/categories
   * Get cryptocurrency categories
   */
  async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getCategories();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(response.error?.code === 'HF_DISABLED' ? 503 : 500).json({
          error: response.error?.message || 'Failed to get categories',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getCategories', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/rate-limits
   * Get rate limit information
   */
  async getRateLimits(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getRateLimits();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to get rate limits',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getRateLimits', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/logs
   * Get system logs
   * Query params: limit (default: 100)
   */
  async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const response = await hfDataEngineAdapter.getLogs(limit);

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to get logs',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getLogs', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/alerts
   * Get active alerts
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getAlerts();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to get alerts',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getAlerts', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/hf/health
   * Get HuggingFace integration health
   */
  async getHfHealth(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getHfHealth();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to get HF health',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getHfHealth', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * POST /api/hf-engine/hf/refresh
   * Refresh HuggingFace data
   */
  async refreshHfData(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.refreshHfData();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to refresh HF data',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in refreshHfData', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/hf/registry
   * Get HuggingFace model registry
   */
  async getHfRegistry(req: Request, res: Response): Promise<void> {
    try {
      const response = await hfDataEngineAdapter.getHfRegistry();

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to get HF registry',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in getHfRegistry', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * POST /api/hf-engine/hf/sentiment
   * Run sentiment analysis on text
   * Body: { text: string }
   */
  async runSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        res.status(400).json({
          error: 'Invalid request',
          message: 'Text parameter is required'
        });
        return;
      }

      const response = await hfDataEngineAdapter.runSentimentAnalysis(text);

      if (response.success) {
        res.json(response.data);
      } else {
        res.status(500).json({
          error: response.error?.message || 'Failed to run sentiment analysis',
          details: response.error?.details
        });
      }
    } catch (error) {
      this.logger.error('Error in runSentiment', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }

  /**
   * GET /api/hf-engine/status
   * Get data source configuration and status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = hfDataEngineAdapter.getDataSourceStatus();
      const canConnect = await hfDataEngineAdapter.testConnection();

      res.json({
        ...status,
        connected: canConnect,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.logger.error('Error in getStatus', {}, error as Error);
      res.status(500).json({
        error: 'Internal server error',
        message: (error as Error).message
      });
    }
  }
}

// Export singleton instance
export const hfDataEngineController = HFDataEngineController.getInstance();
