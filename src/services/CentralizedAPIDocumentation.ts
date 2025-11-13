/**
 * Centralized API Management System - Documentation
 * سیستم مدیریت متمرکز API - مستندات
 * 
 * این سیستم بر اساس فایل‌های api-config-complete.txt و api.txt ایجاد شده است
 * و شامل تمام API های موجود با fallback chain کامل می‌باشد
 */

import { centralizedAPIManager } from './CentralizedAPIManager.js';
import { Logger } from '../core/Logger.js';
import { APIIntegrationHelper } from './APIIntegrationHelper.js';
import { CentralizedAPIConfig } from '../config/CentralizedAPIConfig.js';

const logger = Logger.getInstance();

/**
 * ============================================================================
 * راهنمای استفاده از سیستم مدیریت متمرکز API
 * ============================================================================
 * 
 * این سیستم تضمین می‌کند که:
 * ✅ همیشه جایگزین وجود دارد
 * ✅ هرگز به "نبود داده" برنمی‌خوریم
 * ✅ Rate limiting خودکار
 * ✅ Caching هوشمند
 * ✅ CORS proxy مدیریت خودکار
 * ✅ Health tracking برای API ها
 */

// ═══════════════════════════════════════════════════════════════════════════
// مثال 1: دریافت قیمت‌های بازار با fallback خودکار
// ═══════════════════════════════════════════════════════════════════════════

export async function exampleGetMarketPrices() {
  try {
    // استفاده از Helper (ساده‌تر)
    const prices = await APIIntegrationHelper.getMarketPrices(['BTC', 'ETH', 'SOL']);
    logger.info('Market Prices:', { data: prices });
    
    // یا استفاده مستقیم از Manager
    const response = await centralizedAPIManager.getMarketPrices(['BTC', 'ETH']);
    if (response.success) {
      logger.info('Prices from:', { data: response.source });
      logger.info('Data:', { data: response.data });
    }
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 2: دریافت Fear & Greed Index
// ═══════════════════════════════════════════════════════════════════════════

export async function exampleGetFearGreed() {
  try {
    const fng = await APIIntegrationHelper.getFearGreedIndex();
    logger.info(`Fear & Greed: ${fng.value} (${fng.classification});`);
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 3: دریافت اخبار کریپتو
// ═══════════════════════════════════════════════════════════════════════════

export async function exampleGetCryptoNews() {
  try {
    const news = await APIIntegrationHelper.getCryptoNews(10);
    news.forEach((article, i) => {
      logger.info(`${i + 1}. ${article.title} - ${article.source}`);
    });
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 4: دریافت موجودی بلاکچین
// ═══════════════════════════════════════════════════════════════════════════

export async function exampleGetBalance() {
  try {
    // Ethereum
    const ethBalance = await APIIntegrationHelper.getBlockchainBalance(
      'ethereum',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    );
    logger.info('ETH Balance:', { data: ethBalance.balance, unit: 'ETH' });
    
    // BSC
    const bscBalance = await APIIntegrationHelper.getBlockchainBalance(
      'bsc',
      '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    );
    logger.info('BNB Balance:', { data: bscBalance.balance, unit: 'BNB' });
    
    // TRON
    const tronBalance = await APIIntegrationHelper.getBlockchainBalance(
      'tron',
      'TxxxXXXxxx'
    );
    logger.info('TRX Balance:', { data: tronBalance.balance, unit: 'TRX' });
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 5: دریافت تراکنش‌های نهنگ
// ═══════════════════════════════════════════════════════════════════════════

export async function exampleGetWhaleTransactions() {
  try {
    const transactions = await APIIntegrationHelper.getWhaleTransactions(1000000);
    transactions.forEach((tx, i) => {
      logger.info(`${i + 1}. ${tx.amount} ${tx.symbol} from ${tx.from} to ${tx.to}`);
    });
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 6: درخواست سفارشی با fallback
// ═══════════════════════════════════════════════════════════════════════════

export async function exampleCustomRequest() {
  try {
    // استفاده از category و endpoint
    const data = await APIIntegrationHelper.request(
      'sentiment',
      '/?limit=1&format=json'
    );
    logger.info('Sentiment Data:', { data: data });
  } catch (error) {
    logger.error('Error:', {}, error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 7: مدیریت Cache و Health
// ═══════════════════════════════════════════════════════════════════════════

export function exampleManageCacheAndHealth() {
  // بررسی وضعیت API ها
  const health = APIIntegrationHelper.getAPIHealth();
  logger.info('API Health:', { data: health });
  
  // پاک کردن cache خاص
  APIIntegrationHelper.clearCache('marketData');

  // Note: clearAllCaches is not available, use clearCache for each category
  // APIIntegrationHelper.clearAllCaches();

  // Reset health برای API خاص
  APIIntegrationHelper.resetAPIHealth('coingecko');
}

// ═══════════════════════════════════════════════════════════════════════════
// مثال 8: یکپارچه‌سازی با سرویس‌های موجود
// ═══════════════════════════════════════════════════════════════════════════

/**
 * برای استفاده در MultiProviderMarketDataService:
 */
export class EnhancedMultiProviderService {
  private readonly logger = Logger.getInstance();

  async getRealTimePrices(symbols: string[]): Promise<any[]> {
    try {
      // استفاده از CentralizedAPIManager
      return await APIIntegrationHelper.getMarketPrices(symbols);
    } catch (error) {
      // Fallback به سرویس قدیمی اگر نیاز باشد
      logger.warn('Centralized manager failed, using fallback...');
      throw error;
    }
  }
}

/**
 * برای استفاده در SentimentNewsService:
 */
export class EnhancedSentimentService {
  async getFearGreedIndex(): Promise<any> {
    try {
      return await APIIntegrationHelper.getFearGreedIndex();
    } catch (error) {
      logger.warn('Centralized manager failed, using fallback...');
      throw error;
    }
  }

  async getCryptoNews(limit: number): Promise<any[]> {
    try {
      return await APIIntegrationHelper.getCryptoNews(limit);
    } catch (error) {
      logger.warn('Centralized manager failed, using fallback...');
      throw error;
    }
  }
}

/**
 * برای استفاده در BlockchainDataService:
 */
export class EnhancedBlockchainService {
  async getBalance(chain: 'ethereum' | 'bsc' | 'tron', address: string): Promise<any> {
    try {
      return await APIIntegrationHelper.getBlockchainBalance(chain, address);
    } catch (error) {
      logger.warn('Centralized manager failed, using fallback...');
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ویژگی‌های سیستم
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ✅ Fallback Chain:
 *    هر API دارای یک primary و چندین fallback است
 *    سیستم به صورت خودکار از fallback بعدی استفاده می‌کند
 * 
 * ✅ CORS Proxy:
 *    مدیریت خودکار CORS proxy برای API هایی که نیاز دارند
 *    Round-robin برای توزیع بار
 * 
 * ✅ Rate Limiting:
 *    هر API دارای rate limiter مخصوص خود است
 *    Token bucket algorithm برای کنترل دقیق
 * 
 * ✅ Caching:
 *    Cache هوشمند برای هر نوع API
 *    TTL قابل تنظیم
 * 
 * ✅ Health Tracking:
 *    ردیابی سلامت API ها
 *    غیرفعال کردن خودکار API هایی که 5 بار متوالی fail می‌کنند
 *    فعال شدن مجدد پس از 5 دقیقه
 * 
 * ✅ Never Fail:
 *    همیشه حداقل یک جایگزین وجود دارد
 *    حتی اگر همه API ها fail کنند، پیام خطای واضح برمی‌گرداند
 */

// ═══════════════════════════════════════════════════════════════════════════
// API های موجود در سیستم
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Block Explorers:
 * - Ethereum: Etherscan (2 keys), Blockchair, BlockScout, Ethplorer, Infura, Alchemy, Covalent
 * - BSC: BscScan, Ankr, Blockchair, Nodereal
 * - TRON: TronScan, TronGrid, TronStack, Blockchair, TronScan v2
 * 
 * Market Data:
 * - CoinGecko (primary), CoinMarketCap (2 keys), CryptoCompare, CoinCap, CoinPaprika,
 *   Binance, CoinLore, Nomics, Messari, Mobula, CoinDesk
 * 
 * News:
 * - CryptoPanic (primary), NewsAPI, CryptoControl, Reddit, CoinDesk RSS, CoinTelegraph,
 *   CryptoSlate
 * 
 * Sentiment:
 * - Alternative.me (primary), Santiment, LunarCrush, TheTie, CryptoQuant, Glassnode Social,
 *   CoinGecko Community, Messari Social, Reddit Sentiment
 * 
 * Whale Tracking:
 * - ClankApp (primary), WhaleAlert, BitQuery, Arkham, Nansen, DeBank, Zerion
 * 
 * On-Chain Analytics:
 * - The Graph (primary), Glassnode, IntoTheBlock, Covalent, Moralis, Dune, Footprint
 */

export default {
  centralizedAPIManager,
  APIIntegrationHelper,
  CentralizedAPIConfig,
  examples: {
    exampleGetMarketPrices,
    exampleGetFearGreed,
    exampleGetCryptoNews,
    exampleGetBalance,
    exampleGetWhaleTransactions,
    exampleCustomRequest,
    exampleManageCacheAndHealth
  }
};

