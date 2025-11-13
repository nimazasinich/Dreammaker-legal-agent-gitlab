// src/controllers/SystemController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { Database } from '../data/Database.js';
import { RedisService } from '../services/RedisService.js';
import { MultiProviderMarketDataService } from '../services/MultiProviderMarketDataService.js';
import { BinanceService } from '../services/BinanceService.js';
import { AdvancedCache } from '../core/AdvancedCache.js';

export class SystemController {
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private database = Database.getInstance();
  private redisService = RedisService.getInstance();
  private multiProviderService = MultiProviderMarketDataService.getInstance();
  private binanceService = BinanceService.getInstance(); // Fallback only
  private cache = AdvancedCache.getInstance();

  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const redisStatus = await this.redisService.getConnectionStatus();
      const dbStatus = await this.database.getHealth();

      const health = {
        status: 'healthy',
        timestamp: Date.now(),
        services: {
          database: {
            status: dbStatus ? 'connected' : 'disconnected',
            ...dbStatus
          },
          redis: {
            status: redisStatus.isConnected ? 'connected' : 'disconnected',
            reconnectAttempts: redisStatus.reconnectAttempts
          },
          marketData: {
            status: this.config.isRealDataMode() ? 'multi-provider' : 'binance',
            primarySource: this.config.getExchangeConfig().primarySource || 'coingecko'
          }
        },
        uptime: process.uptime()
      };

      res.json(health);
    } catch (error) {
      this.logger.error('Health check failed', {}, error as Error);
      res.status(500).json({
        status: 'unhealthy',
        error: (error as Error).message,
        timestamp: Date.now()
      });
    }
  }

  async getSystemStatus(req: Request, res: Response): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const status = {
        timestamp: Date.now(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime()
        },
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        config: {
          realDataMode: this.config.isRealDataMode(),
          tradingEnabled: this.config.getExchangeConfig().tradingEnabled
        }
      };

      res.json(status);
    } catch (error) {
      this.logger.error('Failed to get system status', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get system status',
        message: (error as Error).message
      });
    }
  }

  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const cacheStats = this.cache.getStats();
      const redisStats = await this.redisService.getStats();

      res.json({
        success: true,
        cache: cacheStats,
        redis: redisStats,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get cache stats', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get cache stats',
        message: (error as Error).message
      });
    }
  }

  async clearCache(req: Request, res: Response): Promise<void> {
    try {
      await this.cache.clear();

      res.json({
        success: true,
        message: 'Cache cleared',
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to clear cache', {}, error as Error);
      res.status(500).json({
        error: 'Failed to clear cache',
        message: (error as Error).message
      });
    }
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const config = {
        realDataMode: this.config.isRealDataMode(),
        demoMode: this.config.isDemoMode(),
        exchange: this.config.getExchangeConfig(),
        marketData: this.config.getMarketDataConfig(),
        timestamp: Date.now()
      };

      res.json({
        success: true,
        config,
        timestamp: Date.now()
      });
    } catch (error) {
      this.logger.error('Failed to get config', {}, error as Error);
      res.status(500).json({
        error: 'Failed to get config',
        message: (error as Error).message
      });
    }
  }
}

