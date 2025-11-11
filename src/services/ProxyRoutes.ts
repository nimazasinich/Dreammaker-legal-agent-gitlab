/**
 * CORS Proxy Routes for External APIs
 * حل مشکل CORS برای Binance و CoinGecko APIs
 */

import express, { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

/**
 * Setup proxy routes for external APIs
 */
export function setupProxyRoutes(app: express.Application): void {
  /**
   * Binance API Proxy - حل مشکل CORS
   * GET binance/klines?symbol=BTCUSDT&interval=1h&limit=100
   */
  app.get('/binance/klines', async (req: Request, res: Response) => {
    try {
      const { symbol, interval, limit } = req.query;
      
      if (!symbol || !interval) {
        return res.status(400).json({ 
          error: 'Missing required parameters: symbol and interval' 
        });
      }

      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 100}`;
      
      logger.info('Fetching Binance klines via proxy', { symbol, interval, limit });
      
      const response = await fetch(binanceUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        // Handle 451 (Geo-blocked) or other errors
        if (response.status === 451) {
          logger.warn('Binance API blocked (451 - Geo restriction)', { symbol });
          return res.status(451).json({ 
            error: 'Binance API unavailable in your region',
            message: 'Please use VPN or alternative data source'
          });
        }
        
        console.error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
      
    } catch (error) {
      logger.error('Binance proxy error', {}, error as Error);
      res.status(500).json({ 
        error: 'Failed to fetch from Binance',
        message: (error as Error).message
      });
    }
  });

  /**
   * Binance 24hr Ticker Proxy
   * GET binance/ticker/24hr?symbol=BTCUSDT
   */
  app.get('/binance/ticker/24hr', async (req: Request, res: Response) => {
    try {
      const { symbol } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ error: 'Missing symbol parameter' });
      }

      const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
      
      const response = await fetch(binanceUrl, { mode: "cors", headers: { "Content-Type": "application/json" } });

      if (!response.ok) {
        if (response.status === 451) {
          return res.status(451).json({ 
            error: 'Binance API unavailable in your region'
          });
        }
        console.error(`Binance API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
      
    } catch (error) {
      logger.error('Binance ticker proxy error', {}, error as Error);
      res.status(500).json({ 
        error: 'Failed to fetch ticker from Binance',
        message: (error as Error).message
      });
    }
  });

  /**
   * CoinGecko API Proxy - حل مشکل CORS و 401
   * GET coingecko/market_chart?coinId=bitcoin&days=30&vs_currency=usd
   */
  app.get('/coingecko/market_chart', async (req: Request, res: Response) => {
    try {
      const { coinId, days, vs_currency, interval } = req.query;
      
      if (!coinId) {
        return res.status(400).json({ error: 'Missing coinId parameter' });
      }

      const apiKey = process.env.COINGECKO_API_KEY;
      const baseUrl = 'https://api.coingecko.com/api/v3';
      let url = `${baseUrl}/coins/${coinId}/market_chart?vs_currency=${vs_currency || 'usd'}&days=${days || 30}`;
      
      if (interval) {
        url += `&interval=${interval}`;
      }
      
      // Add API key if available
      if (apiKey) {
        url += `&x_cg_demo_api_key=${apiKey}`;
      }

      logger.info('Fetching CoinGecko market chart via proxy', { coinId, days });

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          logger.warn('CoinGecko API key missing or invalid (401)', { coinId });
          return res.status(401).json({ 
            error: 'CoinGecko API key required',
            message: 'Please set COINGECKO_API_KEY in environment variables'
          });
        }
        
        if (response.status === 429) {
          logger.warn('CoinGecko rate limit exceeded (429)', { coinId });
          return res.status(429).json({ 
            error: 'Rate limit exceeded',
            message: 'Too many requests to CoinGecko API'
          });
        }
        
        console.error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
      
    } catch (error) {
      logger.error('CoinGecko proxy error', {}, error as Error);
      res.status(500).json({ 
        error: 'Failed to fetch from CoinGecko',
        message: (error as Error).message
      });
    }
  });

  /**
   * CoinGecko Simple Price Proxy
   * GET coingecko/simple/price?ids=bitcoin,ethereum&vs_currencies=usd
   */
  app.get('/coingecko/simple/price', async (req: Request, res: Response) => {
    try {
      const { ids, vs_currencies, include_24hr_change, include_24hr_vol } = req.query;
      
      if (!ids) {
        return res.status(400).json({ error: 'Missing ids parameter' });
      }

      const apiKey = process.env.COINGECKO_API_KEY;
      let url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vs_currencies || 'usd'}`;
      
      if (include_24hr_change === 'true') {
        url += '&include_24hr_change=true';
      }
      if (include_24hr_vol === 'true') {
        url += '&include_24hr_vol=true';
      }
      
      if (apiKey) {
        url += `&x_cg_demo_api_key=${apiKey}`;
      }

      const response = await fetch(url, { mode: "cors", headers: { "Content-Type": "application/json" } });

      if (!response.ok) {
        if (response.status === 401) {
          return res.status(401).json({ 
            error: 'CoinGecko API key required'
          });
        }
        console.error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
      
    } catch (error) {
      logger.error('CoinGecko price proxy error', {}, error as Error);
      res.status(500).json({ 
        error: 'Failed to fetch prices from CoinGecko',
        message: (error as Error).message
      });
    }
  });

  logger.info('✅ CORS Proxy routes initialized');
}

