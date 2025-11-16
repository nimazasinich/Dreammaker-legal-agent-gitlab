import crypto from 'crypto';
import axios from 'axios';
import { Logger } from '../core/Logger.js';

interface KuCoinCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

interface FuturesPosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  marginMode: 'cross' | 'isolated';
}

interface FuturesOrder {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market';
  size: number;
  price?: number;
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  reduceOnly?: boolean;
}

export class KuCoinFuturesService {
  private static instance: KuCoinFuturesService;
  private readonly logger = Logger.getInstance();
  private credentials: Map<string, KuCoinCredentials> = new Map();
  private activeExchange = 'kucoin';
  private baseUrl = 'https://api-futures.kucoin.com';

  private constructor() {
    this.loadCredentials();
  }

  static getInstance(): KuCoinFuturesService {
    if (!KuCoinFuturesService.instance) {
      KuCoinFuturesService.instance = new KuCoinFuturesService();
    }
    return KuCoinFuturesService.instance;
  }

  private loadCredentials() {
    try {
      // Only use localStorage in browser environment
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('exchange_credentials');
        if (stored) {
          const creds = JSON.parse(stored);
          Object.entries(creds).forEach(([key, value]) => {
            this.credentials.set(key, value as KuCoinCredentials);
          });
        }
      } else {
        // Server-side: load from environment variables if available
        const envKey = process.env.KUCOIN_FUTURES_KEY;
        const envSecret = process.env.KUCOIN_FUTURES_SECRET;
        const envPassphrase = process.env.KUCOIN_FUTURES_PASSPHRASE;
        if (envKey && envSecret && envPassphrase) {
          this.credentials.set('kucoin', {
            apiKey: envKey,
            apiSecret: envSecret,
            passphrase: envPassphrase
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to load credentials', {}, error);
    }
  }

  saveCredentials(exchange: string, credentials: KuCoinCredentials) {
    this.credentials.set(exchange, credentials);
    // Only persist to localStorage in browser environment
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const creds: any = {};
      this.credentials.forEach((value, key) => {
        creds[key] = value;
      });
      localStorage.setItem('exchange_credentials', JSON.stringify(creds));
    }
  }

  setActiveExchange(exchange: string) {
    this.activeExchange = exchange;
  }

  private getCredentials(): KuCoinCredentials | null {
    return this.credentials.get(this.activeExchange) || null;
  }

  hasCredentials(): boolean {
    return this.getCredentials() !== null;
  }

  private generateSignature(timestamp: string, method: string, endpoint: string, body = ''): string {
    const creds = this.getCredentials();
    if (!creds) {
      throw new Error('KuCoin credentials not configured. Please configure API credentials in settings.');
    }

    const strToSign = timestamp + method + endpoint + body;
    const signature = crypto
      .createHmac('sha256', creds.apiSecret)
      .update(strToSign)
      .digest('base64');

    return signature;
  }

  private generateHeaders(method: string, endpoint: string, body = ''): any {
    const creds = this.getCredentials();
    if (!creds) {
      throw new Error('KuCoin credentials not configured. Please configure API credentials in settings.');
    }

    const timestamp = Date.now().toString();
    const signature = this.generateSignature(timestamp, method, endpoint, body);
    
    const passphrase = crypto
      .createHmac('sha256', creds.apiSecret)
      .update(creds.passphrase)
      .digest('base64');

    return {
      'KC-API-KEY': creds.apiKey,
      'KC-API-SIGN': signature,
      'KC-API-TIMESTAMP': timestamp,
      'KC-API-PASSPHRASE': passphrase,
      'KC-API-KEY-VERSION': '2',
      'Content-Type': 'application/json'
    };
  }

  async getPositions(): Promise<FuturesPosition[]> {
    // Check credentials before attempting API call
    if (!this.hasCredentials()) {
      throw new Error(
        'KuCoin Futures credentials not configured. ' +
        'Please add your API key, secret, and passphrase in Exchange Settings.'
      );
    }

    try {
      const endpoint = '/api/v1/positions';
      const headers = this.generateHeaders('GET', endpoint);

      const response = await axios.get(this.baseUrl + endpoint, { 
        headers,
        timeout: 15000 // 15 second timeout
      });
      
      if (response.data.code !== '200000') {
        const errorMsg = response.data.msg || 'Unknown error';
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: errorMsg });
        
        // Provide user-friendly error messages
        if (response.data.code === '400003') {
          throw new Error('Invalid KuCoin API credentials. Please check your API key and secret in Exchange Settings.');
        }
        if (response.data.code === '400004') {
          throw new Error('KuCoin API key has insufficient permissions. Ensure "Futures Trading" is enabled.');
        }
        if (response.data.code === '429000') {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        
        throw new Error(`KuCoin Futures API error: ${errorMsg}`);
      }

      return (response.data.data || []).map((pos: any) => ({
        symbol: pos.symbol,
        side: pos.currentQty > 0 ? 'long' : 'short',
        size: Math.abs(pos.currentQty),
        entryPrice: parseFloat(pos.avgEntryPrice),
        markPrice: parseFloat(pos.markPrice),
        leverage: parseInt(pos.realLeverage),
        unrealizedPnl: parseFloat(pos.unrealisedPnl),
        liquidationPrice: parseFloat(pos.liquidationPrice),
        marginMode: pos.crossMode ? 'cross' : 'isolated'
      }));
    } catch (error: any) {
      // Improve error messages for common network issues
      if (error.code === 'ECONNREFUSED') {
        const friendlyError = new Error(
          'Cannot connect to KuCoin Futures API. Check your network connection.'
        );
        this.logger.error('Connection refused to KuCoin', {}, friendlyError);
        throw friendlyError;
      }
      if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        const friendlyError = new Error(
          'KuCoin Futures API request timed out. Please try again.'
        );
        this.logger.error('KuCoin request timeout', {}, friendlyError);
        throw friendlyError;
      }
      
      this.logger.error('Failed to get positions from KuCoin', {}, error);
      
      // Re-throw with existing message if already friendly
      if (error.message && error.message.includes('KuCoin')) {
        throw error;
      }
      
      // Otherwise provide a generic friendly message
      throw new Error(
        'Futures service temporarily unavailable. Please try again later or check your Exchange Settings.'
      );
    }
  }

  async placeOrder(order: FuturesOrder): Promise<any> {
    // Check credentials first
    if (!this.hasCredentials()) {
      throw new Error(
        'KuCoin Futures credentials not configured. ' +
        'Please add your API key, secret, and passphrase in Exchange Settings.'
      );
    }

    try {
      const endpoint = '/api/v1/orders';
      const body = JSON.stringify({
        clientOid: Date.now().toString(),
        side: order.side,
        symbol: order.symbol,
        type: order.type,
        leverage: order.leverage || 10,
        size: order.size,
        price: order.price,
        reduceOnly: order.reduceOnly || false,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit
      });

      const headers = this.generateHeaders('POST', endpoint, body);

      const response = await axios.post(this.baseUrl + endpoint, body, { 
        headers,
        timeout: 15000
      });

      if (response.data.code !== '200000') {
        const errorMsg = response.data.msg || 'Unknown error';
        this.logger.warn('KuCoin order placement error', { code: response.data.code, msg: errorMsg });
        
        // Provide user-friendly error messages for common order errors
        if (response.data.code === '400003') {
          throw new Error('Invalid API credentials. Check your Exchange Settings.');
        }
        if (response.data.code === '400100') {
          throw new Error('Invalid order parameters. Check symbol, size, and price.');
        }
        if (response.data.code === '300003') {
          throw new Error('Insufficient balance to place order.');
        }
        if (response.data.code === '200004') {
          throw new Error('Order size too small. Increase the order quantity.');
        }
        
        throw new Error(`Order failed: ${errorMsg}`);
      }

      return response.data.data;
    } catch (error: any) {
      // Network error handling
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const friendlyError = new Error(
          'Cannot connect to KuCoin Futures. Check your network connection.'
        );
        this.logger.error('Network error placing order', {}, friendlyError);
        throw friendlyError;
      }
      
      this.logger.error('Failed to place order on KuCoin', {}, error);
      
      // Re-throw if already friendly
      if (error.message && (error.message.includes('KuCoin') || error.message.includes('Order failed'))) {
        throw error;
      }
      
      throw new Error(
        'Failed to place order. Please check your order parameters and try again.'
      );
    }
  }

  async closePosition(symbol: string): Promise<any> {
    try {
      const positions = await this.getPositions();
      const position = positions.find(p => p.symbol === symbol);
      
      if (!position) {
        this.logger.warn('Position not found', { symbol });
        throw new Error(`Position not found for symbol: ${symbol}`);
      }

      return await this.placeOrder({
        symbol,
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        size: position.size,
        reduceOnly: true
      });
    } catch (error: any) {
      this.logger.error('Failed to close position', {}, error);
      throw error;
    }
  }

  async setLeverage(symbol: string, leverage: number): Promise<any> {
    try {
      const endpoint = '/api/v1/position/risk-limit-level/change';
      const body = JSON.stringify({
        symbol,
        level: leverage
      });

      const headers = this.generateHeaders('POST', endpoint, body);

      const response = await axios.post(this.baseUrl + endpoint, body, { headers });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to set leverage', {}, error);
      throw error;
    }
  }

  async getAccountBalance(): Promise<any> {
    // Check credentials before attempting API call
    if (!this.hasCredentials()) {
      throw new Error(
        'KuCoin Futures credentials not configured. ' +
        'Please add your API key, secret, and passphrase in Exchange Settings.'
      );
    }

    try {
      const endpoint = '/api/v1/account-overview';
      const headers = this.generateHeaders('GET', endpoint);

      const response = await axios.get(this.baseUrl + endpoint, { 
        headers,
        timeout: 15000
      });

      if (response.data.code !== '200000') {
        const errorMsg = response.data.msg || 'Unknown error';
        this.logger.warn('KuCoin balance fetch error', { code: response.data.code, msg: errorMsg });
        
        if (response.data.code === '400003') {
          throw new Error('Invalid API credentials. Check your Exchange Settings.');
        }
        if (response.data.code === '400004') {
          throw new Error('API key lacks permission to view account balance.');
        }
        
        throw new Error(`Failed to fetch balance: ${errorMsg}`);
      }

      return {
        availableBalance: parseFloat(response.data.data.availableBalance),
        accountEquity: parseFloat(response.data.data.accountEquity),
        unrealisedPNL: parseFloat(response.data.data.unrealisedPNL),
        marginBalance: parseFloat(response.data.data.marginBalance)
      };
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        const friendlyError = new Error(
          'Cannot connect to KuCoin Futures. Check your network connection.'
        );
        this.logger.error('Network error fetching balance', {}, friendlyError);
        throw friendlyError;
      }
      
      this.logger.error('Failed to get account balance from KuCoin', {}, error);
      
      // Re-throw if already friendly
      if (error.message && error.message.includes('KuCoin')) {
        throw error;
      }
      
      throw new Error(
        'Failed to fetch account balance. Please check your Exchange Settings.'
      );
    }
  }

  async getOrderbook(symbol: string, depth = 20): Promise<any> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/level2/snapshot`, {
        params: { symbol }
      });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return {
        bids: response.data.data.bids.slice(0, depth),
        asks: response.data.data.asks.slice(0, depth),
        timestamp: response.data.data.ts
      };
    } catch (error: any) {
      this.logger.error('Failed to get orderbook', {}, error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<any[]> {
    // Check credentials before attempting API call
    if (!this.hasCredentials()) {
      throw new Error('KuCoin credentials not configured. Please configure API credentials in settings.');
    }

    try {
      const endpoint = '/api/v1/orders';
      const headers = this.generateHeaders('GET', endpoint);

      const response = await axios.get(this.baseUrl + endpoint, {
        headers,
        params: { status: 'active', symbol }
      });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return response.data.data.items;
    } catch (error: any) {
      this.logger.error('Failed to get open orders', {}, error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<any> {
    try {
      const endpoint = `/api/v1/orders/${orderId}`;
      const headers = this.generateHeaders('DELETE', endpoint);

      const response = await axios.delete(this.baseUrl + endpoint, { headers });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to cancel order', {}, error);
      throw error;
    }
  }

  async cancelAllOrders(symbol?: string): Promise<any> {
    try {
      const endpoint = '/api/v1/orders';
      const headers = this.generateHeaders('DELETE', endpoint);

      const response = await axios.delete(this.baseUrl + endpoint, {
        headers,
        params: { symbol }
      });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to cancel all orders', {}, error);
      throw error;
    }
  }
}
