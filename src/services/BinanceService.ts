// PHASE 4: NEUTRALIZED BINANCE SERVICE - NO EXTERNAL CALLS
// This is a dummy implementation that returns safe defaults
// All real data should flow through DatasourceClient

import { MarketData } from '../types/index.js';
import { Logger } from '../core/Logger.js';
import { ConfigManager } from '../core/ConfigManager.js';

interface RateLimitInfo {
  requestsPerSecond: number;
  requestsPerMinute: number;
  dailyRequestCount: number;
  lastResetTime: number;
  requestQueue: number[];
}

interface ConnectionHealth {
  isConnected: boolean;
  lastPingTime: number;
  latency: number;
  averageLatency: number;
  reconnectAttempts: number;
  clockSkew: number;
}

export class BinanceService {
  private static instance: BinanceService;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private testnetMode: boolean = true;
  
  private rateLimitInfo: RateLimitInfo = {
    requestsPerSecond: 0,
    requestsPerMinute: 0,
    dailyRequestCount: 0,
    lastResetTime: Date.now(),
    requestQueue: []
  };
  
  private connectionHealth: ConnectionHealth = {
    isConnected: false,
    lastPingTime: Date.now(),
    latency: 0,
    averageLatency: 0,
    reconnectAttempts: 0,
    clockSkew: 0
  };

  private constructor() {
    this.logger.warn('⚠️ BINANCE SERVICE NEUTRALIZED - All methods return dummy data');
  }

  static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  // Dummy implementations - return safe defaults immediately
  async detectClockSkew(): Promise<void> {
    return;
  }

  async testConnection(): Promise<boolean> {
    return false;
  }

  toggleTestnet(useTestnet: boolean): void {
    this.testnetMode = useTestnet;
  }

  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  async getKlines(
    symbol: string, 
    interval: string, 
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<MarketData[]> {
    // Return empty array - real data should come from DatasourceClient
    return [];
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    return 0;
  }

  async get24hrTicker(symbol?: string): Promise<any> {
    return symbol ? { symbol, price: 0 } : [];
  }

  connectWebSocket(streams: string[]): Promise<any> {
    // Return dummy WebSocket-like object
    return Promise.resolve({
      readyState: 3, // CLOSED
      close: () => {},
      send: () => {},
      on: () => {},
      off: () => {}
    });
  }

  async subscribeToKlines(symbols: string[], interval: string = '1m'): Promise<any> {
    return this.connectWebSocket([]);
  }

  async subscribeToTickers(symbols: string[]): Promise<any> {
    return this.connectWebSocket([]);
  }

  async getServerTime(): Promise<number> {
    return Date.now();
  }

  closeAllConnections(): void {
    // Nothing to close - no real connections
    this.logger.info('BinanceService: closeAllConnections called (no-op)');
  }

  async getAccountInfo(): Promise<any> {
    return { balances: [] };
  }

  async getExchangeInfo(): Promise<any> {
    return { symbols: [] };
  }

  async getAllSymbols(): Promise<string[]> {
    // Return empty array - symbols should come from Hugging Face or other providers
    return [];
  }
}