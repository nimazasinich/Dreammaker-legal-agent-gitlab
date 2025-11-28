import { Logger } from '../core/Logger.js';
import { MarketData } from '../types/index.js';
import { SmartMoneyFeatures } from '../types/index.js';

/**
 * Advanced Smart Money Concepts (SMC) Analyzer
 * Implements institutional trading concepts for detecting smart money activity
 */
export class SMCAnalyzer {
  private static instance: SMCAnalyzer;
  private logger = Logger.getInstance();

  // Configuration parameters
  private readonly LIQUIDITY_THRESHOLD = 2.0; // Volume threshold multiplier
  private readonly ORDER_BLOCK_STRENGTH = 1.5; // Volume multiplier for order blocks
  private readonly FVG_MIN_SIZE = 0.001; // Minimum gap size (0.1%)
  private readonly BOS_CONFIRMATION_PCT = 0.01; // 1% price break confirmation

  private constructor() {}

  static getInstance(): SMCAnalyzer {
    if (!SMCAnalyzer.instance) {
      SMCAnalyzer.instance = new SMCAnalyzer();
    }
    return SMCAnalyzer.instance;
  }

  /**
   * Detect liquidity zones where institutions accumulate/distribute positions
   */
  detectLiquidityZones(data: MarketData[]): SmartMoneyFeatures['liquidityZones'] {
    const zones: SmartMoneyFeatures['liquidityZones'] = [];
    
    if (data.length < 20) {
      this.logger.warn('Insufficient data for liquidity zone detection');
      return zones;
    }

    // Calculate volume profile
    const volumeProfile = new Map<number, number>();
    const priceRanges: Array<{ start: number; end: number }> = [];
    
    for (let i = 0; i < data.length; i++) {
      const priceRange = Math.floor(data[i].close * 1000) / 1000; // Round to 0.001 precision
      volumeProfile.set(priceRange, (volumeProfile.get(priceRange) || 0) + data[i].volume);
    }

    // Calculate average volume
    let totalVolume = 0;
    volumeProfile.forEach(vol => { totalVolume += vol; });
    const avgVolume = totalVolume / volumeProfile.size;

    // Identify high-volume zones
    volumeProfile.forEach((volume, price) => {
      if (volume > avgVolume * this.LIQUIDITY_THRESHOLD) {
        // Determine if accumulation or distribution
        const recentData = data.filter(d => 
          Math.abs(d.close - price) < price * 0.01
        );
        
        if ((recentData?.length || 0) > 0) {
          const priceChange = (recentData[recentData.length - 1].close - recentData[0].open) / recentData[0].open;
          const strength = Math.abs(priceChange) * volume;
          
          zones.push({
            price,
            volume,
            strength,
            type: priceChange > 0 ? 'ACCUMULATION' : 'DISTRIBUTION'
          });
        }
      }
    });

    // Sort by strength and return top zones
    zones.sort((a, b) => b.strength - a.strength);
    return zones.slice(0, 10);
  }

  /**
   * Detect order blocks - price levels where institutions placed large orders
   */
  detectOrderBlocks(data: MarketData[]): SmartMoneyFeatures['orderBlocks'] {
    const blocks: SmartMoneyFeatures['orderBlocks'] = [];
    
    if (data.length < 10) {
      this.logger.warn('Insufficient data for order block detection');
      return blocks;
    }

    // Calculate rolling average volume
    const windowSize = 10;
    const avgVolumes: number[] = [];
    
    for (let i = windowSize; i < data.length; i++) {
      const window = data.slice(i - windowSize, i);
      const avgVol = window.reduce((sum, d) => sum + d.volume, 0) / windowSize;
      avgVolumes.push(avgVol);
    }

    // Detect blocks based on high volume and strong price move
    for (let i = windowSize; i < data.length - 1; i++) {
      const idx = i - windowSize;
      const current = data[i];
      const avgVol = avgVolumes[idx];
      
      // High volume spike
      const volumeSpike = current.volume > avgVol * this.ORDER_BLOCK_STRENGTH;
      
      // Significant price movement
      const priceChange = Math.abs(current.close - current.open) / current.open;
      const isSignificant = priceChange > 0.015; // 1.5% move
      
      // Strong close (body size)
      const bodySize = Math.abs(current.close - current.open);
      const wickSize = current.high - Math.max(current.open, current.close);
      const hasStrongBody = bodySize > wickSize * 0.5;
      
      if (volumeSpike && isSignificant && hasStrongBody) {
        blocks.push({
          high: current.high,
          low: current.low,
          timestamp: typeof current.timestamp === 'number' ? current.timestamp : current.timestamp.getTime(),
          type: current.close > current.open ? 'BULLISH' : 'BEARISH'
        });
      }
    }

    return blocks.slice(-10); // Return last 10 blocks
  }

  /**
   * Detect Fair Value Gaps (FVG) - price imbalances that tend to fill
   */
  detectFairValueGaps(data: MarketData[]): SmartMoneyFeatures['fairValueGaps'] {
    const gaps: SmartMoneyFeatures['fairValueGaps'] = [];
    
    if (data.length < 3) {
      this.logger.warn('Insufficient data for FVG detection');
      return gaps;
    }

    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      const next = data[i + 1];
      
      // Bullish FVG: gap up with continuation
      // Requires: prev high < current low AND current close > current open AND next low > prev high
      if (prev.high < current.low && 
          current.close > current.open && 
          next.low > prev.high) {
        
        const gapSize = (current.low - prev.high) / prev.high;
        if (gapSize >= this.FVG_MIN_SIZE) {
          // Check if already filled
          const filled = next.low <= prev.high;
          const fillProbability = this.calculateFillProbability(gapSize, gaps.length);
          
          gaps.push({
            upper: current.low,
            lower: prev.high,
            timestamp: typeof current.timestamp === 'number' ? current.timestamp : current.timestamp.getTime(),
            filled,
            fillProbability
          });
        }
      }
      
      // Bearish FVG: gap down with continuation
      // Requires: prev low > current high AND current close < current.open AND next high < prev low
      if (prev.low > current.high && 
          current.close < current.open && 
          next.high < prev.low) {
        
        const gapSize = (prev.low - current.high) / prev.low;
        if (gapSize >= this.FVG_MIN_SIZE) {
          // Check if already filled
          const filled = next.high >= prev.low;
          const fillProbability = this.calculateFillProbability(gapSize, gaps.length);
          
          gaps.push({
            upper: prev.low,
            lower: current.high,
            timestamp: typeof current.timestamp === 'number' ? current.timestamp : current.timestamp.getTime(),
            filled,
            fillProbability
          });
        }
      }
    }

    // Update fill status for existing gaps
    gaps.forEach(gap => {
      if (!gap.filled) {
        const priceInGap = data[data.length - 1].close >= gap.lower && 
                          data[data.length - 1].close <= gap.upper;
        if (priceInGap) {
          gap.filled = true;
        }
      }
    });

    return gaps.slice(-15); // Return last 15 gaps
  }

  /**
   * Detect Break of Structure (BOS) - trend changes indicating smart money movement
   */
  detectBreakOfStructure(data: MarketData[]): SmartMoneyFeatures['breakOfStructure'] {
    if (data.length < 50) {
      this.logger.warn('Insufficient data for BOS detection');
      return { detected: false, type: 'BULLISH_BOS', strength: 0, displacement: 0 };
    }

    // Analyze recent structure
    const lookback = Math.min(50, data.length);
    const recentData = data.slice(-lookback);
    
    // Find swing highs and lows
    const swingHighs: Array<{ price: number; index: number }> = [];
    const swingLows: Array<{ price: number; index: number }> = [];
    const window = 5;
    
    for (let i = window; i < recentData.length - window; i++) {
      const center = recentData[i];
      
      // Check for swing high
      const isHigh = recentData.slice(i - window, i + window + 1)
        .every((d, idx) => idx === window || d.high <= center.high);
      
      if (isHigh) {
        swingHighs.push({ price: center.high, index: i });
      }
      
      // Check for swing low
      const isLow = recentData.slice(i - window, i + window + 1)
        .every((d, idx) => idx === window || d.low >= center.low);
      
      if (isLow) {
        swingLows.push({ price: center.low, index: i });
      }
    }
    
    if (swingHighs.length < 2 || swingLows.length < 2) {
      return { detected: false, type: 'BULLISH_BOS', strength: 0, displacement: 0 };
    }

    // Get last swing points
    const lastHigh = swingHighs[swingHighs.length - 1];
    const prevHigh = swingHighs[swingHighs.length - 2];
    const lastLow = swingLows[swingLows.length - 1];
    const prevLow = swingLows[swingLows.length - 2];
    
    const currentPrice = data[data.length - 1].close;
    
    // Bullish BOS: higher high with confirmation
    if (lastHigh.price > prevHigh.price && currentPrice > lastHigh.price * (1 + this.BOS_CONFIRMATION_PCT)) {
      const displacement = currentPrice - lastHigh.price;
      const strength = displacement / lastHigh.price;
      
      this.logger.info('Bullish BOS detected', { 
        price: currentPrice, 
        lastHigh: lastHigh.price,
        strength 
      });
      
      return {
        detected: true,
        type: 'BULLISH_BOS',
        strength,
        displacement
      };
    }
    
    // Bearish BOS: lower low with confirmation
    if (lastLow.price < prevLow.price && currentPrice < lastLow.price * (1 - this.BOS_CONFIRMATION_PCT)) {
      const displacement = lastLow.price - currentPrice;
      const strength = displacement / lastLow.price;
      
      this.logger.info('Bearish BOS detected', { 
        price: currentPrice, 
        lastLow: lastLow.price,
        strength 
      });
      
      return {
        detected: true,
        type: 'BEARISH_BOS',
        strength,
        displacement
      };
    }

    return { detected: false, type: 'BULLISH_BOS', strength: 0, displacement: 0 };
  }

  /**
   * Complete SMC analysis
   */
  analyzeFullSMC(data: MarketData[]): SmartMoneyFeatures {
    const features: SmartMoneyFeatures = {
      liquidityZones: this.detectLiquidityZones(data),
      orderBlocks: this.detectOrderBlocks(data),
      fairValueGaps: this.detectFairValueGaps(data),
      breakOfStructure: this.detectBreakOfStructure(data)
    };

    this.logger.debug('SMC analysis complete', {
      zones: features.liquidityZones.length,
      blocks: features.orderBlocks.length,
      gaps: features.fairValueGaps.length,
      bos: features.breakOfStructure.detected
    });

    return features;
  }

  private calculateFillProbability(gapSize: number, totalGaps: number): number {
    // Larger gaps have higher fill probability historically
    // 1% gap = ~75% fill rate, 0.5% gap = ~85% fill rate
    const baseProb = 0.85 - (gapSize * 10);
    
    // Recent gaps have slightly higher fill rates
    const recencyBoost = Math.min(0.1, totalGaps * 0.01);
    
    return Math.max(0.5, Math.min(0.95, baseProb + recencyBoost));
  }
}

