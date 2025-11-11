import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';
import { ElliottWaveAnalysis } from '../types/index.js';

/**
 * Elliott Wave Analyzer
 * Implements automated wave counting and fractal detection for wave state identification
 */
export class ElliottWaveAnalyzer {
  private static instance: ElliottWaveAnalyzer;
  private logger = Logger.getInstance();

  // Wave rules and guidelines
  private readonly FIBONACCI_RETRACEMENTS = [0.236, 0.382, 0.5, 0.618, 0.786];
  private readonly FIBONACCI_EXTENSIONS = [1.272, 1.414, 1.618, 2.0, 2.618];
  private readonly MIN_FRACTAL_WINDOW = 5;
  private readonly MAX_WAVE_COMPLETION_PROB = 0.95;

  private constructor() {}

  static getInstance(): ElliottWaveAnalyzer {
    if (!ElliottWaveAnalyzer.instance) {
      ElliottWaveAnalyzer.instance = new ElliottWaveAnalyzer();
    }
    return ElliottWaveAnalyzer.instance;
  }

  /**
   * Complete Elliott Wave analysis
   */
  analyzeElliottWaves(data: MarketData[]): ElliottWaveAnalysis {
    if (data.length < 50) {
      this.logger.warn('Insufficient data for Elliott Wave analysis');
      return this.getDefaultAnalysis();
    }

    // Find fractals (swing points)
    const fractals = this.detectFractals(data);
    
    if (fractals.length < 5) {
      this.logger.warn('Insufficient fractals for wave analysis');
      return this.getDefaultAnalysis();
    }

    // Detect wave structure
    const waveStructure = this.identifyWaveStructure(fractals);
    
    // Classify current wave
    const currentWave = this.classifyCurrentWave(waveStructure);
    
    // Calculate completion probability
    const completionProbability = this.calculateWaveCompletion(waveStructure, currentWave);
    
    // Predict next direction
    const nextExpectedDirection = this.predictNextDirection(waveStructure, currentWave);

    const analysis: ElliottWaveAnalysis = {
      currentWave,
      completionProbability,
      nextExpectedDirection,
      waveStructure
    };

    this.logger.debug('Elliott Wave analysis complete', {
      fractals: fractals.length,
      waves: waveStructure.length,
      currentWave: currentWave.wave,
      completionProb: completionProbability
    });

    return analysis;
  }

  /**
   * Detect fractals (local highs and lows) using windowed detection
   */
  private detectFractals(data: MarketData[]): Array<{ price: number; timestamp: number; type: 'HIGH' | 'LOW' }> {
    const fractals: Array<{ price: number; timestamp: number; type: 'HIGH' | 'LOW' }> = [];
    const window = this.MIN_FRACTAL_WINDOW;

    for (let i = window; i < data.length - window; i++) {
      const center = data[i];
      const leftWindow = data.slice(i - window, i);
      const rightWindow = data.slice(i + 1, i + window + 1);

      // Check for fractal high
      const isFractalHigh = leftWindow.every(d => d.high <= center.high) &&
                           rightWindow.every(d => d.high <= center.high);

      // Check for fractal low
      const isFractalLow = leftWindow.every(d => d.low >= center.low) &&
                          rightWindow.every(d => d.low >= center.low);

      if (isFractalHigh && !isFractalLow) {
        fractals.push({
          price: center.high,
          timestamp: center.timestamp,
          type: 'HIGH'
        });
      } else if (isFractalLow && !isFractalHigh) {
        fractals.push({
          price: center.low,
          timestamp: center.timestamp,
          type: 'LOW'
        });
      }
    }

    return fractals;
  }

  /**
   * Identify wave structure from fractals
   */
  private identifyWaveStructure(
    fractals: Array<{ price: number; timestamp: number; type: 'HIGH' | 'LOW' }>
  ): Array<{ wave: string; start: number; end: number; price: number; timestamp: number }> {
    const waves: Array<{ wave: string; start: number; end: number; price: number; timestamp: number }> = [];
    
    if (fractals.length === 0) return waves;

    // Determine if starting with up or down move
    let currentDirection = fractals[0].type === 'LOW' ? 'UP' : 'DOWN';
    let waveCount = 1;
    
    for (let i = 0; i < fractals.length - 1; i++) {
      const current = fractals[i];
      const next = fractals[i + 1];
      
      // Check if direction changed
      const directionChanged = (current.type === 'HIGH' && next.type === 'LOW') ||
                               (current.type === 'LOW' && next.type === 'HIGH');
      
      if (directionChanged) {
        waves.push({
          wave: this.getWaveLabel(waveCount, currentDirection),
          start: i,
          end: i + 1,
          price: next.price,
          timestamp: next.timestamp
        });
        
        currentDirection = currentDirection === 'UP' ? 'DOWN' : 'UP';
        waveCount++;
        
        // Reset for next impulse sequence
        if (waveCount > 5) {
          waveCount = 1;
        }
      }
    }

    return waves;
  }

  /**
   * Classify current wave based on structure
   */
  private classifyCurrentWave(
    waveStructure: Array<{ wave: string; start: number; end: number; price: number; timestamp: number }>
  ): ElliottWaveAnalysis['currentWave'] {
    if (waveStructure.length === 0) {
      return { type: 'IMPULSE', wave: '1', degree: 'MINOR' };
    }

    const lastWave = waveStructure[waveStructure.length - 1];
    const waveType = this.isImpulseWave(lastWave.wave) ? 'IMPULSE' : 'CORRECTIVE';
    const degree = this.determineWaveDegree(waveStructure.length);

    return {
      type: waveType,
      wave: lastWave.wave,
      degree
    };
  }

  /**
   * Calculate probability of current wave completing
   */
  private calculateWaveCompletion(
    waveStructure: Array<{ wave: string; start: number; end: number; price: number; timestamp: number }>,
    currentWave: ElliottWaveAnalysis['currentWave']
  ): number {
    if (waveStructure.length < 3) {
      return 0.3;
    }

    let completionProb = 0.5;
    
    // Impulse waves (1, 3, 5) have different completion probabilities
    if (currentWave.type === 'IMPULSE') {
      const waveNum = parseInt(currentWave.wave) || 1;
      
      if (waveNum === 3) {
        // Wave 3 is usually strongest - harder to complete prematurely
        completionProb = 0.4;
      } else if (waveNum === 5) {
        // Wave 5 is final impulse - more likely to complete
        completionProb = 0.7;
      } else {
        // Wave 1 is start - moderate completion probability
        completionProb = 0.5;
      }
    } else {
      // Corrective waves (A, B, C) or (2, 4)
      completionProb = 0.6;
    }

    // Adjust based on wave ratios
    if ((waveStructure?.length || 0) >= 5) {
      const ratios = this.analyzeWaveRatios(waveStructure);
      if (ratios.isValid) {
        completionProb = Math.min(this.MAX_WAVE_COMPLETION_PROB, completionProb + 0.2);
      } else {
        completionProb = Math.max(0.1, completionProb - 0.2);
      }
    }

    return Math.max(0.1, Math.min(this.MAX_WAVE_COMPLETION_PROB, completionProb));
  }

  /**
   * Predict next expected wave direction
   */
  private predictNextDirection(
    waveStructure: Array<{ wave: string; start: number; end: number; price: number; timestamp: number }>,
    currentWave: ElliottWaveAnalysis['currentWave']
  ): 'UP' | 'DOWN' | 'SIDEWAYS' {
    if (waveStructure.length === 0) {
      return 'UP';
    }

    const lastWave = waveStructure[waveStructure.length - 1];
    
    // Impulse waves
    if (currentWave.type === 'IMPULSE') {
      const waveNum = parseInt(currentWave.wave) || 1;
      
      // After wave 1 -> wave 2 (down)
      if (waveNum === 1) return 'DOWN';
      
      // After wave 2 -> wave 3 (up)
      if (waveNum === 2) return 'UP';
      
      // After wave 3 -> wave 4 (down)
      if (waveNum === 3) return 'DOWN';
      
      // After wave 4 -> wave 5 (up)
      if (waveNum === 4) return 'UP';
      
      // After wave 5 -> correction (down)
      if (waveNum === 5) return 'DOWN';
    } else {
      // Corrective waves
      if (currentWave.wave === 'A') return 'UP';
      if (currentWave.wave === 'B') return 'DOWN';
      if (currentWave.wave === 'C') return 'UP';
      
      // After wave 2 or 4 -> next impulse
      const waveNum = parseInt(currentWave.wave) || 0;
      if (waveNum === 2) return 'UP';
      if (waveNum === 4) return 'UP';
    }

    return 'SIDEWAYS';
  }

  /**
   * Analyze wave ratios for Elliott Wave rules validation
   */
  private analyzeWaveRatios(
    waveStructure: Array<{ wave: string; start: number; end: number; price: number; timestamp: number }>
  ): { isValid: boolean; violations: string[] } {
    if (waveStructure.length < 5) {
      return { isValid: false, violations: ['Insufficient waves'] };
    }

    const violations: string[] = [];
    
    // Get price movements for each wave
    const wavePrices = waveStructure.slice(-5).map(w => w.price);
    
    // Wave 3 cannot be shortest
    const wave1Len = Math.abs(wavePrices[1] - wavePrices[0]);
    const wave3Len = Math.abs(wavePrices[3] - wavePrices[2]);
    const wave5Len = Math.abs(wavePrices[4] - wavePrices[3]);
    
    const lengths = [wave1Len, wave3Len, wave5Len].sort((a, b) => a - b);
    if (wave3Len === lengths[0]) {
      violations.push('Wave 3 is shortest (Elliott rule violation)');
    }
    
    // Wave 4 should not overlap with Wave 1
    if (wavePrices[2] > wavePrices[0] && wavePrices[3] < wavePrices[1]) {
      violations.push('Wave 4 overlaps Wave 1');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  private getWaveLabel(count: number, direction: string): string {
    // Impulse waves: 1, 3, 5 (with trends)
    // Corrective waves: 2, 4 (against trends)
    // Or: A, B, C for corrective patterns
    
    if (count <= 5) {
      return count.toString();
    } else if (count === 6) {
      return 'A';
    } else if (count === 7) {
      return 'B';
    } else if (count === 8) {
      return 'C';
    }
    
    return '1';
  }

  private isImpulseWave(waveLabel: string): boolean {
    const num = parseInt(waveLabel);
    return !isNaN(num) && [1, 3, 5].includes(num);
  }

  private determineWaveDegree(waveCount: number): ElliottWaveAnalysis['currentWave']['degree'] {
    if (waveCount < 10) return 'MINUTE';
    if (waveCount < 30) return 'MINOR';
    if (waveCount < 100) return 'INTERMEDIATE';
    return 'PRIMARY';
  }

  private getDefaultAnalysis(): ElliottWaveAnalysis {
    return {
      currentWave: {
        type: 'IMPULSE',
        wave: '1',
        degree: 'MINOR'
      },
      completionProbability: 0.5,
      nextExpectedDirection: 'UP',
      waveStructure: []
    };
  }
}

