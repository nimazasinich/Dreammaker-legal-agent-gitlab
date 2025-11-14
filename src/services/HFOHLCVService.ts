// src/services/HFOHLCVService.ts
import { HuggingFaceService } from './HuggingFaceService.js';
import { MarketData } from '../types/index.js';
import { TTLCache } from '../utils/cache.js';
import { Logger } from '../core/Logger.js';
import axios from 'axios';
import { withExponentialBackoff, isRateLimitError } from '../utils/exponentialBackoff.js';

export interface HFOHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
}

/**
 * Hugging Face OHLCV Service
 * Loads OHLCV data from HF datasets for cryptocurrencies
 */
export class HFOHLCVService extends HuggingFaceService {
  protected static instance: HFOHLCVService;

  // Dataset mappings
  private readonly DATASET_MAP: Record<string, string> = {
    'BTC': 'WinkingFace/CryptoLM-Bitcoin-BTC-USDT',
    'ETH': 'WinkingFace/CryptoLM-Ethereum-ETH-USDT',
    'SOL': 'WinkingFace/CryptoLM-Solana-SOL-USDT',
    'XRP': 'WinkingFace/CryptoLM-Ripple-XRP-USDT',
    // Fallback to general dataset
    'DEFAULT': 'linxy/CryptoCoin'
  };

  // Cache for loaded datasets (3 minutes)
  private readonly datasetCache = new TTLCache<any>(180000);
  private readonly ohlcvCache = new TTLCache<HFOHLCVData[]>(180000);

  private constructor() {
    super();
  }

  static getInstance(): HFOHLCVService {
    if (!HFOHLCVService.instance) {
      HFOHLCVService.instance = new HFOHLCVService();
    }
    return HFOHLCVService.instance;
  }

  /**
   * Get OHLCV data from HF dataset
   */
  async getOHLCV(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 1000
  ): Promise<HFOHLCVData[]> {
    const symbolUpper = symbol.replace('USDT', '').replace('USD', '').toUpperCase();
    const cacheKey = `${symbolUpper}_${timeframe}_${limit}`;

    // Check cache
    const cached = this.ohlcvCache.get(cacheKey);
    if (cached) {
      this.logger.debug('Returning cached OHLCV data', { symbol: symbolUpper, count: cached.length });
      return cached;
    }

    try {
      // Get dataset ID
      const datasetId = this.DATASET_MAP[symbolUpper] || this.DATASET_MAP['DEFAULT'];

      // Load data from HF dataset
      const data = await this.loadDataset(datasetId, symbolUpper, timeframe, limit);

      // Guard against undefined or null data
      const safeData = Array.isArray(data) ? data : [];

      // Cache result (even if empty, to avoid repeated failed requests)
      this.ohlcvCache.set(cacheKey, safeData);

      return safeData;
    } catch (error) {
      this.logger.error('Failed to load OHLCV from HF dataset', { symbol: symbolUpper, dataset: this.DATASET_MAP[symbolUpper] }, error as Error);
      // Return empty array instead of throwing to prevent cascading failures
      return [];
    }
  }

  /**
   * Load dataset from Hugging Face
   */
  private async loadDataset(
    datasetId: string,
    symbol: string,
    timeframe: string,
    limit: number
  ): Promise<HFOHLCVData[]> {
    const errors: string[] = [];

    // Try multiple dataset splits
    const splits = ['train', 'validation', 'test'];

    for (const split of splits) {
      try {
        // Use HF Datasets Server API
        // Query dataset via HF Datasets Server using /rows endpoint
        const url = `${this.DATASETS_API_BASE}/rows?dataset=${encodeURIComponent(datasetId)}&config=default&split=${split}&offset=0&length=${limit}`;

        this.logger.debug(`Attempting to load from HF: ${datasetId} (split: ${split})`);

        // Request data rows with exponential backoff for rate limits
        const response = await withExponentialBackoff(
          async () => {
            const resp = await axios.get(
              url,
              {
                timeout: 30000, // 30 seconds timeout
                headers: {
                  'Content-Type': 'application/json'
                },
                validateStatus: (status) => status < 500 // Don't throw on 4xx errors
              }
            );

            // Throw on rate limit to trigger retry
            if (resp.status === 429) {
              this.logger.warn(`HuggingFace rate limit hit for ${datasetId} (${split}), retrying with backoff...`);
              throw { response: resp, status: 429 };
            }

            return resp;
          },
          {
            maxRetries: 4,
            initialDelayMs: 2000,
            maxDelayMs: 30000,
            retryOn: (error) => isRateLimitError(error)
          }
        );

        // Check for successful response
        if (response.status !== 200) {
          errors.push(`${split}: HTTP ${response.status}`);
          continue;
        }

        const rows = response.data?.rows || [];

        if (rows.length === 0) {
          errors.push(`${split}: No data rows found`);
          continue;
        }

        // Convert to OHLCV format
        const ohlcvData: HFOHLCVData[] = [];

        for (const row of rows) {
          const rowData = row.row || {};

          // Map different possible column names
          const timestamp = this.extractTimestamp(rowData);
          const open = this.extractValue(rowData, ['open', 'Open', 'OPEN', 'o', 'O']);
          const high = this.extractValue(rowData, ['high', 'High', 'HIGH', 'h', 'H']);
          const low = this.extractValue(rowData, ['low', 'Low', 'LOW', 'l', 'L']);
          const close = this.extractValue(rowData, ['close', 'Close', 'CLOSE', 'c', 'C']);
          const volume = this.extractValue(rowData, ['volume', 'Volume', 'VOLUME', 'v', 'V']);

          if (timestamp && open !== null && high !== null && low !== null && close !== null) {
            ohlcvData.push({
              timestamp,
              open: Number(open),
              high: Number(high),
              low: Number(low),
              close: Number(close),
              volume: volume !== null ? Number(volume) : 0,
              symbol
            });
          }
        }

        if (ohlcvData.length === 0) {
          errors.push(`${split}: No valid OHLCV data after parsing`);
          continue;
        }

        // Sort by timestamp ascending
        ohlcvData.sort((a, b) => a.timestamp - b.timestamp);

        this.logger.info('Loaded OHLCV data from HF dataset', {
          datasetId,
          symbol,
          split,
          rowsLoaded: ohlcvData.length,
          requestedLimit: limit
        });

        return ohlcvData.slice(0, limit);
      } catch (error: any) {
        const errorMsg = error.response?.status
          ? `HTTP ${error.response.status}`
          : error.message || 'Unknown error';
        errors.push(`${split}: ${errorMsg}`);
        this.logger.debug(`Failed to load from split ${split}:`, error);
      }
    }

    // All splits failed
    const errorSummary = errors.join(', ');
    this.logger.error('Failed to load dataset from any split', {
      datasetId,
      symbol,
      attempts: errors.length,
      errors: errorSummary
    });

    // Return empty array instead of undefined to prevent "Cannot read properties of undefined" errors
    return [];
  }

  /**
   * Extract timestamp from row data
   */
  private extractTimestamp(rowData: any): number | null {
    // Try various timestamp formats
    if (rowData.timestamp) return Number(rowData.timestamp);
    if (rowData.time) return Number(rowData.time);
    if (rowData.date) {
      const date = new Date(rowData.date);
      return isNaN(date.getTime()) ? null : date.getTime();
    }
    if (rowData.datetime) {
      const date = new Date(rowData.datetime);
      return isNaN(date.getTime()) ? null : date.getTime();
    }
    
    return null;
  }

  /**
   * Extract value using multiple possible column names
   */
  private extractValue(rowData: any, keys: string[]): number | null {
    for (const key of keys) {
      if (rowData[key] !== undefined && rowData[key] !== null) {
        return Number(rowData[key]);
      }
    }
    return null;
  }

  /**
   * Convert HF OHLCV data to MarketData format
   */
  convertToMarketData(hfData: HFOHLCVData[], symbol: string, timeframe: string): MarketData[] {
    return (hfData || []).map(data => ({
      symbol: symbol.toUpperCase(),
      timestamp: data.timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume,
      timeframe,
      interval: timeframe
    }));
  }

  /**
   * Get historical data in MarketData format
   */
  async getHistoricalData(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 1000
  ): Promise<MarketData[]> {
    const hfData = await this.getOHLCV(symbol, timeframe, limit);
    return this.convertToMarketData(hfData, symbol, timeframe);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.datasetCache.clear();
    this.ohlcvCache.clear();
    this.logger.info('HF OHLCV cache cleared');
  }
}

