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
      const stored = localStorage.getItem('exchange_credentials');
      if (stored) {
        const creds = JSON.parse(stored);
        Object.entries(creds).forEach(([key, value]) => {
          this.credentials.set(key, value as KuCoinCredentials);
        });
      }
    } catch (error) {
      this.logger.error('Failed to load credentials', {}, error);
    }
  }

  saveCredentials(exchange: string, credentials: KuCoinCredentials) {
    this.credentials.set(exchange, credentials);
    const creds: any = {};
    this.credentials.forEach((value, key) => {
      creds[key] = value;
    });
    localStorage.setItem('exchange_credentials', JSON.stringify(creds));
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
      throw new Error('KuCoin credentials not configured. Please configure API credentials in settings.');
    }

    try {
      const endpoint = '/api/v1/positions';
      const headers = this.generateHeaders('GET', endpoint);

      const response = await axios.get(this.baseUrl + endpoint, { headers });
      
      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
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
      this.logger.error('Failed to get positions', {}, error);
      throw error;
    }
  }

  async placeOrder(order: FuturesOrder): Promise<any> {
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

      const response = await axios.post(this.baseUrl + endpoint, body, { headers });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return response.data.data;
    } catch (error: any) {
      this.logger.error('Failed to place order', {}, error);
      throw error;
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
      throw new Error('KuCoin credentials not configured. Please configure API credentials in settings.');
    }

    try {
      const endpoint = '/api/v1/account-overview';
      const headers = this.generateHeaders('GET', endpoint);

      const response = await axios.get(this.baseUrl + endpoint, { headers });

      if (response.data.code !== '200000') {
        this.logger.warn('KuCoin API error', { code: response.data.code, msg: response.data.msg });
      }

      return {
        availableBalance: parseFloat(response.data.data.availableBalance),
        accountEquity: parseFloat(response.data.data.accountEquity),
        unrealisedPNL: parseFloat(response.data.data.unrealisedPNL),
        marginBalance: parseFloat(response.data.data.marginBalance)
      };
    } catch (error: any) {
      this.logger.error('Failed to get account balance', {}, error);
      throw error;
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
