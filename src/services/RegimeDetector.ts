// src/services/RegimeDetector.ts
import { Logger } from '../core/Logger.js';
import { OHLCVData } from './MultiProviderMarketDataService.js';

export type MarketRegime = 'bull' | 'bear' | 'sideways';

export interface RegimeResult {
  regime: MarketRegime;
  confidence: number;
  indicators: {
    sma50: number;
    sma200: number;
    priceVsSma50: number;
    priceVsSma200: number;
    atr: number;
    atrPercent: number;
    volumeTrend: number;
  };
  reasoning: string[];
  score: number; // -1 (bear) to +1 (bull), 0 (sideways)
}

export class RegimeDetector {
  private static instance: RegimeDetector;
  private logger = Logger.getInstance();

  private constructor() {}

  public static getInstance(): RegimeDetector {
    if (!RegimeDetector.instance) {
      RegimeDetector.instance = new RegimeDetector();
    }
    return RegimeDetector.instance;
  }

  /**
   * Detect market regime based on price action and indicators
   */
  public detect(candles: OHLCVData[]): RegimeResult {
    if (candles.length < 200) {
      this.logger.warn('RegimeDetector: Insufficient data for regime detection', {
        candlesCount: candles.length
      });

      // Return default sideways regime
      return {
        regime: 'sideways',
        confidence: 0.5,
        indicators: {
          sma50: 0,
          sma200: 0,
          priceVsSma50: 0,
          priceVsSma200: 0,
          atr: 0,
          atrPercent: 0,
          volumeTrend: 0
        },
        reasoning: ['Insufficient data for regime detection'],
        score: 0
      };
    }

    // Calculate indicators
    const closes = (candles || []).map(c => c.close);
    const highs = (candles || []).map(c => c.high);
    const lows = (candles || []).map(c => c.low);
    const volumes = (candles || []).map(c => c.volume);

    const currentPrice = closes[closes.length - 1];

    // Calculate SMAs
    const sma50 = this.calculateSMA(closes, 50);
    const sma200 = this.calculateSMA(closes, 200);

    // Calculate ATR (Average True Range)
    const atr = this.calculateATR(highs, lows, closes, 14);
    const atrPercent = (atr / currentPrice) * 100;

    // Calculate volume trend
    const volumeTrend = this.calculateVolumeTrend(volumes, 20);

    // Price position relative to SMAs
    const priceVsSma50 = ((currentPrice - sma50) / sma50) * 100;
    const priceVsSma200 = ((currentPrice - sma200) / sma200) * 100;

    // Calculate regime score
    const indicators = {
      sma50,
      sma200,
      priceVsSma50,
      priceVsSma200,
      atr,
      atrPercent,
      volumeTrend
    };

    const { regime, score, confidence, reasoning } = this.calculateRegime(
      currentPrice,
      sma50,
      sma200,
      atrPercent,
      volumeTrend
    );

    return {
      regime,
      confidence,
      indicators,
      reasoning,
      score
    };
  }

  private calculateRegime(
    price: number,
    sma50: number,
    sma200: number,
    atrPercent: number,
    volumeTrend: number
  ): { regime: MarketRegime; score: number; confidence: number; reasoning: string[] } {
    const reasoning: string[] = [];
    let score = 0;
    const weights = {
      sma50: 0.3,
      sma200: 0.3,
      atr: 0.2,
      volume: 0.2
    };

    // Price vs SMA50 (30% weight)
    const priceVsSma50Percent = ((price - sma50) / sma50) * 100;
    if (priceVsSma50Percent > 2) {
      score += weights.sma50;
      reasoning.push(`Price ${priceVsSma50Percent.toFixed(2)}% above SMA50 (bullish)`);
    } else if (priceVsSma50Percent < -2) {
      score -= weights.sma50;
      reasoning.push(`Price ${Math.abs(priceVsSma50Percent).toFixed(2)}% below SMA50 (bearish)`);
    } else {
      reasoning.push(`Price near SMA50 (neutral)`);
    }

    // Price vs SMA200 (30% weight)
    const priceVsSma200Percent = ((price - sma200) / sma200) * 100;
    if (priceVsSma200Percent > 2) {
      score += weights.sma200;
      reasoning.push(`Price ${priceVsSma200Percent.toFixed(2)}% above SMA200 (bullish)`);
    } else if (priceVsSma200Percent < -2) {
      score -= weights.sma200;
      reasoning.push(`Price ${Math.abs(priceVsSma200Percent).toFixed(2)}% below SMA200 (bearish)`);
    } else {
      reasoning.push(`Price near SMA200 (neutral)`);
    }

    // ATR (20% weight) - High ATR suggests trending, low ATR suggests sideways
    if (atrPercent < 2) {
      // Low volatility - sideways bias
      score *= 0.5; // Reduce score magnitude
      reasoning.push(`Low volatility (ATR ${atrPercent.toFixed(2)}%) suggests sideways`);
    } else if (atrPercent > 5) {
      // High volatility - trending market
      reasoning.push(`High volatility (ATR ${atrPercent.toFixed(2)}%) suggests trending`);
    } else {
      reasoning.push(`Moderate volatility (ATR ${atrPercent.toFixed(2)}%)`);
    }

    // Volume trend (20% weight)
    if (volumeTrend > 0.1) {
      score += weights.volume * (score > 0 ? 1 : -1); // Amplify existing trend
      reasoning.push(`Rising volume (${(volumeTrend * 100).toFixed(1)}%) confirms trend`);
    } else if (volumeTrend < -0.1) {
      score *= 0.7; // Reduce confidence in trend
      reasoning.push(`Falling volume suggests weakening trend`);
    }

    // Determine regime based on score
    let regime: MarketRegime;
    let confidence: number;

    if (score > 0.3) {
      regime = 'bull';
      confidence = Math.min(0.95, 0.5 + score);
    } else if (score < -0.3) {
      regime = 'bear';
      confidence = Math.min(0.95, 0.5 + Math.abs(score));
    } else {
      regime = 'sideways';
      confidence = Math.min(0.95, 0.7 - Math.abs(score));
    }

    return { regime, score, confidence, reasoning };
  }

  private calculateSMA(values: number[], period: number): number {
    if (values.length < period) return values[values.length - 1];

    const slice = values.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number
  ): number {
    if (highs.length < period + 1) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < highs.length; i++) {
      const high = highs[i];
      const low = lows[i];
      const prevClose = closes[i - 1];

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      trueRanges.push(tr);
    }

    // Calculate ATR as SMA of true ranges
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((acc, val) => acc + val, 0) / period;

    return atr;
  }

  private calculateVolumeTrend(volumes: number[], period: number): number {
    if (volumes.length < period * 2) return 0;

    const recentVolume = this.calculateSMA(volumes.slice(-period), period);
    const olderVolume = this.calculateSMA(volumes.slice(-period * 2, -period), period);

    if (olderVolume === 0) return 0;

    return (recentVolume - olderVolume) / olderVolume;
  }

  /**
   * Get regime description for UI display
   */
  public getRegimeDescription(regime: MarketRegime): string {
    switch (regime) {
      case 'bull':
        return 'Bullish trend - prices moving higher with momentum';
      case 'bear':
        return 'Bearish trend - prices declining with pressure';
      case 'sideways':
        return 'Range-bound - prices consolidating without clear direction';
      default:
        return 'Unknown regime';
    }
  }

  /**
   * Get regime color for UI display
   */
  public getRegimeColor(regime: MarketRegime): string {
    switch (regime) {
      case 'bull':
        return '#22c55e'; // green
      case 'bear':
        return '#ef4444'; // red
      case 'sideways':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  }
}
