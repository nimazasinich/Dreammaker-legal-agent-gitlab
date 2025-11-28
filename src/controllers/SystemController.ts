// src/controllers/SystemController.ts
import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { Database } from '../data/Database.js';
import { RedisService } from '../services/RedisService.js';
import { MultiProviderMarketDataService } from '../services/MultiProviderMarketDataService.js';
// NOTE: BinanceService is REMOVED - using MixedModeDataService instead
// import { BinanceService } from '../services/BinanceService.js';
import { mixedModeDataService } from '../services/MixedModeDataService.js';
import { AdvancedCache } from '../core/AdvancedCache.js';
import { hfDataEngineAdapter } from '../services/HFDataEngineAdapter.js';
import { getPrimarySource, isMixedMode } from '../config/dataSource.js';

export class SystemController {
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private database = Database.getInstance();
  private redisService = RedisService.getInstance();
  private multiProviderService = MultiProviderMarketDataService.getInstance();
  // NOTE: BinanceService REMOVED - using MixedModeDataService
  // private binanceService = BinanceService.getInstance();
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

      // Check MixedModeDataService fallback sources (in mixed mode)
      // NOTE: Binance and KuCoin are REMOVED - using CoinGecko, CryptoCompare, etc.
      if (isMixedMode()) {
        try {
          const mixedModeStats = mixedModeDataService.getStats();
          const sourceHealth = mixedModeDataService.getSourceHealthStatus();
          
          // Add status for each fallback source
          for (const health of sourceHealth) {
            if (health.name !== 'huggingface') {
              providerStatuses[health.name] = health.isHealthy ? 'up' : (health.isDisabled ? 'down' : 'degraded');
            }
          }
          
          // Overall fallback status
          const healthySources = sourceHealth.filter(s => s.isHealthy).length;
          providerStatuses.fallback_sources = healthySources > 0 ? 'up' : 'down';
        } catch (error: any) {
          this.logger.warn('MixedMode fallback health check failed', {}, error);
          providerStatuses.fallback_sources = 'degraded';
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
      this.logger.error('HEALTH_CHECK_ERROR', { error: (error as Error).message }, error as Error);
      // FIXED: Never return 'unknown' - always return a known state
      res.json({
        ok: false,
        timestamp: Date.now(),
        services: {
          backend: 'down',
          database: 'down', // Changed from 'unknown' to 'down'
          redis: 'down' // Changed from 'unknown' to 'down'
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

  /**
   * Check KuCoin health with retry logic, exponential backoff, and caching
   * @deprecated KuCoin is REMOVED in Mixed Mode architecture. 
   * This method is kept for backward compatibility but always returns 'down'.
   */
  private async checkKuCoinHealthWithRetry(): Promise<'up' | 'degraded' | 'down'> {
    // KuCoin is DISABLED in Mixed Mode - always return 'down'
    this.logger.debug('KUCOIN_DISABLED', { 
      reason: 'KuCoin is removed in Mixed Mode architecture. Using HuggingFace + fallback sources instead.' 
    });
    return 'down';
  }
}

