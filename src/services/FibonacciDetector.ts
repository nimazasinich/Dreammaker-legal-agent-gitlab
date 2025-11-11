// src/services/FibonacciDetector.ts
import { Logger } from '../core/Logger.js';
import { OHLCVData } from './MultiProviderMarketDataService.js';

export interface FibonacciLevel {
  level: number; // 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1
  price: number;
  distance: number; // Distance from current price (percentage)
}

export interface FibonacciResult {
  isValid: boolean;
  swing: {
    high: number;
    low: number;
    highIndex: number;
    lowIndex: number;
    direction: 'retracement' | 'extension';
  };
  levels: FibonacciLevel[];
  currentLevel: number | null; // Which Fibonacci level price is near (0-1)
  score: number; // 0-1, higher = better signal
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  reasoning: string[];
}

export class FibonacciDetector {
  private static instance: FibonacciDetector;
  private logger = Logger.getInstance();

  // Standard Fibonacci ratios
  private readonly fibRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

  // Key support/resistance ratios
  private readonly keyLevels = [0.382, 0.5, 0.618];

  private constructor() {}

  public static getInstance(): FibonacciDetector {
    if (!FibonacciDetector.instance) {
      FibonacciDetector.instance = new FibonacciDetector();
    }
    return FibonacciDetector.instance;
  }

  /**
   * Detect Fibonacci retracement/extension opportunities
   */
  public detect(candles: OHLCVData[]): FibonacciResult {
    if (candles.length < 50) {
      return this.getEmptyResult('Insufficient data for Fibonacci analysis');
    }

    // Find significant swing high and low
    const swing = this.findSwingPoints(candles);

    if (!swing) {
      return this.getEmptyResult('No clear swing high/low found');
    }

    const currentPrice = candles[candles.length - 1].close;

    // Calculate Fibonacci levels
    const levels = this.calculateLevels(swing.high, swing.low);

    // Determine current level and generate signal
    const { currentLevel, distance } = this.findCurrentLevel(currentPrice, levels);

    const { signal, score, confidence, reasoning } = this.generateSignal(
      currentPrice,
      swing,
      levels,
      currentLevel,
      distance,
      candles
    );

    return {
      isValid: true,
      swing: {
        high: swing.high,
        low: swing.low,
        highIndex: swing.highIndex,
        lowIndex: swing.lowIndex,
        direction: swing.direction
      },
      levels,
      currentLevel,
      score,
      signal,
      confidence,
      reasoning
    };
  }

  private findSwingPoints(candles: OHLCVData[]): {
    high: number;
    low: number;
    highIndex: number;
    lowIndex: number;
    direction: 'retracement' | 'extension';
  } | null {
    const lookback = Math.min(100, candles.length);
    const recentCandles = candles.slice(-lookback);

    let swingHigh = -Infinity;
    let swingLow = Infinity;
    let highIndex = 0;
    let lowIndex = 0;

    // Find swing high and low
    for (let i = 0; i < recentCandles.length; i++) {
      if (recentCandles[i].high > swingHigh) {
        swingHigh = recentCandles[i].high;
        highIndex = i;
      }
      if (recentCandles[i].low < swingLow) {
        swingLow = recentCandles[i].low;
        lowIndex = i;
      }
    }

    // Ensure swing range is significant (at least 5% range)
    const range = swingHigh - swingLow;
    const rangePercent = (range / swingLow) * 100;

    if (rangePercent < 5) {
      return null;
    }

    // Determine if we're in retracement or extension
    const direction: 'retracement' | 'extension' = highIndex > lowIndex ? 'retracement' : 'extension';

    return {
      high: swingHigh,
      low: swingLow,
      highIndex,
      lowIndex,
      direction
    };
  }

  private calculateLevels(high: number, low: number): FibonacciLevel[] {
    const range = high - low;
    const currentPrice = high; // Will be updated by caller

    return (this.fibRatios || []).map(ratio => {
      const price = low + range * ratio;
      return {
        level: ratio,
        price,
        distance: 0 // Will be calculated later
      };
    });
  }

  private findCurrentLevel(
    currentPrice: number,
    levels: FibonacciLevel[]
  ): { currentLevel: number | null; distance: number } {
    let closestLevel: number | null = null;
    let minDistance = Infinity;

    for (const level of levels) {
      const distance = Math.abs(currentPrice - level.price);
      const distancePercent = (distance / currentPrice) * 100;

      // Update distance in level
      level.distance = distancePercent;

      if (distancePercent < minDistance) {
        minDistance = distancePercent;
        closestLevel = level.level;
      }
    }

    return {
      currentLevel: minDistance < 2 ? closestLevel : null, // Only return if within 2%
      distance: minDistance
    };
  }

  private generateSignal(
    currentPrice: number,
    swing: any,
    levels: FibonacciLevel[],
    currentLevel: number | null,
    distance: number,
    candles: OHLCVData[]
  ): {
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    score: number;
    confidence: number;
    reasoning: string[];
  } {
    const reasoning: string[] = [];
    let score = 0.5;
    let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
    let confidence = 0.5;

    // Check if price is near key Fibonacci levels
    const nearKeyLevel = this.keyLevels.some(keyLevel => {
      const level = levels.find(l => l.level === keyLevel);
      return level && level.distance < 1.5;
    });

    if (nearKeyLevel && currentLevel !== null) {
      reasoning.push(`Price near key Fibonacci ${(currentLevel * 100).toFixed(1)}% level`);

      // At retracement levels, look for bounces
      if (currentLevel >= 0.382 && currentLevel <= 0.618) {
        // Check recent price action for bounce
        const recentCandles = candles.slice(-5);
        const isBouncingUp = recentCandles[recentCandles.length - 1].close >
          recentCandles[0].close;

        if (swing.direction === 'retracement') {
          if (isBouncingUp) {
            signal = 'BUY';
            score = 0.65 + (currentLevel - 0.382) * 0.2; // Higher score for deeper retracements
            confidence = 0.7;
            reasoning.push(`Bullish bounce from ${(currentLevel * 100).toFixed(1)}% Fibonacci support`);
          }
        } else {
          if (!isBouncingUp) {
            signal = 'SELL';
            score = 0.35 - (currentLevel - 0.382) * 0.2;
            confidence = 0.7;
            reasoning.push(`Bearish rejection at ${(currentLevel * 100).toFixed(1)}% Fibonacci resistance`);
          }
        }
      }

      // At extension levels (above 1.0), look for reversals
      if (currentLevel >= 1.0) {
        reasoning.push(`Price at extension level - potential reversal zone`);
        confidence = 0.65;
      }
    } else {
      reasoning.push(`Price between Fibonacci levels (${distance.toFixed(2)}% from nearest)`);
    }

    // Check if price is at extremes
    const atHigh = Math.abs(currentPrice - swing.high) / swing.high < 0.01;
    const atLow = Math.abs(currentPrice - swing.low) / swing.low < 0.01;

    if (atHigh) {
      reasoning.push('Price at swing high - potential resistance');
      if (signal === 'NEUTRAL') {
        signal = 'SELL';
        score = 0.4;
        confidence = 0.6;
      }
    } else if (atLow) {
      reasoning.push('Price at swing low - potential support');
      if (signal === 'NEUTRAL') {
        signal = 'BUY';
        score = 0.6;
        confidence = 0.6;
      }
    }

    // Default reasoning if no strong signal
    if (reasoning.length === 0) {
      reasoning.push('No clear Fibonacci setup detected');
    }

    return { signal, score, confidence, reasoning };
  }

  private getEmptyResult(reason: string): FibonacciResult {
    return {
      isValid: false,
      swing: {
        high: 0,
        low: 0,
        highIndex: 0,
        lowIndex: 0,
        direction: 'retracement'
      },
      levels: [],
      currentLevel: null,
      score: 0.5,
      signal: 'NEUTRAL',
      confidence: 0,
      reasoning: [reason]
    };
  }

  /**
   * Get Fibonacci level name for UI display
   */
  public getLevelName(level: number): string {
    const levelMap: Record<number, string> = {
      0: '0% (Swing Low)',
      0.236: '23.6%',
      0.382: '38.2%',
      0.5: '50%',
      0.618: '61.8% (Golden Ratio)',
      0.786: '78.6%',
      1.0: '100% (Swing High)'
    };

    return levelMap[level] || `${(level * 100).toFixed(1)}%`;
  }
}
