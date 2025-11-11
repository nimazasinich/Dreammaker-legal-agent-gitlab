import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';
import { HarmonicPattern } from '../types/index.js';

/**
 * Harmonic Pattern Detector
 * Detects Gartley, Bat, Butterfly, Crab, and ABCD patterns using Fibonacci ratios
 */
export class HarmonicPatternDetector {
  private static instance: HarmonicPatternDetector;
  private logger = Logger.getInstance();

  // Pattern tolerance (how close ratios must be)
  private readonly RATIO_TOLERANCE = 0.1; // 10% tolerance
  private readonly MIN_PATTERN_SIZE = 0.02; // 2% minimum price movement

  // Pattern-specific Fibonacci ratios
  private readonly PATTERN_RATIOS = {
    GARTLEY: {
      AB: { min: 0.382, max: 0.618 },
      BC: { min: 0.382, max: 0.886 },
      CD: { min: 1.272, max: 1.618 },
      XA: 0.786
    },
    BAT: {
      AB: { min: 0.382, max: 0.500 },
      BC: { min: 0.382, max: 0.886 },
      CD: { min: 1.618, max: 2.618 },
      XA: 0.886
    },
    BUTTERFLY: {
      AB: { min: 0.786, max: 0.786 },
      BC: { min: 0.382, max: 0.886 },
      CD: { min: 1.618, max: 2.618 },
      XA: 0.786
    },
    CRAB: {
      AB: { min: 0.382, max: 0.618 },
      BC: { min: 0.382, max: 0.886 },
      CD: { min: 2.618, max: 3.618 },
      XA: 0.618
    },
    ABCD: {
      AB: { min: 0.382, max: 0.618 },
      BC: { min: 0.382, max: 0.886 },
      CD: 1.272
    }
  };

  private constructor() {}

  static getInstance(): HarmonicPatternDetector {
    if (!HarmonicPatternDetector.instance) {
      HarmonicPatternDetector.instance = new HarmonicPatternDetector();
    }
    return HarmonicPatternDetector.instance;
  }

  /**
   * Detect all harmonic patterns in market data
   */
  detectHarmonicPatterns(data: MarketData[]): HarmonicPattern[] {
    const patterns: HarmonicPattern[] = [];
    
    if (data.length < 20) {
      this.logger.warn('Insufficient data for harmonic pattern detection');
      return patterns;
    }

    // Find pivot points
    const pivots = this.findPivotPoints(data);
    
    if (pivots.length < 4) {
      this.logger.warn('Insufficient pivot points for harmonic patterns');
      return patterns;
    }

    // Try to identify complete patterns (XABCD)
    for (let i = 0; i <= pivots.length - 5; i++) {
      const X = pivots[i];
      const A = pivots[i + 1];
      const B = pivots[i + 2];
      const C = pivots[i + 3];
      const D = pivots[i + 4];

      // Detect each pattern type
      const gartley = this.detectPattern('GARTLEY', X, A, B, C, D);
      if (gartley) patterns.push(gartley);

      const bat = this.detectPattern('BAT', X, A, B, C, D);
      if (bat) patterns.push(bat);

      const butterfly = this.detectPattern('BUTTERFLY', X, A, B, C, D);
      if (butterfly) patterns.push(butterfly);

      const crab = this.detectPattern('CRAB', X, A, B, C, D);
      if (crab) patterns.push(crab);
    }

    // Try ABCD patterns (only 3 points needed)
    for (let i = 0; i <= pivots.length - 4; i++) {
      const A = pivots[i];
      const B = pivots[i + 1];
      const C = pivots[i + 2];
      const D = pivots[i + 3];

      const abcd = this.detectABCDPattern(A, B, C, D);
      if (abcd) patterns.push(abcd);
    }

    // Sort by reliability score
    patterns.sort((a, b) => b.reliabilityScore - a.reliabilityScore);

    this.logger.debug('Harmonic pattern detection complete', {
      patterns: patterns.length,
      types: (patterns || []).map(p => p.type)
    });

    return patterns;
  }

  /**
   * Detect specific harmonic pattern type (Gartley, Bat, Butterfly, Crab)
   */
  private detectPattern(
    patternType: 'GARTLEY' | 'BAT' | 'BUTTERFLY' | 'CRAB',
    X: { price: number; timestamp: number },
    A: { price: number; timestamp: number },
    B: { price: number; timestamp: number },
    C: { price: number; timestamp: number },
    D: { price: number; timestamp: number }
  ): HarmonicPattern | null {
    const ratios = this.PATTERN_RATIOS[patternType];
    const direction = A.price > X.price ? 'UP' : 'DOWN';

    // Calculate ratios
    const XA_length = Math.abs(A.price - X.price);
    const AB_length = Math.abs(B.price - A.price);
    const BC_length = Math.abs(C.price - B.price);
    const CD_length = Math.abs(D.price - C.price);

    const AB_ratio = XA_length > 0 ? AB_length / XA_length : 0;
    const BC_ratio = AB_length > 0 ? BC_length / AB_length : 0;
    const CD_ratio = BC_length > 0 ? CD_length / BC_length : 0;
    const XA_retrace = Math.abs((B.price - X.price) / XA_length);

    // Validate pattern ratios
    const abValid = this.validateRatio(AB_ratio, ratios.AB.min, ratios.AB.max);
    const bcValid = this.validateRatio(BC_ratio, ratios.BC.min, ratios.BC.max);
    const cdValid = this.validateRatio(CD_ratio, ratios.CD.min, ratios.CD.max);
    const xaValid = this.validateRatio(XA_retrace, ratios.XA - this.RATIO_TOLERANCE, ratios.XA + this.RATIO_TOLERANCE);

    // Check minimum pattern size
    const patternSize = XA_length / Math.max(X.price, A.price);
    if (patternSize < this.MIN_PATTERN_SIZE) {
      return null;
    }

    // Must match at least 3 out of 4 ratios for valid pattern
    const validRatios = [abValid, bcValid, cdValid, xaValid].filter(Boolean).length;
    if (validRatios < 3) {
      return null;
    }

    // Calculate Fibonacci levels
    const fibonacciLevels = this.calculateFibonacciLevels(X, A, B, C, D);

    // Calculate Potential Reversal Zone (PRZ)
    const prz = this.calculatePRZ(X, A, B, C, D, ratios.XA);

    // Calculate completion probability
    const completionProb = this.calculateCompletionProbability(patternType, D, prz);

    // Calculate reliability score
    const reliabilityScore = this.calculateReliabilityScore(validRatios, patternType, fibonacciLevels);

    return {
      type: patternType,
      points: { X, A, B, C, D },
      fibonacciLevels,
      prz,
      completionProbability: completionProb,
      reliabilityScore
    };
  }

  /**
   * Detect ABCD pattern (simpler harmonic pattern)
   */
  private detectABCDPattern(
    A: { price: number; timestamp: number },
    B: { price: number; timestamp: number },
    C: { price: number; timestamp: number },
    D: { price: number; timestamp: number }
  ): HarmonicPattern | null {
    const ratios = this.PATTERN_RATIOS.ABCD;
    
    // Calculate ratios
    const AB_length = Math.abs(B.price - A.price);
    const BC_length = Math.abs(C.price - B.price);
    const CD_length = Math.abs(D.price - C.price);

    const AB_ratio = this.validateRatio(AB_length / (Math.max(A.price, B.price) * 0.1), ratios.AB.min, ratios.AB.max);
    const BC_ratio = AB_length > 0 ? this.validateRatio(BC_length / AB_length, ratios.BC.min, ratios.BC.max) : false;
    const CD_ratio = BC_length > 0 ? this.validateRatio(CD_length / BC_length, 
      ratios.CD - this.RATIO_TOLERANCE, 
      ratios.CD + this.RATIO_TOLERANCE) : false;

    // Must match CD ratio (critical for ABCD)
    if (!CD_ratio) {
      return null;
    }

    // Calculate Fibonacci levels
    const fibonacciLevels = this.calculateFibonacciLevelsForABCD(A, B, C, D);

    // Calculate PRZ
    const prz = this.calculatePRZForABCD(A, B, C, D);

    // Calculate completion probability
    const completionProb = this.calculateCompletionProbability('ABCD', D, prz);

    // Calculate reliability score
    const reliabilityScore = this.calculateReliabilityScore(
      [AB_ratio, BC_ratio, CD_ratio].filter(Boolean).length,
      'ABCD',
      fibonacciLevels
    );

    return {
      type: 'ABCD',
      points: { X: A, A, B, C, D },
      fibonacciLevels,
      prz,
      completionProbability: completionProb,
      reliabilityScore
    };
  }

  /**
   * Find pivot points in price data
   */
  private findPivotPoints(data: MarketData[]): Array<{ price: number; timestamp: number }> {
    const pivots: Array<{ price: number; timestamp: number }> = [];
    const window = 5;

    for (let i = window; i < data.length - window; i++) {
      const center = data[i];
      const leftWindow = data.slice(i - window, i);
      const rightWindow = data.slice(i + 1, i + window + 1);

      // Check for swing high
      const isSwingHigh = leftWindow.every(d => d.high <= center.high) &&
                         rightWindow.every(d => d.high <= center.high);

      // Check for swing low
      const isSwingLow = leftWindow.every(d => d.low >= center.low) &&
                        rightWindow.every(d => d.low >= center.low);

      if (isSwingHigh) {
        const ts = center.timestamp instanceof Date ? center.timestamp.getTime() : center.timestamp;
        pivots.push({ price: center.high, timestamp: ts });
      } else if (isSwingLow) {
        const ts = center.timestamp instanceof Date ? center.timestamp.getTime() : center.timestamp;
        pivots.push({ price: center.low, timestamp: ts });
      }
    }

    return pivots;
  }

  /**
   * Validate if ratio is within acceptable range
   */
  private validateRatio(ratio: number, min: number, max: number): boolean {
    return ratio >= min && ratio <= max;
  }

  /**
   * Calculate Fibonacci levels for harmonic patterns
   */
  private calculateFibonacciLevels(
    X: { price: number; timestamp: number },
    A: { price: number; timestamp: number },
    B: { price: number; timestamp: number },
    C: { price: number; timestamp: number },
    D: { price: number; timestamp: number }
  ): HarmonicPattern['fibonacciLevels'] {
    const levels: HarmonicPattern['fibonacciLevels'] = [];
    
    // Retracement levels (XA leg)
    const XA_range = Math.abs(A.price - X.price);
    [0.236, 0.382, 0.5, 0.618, 0.786].forEach(level => {
      const retracePrice = B.price + (XA_range * level * (A.price > X.price ? -1 : 1));
      levels.push({
        level,
        price: retracePrice,
        type: 'RETRACEMENT'
      });
    });

    // Extension levels (CD leg)
    const CD_range = Math.abs(D.price - C.price);
    [1.272, 1.414, 1.618].forEach(level => {
      const extensionPrice = C.price + (CD_range * (level - 1) * (D.price > C.price ? 1 : -1));
      levels.push({
        level,
        price: extensionPrice,
        type: 'EXTENSION'
      });
    });

    return levels;
  }

  /**
   * Calculate Fibonacci levels for ABCD patterns
   */
  private calculateFibonacciLevelsForABCD(
    A: { price: number; timestamp: number },
    B: { price: number; timestamp: number },
    C: { price: number; timestamp: number },
    D: { price: number; timestamp: number }
  ): HarmonicPattern['fibonacciLevels'] {
    const levels: HarmonicPattern['fibonacciLevels'] = [];
    
    const AB_range = Math.abs(B.price - A.price);
    
    // Retracement levels from AB
    [0.236, 0.382, 0.5, 0.618, 0.786].forEach(level => {
      const retracePrice = A.price + (AB_range * level * (B.price > A.price ? 1 : -1));
      levels.push({
        level,
        price: retracePrice,
        type: 'RETRACEMENT'
      });
    });

    return levels;
  }

  /**
   * Calculate Potential Reversal Zone (PRZ)
   */
  private calculatePRZ(
    X: { price: number; timestamp: number },
    A: { price: number; timestamp: number },
    B: { price: number; timestamp: number },
    C: { price: number; timestamp: number },
    D: { price: number; timestamp: number },
    targetXA: number
  ): HarmonicPattern['prz'] {
    const XA_range = Math.abs(A.price - X.price);
    const targetPrice = X.price + (XA_range * targetXA * (A.price > X.price ? 1 : -1));
    
    const width = targetPrice * 0.02; // 2% width for PRZ
    
    return {
      upper: targetPrice + width,
      lower: targetPrice - width,
      confluence: 0.85 // High confluence for harmonic patterns
    };
  }

  /**
   * Calculate PRZ for ABCD patterns
   */
  private calculatePRZForABCD(
    A: { price: number; timestamp: number },
    B: { price: number; timestamp: number },
    C: { price: number; timestamp: number },
    D: { price: number; timestamp: number }
  ): HarmonicPattern['prz'] {
    // PRZ is typically at D point for ABCD
    const targetPrice = D.price;
    const width = targetPrice * 0.015; // 1.5% width
    
    return {
      upper: targetPrice + width,
      lower: targetPrice - width,
      confluence: 0.8
    };
  }

  /**
   * Calculate pattern completion probability
   */
  private calculateCompletionProbability(
    patternType: string,
    D: { price: number; timestamp: number },
    prz: HarmonicPattern['prz']
  ): number {
    let baseProb = 0.7;
    
    // Pattern-specific adjustments
    if (patternType === 'GARTLEY') baseProb = 0.75;
    if (patternType === 'BAT') baseProb = 0.8;
    if (patternType === 'BUTTERFLY') baseProb = 0.7;
    if (patternType === 'CRAB') baseProb = 0.65;
    if (patternType === 'ABCD') baseProb = 0.72;

    // Adjust based on confluence
    const confluenceBoost = prz.confluence * 0.2;
    
    return Math.max(0.5, Math.min(0.95, baseProb + confluenceBoost));
  }

  /**
   * Calculate pattern reliability score
   */
  private calculateReliabilityScore(
    validRatios: number,
    patternType: string,
    fibonacciLevels: HarmonicPattern['fibonacciLevels']
  ): number {
    let score = 0.5;
    
    // Bonus for perfect ratios
    score += (validRatios / 4) * 0.3;
    
    // Bonus for multiple Fibonacci levels clustering
    if ((fibonacciLevels?.length || 0) >= 6) {
      score += 0.1;
    }
    
    // Pattern-specific reliability
    if (patternType === 'GARTLEY') score += 0.05;
    if (patternType === 'BAT') score += 0.08;
    
    return Math.max(0.3, Math.min(1.0, score));
  }
}

