// src/services/ParabolicSARDetector.ts
import { Logger } from '../core/Logger.js';
import { OHLCVData } from './MultiProviderMarketDataService.js';

export interface SARResult {
  isValid: boolean;
  currentSAR: number;
  currentPrice: number;
  trend: 'up' | 'down';
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  score: number; // 0-1
  confidence: number;
  acceleration: number;
  extremePoint: number;
  distanceFromSAR: number; // Percentage
  reasoning: string[];
  recentFlips: number; // Number of trend flips in recent candles
}

export class ParabolicSARDetector {
  private static instance: ParabolicSARDetector;
  private logger = Logger.getInstance();

  // SAR parameters
  private readonly initialAF = 0.02; // Initial acceleration factor
  private readonly maxAF = 0.2; // Maximum acceleration factor
  private readonly afStep = 0.02; // Acceleration factor increment

  private constructor() {}

  public static getInstance(): ParabolicSARDetector {
    if (!ParabolicSARDetector.instance) {
      ParabolicSARDetector.instance = new ParabolicSARDetector();
    }
    return ParabolicSARDetector.instance;
  }

  /**
   * Calculate Parabolic SAR and generate trading signal
   */
  public detect(candles: OHLCVData[]): SARResult {
    if (candles.length < 20) {
      return this.getEmptyResult('Insufficient data for SAR calculation');
    }

    // Calculate SAR for all candles
    const sarValues = this.calculateSAR(candles);

    if (sarValues.length === 0) {
      return this.getEmptyResult('Failed to calculate SAR');
    }

    const lastSAR = sarValues[sarValues.length - 1];
    const currentCandle = candles[candles.length - 1];
    const currentPrice = currentCandle.close;

    // Determine trend
    const trend: 'up' | 'down' = currentPrice > lastSAR.sar ? 'up' : 'down';

    // Calculate distance from SAR
    const distanceFromSAR = ((currentPrice - lastSAR.sar) / currentPrice) * 100;

    // Count recent trend flips
    const recentFlips = this.countRecentFlips(sarValues, 10);

    // Generate signal
    const { signal, score, confidence, reasoning } = this.generateSignal(
      currentPrice,
      lastSAR,
      trend,
      distanceFromSAR,
      recentFlips,
      candles
    );

    return {
      isValid: true,
      currentSAR: lastSAR.sar,
      currentPrice,
      trend,
      signal,
      score,
      confidence,
      acceleration: lastSAR.af,
      extremePoint: lastSAR.ep,
      distanceFromSAR,
      reasoning,
      recentFlips
    };
  }

  private calculateSAR(candles: OHLCVData[]): Array<{
    sar: number;
    trend: 'up' | 'down';
    af: number;
    ep: number;
  }> {
    const result: Array<{ sar: number; trend: 'up' | 'down'; af: number; ep: number }> = [];

    if (candles.length < 2) return result;

    // Initialize with first candle
    let sar = candles[0].low;
    let trend: 'up' | 'down' = 'up';
    let af = this.initialAF;
    let ep = candles[0].high; // Extreme point

    for (let i = 1; i < candles.length; i++) {
      const candle = candles[i];

      // Store current SAR
      result.push({ sar, trend, af, ep });

      // Calculate next SAR
      const nextSAR = sar + af * (ep - sar);

      // Check for trend reversal
      if (trend === 'up') {
        // Uptrend
        if (candle.low < nextSAR) {
          // Reversal to downtrend
          trend = 'down';
          sar = ep; // SAR becomes the previous EP
          ep = candle.low; // New EP is current low
          af = this.initialAF; // Reset AF
        } else {
          // Continue uptrend
          sar = nextSAR;

          // Update SAR to not be above prior two lows
          if (i >= 2) {
            sar = Math.min(sar, candles[i - 1].low, candles[i - 2].low);
          } else if (i >= 1) {
            sar = Math.min(sar, candles[i - 1].low);
          }

          // Update EP and AF if new high
          if (candle.high > ep) {
            ep = candle.high;
            af = Math.min(af + this.afStep, this.maxAF);
          }
        }
      } else {
        // Downtrend
        if (candle.high > nextSAR) {
          // Reversal to uptrend
          trend = 'up';
          sar = ep; // SAR becomes the previous EP
          ep = candle.high; // New EP is current high
          af = this.initialAF; // Reset AF
        } else {
          // Continue downtrend
          sar = nextSAR;

          // Update SAR to not be below prior two highs
          if (i >= 2) {
            sar = Math.max(sar, candles[i - 1].high, candles[i - 2].high);
          } else if (i >= 1) {
            sar = Math.max(sar, candles[i - 1].high);
          }

          // Update EP and AF if new low
          if (candle.low < ep) {
            ep = candle.low;
            af = Math.min(af + this.afStep, this.maxAF);
          }
        }
      }
    }

    return result;
  }

  private countRecentFlips(sarValues: Array<{ trend: 'up' | 'down' }>, lookback: number): number {
    const recentSAR = sarValues.slice(-lookback);
    let flips = 0;

    for (let i = 1; i < recentSAR.length; i++) {
      if (recentSAR[i].trend !== recentSAR[i - 1].trend) {
        flips++;
      }
    }

    return flips;
  }

  private generateSignal(
    currentPrice: number,
    lastSAR: { sar: number; trend: 'up' | 'down'; af: number; ep: number },
    trend: 'up' | 'down',
    distanceFromSAR: number,
    recentFlips: number,
    candles: OHLCVData[]
  ): {
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    score: number;
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let score = 0.5;
    let confidence = 0.5;

    // Check for recent trend reversal (signal)
    const prevCandles = candles.slice(-3);
    if ((prevCandles?.length || 0) >= 2) {
      const prevPrice = prevCandles[prevCandles.length - 2].close;
      const prevTrend: 'up' | 'down' = prevPrice > lastSAR.sar ? 'up' : 'down';

      if (trend !== prevTrend) {
        // Fresh trend reversal
        if (trend === 'up') {
          signal = 'BUY';
          score = 0.7;
          confidence = 0.75;
          reasoning.push('Fresh SAR reversal to uptrend - bullish signal');
        } else {
          signal = 'SELL';
          score = 0.3;
          confidence = 0.75;
          reasoning.push('Fresh SAR reversal to downtrend - bearish signal');
        }
      }
    }

    // If no fresh reversal, evaluate current trend strength
    if (signal === 'NEUTRAL') {
      if (trend === 'up') {
        // Check trend strength
        const absDistance = Math.abs(distanceFromSAR);

        if (absDistance > 2 && lastSAR.af >= 0.1) {
          // Strong uptrend with acceleration
          signal = 'BUY';
          score = 0.65;
          confidence = 0.7;
          reasoning.push(
            `Strong uptrend (SAR ${absDistance.toFixed(2)}% below, AF: ${lastSAR.af.toFixed(2)})`
          );
        } else if (absDistance < 0.5) {
          // Price too close to SAR - weak signal
          signal = 'NEUTRAL';
          score = 0.55;
          confidence = 0.5;
          reasoning.push('Uptrend but price close to SAR - weak signal');
        } else {
          // Moderate uptrend
          signal = 'BUY';
          score = 0.6;
          confidence = 0.6;
          reasoning.push('Moderate uptrend in progress');
        }
      } else {
        // Downtrend
        const absDistance = Math.abs(distanceFromSAR);

        if (absDistance > 2 && lastSAR.af >= 0.1) {
          // Strong downtrend with acceleration
          signal = 'SELL';
          score = 0.35;
          confidence = 0.7;
          reasoning.push(
            `Strong downtrend (SAR ${absDistance.toFixed(2)}% above, AF: ${lastSAR.af.toFixed(2)})`
          );
        } else if (absDistance < 0.5) {
          // Price too close to SAR - weak signal
          signal = 'NEUTRAL';
          score = 0.45;
          confidence = 0.5;
          reasoning.push('Downtrend but price close to SAR - weak signal');
        } else {
          // Moderate downtrend
          signal = 'SELL';
          score = 0.4;
          confidence = 0.6;
          reasoning.push('Moderate downtrend in progress');
        }
      }
    }

    // Penalize for choppy market (many recent flips)
    if (recentFlips > 3) {
      confidence *= 0.7;
      reasoning.push(`Choppy market (${recentFlips} trend flips) - reduced confidence`);
    }

    return { signal, score, confidence, reasoning };
  }

  private getEmptyResult(reason: string): SARResult {
    return {
      isValid: false,
      currentSAR: 0,
      currentPrice: 0,
      trend: 'up',
      signal: 'NEUTRAL',
      score: 0.5,
      confidence: 0,
      acceleration: 0,
      extremePoint: 0,
      distanceFromSAR: 0,
      reasoning: [reason],
      recentFlips: 0
    };
  }

  /**
   * Get SAR status description for UI
   */
  public getStatusDescription(result: SARResult): string {
    if (!result.isValid) {
      return 'SAR: Insufficient data';
    }

    const trendStr = result.trend === 'up' ? 'Uptrend' : 'Downtrend';
    const distStr = Math.abs(result.distanceFromSAR).toFixed(2);

    return `SAR: ${trendStr} (${distStr}% from price, AF: ${result.acceleration.toFixed(2)})`;
  }
}
