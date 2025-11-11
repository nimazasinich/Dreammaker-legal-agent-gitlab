import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ApiConfig } from '../types/index.js';
import { Logger } from './Logger.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ApiConfig;
  private configPath: string;
  private logger = Logger.getInstance();

  private constructor() {
    this.configPath = join(process.cwd(), 'config', 'api.json');
    this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    try {
      if (!existsSync(this.configPath)) {
        this.logger.warn('Config file not found, creating default configuration');
        this.createDefaultConfig();
        return;
      }

      const configData = readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      
      // Validate required fields
      this.validateConfig();
      
      this.logger.info('Configuration loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load configuration', {}, error as Error);
      this.createDefaultConfig();
    }
  }

  private createDefaultConfig(): void {
    this.config = {
      binance: {
        apiKey: process.env.BINANCE_API_KEY || '',
        secretKey: process.env.BINANCE_SECRET_KEY || '',
        testnet: true,
        rateLimits: {
          requestsPerSecond: 10,
          dailyLimit: 100000
        }
      },
      kucoin: {
        apiKey: process.env.KUCOIN_API_KEY || '',
        secretKey: process.env.KUCOIN_SECRET_KEY || '',
        passphrase: process.env.KUCOIN_PASSPHRASE || '',
        testnet: true,
        rateLimits: {
          requestsPerSecond: 30,
          requestsPerMinute: 1800
        }
      },
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || ''
      },
      database: {
        path: join(process.cwd(), 'data', 'boltai.db'),
        encrypted: true,
        backupEnabled: true
      },
      redis: {
        host: 'localhost',
        port: 6379,
        password: process.env.REDIS_PASSWORD
      }
    };

    this.saveConfig();
  }

  private validateConfig(): void {
    // فعال کردن حالت واقعی با داده‌های واقعی
    if (!this.config.exchange) {
      this.config.exchange = {};
    }

    this.config.exchange.demoMode = false;
    this.config.exchange.realDataMode = true;
    this.config.exchange.primarySource = 'coinmarketcap';
    this.config.exchange.fallbackSources = ['cryptocompare', 'coingecko'];
    this.config.exchange.tradingEnabled = false;

    this.logger.info('✅ REAL MARKET DATA MODE ACTIVATED');
    this.logger.info('📊 Using real data from: CoinMarketCap, CryptoCompare, CoinGecko');
    this.logger.info('📰 Real news from: NewsAPI, CryptoPanic');
    this.logger.info('😱 Real sentiment from: Fear & Greed Index');

    if (!this.config.binance?.apiKey) {
      this.logger.warn('Binance API key not set (optional for real data mode)');
    }
    
    if (!this.config.database?.path) {
      console.error('Database path is required');
    }
  }

  private saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      this.logger.info('Configuration saved successfully');
    } catch (error) {
      this.logger.error('Failed to save configuration', {}, error as Error);
    }
  }

  getConfig(): ApiConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  getBinanceConfig() {
    return this.config.binance;
  }

  getKuCoinConfig() {
    return this.config.kucoin || {
      apiKey: process.env.KUCOIN_API_KEY || '',
      secretKey: process.env.KUCOIN_SECRET_KEY || '',
      passphrase: process.env.KUCOIN_PASSPHRASE || '',
      testnet: true,
      rateLimits: {
        requestsPerSecond: 30,
        requestsPerMinute: 1800
      }
    };
  }

  getTelegramConfig() {
    return this.config.telegram;
  }

  getDatabaseConfig() {
    return this.config.database;
  }

  getRedisConfig() {
    return this.config.redis;
  }

  isRealDataMode(): boolean {
    return this.config.exchange?.realDataMode === true;
  }

  getExchangeConfig() {
    return this.config.exchange || {};
  }

  getMarketDataConfig() {
    return this.config.marketData || {};
  }

  getAnalysisConfig() {
    return this.config.analysis || {};
  }

  getApisConfig() {
    return this.config.apis || {};
  }

  getApiPriority(): string[] {
    return this.config.apiPriority || ['coingecko', 'binance', 'coinmarketcap', 'cryptocompare'];
  }

  getCacheConfig() {
    return this.config.cache || {
      ttl: {
        market_data: 120,
        news: 600,
        sentiment: 3600,
        fear_greed: 300,
        social: 300,
        hf_ohlcv: 180,
        hf_sentiment: 900
      }
    };
  }

  getDynamicWeightingConfig() {
    return this.config.dynamicWeighting || {
      updateInterval: 300000,
      minWeight: 0.05,
      maxWeight: 0.5,
      accuracyFactor: 0.4,
      freshnessFactor: 0.2,
      qualityFactor: 0.2,
      volatilityFactor: 0.2
    };
  }
}