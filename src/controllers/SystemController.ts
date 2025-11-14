// src/controllers/SystemController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { Database } from '../data/Database.js';
import { RedisService } from '../services/RedisService.js';
import { MultiProviderMarketDataService } from '../services/MultiProviderMarketDataService.js';
import { BinanceService } from '../services/BinanceService.js';
import { AdvancedCache } from '../core/AdvancedCache.js';
import { hfDataEngineAdapter } from '../services/HFDataEngineAdapter.js';
import { getPrimarySource } from '../config/dataSource.js';

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

      // Check individual providers (don't let one failure crash the whole endpoint)
      const providerStatuses: Record<string, 'up' | 'degraded' | 'down'> = {};

      // Get primary data source
      const primarySource = getPrimarySource();

      // Check HuggingFace Data Engine if it's the primary source or mixed mode
      if (primarySource === 'huggingface' || primarySource === 'mixed') {
        try {
          const hfHealth = await hfDataEngineAdapter.getHealthSummary();
          if (hfHealth.success && hfHealth.data) {
            providerStatuses.hf_engine = hfHealth.data.engine === 'up' ? 'up' : 'degraded';

            // Add individual HF provider statuses if available
            if (hfHealth.data.providers) {
              for (const provider of hfHealth.data.providers) {
                const key = `hf_${provider.name.toLowerCase()}`;
                providerStatuses[key] = provider.enabled && provider.status === 'healthy' ? 'up' : 'degraded';
              }
            }
          } else {
            providerStatuses.hf_engine = 'down';
          }
        } catch (error: any) {
          this.logger.warn('HF Data Engine health check failed', {}, error);
          providerStatuses.hf_engine = 'down';
        }
      }

      // Check Binance if needed (for binance or mixed mode)
      if (primarySource === 'binance' || primarySource === 'mixed') {
        try {
          await this.binanceService.getPrices(['BTCUSDT'], 2000);
          providerStatuses.binance = 'up';
        } catch (error: any) {
          this.logger.warn('Binance health check failed', {}, error);
          providerStatuses.binance = 'down';
        }
      }

      // Check KuCoin if needed (for kucoin or mixed mode)
      if (primarySource === 'kucoin' || primarySource === 'mixed') {
        try {
          const { KuCoinService } = await import('../services/KuCoinService.js');
          const kucoinService = KuCoinService.getInstance();
          await kucoinService.getAccountInfo();
          providerStatuses.kucoin_sandbox = 'up';
        } catch (error: any) {
          // KuCoin sandbox is often down (ENOTFOUND api-sandbox.kucoin.com)
          // Mark as degraded instead of crashing
          const message = error.message || String(error);
          if (message.includes('ENOTFOUND') || message.includes('api-sandbox.kucoin.com')) {
            this.logger.debug('KuCoin sandbox is unreachable (expected in dev)');
            providerStatuses.kucoin_sandbox = 'down';
          } else {
            providerStatuses.kucoin_sandbox = 'degraded';
          }
        }
      }

      // Overall backend status: "up" if core services (db, redis) are ok
      // Individual provider failures don't affect backend status
      const backendStatus = dbStatus ? 'up' : 'degraded';

      const health = {
        ok: true,
        timestamp: Date.now(),
        primaryDataSource: primarySource,
        services: {
          backend: backendStatus,
          database: dbStatus ? 'up' : 'down',
          redis: redisStatus.isConnected ? 'up' : 'down',
          ...providerStatuses
        },
        uptime: process.uptime()
      };

      res.json(health);
    } catch (error) {
      this.logger.error('Health check failed', {}, error as Error);
      // Even on error, return valid JSON (not 500)
      res.json({
        ok: false,
        timestamp: Date.now(),
        services: {
          backend: 'down',
          database: 'unknown',
          redis: 'unknown'
        },
        error: (error as Error).message
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

