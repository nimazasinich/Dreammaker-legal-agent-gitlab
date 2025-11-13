/**
 * Validation Schemas for Strategy Pipeline Endpoints
 *
 * Defines request validation rules for strategy pipeline API
 */

import { ValidationSchema } from '../ValidationMiddleware';

/**
 * Valid timeframe values
 */
const VALID_TIMEFRAMES = ['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '3d', '1w'];

/**
 * Valid data source modes
 */
const VALID_MODES = ['offline', 'online'];

/**
 * Schema for /api/strategies/pipeline/run
 */
export const runPipelineSchema: ValidationSchema = {
  symbols: {
    type: 'array',
    required: false,
    minLength: 1,
    maxLength: 100,
    items: {
      symbol: {
        type: 'string',
        required: true,
        minLength: 3,
        maxLength: 20,
        pattern: /^[A-Z0-9/]+$/,
        custom: (value) => {
          if (typeof value !== 'string') return 'Symbol must be a string';
          // Check common patterns for trading pairs
          if (!value.includes('/') && !value.includes('USDT') && !value.includes('USD')) {
            return 'Symbol should include base/quote pair (e.g., BTC/USDT)';
          }
          return true;
        }
      }
    }
  },

  timeframes: {
    type: 'array',
    required: false,
    minLength: 1,
    maxLength: 10,
    items: {
      timeframe: {
        type: 'string',
        required: true,
        enum: VALID_TIMEFRAMES,
        custom: (value) => {
          if (!VALID_TIMEFRAMES.includes(value as string)) {
            return `Invalid timeframe. Must be one of: ${VALID_TIMEFRAMES.join(', ')}`;
          }
          return true;
        }
      }
    }
  },

  limit: {
    type: 'number',
    required: false,
    min: 1,
    max: 100,
    custom: (value) => {
      if (!Number.isInteger(value as number)) {
        return 'Limit must be an integer';
      }
      return true;
    }
  },

  mode: {
    type: 'string',
    required: false,
    enum: VALID_MODES
  }
};

/**
 * Schema for market data endpoints (general)
 */
export const marketDataQuerySchema: ValidationSchema = {
  symbol: {
    type: 'string',
    required: false,
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9/]+$/
  },

  timeframe: {
    type: 'string',
    required: false,
    enum: VALID_TIMEFRAMES
  },

  limit: {
    type: 'number',
    required: false,
    min: 1,
    max: 1000
  }
};

/**
 * Schema for signal analysis endpoints
 */
export const signalAnalysisSchema: ValidationSchema = {
  symbol: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[A-Z0-9/]+$/
  },

  timeframe: {
    type: 'string',
    required: false,
    enum: VALID_TIMEFRAMES
  },

  indicators: {
    type: 'array',
    required: false,
    maxLength: 20,
    items: {
      indicator: {
        type: 'string',
        required: true,
        enum: [
          'rsi',
          'macd',
          'ma_cross',
          'bollinger',
          'volume',
          'support_resistance',
          'adx',
          'roc',
          'market_structure',
          'reversal',
          'sentiment',
          'news',
          'whales',
          'ml_ai'
        ]
      }
    }
  }
};

/**
 * Schema for scoring configuration updates
 */
export const scoringConfigSchema: ValidationSchema = {
  weights: {
    type: 'object',
    required: false,
    properties: {
      ml_ai: { type: 'number', min: 0, max: 1 },
      rsi: { type: 'number', min: 0, max: 1 },
      macd: { type: 'number', min: 0, max: 1 },
      ma_cross: { type: 'number', min: 0, max: 1 },
      bollinger: { type: 'number', min: 0, max: 1 },
      volume: { type: 'number', min: 0, max: 1 },
      support_resistance: { type: 'number', min: 0, max: 1 },
      adx: { type: 'number', min: 0, max: 1 },
      roc: { type: 'number', min: 0, max: 1 },
      market_structure: { type: 'number', min: 0, max: 1 },
      reversal: { type: 'number', min: 0, max: 1 },
      sentiment: { type: 'number', min: 0, max: 1 },
      news: { type: 'number', min: 0, max: 1 },
      whales: { type: 'number', min: 0, max: 1 }
    }
  },

  adaptive: {
    type: 'object',
    required: false,
    properties: {
      enabled: { type: 'boolean' },
      minSampleSize: { type: 'number', min: 10, max: 1000 },
      learningRate: { type: 'number', min: 0.001, max: 0.5 },
      decay: { type: 'number', min: 0.5, max: 0.999 }
    }
  }
};
