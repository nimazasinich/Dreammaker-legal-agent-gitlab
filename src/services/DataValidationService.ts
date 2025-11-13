import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  validationRate: number;
  commonErrors: Map<string, number>;
  lastValidationTime: number;
}

export class DataValidationService {
  private static instance: DataValidationService;
  private logger = Logger.getInstance();
  private qualityMetrics: DataQualityMetrics = {
    totalRecords: 0,
    validRecords: 0,
    invalidRecords: 0,
    validationRate: 0,
    commonErrors: new Map(),
    lastValidationTime: 0
  };

  private constructor() {}

  static getInstance(): DataValidationService {
    if (!DataValidationService.instance) {
      DataValidationService.instance = new DataValidationService();
    }
    return DataValidationService.instance;
  }

  validateMarketData(data: MarketData): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    this.qualityMetrics.totalRecords++;

    // Required field validation
    if (!data.symbol || typeof data.symbol !== 'string') {
      result.errors.push('Symbol is required and must be a string');
      result.isValid = false;
    }

    if (!data.timestamp || typeof data.timestamp !== 'number' || data.timestamp <= 0) {
      result.errors.push('Timestamp is required and must be a positive number');
      result.isValid = false;
    }

    if (typeof data.open !== 'number' || data.open <= 0) {
      result.errors.push('Open price must be a positive number');
      result.isValid = false;
    }

    if (typeof data.high !== 'number' || data.high <= 0) {
      result.errors.push('High price must be a positive number');
      result.isValid = false;
    }

    if (typeof data.low !== 'number' || data.low <= 0) {
      result.errors.push('Low price must be a positive number');
      result.isValid = false;
    }

    if (typeof data.close !== 'number' || data.close <= 0) {
      result.errors.push('Close price must be a positive number');
      result.isValid = false;
    }

    if (typeof data.volume !== 'number' || data.volume < 0) {
      result.errors.push('Volume must be a non-negative number');
      result.isValid = false;
    }

    if (!data.interval || typeof data.interval !== 'string') {
      result.errors.push('Interval is required and must be a string');
      result.isValid = false;
    }

    // Logical validation
    if (result.isValid) {
      if (data.high < data.low) {
        result.errors.push('High price cannot be less than low price');
        result.isValid = false;
      }

      if (data.high < Math.max(data.open, data.close)) {
        result.errors.push('High price must be at least as high as open and close prices');
        result.isValid = false;
      }

      if (data.low > Math.min(data.open, data.close)) {
        result.errors.push('Low price must be at most as low as open and close prices');
        result.isValid = false;
      }

      // Sanity checks and warnings
      const priceRange = data.high - data.low;
      const avgPrice = (data.high + data.low) / 2;
      const rangePercentage = priceRange / avgPrice;

      if (rangePercentage > 0.5) {
        result.warnings.push('Price range exceeds 50% of average price - possible data error');
      }

      if (rangePercentage > 1.0) {
        result.errors.push('Price range exceeds 100% of average price - likely data error');
        result.isValid = false;
      }

      // Volume sanity check
      if (data.volume === 0) {
        result.warnings.push('Zero volume detected');
      }

      // Timestamp validation
      const now = Date.now();
      const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
      const oneHourFromNow = now + (60 * 60 * 1000);

      const timestampMs = typeof data.timestamp === 'number' ? data.timestamp : data.timestamp.getTime();

      if (timestampMs < oneYearAgo) {
        result.warnings.push('Timestamp is more than one year old');
      }

      if (timestampMs > oneHourFromNow) {
        result.warnings.push('Timestamp is in the future');
      }
    }

    // Update metrics
    if (result.isValid) {
      this.qualityMetrics.validRecords++;
    } else {
      this.qualityMetrics.invalidRecords++;
      result.errors.forEach(error => {
        const count = this.qualityMetrics.commonErrors.get(error) || 0;
        this.qualityMetrics.commonErrors.set(error, count + 1);
      });
    }

    this.qualityMetrics.validationRate = this.qualityMetrics.validRecords / this.qualityMetrics.totalRecords;
    this.qualityMetrics.lastValidationTime = Date.now();

    if (!result.isValid) {
      this.logger.warn('Market data validation failed', {
        symbol: data.symbol,
        errors: result.errors,
        warnings: result.warnings
      });
    }

    return result;
  }

  validateBatch(dataArray: MarketData[]): {
    results: ValidationResult[];
    summary: {
      total: number;
      valid: number;
      invalid: number;
      validationRate: number;
    };
  } {
    const results = (dataArray || []).map(data => this.validateMarketData(data));
    const valid = results.filter(r => r.isValid).length;
    const invalid = results.length - valid;

    return {
      results,
      summary: {
        total: results.length,
        valid,
        invalid,
        validationRate: valid / results.length
      }
    };
  }

  getQualityMetrics(): DataQualityMetrics {
    return { ...this.qualityMetrics };
  }

  resetMetrics(): void {
    this.qualityMetrics = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      validationRate: 0,
      commonErrors: new Map(),
      lastValidationTime: 0
    };
    this.logger.info('Data quality metrics reset');
  }

  getDataQualityReport(): {
    metrics: DataQualityMetrics;
    topErrors: Array<{ error: string; count: number }>;
    recommendations: string[];
  } {
    const topErrors = Array.from(this.qualityMetrics.commonErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([error, count]) => ({ error, count }));

    const recommendations: string[] = [];

    if (this.qualityMetrics.validationRate < 0.95) {
      recommendations.push('Data validation rate is below 95% - investigate data sources');
    }

    if (this.qualityMetrics.commonErrors.has('Price range exceeds 100% of average price - likely data error')) {
      recommendations.push('High price volatility detected - implement additional data filtering');
    }

    if (this.qualityMetrics.commonErrors.has('Zero volume detected')) {
      recommendations.push('Zero volume records detected - consider filtering low-volume periods');
    }

    return {
      metrics: this.qualityMetrics,
      topErrors,
      recommendations
    };
  }
}