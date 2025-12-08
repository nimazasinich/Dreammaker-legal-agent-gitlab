/**
 * Data Source Configuration
 *
 * Centralized configuration for all data sources.
 * 
 * MIXED MODE ARCHITECTURE:
 * - HuggingFace is the PRIMARY data source
 * - CoinGecko and CryptoCompare are FALLBACK sources
 * - NO WebSocket usage - all data via HTTP(S) API
 * - NO Binance or KuCoin - completely excluded
 * 
 * The system operates in "Mixed Mode" where:
 * 1. HuggingFace is tried first
 * 2. If HuggingFace fails, fallback to CoinGecko/CryptoCompare
 * 3. Data is cached with TTL to reduce API calls
 * 4. API requests only made when data is needed (on-demand)
 */

// Ensure environment variables are loaded before any configuration
import dotenv from 'dotenv';
dotenv.config();

import { Logger } from '../core/Logger.js';

// NOTE: Binance and KuCoin are REMOVED from this system
// Only HuggingFace and free API sources (CoinGecko, CryptoCompare) are supported
export type DataSourceType = 'huggingface' | 'mixed';

// Available fallback sources (NO Binance/KuCoin)
export type FallbackSourceType = 'coingecko' | 'cryptocompare' | 'coinpaprika' | 'coincap';

export interface DataSourceConfig {
  // Primary data source (always HuggingFace or mixed mode)
  primarySource: DataSourceType;

  // HuggingFace Data Engine configuration
  huggingface: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
  };

  // Fallback sources configuration (replaces exchanges)
  fallbackSources: {
    coingecko: { enabled: boolean };
    cryptocompare: { enabled: boolean };
    coinpaprika: { enabled: boolean };
    coincap: { enabled: boolean };
  };

  // Cache configuration
  cache: {
    enabled: boolean;
    ttlMs: number;
  };

  // Polling configuration (replaces WebSocket)
  polling: {
    enabled: boolean;
    intervalMs: number;
  };
}

class DataSourceConfigManager {
  private static instance: DataSourceConfigManager;
  private logger = Logger.getInstance();
  private config: DataSourceConfig;

  private constructor() {
    // Load configuration from environment variables
    // Smart default: Use relative path for production/HuggingFace, localhost for dev
    const isProduction = process.env.NODE_ENV === 'production';
    const isHuggingFace = process.env.SPACE_ID || process.env.SPACE_AUTHOR_NAME;
    const defaultHfUrl = (isProduction || isHuggingFace) ? '/api/hf-engine' : 'http://localhost:8000';
    const hfBaseUrl = process.env.HF_ENGINE_BASE_URL || defaultHfUrl;
    
    // Default to 'mixed' mode for best reliability
    // NOTE: Binance and KuCoin are NOT supported - only HuggingFace and free APIs
    const primarySource = (process.env.PRIMARY_DATA_SOURCE as DataSourceType) || 'mixed';

    this.config = {
      primarySource,
      huggingface: {
        enabled: process.env.HF_ENGINE_ENABLED !== 'false',
        baseUrl: hfBaseUrl,
        timeout: parseInt(process.env.HF_ENGINE_TIMEOUT || '30000', 10)
      },
      // Fallback sources (NO Binance/KuCoin - completely removed)
      fallbackSources: {
        coingecko: { enabled: process.env.COINGECKO_ENABLED !== 'false' },
        cryptocompare: { enabled: process.env.CRYPTOCOMPARE_ENABLED !== 'false' },
        coinpaprika: { enabled: process.env.COINPAPRIKA_ENABLED !== 'false' },
        coincap: { enabled: process.env.COINCAP_ENABLED !== 'false' }
      },
      // Cache settings (enabled by default for efficiency)
      cache: {
        enabled: process.env.DATA_CACHE_ENABLED !== 'false',
        ttlMs: parseInt(process.env.DATA_CACHE_TTL_MS || '60000', 10)
      },
      // Polling replaces WebSocket for real-time updates
      polling: {
        enabled: process.env.POLLING_ENABLED !== 'false',
        intervalMs: parseInt(process.env.POLLING_INTERVAL_MS || '30000', 10)
      }
    };

    this.logger.info('✅ Data Source Configuration loaded (Mixed Mode)', {
      primarySource: this.config.primarySource,
      hfEnabled: this.config.huggingface.enabled,
      hfBaseUrl: this.config.huggingface.baseUrl,
      fallbackSources: Object.entries(this.config.fallbackSources)
        .filter(([_, v]) => v.enabled)
        .map(([k]) => k),
      cacheEnabled: this.config.cache.enabled,
      pollingEnabled: this.config.polling.enabled,
      note: 'NO WebSocket, NO Binance, NO KuCoin'
    });
  }

  static getInstance(): DataSourceConfigManager {
    if (!DataSourceConfigManager.instance) {
      DataSourceConfigManager.instance = new DataSourceConfigManager();
    }
    return DataSourceConfigManager.instance;
  }

  /**
   * Get full data source configuration
   */
  getConfig(): DataSourceConfig {
    return { ...this.config };
  }

  /**
   * Get primary data source type
   */
  getPrimarySource(): DataSourceType {
    return this.config.primarySource;
  }

  /**
   * Check if HuggingFace engine is enabled
   */
  isHuggingFaceEnabled(): boolean {
    return this.config.huggingface.enabled;
  }

  /**
   * Get HuggingFace engine base URL
   */
  getHuggingFaceBaseUrl(): string {
    return this.config.huggingface.baseUrl;
  }

  /**
   * Get HuggingFace engine timeout
   */
  getHuggingFaceTimeout(): number {
    return this.config.huggingface.timeout;
  }

  /**
   * Check if a fallback source is enabled
   * NOTE: Binance and KuCoin are NOT supported - this replaces isExchangeEnabled
   */
  isFallbackSourceEnabled(source: FallbackSourceType): boolean {
    return this.config.fallbackSources[source]?.enabled ?? false;
  }

  /**
   * Get enabled fallback sources list
   */
  getEnabledFallbackSources(): FallbackSourceType[] {
    return Object.entries(this.config.fallbackSources)
      .filter(([_, config]) => config.enabled)
      .map(([name]) => name as FallbackSourceType);
  }

  /**
   * Check if cache is enabled
   */
  isCacheEnabled(): boolean {
    return this.config.cache.enabled;
  }

  /**
   * Get cache TTL
   */
  getCacheTTL(): number {
    return this.config.cache.ttlMs;
  }

  /**
   * Check if polling is enabled
   */
  isPollingEnabled(): boolean {
    return this.config.polling.enabled;
  }

  /**
   * Get polling interval
   */
  getPollingInterval(): number {
    return this.config.polling.intervalMs;
  }

  /**
   * Set primary data source (runtime override)
   * NOTE: Only 'huggingface' or 'mixed' are valid - NO Binance/KuCoin
   */
  setPrimarySource(source: DataSourceType): void {
    if (source !== 'huggingface' && source !== 'mixed') {
      this.logger.warn(`Invalid primary source: ${source}. Only 'huggingface' or 'mixed' are supported.`);
      return;
    }
    this.config.primarySource = source;
    this.logger.info('Primary data source changed', { newSource: source });
  }

  /**
   * Enable/disable HuggingFace engine (runtime override)
   */
  setHuggingFaceEnabled(enabled: boolean): void {
    this.config.huggingface.enabled = enabled;
    this.logger.info('HuggingFace engine status changed', { enabled });
  }

  /**
   * Enable/disable a fallback source
   */
  setFallbackSourceEnabled(source: FallbackSourceType, enabled: boolean): void {
    if (this.config.fallbackSources[source]) {
      this.config.fallbackSources[source].enabled = enabled;
      this.logger.info(`Fallback source ${source} status changed`, { enabled });
    }
  }

  /**
   * Check if system is running in mixed mode
   */
  isMixedMode(): boolean {
    return this.config.primarySource === 'mixed';
  }
}

// Export convenience functions (lazy initialization to allow dotenv.config() to run first)
export const getDataSourceConfig = (): DataSourceConfig =>
  DataSourceConfigManager.getInstance().getConfig();

export const getPrimarySource = (): DataSourceType =>
  DataSourceConfigManager.getInstance().getPrimarySource();

export const isHuggingFaceEnabled = (): boolean =>
  DataSourceConfigManager.getInstance().isHuggingFaceEnabled();

export const getHuggingFaceBaseUrl = (): string =>
  DataSourceConfigManager.getInstance().getHuggingFaceBaseUrl();

export const getHuggingFaceTimeout = (): number =>
  DataSourceConfigManager.getInstance().getHuggingFaceTimeout();

// NOTE: isExchangeEnabled is REMOVED - Binance and KuCoin are not supported
// Use isFallbackSourceEnabled instead for fallback source checks
export const isFallbackSourceEnabled = (source: FallbackSourceType): boolean =>
  DataSourceConfigManager.getInstance().isFallbackSourceEnabled(source);

export const getEnabledFallbackSources = (): FallbackSourceType[] =>
  DataSourceConfigManager.getInstance().getEnabledFallbackSources();

export const isCacheEnabled = (): boolean =>
  DataSourceConfigManager.getInstance().isCacheEnabled();

export const getCacheTTL = (): number =>
  DataSourceConfigManager.getInstance().getCacheTTL();

export const isPollingEnabled = (): boolean =>
  DataSourceConfigManager.getInstance().isPollingEnabled();

export const getPollingInterval = (): number =>
  DataSourceConfigManager.getInstance().getPollingInterval();

export const isMixedMode = (): boolean =>
  DataSourceConfigManager.getInstance().isMixedMode();

export const setPrimarySource = (source: DataSourceType): void =>
  DataSourceConfigManager.getInstance().setPrimarySource(source);

export const setHuggingFaceEnabled = (enabled: boolean): void =>
  DataSourceConfigManager.getInstance().setHuggingFaceEnabled(enabled);

// Export the manager for advanced use cases
export { DataSourceConfigManager };
