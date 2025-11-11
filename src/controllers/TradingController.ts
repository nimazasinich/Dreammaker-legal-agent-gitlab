// src/controllers/TradingController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { RealTradingService } from '../services/RealTradingService.js';
import { OrderManagementService } from '../services/OrderManagementService.js';
import { ConfigManager } from '../core/ConfigManager.js';

export class TradingController {
  private logger = Logger.getInstance();
  private realTradingService: RealTradingService;
  private orderManagement: OrderManagementService;
  private config = ConfigManager.getInstance();

  constructor() {
    this.realTradingService = new RealTradingService();
    this.orderManagement = OrderManagementService.getInstance();
  }

  async analyzeMarket(req: Request, res: Response): Promise<void> {
    try {
      const { symbol } = req.params;
      const cleanSymbol = symbol.replace('USDT', '').toUpperCase();

      if (!this.config.isRealDataMode()) {
        res.status(400).json({
          error: 'Real data mode is not enabled',
          message: 'Enable realDataMode in config to use this endpoint'
        });
        return;
      }

      const analysis = await this.realTradingService.analyzeMarket(cleanSymbol);

      res.json({
        success: true,
        analysis,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to analyze market', { symbol: req.params.symbol }, error as Error);
      res.status(500).json({
        error: 'Failed to analyze market',
        message: (error as Error).message
      });
    }
  }

  async getPortfolio(req: Request, res: Response): Promise<void> {
    try {
      const portfolio = await this.realTradingService.getPortfolioAnalysis();

      res.json({
        success: true,
        portfolio,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get portfolio', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get portfolio',
        message: (error as Error).message
      });
    }
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const { symbol, side, quantity, price, orderType = 'LIMIT' } = req.body;

      if (!symbol || !side || !quantity) {
        res.status(400).json({
          error: 'Missing required fields: symbol, side, quantity'
        });
        return;
      }

      const order = await this.orderManagement.createOrder({
        symbol: symbol.toUpperCase(),
        side: side.toUpperCase(),
        quantity: parseFloat(quantity),
        price: price ? parseFloat(price) : undefined,
        type: orderType
      });

      res.json({
        success: true,
        order,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to create order', { body: req.body }, error as Error);
      res.status(500).json({
        error: 'Failed to create order',
        message: (error as Error).message
      });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { status, symbol } = req.query;
      const orders = await this.orderManagement.getOrders({
        status: status as string,
        symbol: symbol as string
      });

      res.json({
        success: true,
        orders,
        count: orders.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get orders', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get orders',
        message: (error as Error).message
      });
    }
  }

  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      const positions = await this.orderManagement.getPositions();

      res.json({
        success: true,
        positions,
        count: positions.length,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get positions', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get positions',
        message: (error as Error).message
      });
    }
  }

  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await this.orderManagement.cancelOrder(id);

      res.json({
        success: true,
        message: 'Order cancelled',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to cancel order', { id: req.params.id }, error as Error);
      res.status(500).json({
        error: 'Failed to cancel order',
        message: (error as Error).message
      });
    }
  }
}

