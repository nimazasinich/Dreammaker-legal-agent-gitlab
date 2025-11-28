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

export class KuCoinService {
  private static instance: KuCoinService;
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
  private wsToken: string | null = null;
  private testnetMode: boolean = true;
  private backoffFn: (retryAfter: number, jitter: number) => Promise<void> = async (retryAfter, jitter) => {
    const backoffTime = Math.min((retryAfter * 1000) + jitter, 30000);
    return new Promise(resolve => setTimeout(resolve, backoffTime));
  };

  private constructor() {
    const kucoinConfig = this.config.getKuCoinConfig();
    
    this.testnetMode = kucoinConfig.testnet;
    this.baseUrl = this.testnetMode
      ? 'https://api-sandbox.kucoin.com'
      : 'https://api.kucoin.com';
      
    this.wsBaseUrl = this.testnetMode
      ? 'wss://ws-api-sandbox.kucoin.com'
      : 'wss://ws-api-spot.kucoin.com';

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

  static getInstance(): KuCoinService {
    if (!KuCoinService.instance) {
      KuCoinService.instance = new KuCoinService();
    }
    return KuCoinService.instance;
  }

  /**
   * Set custom backoff function for testing purposes
   */
  setBackoffFunction(backoffFn: (retryAfter: number, jitter: number) => Promise<void>): void {
    this.backoffFn = backoffFn;
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting and authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        // Rate limiting check
        await this.enforceRateLimit();
        
        const kucoinConfig = this.config.getKuCoinConfig();
        
        // Add timestamp and signature for authenticated endpoints
        if (config.headers?.['X-REQUIRE-AUTH']) {
          const timestamp = Date.now().toString();
          const method = (config.method || 'GET').toUpperCase();
          const endpoint = config.url || '';
          const queryString = new URLSearchParams(config.params).toString();
          const body = config.data ? JSON.stringify(config.data) : '';
          
          // KuCoin signature format: timestamp + method + endpoint + queryString + body
          const strToSign = timestamp + method + endpoint + (queryString ? '?' + queryString : '') + body;
          const signature = this.createSignature(strToSign);
          
          // KuCoin v2 passphrase (encrypted)
          const passphrase = this.createSignature(kucoinConfig.passphrase);
          
          config.headers['KC-API-KEY'] = kucoinConfig.apiKey;
          config.headers['KC-API-SIGN'] = signature;
          config.headers['KC-API-TIMESTAMP'] = timestamp;
          config.headers['KC-API-PASSPHRASE'] = passphrase;
          config.headers['KC-API-KEY-VERSION'] = '2';
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
        // Handle rate limit errors (KuCoin uses 429)
        if (error.response?.status === 429) {
          this.logger.warn('Rate limit exceeded, implementing backoff');
          return this.handleRateLimitError(error);
        }
        
        this.logger.error('KuCoin API error', {
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
    
    // KuCoin rate limits: 1800 requests per minute (30 per second)
    const kucoinConfig = this.config.getKuCoinConfig();
    if ((recentRequests?.length || 0) >= kucoinConfig.rateLimits.requestsPerSecond) {
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
    // Add jitter to prevent thundering herd (0-1000ms randomization)
    const jitter = Math.random() * 1000;
    const backoffTime = Math.min((retryAfter * 1000) + jitter, 30000); // Max 30 seconds

    this.logger.warn(`Rate limited, backing off for ${backoffTime}ms (with jitter)`);
    await this.backoffFn(retryAfter, jitter);

    // Retry the original request
    return this.httpClient.request(error.config);
  }

  private async detectClockSkew(): Promise<void> {
    try {
      const localTime = Date.now();
      const serverTime = await this.getServerTime();
      this.connectionHealth.clockSkew = Math.abs(serverTime - localTime);
      
      if (this.connectionHealth.clockSkew > 5000) {
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
      ? 'https://api-sandbox.kucoin.com'
      : 'https://api.kucoin.com';
      
    this.wsBaseUrl = useTestnet
      ? 'wss://ws-api-sandbox.kucoin.com'
      : 'wss://ws-api-spot.kucoin.com';
    
    // Update HTTP client base URL
    this.httpClient.defaults.baseURL = this.baseUrl;
    
    // Close existing WebSocket connections
    this.closeAllConnections();
    
    this.logger.info('Switched network mode', { testnet: useTestnet });
  }

  // Get WebSocket token and connection details
  private async getWebSocketToken(isPrivate: boolean = false): Promise<any> {
    try {
      const endpoint = isPrivate ? '/api/v1/bullet-private' : '/api/v1/bullet-public';
      const config: any = { method: 'POST', url: endpoint };
      
      if (isPrivate) {
        config.headers = { 'X-REQUIRE-AUTH': 'true' };
      }
      
      const response = await this.httpClient.post(endpoint, {}, config);
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get WebSocket token', {}, error as Error);
      throw error;
    }
  }

  // WebSocket connection for real-time data
  async connectWebSocket(channels: string[], isPrivate: boolean = false): Promise<WebSocket> {
    try {
      // Get WebSocket token and instance servers
      const wsConfig = await this.getWebSocketToken(isPrivate);
      this.wsToken = wsConfig.token;
      const wsEndpoint = wsConfig.instanceServers[0].endpoint;
      const connectId = Date.now().toString();
      const wsUrl = `${wsEndpoint}?token=${this.wsToken}&connectId=${connectId}`;
      
      const channelKey = channels.join(',');
      
      if (this.wsConnections.has(channelKey)) {
        this.logger.info('Reusing existing WebSocket connection', { channels });
        return this.wsConnections.get(channelKey)!;
      }

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
          this.logger.info('KuCoin WebSocket connected', { channels });
          this.wsConnections.set(channelKey, ws);
          
          // Subscribe to channels
          const subscribeMessage = {
            id: connectId,
            type: 'subscribe',
            topic: channels.join(','),
            privateChannel: isPrivate,
            response: true
          };
          
          ws.send(JSON.stringify(subscribeMessage));
          resolve(ws);
        });

        ws.on('error', (error) => {
          this.logger.error('WebSocket error', { channels }, error);
          reject(error);
        });

        ws.on('close', () => {
          this.logger.info('WebSocket disconnected', { channels });
          this.wsConnections.delete(channelKey);
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleWebSocketMessage(message, ws);
          } catch (error) {
            this.logger.error('Failed to parse WebSocket message', { channels }, error as Error);
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
    } catch (error) {
      this.logger.error('Failed to connect WebSocket', {}, error as Error);
      throw error;
    }
  }

  private handleWebSocketMessage(message: any, ws?: WebSocket): void {
    // Handle ping/pong - PATCH 1: Send pong response to prevent disconnection
    if (message.type === 'ping') {
      if (ws) {
        ws.send(JSON.stringify({ type: 'pong', id: message.id }));
        this.logger.debug('Sent pong response', { id: message.id });
      }
      return;
    }
    
    // Handle different types of WebSocket messages
    if (message.type === 'message' && message.topic) {
      if (message.topic.startsWith('/market/candles:')) {
        // Kline/Candlestick data
        const data = message.data;
        const symbol = message.subject;
        
        const marketData: MarketData = {
          symbol: symbol,
          timestamp: parseInt(data.time),
          open: parseFloat(data.candles[0]),
          close: parseFloat(data.candles[1]),
          high: parseFloat(data.candles[2]),
          low: parseFloat(data.candles[3]),
          volume: parseFloat(data.candles[4]),
          interval: data.candles[5]
        };

        // Emit event or store in database
        this.logger.debug('Received kline data', { symbol: marketData.symbol });
      } else if (message.topic.startsWith('/market/ticker:')) {
        // Ticker data
        const data = message.data;
        this.logger.debug('Received ticker data', { symbol: message.subject });
      }
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
      await this.httpClient.get('/api/v1/timestamp');
      this.connectionHealth.latency = Date.now() - startTime;
      this.connectionHealth.isConnected = true;
      this.connectionHealth.lastPingTime = Date.now();
      this.logger.info('KuCoin connection test successful', {
        latency: this.connectionHealth.latency,
        testnet: this.testnetMode
      });
      return true;
    } catch (error) {
      this.connectionHealth.isConnected = false;
      this.logger.error('KuCoin connection test failed', {
        testnet: this.testnetMode
      }, error as Error);
      return false;
    }
  }

  private createSignature(str: string): string {
    const kucoinConfig = this.config.getKuCoinConfig();
    return createHmac('sha256', kucoinConfig.secretKey)
      .update(str)
      .digest('base64');
  }

  // PATCH 2: Helper to convert symbol format to KuCoin standard (BTC-USDT)
  private formatSymbolForKuCoin(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    // If already has hyphen, return as-is
    if (upperSymbol.includes('-')) {
      return upperSymbol;
    }
    // Convert BTCUSDT -> BTC-USDT format
    // Match common quote currencies at the end
    const quoteRegex = /(USDT|BTC|ETH|BNB|USDC|BUSD|DAI|PAX|TUSD|USDS|USD)$/;
    const match = upperSymbol.match(quoteRegex);
    if (match) {
      const quote = match[1];
      const base = upperSymbol.slice(0, -quote.length);
      return `${base}-${quote}`;
    }
    // Fallback: return as-is if pattern doesn't match
    return upperSymbol;
  }

  // Get historical OHLCV data (klines)
  async getKlines(
    symbol: string, 
    interval: string, 
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<MarketData[]> {
    try {
      this.logger.info('Fetching klines data', { symbol, interval, limit });

      // KuCoin uses different interval format: 1min, 5min, 15min, 30min, 1hour, 4hour, 1day, 1week
      const intervalMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '30m': '30min',
        '1h': '1hour',
        '4h': '4hour',
        '1d': '1day',
        '1w': '1week'
      };

      const kucoinInterval = intervalMap[interval] || interval;
      const kucoinSymbol = this.formatSymbolForKuCoin(symbol);
      
      const params: any = {
        symbol: kucoinSymbol,
        type: kucoinInterval
      };

      if (startTime) params.startAt = Math.floor(startTime / 1000); // KuCoin uses seconds
      if (endTime) params.endAt = Math.floor(endTime / 1000);

      const response = await this.httpClient.get('/api/v1/market/candles', { params });

      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }

      const marketData: MarketData[] = (response.data.data || []).map((kline: any[]) => ({
        symbol,
        timestamp: parseInt(kline[0]) * 1000, // Convert to milliseconds
        open: parseFloat(kline[1]),
        close: parseFloat(kline[2]),
        high: parseFloat(kline[3]),
        low: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
        interval: kucoinInterval
      })).reverse(); // KuCoin returns data in reverse order

      this.logger.info('Successfully fetched klines data', { 
        symbol, 
        interval, 
        count: marketData.length 
      });

      return marketData.slice(0, limit);

    } catch (error) {
      this.logger.error('Failed to fetch klines data', { symbol, interval }, error as Error);
      throw error;
    }
  }

  // Get current price for symbol
  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const kucoinSymbol = this.formatSymbolForKuCoin(symbol);
      const response = await this.httpClient.get('/api/v1/market/orderbook/level1', {
        params: { symbol: kucoinSymbol }
      });

      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }

      return parseFloat(response.data.data.price);
    } catch (error) {
      this.logger.error('Failed to get current price', { symbol }, error as Error);
      throw error;
    }
  }

  // Get 24hr ticker statistics
  async get24hrTicker(symbol?: string): Promise<any> {
    try {
      const endpoint = symbol 
        ? '/api/v1/market/stats'
        : '/api/v1/market/allTickers';
      
      const kucoinSymbol = symbol ? this.formatSymbolForKuCoin(symbol) : undefined;
      const params = kucoinSymbol ? { symbol: kucoinSymbol } : {};
      const response = await this.httpClient.get(endpoint, { params });
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get 24hr ticker', { symbol }, error as Error);
      throw error;
    }
  }

  // Subscribe to kline data stream
  async subscribeToKlines(symbols: string[], interval: string = '1m'): Promise<WebSocket> {
    const intervalMap: Record<string, string> = {
      '1m': '1min',
      '5m': '5min',
      '15m': '15min',
      '30m': '30min',
      '1h': '1hour',
      '4h': '4hour',
      '1d': '1day',
      '1w': '1week'
    };
    
    const kucoinInterval = intervalMap[interval] || interval;
    
    const channels = (symbols || []).map(symbol => 
      `/market/candles:${this.formatSymbolForKuCoin(symbol)}_${kucoinInterval}`
    );
    
    return this.connectWebSocket(channels);
  }

  // Subscribe to ticker data stream
  async subscribeToTickers(symbols: string[]): Promise<WebSocket> {
    const channels = (symbols || []).map(symbol => 
      `/market/ticker:${this.formatSymbolForKuCoin(symbol)}`
    );
    
    return this.connectWebSocket(channels);
  }

  // Get server time
  async getServerTime(): Promise<number> {
    try {
      const response = await this.httpClient.get('/api/v1/timestamp');
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return parseInt(response.data.data);
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
    
    this.wsConnections.forEach((ws, channel) => {
      this.logger.info('Closing WebSocket connection', { channel });
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
      const response = await this.httpClient.get('/api/v1/accounts', {
        headers: { 'X-REQUIRE-AUTH': 'true' }
      });
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get account info', {}, error as Error);
      throw error;
    }
  }

  // Get exchange info (symbols list)
  async getExchangeInfo(): Promise<any> {
    try {
      const response = await this.httpClient.get('/api/v1/symbols');
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get exchange info', {}, error as Error);
      throw error;
    }
  }

  // Get currencies list
  async getCurrencies(): Promise<any> {
    try {
      const response = await this.httpClient.get('/api/v1/currencies');
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get currencies', {}, error as Error);
      throw error;
    }
  }

  // Place order (authenticated)
  async placeOrder(params: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    size: string;
    price?: string;
    timeInForce?: 'GTC' | 'GTT' | 'IOC' | 'FOK';
  }): Promise<any> {
    try {
      const response = await this.httpClient.post('/api/v1/orders', params, {
        headers: { 'X-REQUIRE-AUTH': 'true' }
      });
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to place order', { params }, error as Error);
      throw error;
    }
  }

  // Cancel order (authenticated)
  async cancelOrder(orderId: string): Promise<any> {
    try {
      const response = await this.httpClient.delete(`/api/v1/orders/${orderId}`, {
        headers: { 'X-REQUIRE-AUTH': 'true' }
      });
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to cancel order', { orderId }, error as Error);
      throw error;
    }
  }

  // Get order details (authenticated)
  async getOrder(orderId: string): Promise<any> {
    try {
      const response = await this.httpClient.get(`/api/v1/orders/${orderId}`, {
        headers: { 'X-REQUIRE-AUTH': 'true' }
      });
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get order', { orderId }, error as Error);
      throw error;
    }
  }

  // Get open orders (authenticated)
  async getOpenOrders(symbol?: string): Promise<any> {
    try {
      const params = symbol ? { symbol: symbol.toUpperCase() } : {};
      const response = await this.httpClient.get('/api/v1/orders', {
        params: { ...params, status: 'active' },
        headers: { 'X-REQUIRE-AUTH': 'true' }
      });
      
      if (response.data.code !== '200000') {
        console.error(`KuCoin API error: ${response.data.msg}`);
      }
      
      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get open orders', { symbol }, error as Error);
      throw error;
    }
  }

  // Get all available trading symbols
  async getAllSymbols(): Promise<string[]> {
    try {
      const response = await this.httpClient.get('/api/v2/symbols');
      
      if (response.data.code !== '200000') {
        this.logger.warn('Failed to get symbols from KuCoin', { error: response.data.msg });
        return [];
      }
      
      // Extract symbol names from the response
      const symbols = response.data.data?.map((item: any) => item.symbol) || [];
      return symbols;
    } catch (error) {
      this.logger.error('Failed to get all symbols', {}, error as Error);
      return []; // Return empty array on error
    }
  }
}

