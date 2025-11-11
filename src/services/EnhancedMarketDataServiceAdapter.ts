/**
 * Enhanced Market Data Service Adapter
 *
 * Bridges the existing MultiProviderMarketDataService with the new UnifiedDataService
 * Provides backward compatibility while leveraging new multi-source capabilities
 */

import { Logger } from '../core/Logger.js';
import { UnifiedDataService, UnifiedPriceData } from './UnifiedDataService.js';
import type { PriceData } from './MultiProviderMarketDataService.js';

/**
 * Adapter for enhanced market data with backward compatibility
 */
export class EnhancedMarketDataServiceAdapter {
  private static instance: EnhancedMarketDataServiceAdapter;
  private logger = Logger.getInstance();
  private unifiedService = UnifiedDataService.getInstance();

  private constructor() {
    this.logger.info('EnhancedMarketDataServiceAdapter initialized');
  }

  static getInstance(): EnhancedMarketDataServiceAdapter {
    if (!EnhancedMarketDataServiceAdapter.instance) {
      EnhancedMarketDataServiceAdapter.instance = new EnhancedMarketDataServiceAdapter();
    }
    return EnhancedMarketDataServiceAdapter.instance;
  }

  /**
   * Get price data for a single symbol
   * Compatible with MultiProviderMarketDataService.getPrice()
   */
  async getPrice(symbol: string, vsCurrency: string = 'usd'): Promise<PriceData> {
    try {
      const data = await this.unifiedService.getPrice(symbol, vsCurrency);
      return this.convertToPriceData(data);
    } catch (error) {
      this.logger.error('Failed to get price', { symbol, vsCurrency }, error as Error);
      throw error;
    }
  }

  /**
   * Get prices for multiple symbols
   * Compatible with MultiProviderMarketDataService batch operations
   */
  async getPrices(symbols: string[], vsCurrency: string = 'usd'): Promise<PriceData[]> {
    try {
      const data = await this.unifiedService.getPrices(symbols, vsCurrency);
      return (data || []).map(d => this.convertToPriceData(d));
    } catch (error) {
      this.logger.error('Failed to get prices', { symbols, vsCurrency }, error as Error);
      throw error;
    }
  }

  /**
   * Get trending cryptocurrencies
   */
  async getTrending() {
    try {
      return await this.unifiedService.getTrending();
    } catch (error) {
      this.logger.error('Failed to get trending', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get health status of data providers
   */
  getHealthStatus() {
    return this.unifiedService.getHealthStatus();
  }

  /**
   * Get detailed provider health information
   */
  getProviderHealth() {
    return this.unifiedService.getProviderHealth();
  }

  /**
   * Reset provider health for recovery
   */
  resetProviderHealth(provider?: string) {
    this.unifiedService.resetProviderHealth('marketData', provider);
  }

  /**
   * Convert UnifiedPriceData to PriceData format
   */
  private convertToPriceData(data: UnifiedPriceData): PriceData {
    return {
      symbol: data.symbol,
      price: data.price,
      volume24h: data.volume24h || 0,
      change24h: data.change24h || 0,
      changePercent24h: data.changePercent24h || 0,
      marketCap: data.marketCap,
      source: data.source,
      timestamp: data.timestamp
    };
  }
}
