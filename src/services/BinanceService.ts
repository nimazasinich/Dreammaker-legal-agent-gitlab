import { MarketData } from '../types/index.js';
import { Logger } from '../core/Logger.js';

export class BinanceService {
  private static instance: BinanceService;
  private logger = Logger.getInstance();

  private constructor() {
    this.logger.info('BinanceService initialized in DUMMY MODE');
  }

  static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  // Initialize method - returns immediately
  async initialize(): Promise<void> {
    this.logger.info('BinanceService dummy initialization complete');
    return Promise.resolve();
  }

  // Detect clock skew - returns 0 immediately
  async detectClockSkew(): Promise<number> {
    this.logger.debug('Dummy clock skew detection returning 0');
    return Promise.resolve(0);
  }

  // Get server time - returns current time
  async getServerTime(): Promise<number> {
    const currentTime = Date.now();
    this.logger.debug(`Dummy server time returning: ${currentTime}`);
    return Promise.resolve(currentTime);
  }

  // Get exchange info - returns empty object
  async getExchangeInfo(): Promise<any> {
    this.logger.debug('Dummy exchange info returning empty object');
    return Promise.resolve({
      timezone: 'UTC',
      serverTime: Date.now(),
      symbols: []
    });
  }

  // Get historical OHLCV data - returns empty array
  async getKlines(
    symbol: string, 
    interval: string, 
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<MarketData[]> {
    this.logger.debug(`Dummy klines request for ${symbol} returning empty array`);
    return Promise.resolve([]);
  }

  // Additional dummy methods that might be called
  async testConnection(): Promise<boolean> {
    this.logger.debug('Dummy connection test returning false');
    return Promise.resolve(false);
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    this.logger.debug(`Dummy price for ${symbol} returning 0`);
    return Promise.resolve(0);
  }

  async get24hrTicker(symbol?: string): Promise<any> {
    this.logger.debug('Dummy 24hr ticker returning empty object');
    return Promise.resolve({});
  }

  closeAllConnections(): void {
    this.logger.debug('Dummy close all connections - nothing to close');
  }

  getConnectionHealth(): any {
    return {
      isConnected: false,
      lastPingTime: 0,
      latency: 0,
      averageLatency: 0,
      reconnectAttempts: 0,
      clockSkew: 0
    };
  }

  getRateLimitInfo(): any {
    return {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      dailyRequestCount: 0,
      lastResetTime: Date.now(),
      requestQueue: []
    };
  }

  // Dummy WebSocket methods
  async subscribeToKlines(symbols: string[], interval: string = '1m'): Promise<any> {
    this.logger.debug('Dummy kline subscription - returning null');
    return Promise.resolve(null);
  }

  async subscribeToTickers(symbols: string[]): Promise<any> {
    this.logger.debug('Dummy ticker subscription - returning null');
    return Promise.resolve(null);
  }

  connectWebSocket(streams: string[]): Promise<any> {
    this.logger.debug('Dummy WebSocket connection - returning null');
    return Promise.resolve(null);
  }

  toggleTestnet(useTestnet: boolean): void {
    this.logger.debug(`Dummy testnet toggle to: ${useTestnet}`);
  }

  async getAccountInfo(): Promise<any> {
    this.logger.debug('Dummy account info returning empty object');
    return Promise.resolve({});
  }
}