/**
 * Unified Proxy Service
 * 
 * این سرویس تمام درخواست‌های API را از طریق backend proxy می‌کند
 * مزایا:
 * - حل مشکل CORS
 * - مدیریت rate limiting
 * - کش کردن هوشمند
 * - fallback به چندین منبع
 * - retry logic
 */

import { Router, Request, Response } from 'express';
import axios, { AxiosError } from 'axios';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

interface ProxyConfig {
  url: string;
  cacheTTL?: number;
  rateLimit?: number;
  requiresAuth?: boolean;
}

export class UnifiedProxyService {
  private router: Router;
  private cache: Map<string, CacheEntry>;
  private requestCounts: Map<string, number[]>;
  
  constructor() {
    this.router = Router();
    this.cache = new Map();
    this.requestCounts = new Map();
    this.setupRoutes();
    this.startCacheCleanup();
  }

  /**
   * تنظیم روت‌های proxy
   */
  private setupRoutes(): void {
    // ====================
    // Binance Public API
    // ====================
    this.router.get('/binance/price', this.createProxyHandler({
      url: 'https://api.binance.com/api/v3/ticker/price',
      cacheTTL: 5000 // 5 seconds
    }));

    this.router.get('/binance/klines', this.createProxyHandler({
      url: 'https://api.binance.com/api/v3/klines',
      cacheTTL: 60000 // 1 minute
    }));

    this.router.get('/binance/ticker/24hr', this.createProxyHandler({
      url: 'https://api.binance.com/api/v3/ticker/24hr',
      cacheTTL: 10000 // 10 seconds
    }));

    // ====================
    // CoinGecko API
    // ====================
    this.router.get('/coingecko/simple/price', this.createProxyHandler({
      url: 'https://api.coingecko.com/api/v3/simple/price',
      cacheTTL: 10000, // 10 seconds
      rateLimit: 50 // max 50 requests per minute
    }));

    this.router.get('/coingecko/coins/markets', this.createProxyHandler({
      url: 'https://api.coingecko.com/api/v3/coins/markets',
      cacheTTL: 30000, // 30 seconds
      rateLimit: 50
    }));

    this.router.get('/coingecko/coins/:id', this.createProxyHandler({
      url: 'https://api.coingecko.com/api/v3/coins',
      cacheTTL: 60000, // 1 minute
      rateLimit: 50
    }));

    // ====================
    // Kraken Public API
    // ====================
    this.router.get('/kraken/ticker', this.createProxyHandler({
      url: 'https://api.kraken.com/0/public/Ticker',
      cacheTTL: 5000 // 5 seconds
    }));

    this.router.get('/kraken/ohlc', this.createProxyHandler({
      url: 'https://api.kraken.com/0/public/OHLC',
      cacheTTL: 60000 // 1 minute
    }));

    // ====================
    // CoinCap API
    // ====================
    this.router.get('/coincap/assets', this.createProxyHandler({
      url: 'https://api.coincap.io/v2/assets',
      cacheTTL: 10000 // 10 seconds
    }));

    this.router.get('/coincap/assets/:id', this.createProxyHandler({
      url: 'https://api.coincap.io/v2/assets',
      cacheTTL: 10000
    }));

    // ====================
    // CryptoPanic News
    // ====================
    this.router.get('/cryptopanic/posts', this.createProxyHandler({
      url: 'https://cryptopanic.com/api/free/v1/posts',
      cacheTTL: 300000 // 5 minutes
    }));

    // ====================
    // Fear & Greed Index
    // ====================
    this.router.get('/fear-greed', this.createProxyHandler({
      url: 'https://api.alternative.me/fng',
      cacheTTL: 3600000 // 1 hour
    }));

    // ====================
    // Generic Proxy
    // ====================
    this.router.get('/generic', async (req: Request, res: Response) => {
      const targetUrl = req.query.url as string;
      
      if (!targetUrl) {
        return res.status(400).json({ error: 'Missing url parameter' });
      }

      try {
        const response = await axios.get(targetUrl, {
          params: req.query,
          timeout: 10000,
          headers: {
            'User-Agent': process.env.DEFAULT_UA || 'DreammakerCrypto/1.0'
          }
        });

        res.json(response.data);
      } catch (error) {
        this.handleProxyError(error as AxiosError, res);
      }
    });
  }

  /**
   * ساخت handler برای proxy
   */
  private createProxyHandler(config: ProxyConfig) {
    return async (req: Request, res: Response) => {
      const cacheKey = this.getCacheKey(config.url, req.query, req.params);
      
      // Check cache
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return res.json({
          ...cached,
          _cached: true,
          _timestamp: Date.now()
        });
      }

      // Check rate limit
      if (config.rateLimit && !this.checkRateLimit(config.url, config.rateLimit)) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: 60
        });
      }

      // Build URL
      let url = config.url;
      if (req.params.id) {
        url = `${url}/${req.params.id}`;
      }

      try {
        const response = await this.fetchWithRetry(url, {
          params: req.query,
          timeout: 10000,
          headers: {
            'User-Agent': process.env.DEFAULT_UA || 'DreammakerCrypto/1.0'
          }
        });

        // Cache response
        if (config.cacheTTL) {
          this.setCache(cacheKey, response.data, config.cacheTTL);
        }

        res.json({
          ...response.data,
          _cached: false,
          _timestamp: Date.now()
        });
      } catch (error) {
        this.handleProxyError(error as AxiosError, res, cacheKey);
      }
    };
  }

  /**
   * دریافت از cache
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * ذخیره در cache
   */
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * ساخت کلید cache
   */
  private getCacheKey(url: string, query: any, params: any): string {
    const queryString = JSON.stringify(query);
    const paramsString = JSON.stringify(params);
    return `${url}:${queryString}:${paramsString}`;
  }

  /**
   * بررسی rate limit
   */
  private checkRateLimit(url: string, maxRequests: number): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const requests = this.requestCounts.get(url) || [];
    
    // حذف درخواست‌های قدیمی
    const recentRequests = requests.filter(timestamp => timestamp > oneMinuteAgo);
    
    if ((recentRequests?.length || 0) >= maxRequests) {
      return false;
    }

    // اضافه کردن درخواست جدید
    recentRequests.push(now);
    this.requestCounts.set(url, recentRequests);
    
    return true;
  }

  /**
   * Fetch با retry
   * Only uses proxy for Binance requests
   */
  private async fetchWithRetry(
    url: string,
    config: any,
    maxRetries: number = 5 // افزایش از 3 به 5 برای پایداری بیشتر
  ): Promise<any> {
    let lastError: Error | null = null;
    
    // Only use proxy for Binance API requests
    const isBinanceRequest = url.includes('api.binance.com');
    const axiosConfig = {
      ...config,
      // Only set proxy for Binance requests
      ...(isBinanceRequest && (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) ? {
        proxy: process.env.HTTPS_PROXY || process.env.HTTP_PROXY ? {
          host: new URL(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '').hostname,
          port: parseInt(new URL(process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '').port) || 8080,
          protocol: url.startsWith('https') ? 'https' : 'http'
        } : undefined
      } : {})
    };

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.get(url, axiosConfig);
        return response;
      } catch (error) {
        lastError = error as Error;
        
        // اگر خطای 4xx بود، دیگر retry نکن
        if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
          throw error;
        }

        // صبر کن قبل از retry بعدی
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * مدیریت خطاها
   */
  private handleProxyError(error: AxiosError, res: Response, cacheKey?: string): void {
    console.error('Proxy error:', error.message);

    // اگر داده cache شده (expired) داریم، آن را برگردان
    if (cacheKey) {
      const entry = this.cache.get(cacheKey);
      if (entry) {
        res.json({
          ...entry.data,
          _cached: true,
          _stale: true,
          _timestamp: Date.now()
        });
        return;
      }
    }

    // خطاهای مختلف
    if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: 'Request timeout',
        message: 'The API did not respond in time'
      });
      return;
    }

    if (error.response) {
      res.status(error.response.status).json({
        error: 'API error',
        status: error.response.status,
        message: error.message
      });
      return;
    }

    res.status(500).json({
      error: 'Proxy error',
      message: error.message
    });
  }

  /**
   * پاکسازی cache قدیمی
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // هر 1 دقیقه
  }

  /**
   * دریافت router
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * دریافت آمار
   */
  public getStats() {
    return {
      cacheSize: this.cache.size,
      requestCounts: Array.from(this.requestCounts.entries()).map(([url, counts]) => ({
        url,
        count: counts.length
      }))
    };
  }
}

export default UnifiedProxyService;
