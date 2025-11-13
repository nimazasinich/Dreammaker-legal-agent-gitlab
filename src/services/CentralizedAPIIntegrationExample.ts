/**
 * Example: Integration with MultiProviderMarketDataService
 * مثال: یکپارچه‌سازی با MultiProviderMarketDataService
 * 
 * این فایل نشان می‌دهد چگونه CentralizedAPIManager را با سرویس‌های موجود یکپارچه کنیم
 */

import { APIIntegrationHelper } from './APIIntegrationHelper.js';
import { Logger } from '../core/Logger.js';

const logger = Logger.getInstance();

/**
 * Enhanced MultiProviderMarketDataService
 * استفاده از CentralizedAPIManager به عنوان لایه اول
 */
export class EnhancedMultiProviderMarketDataService {
  
  /**
   * Get real-time prices with centralized manager as primary
   */
  async getRealTimePrices(symbols: string[]): Promise<any[]> {
    try {
      // استفاده از CentralizedAPIManager (دارای 11+ fallback)
      const prices = await APIIntegrationHelper.getMarketPrices(symbols);
      
      if (prices && (prices?.length || 0) > 0) {
        logger.info(`Successfully fetched prices from centralized manager for ${symbols.length} symbols`);
        return prices;
      }
    } catch (error) {
      logger.warn('CentralizedAPIManager failed, this should not happen due to fallbacks', {}, error as Error);
    }

    // این خط نباید اجرا شود چون CentralizedAPIManager همیشه fallback دارد
    // اما برای اطمینان اضافه شده است
    console.error('All price sources failed (this should not happen)');
  }

  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex(): Promise<any> {
    try {
      return await APIIntegrationHelper.getFearGreedIndex();
    } catch (error) {
      logger.error('Failed to get Fear & Greed Index', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get crypto news
   */
  async getCryptoNews(limit: number = 10): Promise<any[]> {
    try {
      return await APIIntegrationHelper.getCryptoNews(limit);
    } catch (error) {
      logger.error('Failed to get crypto news', {}, error as Error);
      throw error;
    }
  }
}

/**
 * Example: How to use in existing services
 */
export function integrationExample() {
  // 1. Import the helper
  // import { APIIntegrationHelper } from './services/APIIntegrationHelper';
  
  // 2. Use in your service
  const enhancedService = new EnhancedMultiProviderMarketDataService();
  
  // 3. Call methods - they automatically use centralized manager with fallbacks
  enhancedService.getRealTimePrices(['BTC', 'ETH', 'SOL'])
    .then(prices => {
      logger.info('Prices:', { data: prices });
    })
    .catch(error => {
      logger.error('Error:', {}, error);
    });
}

/**
 * Example: Direct usage without service wrapper
 */
export async function directUsageExample() {
  try {
    // Get market prices
    const prices = await APIIntegrationHelper.getMarketPrices(['BTC', 'ETH']);
    logger.info('Market Prices:', { data: prices });
    
    // Get Fear & Greed
    const fng = await APIIntegrationHelper.getFearGreedIndex();
    logger.info('Fear & Greed:', { data: fng.value, classification: fng.classification });
    
    // Get news
    const news = await APIIntegrationHelper.getCryptoNews(5);
    logger.info('Latest News:', { data: news.length, type: 'articles' });
    
    // Get blockchain balance
    const balance = await APIIntegrationHelper.getBlockchainBalance(
      'ethereum',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    );
    logger.info('ETH Balance:', { data: balance.balance });
    
    // Get whale transactions
    const whales = await APIIntegrationHelper.getWhaleTransactions(1000000);
    logger.info('Whale Transactions:', { data: whales.length });
    
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

/**
 * Example: Check API health
 */
export function healthCheckExample() {
  const health = APIIntegrationHelper.getAPIHealth();
  
  logger.info('API Health Status:');
  Object.entries(health).forEach(([api, status]) => {
    if (status.disabled) {
      logger.info(`❌ ${api}: Disabled (${status.failures} failures);`);
    } else {
      logger.info(`✅ ${api}: Healthy`);
    }
  });
  
  // Reset health if needed
  // APIIntegrationHelper.resetAPIHealth('coingecko');
}

/**
 * Example: Cache management
 */
export function cacheManagementExample() {
  // Clear specific cache
  APIIntegrationHelper.clearCache('marketData');

  // Clear all caches - method not available, using clearCache instead
  // APIIntegrationHelper.clearAllCaches();

  logger.info('Caches cleared');
}

export default {
  EnhancedMultiProviderMarketDataService,
  integrationExample,
  directUsageExample,
  healthCheckExample,
  cacheManagementExample
};

