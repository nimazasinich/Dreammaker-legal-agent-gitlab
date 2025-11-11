/**
 * Centralized API Integration Adapter
 * آداپتر یکپارچه‌سازی برای سرویس‌های موجود
 * 
 * این فایل CentralizedAPIManager را با سرویس‌های موجود یکپارچه می‌کند
 */

import { centralizedAPIManager } from './CentralizedAPIManager.js';
import { CentralizedAPIConfig } from '../config/CentralizedAPIConfig.js';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

/**
 * API Integration Helper
 * Helper functions برای استفاده از CentralizedAPIManager در سرویس‌های موجود
 */
export class APIIntegrationHelper {
  /**
   * Get market prices using centralized manager
   */
  static async getMarketPrices(symbols: string[]): Promise<any[]> {
    try {
      const response = await centralizedAPIManager.getMarketPrices(symbols);
      
      if (!response.success || !response.data) {
        console.error(response.error || 'Failed to fetch market prices');
      }

      // Convert response to PriceData format
      const prices: any[] = [];
      
      if (response.source === 'coingecko' && response.data) {
        // CoinGecko format: { bitcoin: { usd: 50000 }, ... }
        symbols.forEach(symbol => {
          const geckoId = symbol.toLowerCase();
          const coinData = response.data[geckoId];
          if (coinData && coinData.usd) {
            prices.push({
              symbol: symbol.toUpperCase(),
              price: coinData.usd,
              volume24h: coinData.usd_24h_vol || 0,
              change24h: coinData.usd_24h_change || 0,
              changePercent24h: coinData.usd_24h_change || 0,
              marketCap: coinData.usd_market_cap,
              source: response.source,
              timestamp: Date.now()
            });
          }
        });
      } else if (response.source.includes('coinmarketcap') && response.data?.data) {
        // CoinMarketCap format: { data: { BTC: [{ quote: { USD: {...} } }] } }
        Object.entries(response.data.data).forEach(([symbol, data]: [string, any]) => {
          if (data && data[0]?.quote?.USD) {
            const quote = data[0].quote.USD;
            prices.push({
              symbol: symbol.toUpperCase(),
              price: quote.price,
              volume24h: quote.volume_24h || 0,
              change24h: quote.volume_24h_change_24h || 0,
              changePercent24h: quote.percent_change_24h || 0,
              marketCap: quote.market_cap,
              source: response.source,
              timestamp: Date.now()
            });
          }
        });
      } else if (response.source === 'cryptocompare' && response.data) {
        // CryptoCompare format: { BTC: { USD: 50000 }, ... }
        Object.entries(response.data).forEach(([symbol, data]: [string, any]) => {
          if (data && data.USD) {
            prices.push({
              symbol: symbol.toUpperCase(),
              price: data.USD,
              source: response.source,
              timestamp: Date.now()
            });
          }
        });
      }

      return prices;
    } catch (error) {
      logger.error('Failed to get market prices via centralized manager', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get Fear & Greed Index using centralized manager
   */
  static async getFearGreedIndex(): Promise<any> {
    try {
      const response = await centralizedAPIManager.getFearGreedIndex();
      
      if (!response.success || !response.data) {
        console.error(response.error || 'Failed to fetch Fear & Greed Index');
      }

      // Parse Alternative.me format
      if (response.data.data && Array.isArray(response.data.data) && (response.data.data?.length || 0) > 0) {
        const fng = response.data.data[0];
        return {
          value: parseInt(fng.value),
          classification: fng.value_classification,
          timestamp: new Date(parseInt(fng.timestamp) * 1000)
        };
      }

      return response.data;
    } catch (error) {
      logger.error('Failed to get Fear & Greed Index', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get crypto news using centralized manager
   */
  static async getCryptoNews(limit: number = 10): Promise<any[]> {
    try {
      const response = await centralizedAPIManager.getCryptoNews(limit);
      
      if (!response.success || !response.data) {
        console.error(response.error || 'Failed to fetch crypto news');
      }

      // Parse different news formats
      if (response.source === 'cryptopanic' && response.data.results) {
        return (response.data.results || []).map((post: any) => ({
          title: post.title,
          url: post.url,
          source: post.source?.title || 'CryptoPanic',
          published: new Date(post.published_at),
          sentiment: post.sentiment === 'positive' ? 'positive' : 
                    post.sentiment === 'negative' ? 'negative' : 'neutral'
        }));
      } else if (response.source === 'newsapi' && response.data.articles) {
        return (response.data.articles || []).map((article: any) => ({
          title: article.title,
          url: article.url,
          source: article.source?.name || 'NewsAPI',
          published: new Date(article.publishedAt),
          sentiment: 'neutral'
        }));
      } else if (response.source === 'reddit' && response.data.data?.children) {
        return (response.data.data.children || []).map((item: any) => ({
          title: item.data.title,
          url: `https://reddit.com${item.data.permalink}`,
          source: 'Reddit',
          published: new Date(item.data.created_utc * 1000),
          sentiment: 'neutral'
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to get crypto news', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get whale transactions using centralized manager
   */
  static async getWhaleTransactions(minValue: number = 1000000): Promise<any[]> {
    try {
      const response = await centralizedAPIManager.getWhaleTransactions(minValue);
      
      if (!response.success || !response.data) {
        console.error(response.error || 'Failed to fetch whale transactions');
      }

      // Parse different whale transaction formats
      if (response.source === 'clankapp' && Array.isArray(response.data)) {
        return response.data;
      } else if (response.source === 'whalealert' && response.data.transactions) {
        return (response.data.transactions || []).map((tx: any) => ({
          id: tx.hash,
          symbol: tx.symbol,
          amount: tx.amount,
          value: tx.amount_usd,
          from: tx.from?.owner || tx.from?.address,
          to: tx.to?.owner || tx.to?.address,
          timestamp: tx.timestamp,
          blockchain: tx.blockchain
        }));
      }

      return [];
    } catch (error) {
      logger.error('Failed to get whale transactions', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get blockchain balance using centralized manager
   */
  static async getBlockchainBalance(
    chain: 'ethereum' | 'bsc' | 'tron',
    address: string
  ): Promise<any> {
    try {
      let response;
      
      switch (chain) {
        case 'ethereum':
          response = await centralizedAPIManager.getETHBalance(address);
          break;
        case 'bsc':
          response = await centralizedAPIManager.getBSCBalance(address);
          break;
        case 'tron':
          response = await centralizedAPIManager.getTRONBalance(address);
          break;
        default:
          console.error(`Unsupported chain: ${chain}`);
      }

      if (!response.success || !response.data) {
        console.error(response.error || `Failed to fetch ${chain} balance`);
      }

      // Parse balance from different explorer formats
      if (response.source.includes('scan') && response.data.result) {
        // Etherscan/BscScan format
        return {
          address,
          balance: parseInt(response.data.result) / 1e18, // Convert wei to ETH/BNB
          source: response.source,
          timestamp: Date.now()
        };
      } else if (response.source.includes('tronscan') && response.data.balance) {
        // TronScan format
        return {
          address,
          balance: response.data.balance / 1e6, // Convert sun to TRX
          source: response.source,
          timestamp: Date.now()
        };
      } else if (response.source.includes('trongrid') && response.data.balance) {
        // TronGrid format
        return {
          address,
          balance: response.data.balance / 1e6,
          source: response.source,
          timestamp: Date.now()
        };
      }

      return response.data;
    } catch (error) {
      logger.error(`Failed to get ${chain} balance`, {}, error as Error);
      throw error;
    }
  }

  /**
   * Generic request method using centralized manager
   */
  static async request<T>(
    category: keyof typeof CentralizedAPIConfig,
    endpoint: string,
    options?: any
  ): Promise<T> {
    let categoryConfig: any;
    
    switch (category) {
      case 'marketData':
        categoryConfig = CentralizedAPIConfig.marketData;
        break;
      case 'news':
        categoryConfig = CentralizedAPIConfig.news;
        break;
      case 'sentiment':
        categoryConfig = CentralizedAPIConfig.sentiment;
        break;
      case 'whaleTracking':
        categoryConfig = CentralizedAPIConfig.whaleTracking;
        break;
      case 'onChainAnalytics':
        categoryConfig = CentralizedAPIConfig.onChainAnalytics;
        break;
      default:
        console.error(`Unknown category: ${category}`);
    }

    const response = await centralizedAPIManager.requestWithFallback(
      categoryConfig,
      endpoint,
      options
    );

    if (!response.success) {
      console.error(response.error || 'Request failed');
    }

    return response.data as T;
  }

  /**
   * Get API health status
   */
  static getAPIHealth(): Record<string, any> {
    return centralizedAPIManager.getAPIHealth();
  }

  /**
   * Clear cache
   */
  static clearCache(cacheType?: string): void {
    if (cacheType) {
      centralizedAPIManager.clearCache(cacheType);
    } else {
      centralizedAPIManager.clearAllCaches();
    }
  }

  /**
   * Reset API health
   */
  static resetAPIHealth(apiName?: string): void {
    centralizedAPIManager.resetAPIHealth(apiName);
  }
}

export default APIIntegrationHelper;

