import Redis from 'ioredis';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';
import { MarketData } from '../types/index.js';
import { DISABLE_REDIS } from '../config/flags.js';
import { logThrottled } from '../utils/logOnce.js';

export class RedisService {
  private static instance: RedisService;
  private redis: Redis | null = null;
  private subscriber: Redis | null = null;
  private publisher: Redis | null = null;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isRedisConfigured = false;
  private hasLoggedDisabled = false;

  private constructor() {}

  static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  async initialize(): Promise<void> {
    // No-op mode if Redis is disabled
    if (DISABLE_REDIS) {
      if (!this.hasLoggedDisabled) {
        this.logger.info('Redis disabled via DISABLE_REDIS flag');
        this.hasLoggedDisabled = true;
      }
      this.isConnected = false;
      this.isRedisConfigured = false;
      return;
    }

    try {
      const redisConfig = this.config.getRedisConfig();

      // Check if Redis is properly configured
      if (!redisConfig.host || redisConfig.host === 'localhost' && !redisConfig.password) {
        // Likely no Redis configured, fail fast and silent
        if (!this.hasLoggedDisabled) {
          this.logger.info('Redis not configured - continuing without caching');
          this.hasLoggedDisabled = true;
        }
        this.isConnected = false;
        this.isRedisConfigured = false;
        return;
      }

      this.isRedisConfigured = true;

      const connectionOptions = {
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 5000,
        commandTimeout: 3000,
        enableReadyCheck: true,
        retryStrategy: () => null // Disable automatic retry - fail fast
      };

      this.redis = new Redis(connectionOptions);
      this.publisher = new Redis(connectionOptions);
      this.subscriber = new Redis(connectionOptions);

      this.setupEventHandlers();

      const connectPromise = Promise.all([
        this.redis.connect(),
        this.publisher.connect(),
        this.subscriber.connect()
      ]);

      await Promise.race([
        connectPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
        )
      ]);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.info('Redis service initialized successfully');
    } catch (error) {
      this.isConnected = false;
      // Only log if Redis was actually configured
      if (this.isRedisConfigured) {
        logThrottled('redis_init_failed', () => {
          this.logger.warn('Redis service not available - continuing without Redis', {}, error as Error);
        }, 60000);
      }
    }
  }

  private setupEventHandlers(): void {
    if (!this.redis || !this.publisher || !this.subscriber) return;

    this.redis.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.redis.on('error', (error) => {
      logThrottled('redis_main_error', () => {
        this.logger.error('Redis main connection error', {}, error);
      }, 30000);
      this.isConnected = false;
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.handleReconnection();
    });

    this.publisher.on('error', (error) => {
      logThrottled('redis_pub_error', () => {
        this.logger.error('Redis publisher error', {}, error);
      }, 30000);
    });

    this.subscriber.on('error', (error) => {
      logThrottled('redis_sub_error', () => {
        this.logger.error('Redis subscriber error', {}, error);
      }, 30000);
    });
  }

  private async handleReconnection(): Promise<void> {
    // Don't reconnect if Redis is disabled or not configured
    if (DISABLE_REDIS || !this.isRedisConfigured || this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.isRedisConfigured && this.reconnectAttempts >= this.maxReconnectAttempts) {
        logThrottled('redis_max_reconnect', () => {
          this.logger.warn('Max Redis reconnection attempts reached - continuing without Redis');
        }, 60000);
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        logThrottled('redis_reconnect_failed', () => {
          this.logger.debug('Redis reconnection failed', { error: (error as Error).message });
        }, 60000);
      }
    }, delay);
  }

  async publish(channel: string, data: any): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      // Only log if Redis was actually configured
      if (this.isRedisConfigured) {
        logThrottled('redis_publish_not_connected', () => {
          this.logger.debug('Redis not connected, skipping publish');
        }, 60000);
      }
      return;
    }

    try {
      const message = JSON.stringify(data);
      await this.publisher.publish(channel, message);

      this.logger.debug('Data published to Redis', { channel });
    } catch (error) {
      logThrottled('redis_publish_error', () => {
        this.logger.error('Failed to publish to Redis', { channel }, error as Error);
      }, 30000);
    }
  }

  async publishMarketData(data: MarketData): Promise<void> {
    if (!this.isConnected || !this.publisher) {
      // Only log if Redis was actually configured
      if (this.isRedisConfigured) {
        logThrottled('redis_publish_market_not_connected', () => {
          this.logger.debug('Redis not connected, skipping market data publish');
        }, 60000);
      }
      return;
    }

    try {
      const channel = `market_data:${data.symbol}:${data.interval || '1m'}`;
      const message = JSON.stringify(data);

      await this.publisher.publish(channel, message);

      this.logger.debug('Market data published to Redis', {
        channel,
        symbol: data.symbol
      });
    } catch (error) {
      logThrottled('redis_publish_market_error', () => {
        this.logger.error('Failed to publish market data to Redis', { data }, error as Error);
      }, 30000);
    }
  }

  async subscribeToMarketData(
    symbols: string[],
    intervals: string[],
    callback: (data: MarketData) => void
  ): Promise<void> {
    if (!this.isConnected || !this.subscriber) {
      if (this.isRedisConfigured) {
        logThrottled('redis_subscribe_not_connected', () => {
          this.logger.debug('Redis not connected, cannot subscribe');
        }, 60000);
      }
      return;
    }

    try {
      const channels = symbols.flatMap(symbol =>
        (intervals || []).map(interval => `market_data:${symbol}:${interval}`)
      );

      await this.subscriber.subscribe(...channels);

      this.subscriber.on('message', (channel, message) => {
        try {
          const data: MarketData = JSON.parse(message);
          callback(data);
        } catch (error) {
          logThrottled('redis_parse_error', () => {
            this.logger.error('Failed to parse Redis message', { channel, message }, error as Error);
          }, 30000);
        }
      });

      this.logger.info('Subscribed to market data channels', { channels });
    } catch (error) {
      logThrottled('redis_subscribe_error', () => {
        this.logger.error('Failed to subscribe to market data', { symbols, intervals }, error as Error);
      }, 30000);
    }
  }

  async cacheData(key: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected || !this.redis) {
      // Silent fail - caching is optional
      return;
    }

    try {
      const serializedData = JSON.stringify(data);
      await this.redis.setex(key, ttlSeconds, serializedData);

      this.logger.debug('Data cached in Redis', { key, ttl: ttlSeconds });
    } catch (error) {
      logThrottled('redis_cache_error', () => {
        this.logger.error('Failed to cache data in Redis', { key }, error as Error);
      }, 30000);
    }
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.redis) {
      // Silent fail - caching is optional
      return null;
    }

    try {
      const data = await this.redis.get(key);
      if (!data) return null;

      return JSON.parse(data) as T;
    } catch (error) {
      logThrottled('redis_get_cache_error', () => {
        this.logger.error('Failed to retrieve cached data from Redis', { key }, error as Error);
      }, 30000);
      return null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.isConnected || !this.redis) {
      return null;
    }
    try {
      return await this.redis.get(key);
    } catch (error) {
      this.logger.error('Failed to get from Redis', { key }, error as Error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || !this.redis) {
      return;
    }
    try {
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, value);
      } else {
        await this.redis.set(key, value);
      }
    } catch (error) {
      this.logger.error('Failed to set in Redis', { key }, error as Error);
    }
  }

  async delete(key: string): Promise<number> {
    if (!this.isConnected || !this.redis) {
      return 0;
    }
    try {
      return await this.redis.del(key);
    } catch (error) {
      this.logger.error('Failed to delete from Redis', { key }, error as Error);
      return 0;
    }
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.isConnected || !this.redis) {
      // Silent fail - cache invalidation is optional
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if ((keys?.length || 0) > 0) {
        await this.redis.del(...keys);
        this.logger.info('Cache invalidated', { pattern, keysDeleted: keys.length });
      }
    } catch (error) {
      logThrottled('redis_invalidate_error', () => {
        this.logger.error('Failed to invalidate cache', { pattern }, error as Error);
      }, 30000);
    }
  }

  async getConnectionStatus(): Promise<{
    isConnected: boolean;
    reconnectAttempts: number;
    redisInfo?: any;
  }> {
    const status = {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      redisInfo: undefined as any
    };

    if (this.isConnected && this.redis) {
      try {
        status.redisInfo = await this.redis.info();
      } catch (error) {
        this.logger.error('Failed to get Redis info', {}, error as Error);
      }
    }

    return status;
  }

  async disconnect(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        this.redis = null;
      }
      if (this.publisher) {
        await this.publisher.quit();
        this.publisher = null;
      }
      if (this.subscriber) {
        await this.subscriber.quit();
        this.subscriber = null;
      }
      
      this.isConnected = false;
      this.logger.info('Redis service disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting from Redis', {}, error as Error);
    }
  }

  async getStats(): Promise<{ keys: number } | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }
    
    try {
      const keys = await this.redis.dbsize();
      return { keys };
    } catch (error) {
      this.logger.error('Failed to get Redis stats', {}, error as Error);
      return null;
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return 0;
    }
    
    try {
      const stream = this.redis.scanStream({
        match: pattern,
        count: 100
      });
      
      let deletedCount = 0;
      const deletePromises: Promise<number>[] = [];
      
      stream.on('data', async (keys: string[]) => {
        if ((keys?.length || 0) > 0) {
          deletePromises.push(this.redis!.del(...keys));
        }
      });
      
      await new Promise<void>((resolve, reject) => {
        stream.on('end', async () => {
          const results = await Promise.all(deletePromises);
          deletedCount = results.reduce((sum, count) => sum + count, 0);
          resolve();
        });
        stream.on('error', reject);
      });
      
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to delete pattern', { pattern }, error as Error);
      throw error;
    }
  }

  async flushAll(): Promise<void> {
    if (!this.redis || !this.isConnected) {
      return;
    }
    
    try {
      await this.redis.flushall();
      this.logger.info('Redis cache flushed');
    } catch (error) {
      this.logger.error('Failed to flush Redis cache', {}, error as Error);
      throw error;
    }
  }
}