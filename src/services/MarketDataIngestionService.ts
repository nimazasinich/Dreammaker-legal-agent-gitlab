import { Logger } from '../core/Logger.js';
import { BinanceService } from './BinanceService.js';
import { KuCoinService } from './KuCoinService.js';
import { Database } from '../data/Database.js';
import { MarketData } from '../types/index.js';
import { RedisService } from './RedisService.js';
import { MultiProviderMarketDataService } from './MultiProviderMarketDataService.js';
import { SentimentNewsService } from './SentimentNewsService.js';
import { RealTradingService } from './RealTradingService.js';
import { HFOHLCVService } from './HFOHLCVService.js';
import { ConfigManager } from '../core/ConfigManager.js';
// COMMENTED OUT: Missing FallbackDataProvider - need to be created or removed
// import { FallbackDataProvider } from '../providers/FallbackDataProvider.js';
import cron from 'node-cron';

export class MarketDataIngestionService {
  private static instance: MarketDataIngestionService;
  private logger = Logger.getInstance();
  private binanceService = BinanceService.getInstance();
  private kucoinService = KuCoinService.getInstance();
  private database = Database.getInstance();
  private redisService = RedisService.getInstance();
  private multiProviderService = MultiProviderMarketDataService.getInstance();
  private hfOHLCVService = HFOHLCVService.getInstance();
  private sentimentNewsService = SentimentNewsService.getInstance();
  private realTradingService: RealTradingService;
  private config = ConfigManager.getInstance();
  private isRunning = false;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private watchedSymbols: string[] = (process.env.WATCHED_SYMBOLS || 'BTC,ETH')
    .split(',').map(s => s.trim().toUpperCase());
  private intervals: string[] = (process.env.STARTUP_INTERVALS || '15m')
    .split(',').map(s => s.trim());
  private bootFlags = {
    startOnBoot: process.env.START_INGEST_ON_BOOT !== 'false',
    disableNews: process.env.DISABLE_NEWS === 'true',
    disableSentiment: process.env.DISABLE_SENTIMENT === 'true',
    enableCron: process.env.ENABLE_INGEST_CRON !== 'false',
    histLimit: Number(process.env.STARTUP_HIST_LIMIT || 200)
  };
  private realTimeStreamCleanup?: () => void;
  private newsStreamCleanup?: () => void;
  private sentimentIntervalId?: NodeJS.Timeout;
  private preferredExchange: 'binance' | 'kucoin' = 'binance';

  private constructor() {
    this.realTradingService = new RealTradingService();
  }

  static getInstance(): MarketDataIngestionService {
    if (!MarketDataIngestionService.instance) {
      MarketDataIngestionService.instance = new MarketDataIngestionService();
    }
    return MarketDataIngestionService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.redisService.initialize();
      
      // Set preferred exchange from config
      const exchangeConfig = this.config.getExchangeConfig();
      if (exchangeConfig.preferredExchange) {
        this.preferredExchange = exchangeConfig.preferredExchange;
        this.logger.info(`Using ${this.preferredExchange} as preferred exchange`);
      }
      
      // Always use multi-provider service (primary source)
      if (!this.bootFlags.startOnBoot) {
        this.logger.info('Skipping ingestion at boot (START_INGEST_ON_BOOT=false)');
      } else if (this.config.isRealDataMode()) {
        this.logger.info('Starting multi-provider market data ingestion (boot-gated)');
        await this.startRealTimeDataCollection();
        await this.startHistoricalDataCollection(this.bootFlags.histLimit);
        if (!this.bootFlags.disableNews) await this.startNewsCollection();
        if (!this.bootFlags.disableSentiment) await this.startSentimentAnalysis();
      } else {
        // Fallback to Binance if real data mode is disabled
        this.setupDataIngestionSchedule();
        this.setupRealTimeStreaming();
      }
      
      this.isRunning = true;
      this.logger.info('Market data ingestion service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize market data ingestion service', {}, error as Error);
      throw error;
    }
  }

  private setupDataIngestionSchedule(): void {
    // Ingest 1-minute data every minute
    const minuteJob = cron.schedule('* * * * *', async () => {
      await this.ingestHistoricalData('1m', 100);
    }, { scheduled: false });

    // Ingest 5-minute data every 5 minutes
    const fiveMinuteJob = cron.schedule('*/5 * * * *', async () => {
      await this.ingestHistoricalData('5m', 100);
    }, { scheduled: false });

    // Ingest hourly data every hour
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      await this.ingestHistoricalData('1h', 100);
    }, { scheduled: false });

    // Ingest daily data once per day
    const dailyJob = cron.schedule('0 0 * * *', async () => {
      await this.ingestHistoricalData('1d', 365);
    }, { scheduled: false });

    this.cronJobs.set('1m', minuteJob);
    this.cronJobs.set('5m', fiveMinuteJob);
    this.cronJobs.set('1h', hourlyJob);
    this.cronJobs.set('1d', dailyJob);

    // Start all cron jobs
    this.cronJobs.forEach(job => job.start());
    this.logger.info('Data ingestion schedule configured');
  }

  private async setupRealTimeStreaming(): Promise<void> {
    try {
      const exchangeService = this.getExchangeService();
      
      for (const symbol of this.watchedSymbols) {
        const ws = await exchangeService.subscribeToKlines([symbol], '1m');
        
        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            
            // Handle both Binance and KuCoin message formats
            if (message.e === 'kline') {
              // Binance format
              const kline = message.k;
              const marketData: MarketData = {
                symbol: kline.s,
                timestamp: kline.t,
                open: parseFloat(kline.o),
                high: parseFloat(kline.h),
                low: parseFloat(kline.l),
                close: parseFloat(kline.c),
                volume: parseFloat(kline.v),
                interval: kline.i || '1m'
              };
              await this.processMarketData(marketData);
            } else if (message.type === 'message' && message.topic?.startsWith('/market/candles:')) {
              // KuCoin format
              const data = message.data;
              const marketData: MarketData = {
                symbol: message.subject,
                timestamp: parseInt(data.time),
                open: parseFloat(data.candles[0]),
                close: parseFloat(data.candles[1]),
                high: parseFloat(data.candles[2]),
                low: parseFloat(data.candles[3]),
                volume: parseFloat(data.candles[4]),
                interval: data.candles[5] || '1m'
              };
              await this.processMarketData(marketData);
            }
          } catch (error) {
            this.logger.error('Failed to process real-time market data', {}, error as Error);
          }
        });
      }
      this.logger.info(`Real-time streaming setup complete with ${this.preferredExchange}`);
    } catch (error) {
      this.logger.error('Failed to setup real-time streaming', {}, error as Error);
    }
  }

  // Helper method to get the preferred exchange service
  private getExchangeService(): BinanceService | KuCoinService {
    return this.preferredExchange === 'kucoin' ? this.kucoinService : this.binanceService;
  }

  // PATCH 4: Method to switch exchange at runtime with proper cleanup and resubscription
  async setPreferredExchange(exchange: 'binance' | 'kucoin'): Promise<void> {
    if (this.preferredExchange === exchange) {
      this.logger.info(`Already using ${exchange}, no switch needed`);
      return;
    }
    
    this.logger.info(`Switching from ${this.preferredExchange} to ${exchange}`);
    const oldExchange = this.preferredExchange;
    this.preferredExchange = exchange;
    
    // Close connections from old exchange if running
    if (this.isRunning) {
      try {
        // Close old exchange WebSocket connections
        if (oldExchange === 'binance') {
          this.binanceService.closeAllConnections();
          this.logger.info('Closed Binance WebSocket connections');
        } else {
          this.kucoinService.closeAllConnections();
          this.logger.info('Closed KuCoin WebSocket connections');
        }
        
        // Reconnect with new exchange
        await this.setupRealTimeStreaming();
        this.logger.info(`Successfully switched to ${exchange} and resubscribed to all streams`);
      } catch (error) {
        this.logger.error(`Failed to switch exchange to ${exchange}`, {}, error as Error);
        // Rollback on error
        this.preferredExchange = oldExchange;
        throw error;
      }
    }
  }

  private async ingestHistoricalData(interval: string, limit: number): Promise<void> {
    // Set stream interval for normalization
    (this as any).streamInterval = interval;
    
    for (const symbol of this.watchedSymbols) {
      try {
        let ohlcvData: any[] = [];
        
        // PRIMARY: Try Hugging Face datasets first
        try {
          this.logger.debug('Attempting to fetch data from Hugging Face', { symbol, interval });
          const hfData = await this.hfOHLCVService.getHistoricalData(symbol, interval, limit);
          ohlcvData = hfData;
          this.logger.info('Successfully fetched data from Hugging Face', { 
            symbol, 
            interval, 
            count: ohlcvData.length 
          });
        } catch (hfError) {
          this.logger.warn('HF dataset fetch failed, using fallback', { 
            symbol, 
            interval 
          }, hfError as Error);
          
          // FALLBACK: Use multi-provider service
          try {
            const days = this.convertIntervalToDays(interval, limit);
            const fallbackData = await this.multiProviderService.getHistoricalData(symbol, interval, days);
            ohlcvData = fallbackData;
            this.logger.info('Fetched data from multi-provider fallback', { 
              symbol, 
              interval, 
              count: ohlcvData.length 
            });
          } catch (fallbackError) {
            this.logger.error('All data sources failed for historical ingestion', { 
              symbol, 
              interval 
            }, fallbackError as Error);
            continue; // Skip this symbol
          }
        }
        
        // Process all retrieved data
        for (const data of ohlcvData) {
          const marketData: MarketData = {
            symbol: data.symbol + 'USDT',
            timestamp: data.timestamp,
            open: data.open,
            high: data.high,
            low: data.low,
            close: data.close,
            volume: data.volume,
            interval: data.interval || interval
          };
          
          await this.processMarketData(marketData);
        }

        this.logger.info('Historical data ingested', { symbol, interval, count: ohlcvData.length });
      } catch (error) {
        this.logger.error('Failed to ingest historical data', { symbol, interval }, error as Error);
      }
    }
  }

  private convertIntervalToDays(interval: string, limit: number): number {
    const intervalMinutes: Record<string, number> = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };

    const minutes = intervalMinutes[interval] || 60;
    const totalMinutes = minutes * limit;
    return Math.ceil(totalMinutes / 1440); // Convert to days
  }

  private async startHistoricalDataCollection(limitOverride?: number): Promise<void> {
    if (!this.bootFlags.enableCron) {
      this.logger.info('Historical cron disabled at boot (ENABLE_INGEST_CRON=false)');
      return;
    }

    // Ingest historical data on startup
    await this.ingestHistoricalData('1h', limitOverride ?? 100);
    await this.ingestHistoricalData('1d', Math.min(limitOverride ?? 30, 60));
    
    // Set up cron jobs for periodic historical data collection
    const hourlyJob = cron.schedule('0 * * * *', async () => {
      await this.ingestHistoricalData('1h', limitOverride ?? 24);
    }, { scheduled: false });

    const dailyJob = cron.schedule('0 0 * * *', async () => {
      await this.ingestHistoricalData('1d', Math.min(limitOverride ?? 30, 60));
    }, { scheduled: false });

    this.cronJobs.set('1h', hourlyJob);
    this.cronJobs.set('1d', dailyJob);
    
    hourlyJob.start();
    dailyJob.start();
    
    this.logger.info('Historical data collection started');
  }

  private async processMarketData(data: MarketData): Promise<void> {
    try {
      // Normalize data first (this ensures interval is always set)
      const normalizedData = this.normalizeMarketData(data);
      
      // Validate data (interval is guaranteed after normalization)
      if (!this.validateMarketData(normalizedData)) {
        this.logger.warn('Invalid market data detected', { data: normalizedData });
        return;
      }

      // Store in database (optional - gracefully handle if method doesn't exist)
      if (this.database && typeof (this.database as any).insertMarketData === 'function') {
        try {
          await (this.database as any).insertMarketData(normalizedData);
        } catch (dbError) {
          // Database persistence is optional - log only in debug mode
          this.logger.debug('Market data DB persistence skipped (optional)', { 
            symbol: normalizedData.symbol 
          });
        }
      } else {
        // Method doesn't exist - this is fine, DB persistence is optional
        this.logger.debug('Market data DB persistence disabled (no insertMarketData method)');
      }

      // Publish to Redis
      await this.redisService.publishMarketData(normalizedData);

      this.logger.debug('Market data processed', { 
        symbol: normalizedData.symbol, 
        timestamp: normalizedData.timestamp 
      });
    } catch (error) {
      this.logger.error('Failed to process market data', { data }, error as Error);
    }
  }

  private normalizeMarketData(data: MarketData): MarketData {
    // Derive interval from the ingestion context or fallback to '1m'
    // Priority: data.interval || this.streamInterval || '1m'
    const resolvedInterval = 
      data.interval || 
      (this as any).streamInterval ||
      '1m';

    const timestamp = typeof data.timestamp === 'number' ? data.timestamp : data.timestamp.getTime();

    return {
      symbol: data.symbol.toUpperCase(),
      timestamp: Math.floor(timestamp),
      open: Number(data.open.toFixed(8)),
      high: Number(data.high.toFixed(8)),
      low: Number(data.low.toFixed(8)),
      close: Number(data.close.toFixed(8)),
      volume: Number(data.volume.toFixed(8)),
      interval: resolvedInterval
    };
  }

  private validateMarketData(data: MarketData): boolean {
    // Basic validation checks
    const timestamp = typeof data.timestamp === 'number' ? data.timestamp : data.timestamp.getTime();
    if (!data.symbol || typeof data.symbol !== 'string') return false;
    if (!timestamp || timestamp <= 0) return false;
    if (data.open <= 0 || data.high <= 0 || data.low <= 0 || data.close <= 0) return false;
    if (data.volume < 0) return false;
    if (data.high < data.low) return false;
    if (data.high < Math.max(data.open, data.close)) return false;
    if (data.low > Math.min(data.open, data.close)) return false;

    // Sanity checks for extreme values
    const priceRange = data.high - data.low;
    const avgPrice = (data.high + data.low) / 2;
    if (priceRange / avgPrice > 0.5) return false; // 50% range seems extreme

    return true;
  }

  async addWatchedSymbol(symbol: string): Promise<void> {
    if (!this.watchedSymbols.includes(symbol.toUpperCase())) {
      this.watchedSymbols.push(symbol.toUpperCase());
      this.logger.info('Added watched symbol', { symbol });
    }
  }

  async removeWatchedSymbol(symbol: string): Promise<void> {
    const index = this.watchedSymbols.indexOf(symbol.toUpperCase());
    if (index > -1) {
      this.watchedSymbols.splice(index, 1);
      this.logger.info('Removed watched symbol', { symbol });
    }
  }

  getWatchedSymbols(): string[] {
    return [...this.watchedSymbols];
  }

  private async startRealTimeDataCollection(): Promise<void> {
    const symbols = this.config.getMarketDataConfig().symbols || 
      ['BTC', 'ETH', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XLM', 'XRP'];
    const updateInterval = this.config.getMarketDataConfig().updateInterval || 5000;
    
    // Set stream interval for normalization
    (this as any).streamInterval = '1m';

    this.realTimeStreamCleanup = this.multiProviderService.startRealTimeStream(
      symbols,
      async (priceData) => {
        // Convert PriceData from MultiProviderMarketDataService to MarketData format
        const formattedData: MarketData = {
          symbol: priceData.symbol + 'USDT',
          timestamp: priceData.timestamp,
          open: priceData.price,
          high: priceData.price * 1.001, // Small spread estimate
          low: priceData.price * 0.999,
          close: priceData.price,
          volume: priceData.volume24h,
          price: priceData.price,
          change24h: priceData.change24h,
          changePercent24h: priceData.changePercent24h,
          interval: '1m'
        };

        // Store in database
        await this.processMarketData(formattedData);

        // Update WebSocket for clients
        await this.redisService.publishMarketData(formattedData);

        // Auto-analysis
        try {
          const analysis = await this.realTradingService.analyzeMarket(priceData.symbol);
          this.logger.debug('Market analysis completed', { symbol: priceData.symbol, analysis });
        } catch (error) {
          this.logger.warn('Auto-analysis failed', { symbol: priceData.symbol }, error as Error);
        }
      },
      updateInterval
    );

    this.logger.info('Real-time data collection started', { symbols, interval: updateInterval });
  }

  private async startNewsCollection(): Promise<void> {
    const newsInterval = this.config.getMarketDataConfig().newsUpdateInterval || 30000;

    // Use SentimentNewsService for news streaming
    this.newsStreamCleanup = this.sentimentNewsService.startNewsStream(
      async (newsItem) => {
        try {
          await this.redisService.publish('news_update', { 
            news: newsItem, 
            timestamp: Date.now() 
          });
          this.logger.debug('News item published', { title: newsItem.title });
        } catch (error) {
          this.logger.error('News publish error', {}, error as Error);
        }
      },
      newsInterval
    );

    this.logger.info('News collection started', { interval: newsInterval });
  }

  private async startSentimentAnalysis(): Promise<void> {
    const sentimentInterval = this.config.getMarketDataConfig().sentimentUpdateInterval || 300000;

    // Initial sentiment fetch
    try {
      const sentiment = await this.sentimentNewsService.getAggregatedSentiment();
      await this.redisService.publish('sentiment_update', sentiment);
      this.logger.info('Initial sentiment data published', { sentiment });
    } catch (error) {
      this.logger.error('Initial sentiment fetch error', {}, error as Error);
    }

    // Periodic sentiment updates
    this.sentimentIntervalId = setInterval(async () => {
      try {
        const sentiment = await this.sentimentNewsService.getAggregatedSentiment();
        await this.redisService.publish('sentiment_update', sentiment);
        this.logger.debug('Sentiment analysis completed', {
          overallSentiment: sentiment.overallSentiment,
          score: sentiment.overallScore
        });
      } catch (error) {
        this.logger.error('Sentiment analysis error', {}, error as Error);
      }
    }, sentimentInterval);

    this.logger.info('Sentiment analysis started', { interval: sentimentInterval });
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs.clear();

    if (this.sentimentIntervalId) {
      clearInterval(this.sentimentIntervalId);
      this.sentimentIntervalId = undefined;
    }

    if (this.realTimeStreamCleanup) {
      this.realTimeStreamCleanup();
    }

    if (this.newsStreamCleanup) {
      this.newsStreamCleanup();
    }
    
    await this.redisService.disconnect();
    this.logger.info('Market data ingestion service stopped');
  }

  getStatus(): { isRunning: boolean; watchedSymbols: string[]; intervals: string[] } {
    return {
      isRunning: this.isRunning,
      watchedSymbols: this.watchedSymbols,
      intervals: this.intervals
    };
  }

  /**
   * Get bars with full cascade fallback (never stalls)
   * Non-intrusive wrapper that adds FallbackDataProvider as final safety net
   */
  async getBarsCascade(symbol: string, tf: string, limit: number): Promise<any[]> {
    try {
      // Try existing fast paths first (HF -> MultiProvider)
      const symbolWithoutUSDT = symbol.replace('USDT', '').replace('USD', '').toUpperCase();

      // Try HF first
      try {
        const hfData = await this.hfOHLCVService.getHistoricalData(symbolWithoutUSDT, tf, limit);
        if (hfData?.length > 0) {
          this.logger.debug('HF data retrieved via cascade', { symbol, count: hfData.length });
          return hfData;
        }
      } catch (hfError) {
        this.logger.debug('HF cascade attempt failed', { symbol, error: (hfError as Error).message });
      }

      // Try MultiProvider fallback
      try {
        const days = this.convertIntervalToDays(tf, limit);
        const multiData = await this.multiProviderService.getHistoricalData(symbolWithoutUSDT, tf, days);
        if (multiData?.length > 0) {
          this.logger.debug('MultiProvider data retrieved via cascade', { symbol, count: multiData.length });
          return multiData;
        }
      } catch (multiError) {
        this.logger.debug('MultiProvider cascade attempt failed', { symbol, error: (multiError as Error).message });
      }
    } catch (err) {
      this.logger.warn('All existing providers failed in cascade', { symbol }, err as Error);
    }

    // Final fallback: return empty array if all providers fail
    // TODO: Implement FallbackDataProvider for synthetic data
    this.logger.warn('All providers failed, returning empty data', { symbol, tf });
    return [];
  }
}