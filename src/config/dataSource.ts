/**
 * Data Source Configuration
 *
 * Centralized configuration for all data sources including
 * HuggingFace Data Engine, Binance, KuCoin, etc.
 */

import { Logger } from '../core/Logger.js';

export type DataSourceType = 'huggingface' | 'binance' | 'kucoin' | 'mixed';

export interface DataSourceConfig {
  // Primary data source
  primarySource: DataSourceType;

  // HuggingFace Data Engine configuration
  huggingface: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
  };

  // Exchange configurations
  exchanges: {
    binance: {
      enabled: boolean;
    };
    kucoin: {
      enabled: boolean;
    };
  };
}

class DataSourceConfigManager {
  private static instance: DataSourceConfigManager;
  private logger = Logger.getInstance();
  private config: DataSourceConfig;

  private constructor() {
    // Load configuration from environment variables
    const hfBaseUrl = process.env.HF_ENGINE_BASE_URL || 'http://localhost:8000';
    const primarySource = (process.env.PRIMARY_DATA_SOURCE as DataSourceType) || 'huggingface';

    this.config = {
      primarySource,
      huggingface: {
        enabled: process.env.HF_ENGINE_ENABLED !== 'false',
        baseUrl: hfBaseUrl,
        timeout: parseInt(process.env.HF_ENGINE_TIMEOUT || '30000', 10)
      },
      exchanges: {
        binance: {
          enabled: process.env.BINANCE_ENABLED !== 'false'
        },
        kucoin: {
          enabled: process.env.KUCOIN_ENABLED !== 'false'
        }
      }
    };

    this.logger.info('Data Source Configuration loaded', {
      primarySource: this.config.primarySource,
      hfEnabled: this.config.huggingface.enabled,
      hfBaseUrl: this.config.huggingface.baseUrl
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
   * Check if an exchange is enabled
   */
  isExchangeEnabled(exchange: 'binance' | 'kucoin'): boolean {
    return this.config.exchanges[exchange].enabled;
  }

  /**
   * Set primary data source (runtime override)
   */
  setPrimarySource(source: DataSourceType): void {
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
}

// Export singleton instance and convenience functions
const dataSourceConfigManager = DataSourceConfigManager.getInstance();

export const getDataSourceConfig = (): DataSourceConfig =>
  dataSourceConfigManager.getConfig();

export const getPrimarySource = (): DataSourceType =>
  dataSourceConfigManager.getPrimarySource();

export const isHuggingFaceEnabled = (): boolean =>
  dataSourceConfigManager.isHuggingFaceEnabled();

export const getHuggingFaceBaseUrl = (): string =>
  dataSourceConfigManager.getHuggingFaceBaseUrl();

export const getHuggingFaceTimeout = (): number =>
  dataSourceConfigManager.getHuggingFaceTimeout();

export const isExchangeEnabled = (exchange: 'binance' | 'kucoin'): boolean =>
  dataSourceConfigManager.isExchangeEnabled(exchange);

export const setPrimarySource = (source: DataSourceType): void =>
  dataSourceConfigManager.setPrimarySource(source);

export const setHuggingFaceEnabled = (enabled: boolean): void =>
  dataSourceConfigManager.setHuggingFaceEnabled(enabled);

// Export the manager for advanced use cases
export { DataSourceConfigManager };
