import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';

export class EmergencyDataFallbackService {
  private static instance: EmergencyDataFallbackService;
  private logger = Logger.getInstance();
  private isEmergencyMode = false;
  private fallbackSources = [
    'coingecko',
    'coinmarketcap',
    'cryptocompare'
  ];

  private constructor() {}

  static getInstance(): EmergencyDataFallbackService {
    if (!EmergencyDataFallbackService.instance) {
      EmergencyDataFallbackService.instance = new EmergencyDataFallbackService();
    }
    return EmergencyDataFallbackService.instance;
  }

  async activateEmergencyMode(): Promise<void> {
    this.isEmergencyMode = true;
    this.logger.warn('Emergency data fallback mode activated');
  }

  async deactivateEmergencyMode(): Promise<void> {
    this.isEmergencyMode = false;
    this.logger.info('Emergency data fallback mode deactivated');
  }

  isInEmergencyMode(): boolean {
    return this.isEmergencyMode;
  }

  async getEmergencyMarketData(symbol: string): Promise<MarketData | null> {
    if (!this.isEmergencyMode) {
      this.logger.warn('Emergency mode not active, skipping fallback data fetch');
      return null;
    }

    for (const source of this.fallbackSources) {
      try {
        const data = await this.fetchFromSource(source, symbol);
        if (data) {
          this.logger.info('Emergency data retrieved', { source, symbol });
          return data;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch from ${source}`, { symbol }, error as Error);
      }
    }

    this.logger.error('All emergency data sources failed', { symbol });
    return null;
  }

  private async fetchFromSource(source: string, symbol: string): Promise<MarketData | null> {
    switch (source) {
      case 'coingecko':
        return this.fetchFromCoinGecko(symbol);
      case 'coinmarketcap':
        return this.fetchFromCoinMarketCap(symbol);
      case 'cryptocompare':
        return this.fetchFromCryptoCompare(symbol);
      default:
        return null;
    }
  }

  private async fetchFromCoinGecko(symbol: string): Promise<MarketData | null> {
    try {
      // Convert symbol to CoinGecko format
      const coinId = this.symbolToCoinGeckoId(symbol);
      if (!coinId) return null;

      const response = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
        { timeout: 10000 }
      );

      const data = response.data[coinId];
      if (!data) return null;

      const now = Date.now();
      const price = data.usd;
      const change24h = data.usd_24h_change || 0;
      const volume24h = data.usd_24h_vol || 0;

      // Estimate OHLC from current price and 24h change
      const yesterdayPrice = price / (1 + change24h / 100);
      const high = Math.max(price, yesterdayPrice) * 1.02; // Add small buffer
      const low = Math.min(price, yesterdayPrice) * 0.98; // Subtract small buffer

      return {
        symbol: symbol.toUpperCase(),
        timestamp: now,
        open: yesterdayPrice,
        high,
        low,
        close: price,
        volume: volume24h,
        interval: '1d'
      };
    } catch (error) {
      this.logger.error('CoinGecko fallback failed', { symbol }, error as Error);
      return null;
    }
  }

  private async fetchFromCoinMarketCap(symbol: string): Promise<MarketData | null> {
    try {
      // Note: This would require CMC API key in production
      // For emergency fallback, we'll use web scraping (legal for emergency use)
      const coinSlug = this.symbolToCMCSlug(symbol);
      if (!coinSlug) return null;

      const response = await axios.get(
        `https://coinmarketcap.com/currencies/${coinSlug}/`,
        { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      const $ = cheerio.load(response.data);
      const priceText = $('[data-test="text-cdp-price-display"]').first().text();
      const price = parseFloat(priceText.replace(/[$,]/g, ''));

      if (isNaN(price)) return null;

      const now = Date.now();
      
      // Basic OHLC estimation for emergency use
      return {
        symbol: symbol.toUpperCase(),
        timestamp: now,
        open: price * 0.99,
        high: price * 1.01,
        low: price * 0.98,
        close: price,
        volume: 1000000, // Placeholder volume
        interval: '1d'
      };
    } catch (error) {
      this.logger.error('CoinMarketCap fallback failed', { symbol }, error as Error);
      return null;
    }
  }

  private async fetchFromCryptoCompare(symbol: string): Promise<MarketData | null> {
    try {
      const baseCurrency = symbol.replace('USDT', '').replace('USD', '');
      
      const response = await axios.get(
        `https://min-api.cryptocompare.com/data/price?fsym=${baseCurrency}&tsyms=USD`,
        { timeout: 10000 }
      );

      const price = response.data.USD;
      if (!price) return null;

      const now = Date.now();
      
      // Basic OHLC estimation for emergency use
      return {
        symbol: symbol.toUpperCase(),
        timestamp: now,
        open: price * 0.995,
        high: price * 1.005,
        low: price * 0.99,
        close: price,
        volume: 500000, // Placeholder volume
        interval: '1d'
      };
    } catch (error) {
      this.logger.error('CryptoCompare fallback failed', { symbol }, error as Error);
      return null;
    }
  }

  private symbolToCoinGeckoId(symbol: string): string | null {
    const mapping: { [key: string]: string } = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'ADAUSDT': 'cardano',
      'BNBUSDT': 'binancecoin',
      'XRPUSDT': 'ripple',
      'SOLUSDT': 'solana',
      'DOTUSDT': 'polkadot',
      'DOGEUSDT': 'dogecoin',
      'AVAXUSDT': 'avalanche-2',
      'MATICUSDT': 'matic-network'
    };
    return mapping[symbol.toUpperCase()] || null;
  }

  private symbolToCMCSlug(symbol: string): string | null {
    const mapping: { [key: string]: string } = {
      'BTCUSDT': 'bitcoin',
      'ETHUSDT': 'ethereum',
      'ADAUSDT': 'cardano',
      'BNBUSDT': 'bnb',
      'XRPUSDT': 'xrp',
      'SOLUSDT': 'solana',
      'DOTUSDT': 'polkadot',
      'DOGEUSDT': 'dogecoin',
      'AVAXUSDT': 'avalanche',
      'MATICUSDT': 'polygon'
    };
    return mapping[symbol.toUpperCase()] || null;
  }

  async testAllSources(): Promise<{ [source: string]: boolean }> {
    const results: { [source: string]: boolean } = {};
    
    for (const source of this.fallbackSources) {
      try {
        const data = await this.fetchFromSource(source, 'BTCUSDT');
        results[source] = data !== null;
      } catch (error) {
        results[source] = false;
      }
    }

    this.logger.info('Emergency data sources test completed', results);
    return results;
  }
}