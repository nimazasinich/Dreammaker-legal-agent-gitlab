/**
 * HuggingFace Market Data Adapter
 *
 * Handles market-related routes and provides fallback to Binance/KuCoin
 * when PRIMARY_DATA_SOURCE = mixed
 */

import { Logger } from '../../core/Logger.js';
import { HFDataEngineClient, HFCryptoPrice } from '../HFDataEngineClient.js';
import { HFOHLCVService, HFOHLCVData } from '../HFOHLCVService.js';
import { getPrimarySource } from '../../config/dataSource.js';
import { providerLatencyTracker } from '../../core/providerLatencyTracker.js';
import { providerRecoveryTracker } from '../../core/providerRecoveryTracker.js';
import { providerErrorLog } from '../../core/providerErrorLog.js';
import { MarketData } from '../../types/index.js';

/**
 * Standard error response format
 */
export interface AdapterErrorResponse {
  ok: false;
  provider: string;
  status: number;
  reason: string;
  message: string;
  endpoint?: string;
}

/**
 * Standard success response format
 */
export interface AdapterSuccessResponse<T> {
  ok: true;
  provider: string;
  data: T;
  timestamp: string;
}

export type AdapterResponse<T> = AdapterSuccessResponse<T> | AdapterErrorResponse;

/**
 * Market ticker data
 */
export interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h?: number;
  low24h?: number;
  lastUpdated: string;
}

/**
 * HuggingFace Market Adapter
 */
export class HFMarketAdapter {
  private static instance: HFMarketAdapter;
  private logger = Logger.getInstance();
  private hfClient: HFDataEngineClient;
  private hfOHLCV: HFOHLCVService;

  private constructor() {
    this.hfClient = HFDataEngineClient.getInstance();
    this.hfOHLCV = HFOHLCVService.getInstance();
    this.logger.info('HF Market Adapter initialized');
  }

  static getInstance(): HFMarketAdapter {
    if (!HFMarketAdapter.instance) {
      HFMarketAdapter.instance = new HFMarketAdapter();
    }
    return HFMarketAdapter.instance;
  }

  /**
   * Create error response
   */
  private createError(
    endpoint: string,
    message: string,
    status: number = 503,
    reason: string = 'SERVICE_UNAVAILABLE'
  ): AdapterErrorResponse {
    providerErrorLog.logError('huggingface', message, endpoint, status);
    return {
      ok: false,
      provider: 'huggingface',
      status,
      reason,
      message,
      endpoint
    };
  }

  /**
   * Create success response
   */
  private createSuccess<T>(data: T): AdapterSuccessResponse<T> {
    return {
      ok: true,
      provider: 'huggingface',
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if should use HuggingFace
   */
  private shouldUseHF(): boolean {
    const primarySource = getPrimarySource();
    return primarySource === 'huggingface' || primarySource === 'mixed';
  }

  /**
   * Get market prices (top cryptocurrencies)
   */
  async getMarketPrices(limit: number = 50): Promise<AdapterResponse<HFCryptoPrice[]>> {
    const endpoint = '/api/crypto/prices/top';

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.getTopPrices(limit);
      });

      if (HFDataEngineClient.isError(result)) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(endpoint, result.message, result.status, 'HF_ENGINE_ERROR');
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get ticker data for a specific symbol
   */
  async getTicker(symbol: string): Promise<AdapterResponse<TickerData>> {
    const endpoint = `/market/ticker/${symbol}`;

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    try {
      // Get top prices and filter for the symbol
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.getTopPrices(100);
      });

      if (HFDataEngineClient.isError(result)) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(endpoint, result.message, result.status, 'HF_ENGINE_ERROR');
      }

      // Find the symbol
      const symbolUpper = symbol.toUpperCase().replace('USDT', '').replace('USD', '');
      const ticker = result.find(p =>
        p.symbol.toUpperCase().includes(symbolUpper) ||
        symbolUpper.includes(p.symbol.toUpperCase())
      );

      if (!ticker) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(endpoint, `Symbol ${symbol} not found`, 404, 'SYMBOL_NOT_FOUND');
      }

      providerRecoveryTracker.recordSuccess('huggingface');

      const tickerData: TickerData = {
        symbol: ticker.symbol,
        price: ticker.price,
        change24h: ticker.change_24h,
        volume24h: ticker.volume_24h,
        lastUpdated: ticker.last_updated || new Date().toISOString()
      };

      return this.createSuccess(tickerData);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get OHLCV candlestick data
   */
  async getCandlestick(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 100
  ): Promise<AdapterResponse<HFOHLCVData[]>> {
    const endpoint = `/market/candlestick/${symbol}`;

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfOHLCV.getOHLCV(symbol, timeframe, limit);
      });

      // HFOHLCVService returns empty array on error, so check for that
      if (!result || result.length === 0) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(
          endpoint,
          `No OHLCV data available for ${symbol}`,
          404,
          'NO_DATA'
        );
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get OHLCV data in MarketData format
   */
  async getOHLCV(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 1000
  ): Promise<AdapterResponse<MarketData[]>> {
    const endpoint = '/market/ohlcv';

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfOHLCV.getHistoricalData(symbol, timeframe, limit);
      });

      // HFOHLCVService returns empty array on error
      if (!result || result.length === 0) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(
          endpoint,
          `No OHLCV data available for ${symbol}`,
          404,
          'NO_DATA'
        );
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get market overview
   */
  async getMarketOverview(): Promise<AdapterResponse<any>> {
    const endpoint = '/api/crypto/market-overview';

    if (!this.shouldUseHF()) {
      return this.createError(endpoint, 'HuggingFace is not the primary data source', 400, 'NOT_PRIMARY_SOURCE');
    }

    try {
      const result = await providerLatencyTracker.measure('huggingface', async () => {
        return await this.hfClient.getMarketOverview();
      });

      if (HFDataEngineClient.isError(result)) {
        providerRecoveryTracker.recordFailure('huggingface');
        return this.createError(endpoint, result.message, result.status, 'HF_ENGINE_ERROR');
      }

      providerRecoveryTracker.recordSuccess('huggingface');
      return this.createSuccess(result);
    } catch (error: any) {
      providerRecoveryTracker.recordFailure('huggingface');
      const message = error?.message || 'Unknown error occurred';
      return this.createError(endpoint, message, 500, 'INTERNAL_ERROR');
    }
  }
}

// Export singleton instance
export const hfMarketAdapter = HFMarketAdapter.getInstance();
