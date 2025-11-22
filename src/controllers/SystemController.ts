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
  
  // Cache for KuCoin health status
  private kucoinHealthCache: { status: 'up' | 'degraded' | 'down', timestamp: number } | null = null;
  private readonly KUCOIN_HEALTH_CACHE_TTL = 60000; // 60 seconds

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
          const isConnected = await this.binanceService.testConnection();
          providerStatuses.binance = isConnected ? 'up' : 'down';
        } catch (error: any) {
          this.logger.warn('Binance health check failed', {}, error);
          providerStatuses.binance = 'down';
        }
      }

      // Check KuCoin if needed (for kucoin or mixed mode)
      if (primarySource === 'kucoin' || primarySource === 'mixed') {
        const kucoinStatus = await this.checkKuCoinHealthWithRetry();
        providerStatuses.kucoin = kucoinStatus;
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
   */
  private async checkKuCoinHealthWithRetry(): Promise<'up' | 'degraded' | 'down'> {
    // Check cache first
    if (this.kucoinHealthCache && 
        (Date.now() - this.kucoinHealthCache.timestamp) < this.KUCOIN_HEALTH_CACHE_TTL) {
      this.logger.debug('KUCOIN_HEALTH_CACHED', { status: this.kucoinHealthCache.status });
      return this.kucoinHealthCache.status;
    }

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Check if KuCoin API keys are configured
        const kucoinConfig = this.config.getKuCoinConfig();
        if (!kucoinConfig.apiKey || !kucoinConfig.secretKey) {
          this.logger.info('KUCOIN_DISABLED_BY_CONFIG', { 
            reason: 'API keys not configured' 
          });
          const status = 'down'; // Treat as disabled
          this.kucoinHealthCache = { status, timestamp: Date.now() };
          return status;
        }

        const { KuCoinService } = await import('../services/KuCoinService.js');
        const kucoinService = KuCoinService.getInstance();
        
        // Test connection with timeout
        const isConnected = await Promise.race([
          kucoinService.testConnection(),
          new Promise<boolean>((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT')), 5000)
          )
        ]);

        if (isConnected) {
          this.logger.info('KUCOIN_HEALTH_SUCCESS', { attempt: attempt + 1 });
          const status = 'up';
          this.kucoinHealthCache = { status, timestamp: Date.now() };
          return status;
        } else {
          throw new Error('Connection test failed');
        }
      } catch (error: any) {
        const message = error.message || String(error);
        
        // Determine error type
        if (message.includes('ENOTFOUND') || message.includes('api-sandbox.kucoin.com')) {
          this.logger.warn('KUCOIN_UNAVAILABLE', { 
            error: 'KuCoin API unreachable',
            attempt: attempt + 1,
            maxRetries 
          });
          
          // Last attempt - cache the result
          if (attempt === maxRetries - 1) {
            const status = 'down';
            this.kucoinHealthCache = { status, timestamp: Date.now() };
            return status;
          }
        } else if (message.includes('TIMEOUT')) {
          this.logger.warn('KUCOIN_TIMEOUT', { 
            error: 'KuCoin health check timeout',
            attempt: attempt + 1,
            maxRetries 
          });
          
          if (attempt === maxRetries - 1) {
            const status = 'degraded';
            this.kucoinHealthCache = { status, timestamp: Date.now() };
            return status;
          }
        } else {
          this.logger.error('KUCOIN_HEALTH_FAIL', { 
            error: message,
            attempt: attempt + 1,
            maxRetries 
          }, error);
          
          if (attempt === maxRetries - 1) {
            const status = 'degraded';
            this.kucoinHealthCache = { status, timestamp: Date.now() };
            return status;
          }
        }
        
        // Exponential backoff with jitter
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          const jitter = Math.random() * 500; // 0-500ms jitter
          const waitTime = delay + jitter;
          
          this.logger.debug('KUCOIN_RETRY_BACKOFF', { 
            attempt: attempt + 1,
            waitTime: Math.round(waitTime)
          });
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Fallback - should never reach here
    this.logger.error('KUCOIN_HEALTH_EXHAUSTED', { 
      error: 'All retry attempts failed' 
    });
    const status = 'down';
    this.kucoinHealthCache = { status, timestamp: Date.now() };
    return status;
  }
}

