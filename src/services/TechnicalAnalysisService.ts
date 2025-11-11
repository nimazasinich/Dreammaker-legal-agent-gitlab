// src/services/TechnicalAnalysisService.ts
import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  sma: {
    sma20: number;
    sma50: number;
    sma200: number;
  };
  ema: {
    ema12: number;
    ema26: number;
    ema50: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  stochastic: {
    k: number;
    d: number;
  };
  adx: number;
  obv: number;
}

export class TechnicalAnalysisService {
  private static instance: TechnicalAnalysisService;
  private logger = Logger.getInstance();

  private constructor() {}

  static getInstance(): TechnicalAnalysisService {
    if (!TechnicalAnalysisService.instance) {
      TechnicalAnalysisService.instance = new TechnicalAnalysisService();
    }
    return TechnicalAnalysisService.instance;
  }

  /**
   * Calculate comprehensive technical indicators
   */
  calculateAllIndicators(data: MarketData[]): TechnicalIndicators {
    if (data.length < 50) {
      this.logger.warn('Insufficient data for technical analysis', { length: data.length });
    }

    const closes = (data || []).map(d => d.close);
    const highs = (data || []).map(d => d.high);
    const lows = (data || []).map(d => d.low);
    const volumes = (data || []).map(d => d.volume);

    return {
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      sma: {
        sma20: this.calculateSMA(closes, 20),
        sma50: this.calculateSMA(closes, 50),
        sma200: this.calculateSMA(closes, 200)
      },
      ema: {
        ema12: this.calculateEMA(closes, 12),
        ema26: this.calculateEMA(closes, 26),
        ema50: this.calculateEMA(closes, 50)
      },
      bollingerBands: this.calculateBollingerBands(closes, 20, 2),
      atr: this.calculateATR(data, 14),
      stochastic: this.calculateStochastic(highs, lows, closes, 14),
      adx: this.calculateADX(data, 14),
      obv: this.calculateOBV(closes, volumes)
    };
  }

  /**
   * Calculate RSI using Wilder's Smoothing (industry standard)
   */
  private calculateRSI(closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 50;

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    let avgGain = gains.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Calculate MACD with proper signal line (EMA9 of MACD)
   */
  private calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
    if (closes.length < 26) {
      return { macd: 0, signal: 0, histogram: 0 };
    }

    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);
    const macd = ema12 - ema26;

    const macdLine: number[] = [];
    for (let i = 26; i < closes.length; i++) {
      const periodCloses = closes.slice(0, i + 1);
      const periodEma12 = this.calculateEMA(periodCloses, 12);
      const periodEma26 = this.calculateEMA(periodCloses, 26);
      macdLine.push(periodEma12 - periodEma26);
    }

    let signal = 0;
    if ((macdLine?.length || 0) >= 9) {
      signal = this.calculateEMA(macdLine, 9);
    } else if ((macdLine?.length || 0) > 0) {
      signal = macdLine.reduce((sum, val) => sum + val, 0) / macdLine.length;
    } else {
      signal = macd * 0.9;
    }

    return { macd, signal, histogram: macd - signal };
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1] || 0;
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Calculate Exponential Moving Average
   */
  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];

    const multiplier = 2 / (period + 1);
    let ema = values[0];

    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  /**
   * Calculate Bollinger Bands
   */
  private calculateBollingerBands(
    closes: number[],
    period: number,
    stdDev: number
  ): { upper: number; middle: number; lower: number } {
    const middle = this.calculateSMA(closes, period);

    if (closes.length < period) {
      return { upper: middle, middle, lower: middle };
    }

    const slice = closes.slice(-period);
    const variance = slice.reduce((sum, val) => sum + Math.pow(val - middle, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: middle + (standardDeviation * stdDev),
      middle,
      lower: middle - (standardDeviation * stdDev)
    };
  }

  /**
   * Calculate Average True Range
   */
  private calculateATR(data: MarketData[], period: number): number {
    if (data.length < period + 1) return 0;

    const trueRanges: number[] = [];
    for (let i = 1; i < data.length; i++) {
      const tr = Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      );
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return 0;
    const slice = trueRanges.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  /**
   * Calculate Stochastic Oscillator
   */
  private calculateStochastic(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): { k: number; d: number } {
    if (closes.length < period) {
      return { k: 50, d: 50 };
    }

    const currentClose = closes[closes.length - 1];
    const periodHigh = Math.max(...highs.slice(-period));
    const periodLow = Math.min(...lows.slice(-period));

    if (periodHigh === periodLow) {
      return { k: 50, d: 50 };
    }

    const k = ((currentClose - periodLow) / (periodHigh - periodLow)) * 100;

    // Calculate %D as SMA of %K (3-period smoothing)
    const kValues: number[] = [];
    for (let i = period; i < closes.length; i++) {
      const periodClose = closes[i];
      const periodH = Math.max(...highs.slice(i - period, i + 1));
      const periodL = Math.min(...lows.slice(i - period, i + 1));
      if (periodH !== periodL) {
        kValues.push(((periodClose - periodL) / (periodH - periodL)) * 100);
      }
    }

    const d = (kValues?.length || 0) >= 3
      ? this.calculateSMA(kValues, 3)
      : k;

    return { k, d };
  }

  /**
   * Calculate Average Directional Index (ADX)
   */
  private calculateADX(data: MarketData[], period: number): number {
    if (data.length < period * 2) return 0;

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;

      plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      tr.push(Math.max(
        data[i].high - data[i].low,
        Math.abs(data[i].high - data[i - 1].close),
        Math.abs(data[i].low - data[i - 1].close)
      ));
    }

    if (plusDM.length < period || minusDM.length < period || tr.length < period) {
      return 0;
    }

    // Calculate smoothed values
    let plusDI = plusDM.slice(0, period).reduce((sum, val) => sum + val, 0) / tr.slice(0, period).reduce((sum, val) => sum + val, 0) * 100;
    let minusDI = minusDM.slice(0, period).reduce((sum, val) => sum + val, 0) / tr.slice(0, period).reduce((sum, val) => sum + val, 0) * 100;

    for (let i = period; i < plusDM.length; i++) {
      const trSum = tr.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0);
      plusDI = (plusDM.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / trSum) * 100;
      minusDI = (minusDM.slice(i - period + 1, i + 1).reduce((sum, val) => sum + val, 0) / trSum) * 100;
    }

    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;

    return dx;
  }

  /**
   * Calculate On-Balance Volume
   */
  private calculateOBV(closes: number[], volumes: number[]): number {
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        obv += volumes[i];
      } else if (closes[i] < closes[i - 1]) {
        obv -= volumes[i];
      }
    }
    return obv;
  }

  /**
   * Detect trend direction based on multiple indicators
   */
  detectTrend(indicators: TechnicalIndicators): 'bullish' | 'bearish' | 'neutral' {
    let bullishSignals = 0;
    let bearishSignals = 0;

    // RSI signals
    if (indicators.rsi > 50 && indicators.rsi < 70) bullishSignals++;
    else if (indicators.rsi < 50 && indicators.rsi > 30) bearishSignals++;

    // MACD signals
    if (indicators.macd.histogram > 0) bullishSignals++;
    else if (indicators.macd.histogram < 0) bearishSignals++;

    // Moving average signals
    if (indicators.sma.sma20 > indicators.sma.sma50) bullishSignals++;
    else if (indicators.sma.sma20 < indicators.sma.sma50) bearishSignals++;

    // Stochastic signals
    if (indicators.stochastic.k > 50) bullishSignals++;
    else if (indicators.stochastic.k < 50) bearishSignals++;

    if (bullishSignals > bearishSignals) return 'bullish';
    if (bearishSignals > bullishSignals) return 'bearish';
    return 'neutral';
  }
}

