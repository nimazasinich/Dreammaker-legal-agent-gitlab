import axios, { AxiosInstance } from 'axios';
import { createHmac } from 'crypto';
import WebSocket from 'ws';
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
  private httpClient: AxiosInstance;
  private wsConnections: Map<string, WebSocket> = new Map();
  private wsMultiplexer: WebSocket | null = null;
  private rateLimitInfo: RateLimitInfo;
  private connectionHealth: ConnectionHealth;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private logger = Logger.getInstance();
  private config = ConfigManager.getInstance();
  private baseUrl: string;
  private wsBaseUrl: string;
  private testnetMode: boolean = true;

  private constructor() {
    const binanceConfig = this.config.getBinanceConfig();
    
    this.testnetMode = binanceConfig.testnet;
    this.baseUrl = this.testnetMode
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';
      
    this.wsBaseUrl = this.testnetMode
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';

    this.rateLimitInfo = {
      requestsPerSecond: 0,
      requestsPerMinute: 0,
      dailyRequestCount: 0,
      lastResetTime: Date.now(),
      requestQueue: []
    };

    this.connectionHealth = {
      isConnected: false,
      lastPingTime: 0,
      latency: 0,
      averageLatency: 0,
      reconnectAttempts: 0,
      clockSkew: 0
    };

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });

    this.setupInterceptors();
    this.startHealthMonitoring();
    this.detectClockSkew();
  }

  static getInstance(): BinanceService {
    if (!BinanceService.instance) {
      BinanceService.instance = new BinanceService();
    }
    return BinanceService.instance;
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting and authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Rate limiting check
        await this.enforceRateLimit();
        
        const binanceConfig = this.config.getBinanceConfig();
        
        // Add timestamp and signature for authenticated endpoints
        if (config.headers?.['X-REQUIRE-AUTH']) {
          const timestamp = Date.now();
          const queryString = new URLSearchParams(config.params).toString();
          const signature = this.createSignature(queryString + `&timestamp=${timestamp}`);
          
          config.params = {
            ...config.params,
            timestamp,
            signature
          };
          
          config.headers['X-MBX-APIKEY'] = binanceConfig.apiKey;
          delete config.headers['X-REQUIRE-AUTH'];
        }
        
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', {}, error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle rate limit errors
        if (error.response?.status === 429) {
          this.logger.warn('Rate limit exceeded, implementing backoff');
          return this.handleRateLimitError(error);
        }
        
        this.logger.error('Binance API error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        }, error);
        return Promise.reject(error);
      }
    );
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    
    // Clean old requests
    this.rateLimitInfo.requestQueue = this.rateLimitInfo?.requestQueue?.filter(
      timestamp => timestamp > oneMinuteAgo
    );
    
    const recentRequests = this.rateLimitInfo?.requestQueue?.filter(
      timestamp => timestamp > oneSecondAgo
    );
    
    // Check rate limits
    const binanceConfig = this.config.getBinanceConfig();
    if ((recentRequests?.length || 0) >= binanceConfig.rateLimits.requestsPerSecond) {
      const waitTime = 1000 - (now - recentRequests[0]);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Add current request to queue
    this.rateLimitInfo.requestQueue.push(now);
    this.rateLimitInfo.requestsPerSecond = recentRequests.length + 1;
    this.rateLimitInfo.requestsPerMinute = this.rateLimitInfo.requestQueue.length;
  }

  private async handleRateLimitError(error: any): Promise<any> {
    const retryAfter = error.response?.headers['retry-after'] || 1;
    const backoffTime = Math.min(retryAfter * 1000, 30000); // Max 30 seconds
    
    this.logger.warn(`Rate limited, backing off for ${backoffTime}ms`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
    
    // Retry the original request
    return this.httpClient.request(error.config);
  }

  private async detectClockSkew(): Promise<void> {
    try {
      const localTime = Date.now();
      const serverTime = await this.getServerTime();
      this.connectionHealth.clockSkew = Math.abs(serverTime - localTime);
      
      if (this.connectionHealth.clockSkew > 1000) {
        this.logger.warn('Clock skew detected', {
          skew: this.connectionHealth.clockSkew,
          localTime,
          serverTime
        });
      }
    } catch (error) {
      this.logger.error('Failed to detect clock skew', {}, error as Error);
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const startTime = Date.now();
        await this.testConnection();
        this.connectionHealth.latency = Date.now() - startTime;
        this.connectionHealth.isConnected = true;
        this.connectionHealth.lastPingTime = Date.now();
        this.connectionHealth.reconnectAttempts = 0;
      } catch (error) {
        this.connectionHealth.isConnected = false;
        this.connectionHealth.reconnectAttempts++;
        this.logger.error('Health check failed', {
          attempts: this.connectionHealth.reconnectAttempts
        }, error as Error);
        
        if (this.connectionHealth.reconnectAttempts >= 3) {
          this.initiateReconnection();
        }
      }
    }, 60000); // Check every 60 seconds (reduced from 30s to save API calls)
  }

  private initiateReconnection(): void {
    if (this.reconnectTimer) return;
    
    const backoffTime = Math.min(
      1000 * Math.pow(2, this.connectionHealth.reconnectAttempts),
      300000 // Max 5 minutes
    );
    
    this.logger.info('Initiating reconnection', { backoffTime });
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.testConnection();
        this.connectionHealth.isConnected = true;
        this.connectionHealth.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.logger.info('Reconnection successful');
      } catch (error) {
        this.reconnectTimer = null;
        this.logger.error('Reconnection failed', {}, error as Error);
      }
    }, backoffTime);
  }

  // Toggle between testnet and mainnet
  toggleTestnet(useTestnet: boolean): void {
    if (this.testnetMode === useTestnet) return;
    
    this.testnetMode = useTestnet;
    this.baseUrl = useTestnet
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';
      
    this.wsBaseUrl = useTestnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
    
    // Update HTTP client base URL
    this.httpClient.defaults.baseURL = this.baseUrl;
    
    // Close existing WebSocket connections
    this.closeAllConnections();
    
    this.logger.info('Switched network mode', { testnet: useTestnet });
  }

  // WebSocket multiplexer for efficient connection management
  private async createWebSocketMultiplexer(): Promise<WebSocket> {
    if (this.wsMultiplexer && this.wsMultiplexer.readyState === WebSocket.OPEN) {
      return this.wsMultiplexer;
    }
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsBaseUrl}/!ticker@arr`);
      
      ws.on('open', () => {
        this.logger.info('WebSocket multiplexer connected');
        this.wsMultiplexer = ws;
        this.connectionHealth.isConnected = true;
        resolve(ws);
      });
      
      ws.on('error', (error) => {
        this.logger.error('WebSocket multiplexer error', {}, error);
        this.connectionHealth.isConnected = false;
        reject(error);
      });
      
      ws.on('close', () => {
        this.logger.info('WebSocket multiplexer disconnected');
        this.wsMultiplexer = null;
        this.connectionHealth.isConnected = false;
        
        // Auto-reconnect with exponential backoff
        setTimeout(() => {
          this.createWebSocketMultiplexer().catch(error => {
            this.logger.error('Failed to reconnect multiplexer', {}, error);
          });
        }, Math.min(1000 * Math.pow(2, this.connectionHealth.reconnectAttempts), 30000));
      });
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMultiplexerMessage(message);
        } catch (error) {
          this.logger.error('Failed to parse multiplexer message', {}, error as Error);
        }
      });
      
      // Connection timeout
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
          reject(new Error('WebSocket multiplexer connection timeout'));
        }
      }, 10000);
    });
  }

  private handleMultiplexerMessage(message: any): void {
    // Handle different types of multiplexed messages
    if (Array.isArray(message)) {
      // Ticker array data
      message.forEach(ticker => {
        this.logger.debug('Received ticker data', { symbol: ticker.s });
      });
    }
  }

  // Get connection health status
  getConnectionHealth(): ConnectionHealth {
    return { ...this.connectionHealth };
  }

  // Get rate limit information
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  // Enhanced connection test with health metrics
  async testConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      await this.httpClient.get('/ping');
      this.connectionHealth.latency = Date.now() - startTime;
      this.connectionHealth.isConnected = true;
      this.connectionHealth.lastPingTime = Date.now();
      this.logger.info('Binance connection test successful', {
        latency: this.connectionHealth.latency,
        testnet: this.testnetMode
      });
      return true;
    } catch (error) {
      this.connectionHealth.isConnected = false;
      this.logger.error('Binance connection test failed', {
        testnet: this.testnetMode
      }, error as Error);
      return false;
    }
  }

  private createSignature(queryString: string): string {
    const binanceConfig = this.config.getBinanceConfig();
    return createHmac('sha256', binanceConfig.secretKey)
      .update(queryString)
      .digest('hex');
  }

  // Get historical OHLCV data
  async getKlines(
    symbol: string, 
    interval: string, 
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<MarketData[]> {
    try {
      this.logger.info('Fetching klines data', { symbol, interval, limit });

      const params: any = {
        symbol: symbol.toUpperCase(),
        interval,
        limit
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      const response = await this.httpClient.get('/klines', { params });

      const marketData: MarketData[] = (response.data || []).map((kline: any[]) => ({
        symbol,
        timestamp: kline[0], // Open time
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        interval
      }));

      this.logger.info('Successfully fetched klines data', { 
        symbol, 
        interval, 
        count: marketData.length 
      });

      return marketData;

    } catch (error) {
      this.logger.error('Failed to fetch klines data', { symbol, interval }, error as Error);
      throw error;
    }
  }

  // Get current price for symbol
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await this.httpClient.get('/ticker/price', {
        params: { symbol: symbol.toUpperCase() }
      });

      return parseFloat(response.data.price);
    } catch (error) {
      this.logger.error('Failed to get current price', { symbol }, error as Error);
      throw error;
    }
  }

  // Get 24hr ticker statistics
  async get24hrTicker(symbol?: string): Promise<any> {
    try {
      const params = symbol ? { symbol: symbol.toUpperCase() } : {};
      const response = await this.httpClient.get('/ticker/24hr', { params });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get 24hr ticker', { symbol }, error as Error);
      throw error;
    }
  }

  // WebSocket connection for real-time data
  connectWebSocket(streams: string[]): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const streamString = streams.join('/');
      const wsUrl = `${this.wsBaseUrl}/${streamString}`;

      if (this.wsConnections.has(streamString)) {
        this.logger.info('Reusing existing WebSocket connection', { streams });
        resolve(this.wsConnections.get(streamString)!);
        return;
      }

      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        this.logger.info('WebSocket connected', { streams });
        this.wsConnections.set(streamString, ws);
        resolve(ws);
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket error', { streams }, error);
        reject(error);
      });

      ws.on('close', () => {
        this.logger.info('WebSocket disconnected', { streams });
        this.wsConnections.delete(streamString);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(message);
        } catch (error) {
          this.logger.error('Failed to parse WebSocket message', { streams }, error as Error);
        }
      });

      // Connection timeout
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private handleWebSocketMessage(message: any): void {
    // Handle different types of WebSocket messages
    if (message.e === 'kline') {
      // Kline/Candlestick data
      const kline = message.k;
      const marketData: MarketData = {
        symbol: kline.s,
        timestamp: kline.t,
        open: parseFloat(kline.o),
        high: parseFloat(kline.h),
        low: parseFloat(kline.l),
        close: parseFloat(kline.c),
        volume: parseFloat(kline.v),
        interval: kline.i
      };

      // Emit event or store in database
      this.logger.debug('Received kline data', { symbol: marketData.symbol });
    }
  }

  // Subscribe to kline data stream
  async subscribeToKlines(symbols: string[], interval: string = '1m'): Promise<WebSocket> {
    const streams = (symbols || []).map(symbol => 
      `${symbol.toLowerCase()}@kline_${interval}`
    );
    
    return this.connectWebSocket(streams);
  }

  // Subscribe to ticker data stream
  async subscribeToTickers(symbols: string[]): Promise<WebSocket> {
    const streams = (symbols || []).map(symbol => 
      `${symbol.toLowerCase()}@ticker`
    );
    
    return this.connectWebSocket(streams);
  }

  // Get server time
  async getServerTime(): Promise<number> {
    try {
      const response = await this.httpClient.get('/time');
      return response.data.serverTime;
    } catch (error) {
      this.logger.error('Failed to get server time', {}, error as Error);
      throw error;
    }
  }

  // Close all WebSocket connections
  closeAllConnections(): void {
    if (this.wsMultiplexer) {
      this.wsMultiplexer.close();
      this.wsMultiplexer = null;
    }
    
    this.wsConnections.forEach((ws, stream) => {
      this.logger.info('Closing WebSocket connection', { stream });
      ws.close();
    });
    this.wsConnections.clear();
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  // Get account information (authenticated)
  async getAccountInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/account', {
        headers: { 'X-REQUIRE-AUTH': 'true' }
      });
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get account info', {}, error as Error);
      throw error;
    }
  }

  // Get exchange info
  async getExchangeInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/exchangeInfo');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get exchange info', {}, error as Error);
      throw error;
    }
  }
}