import { Bar, LayerScore } from '../types/signals';
import { SMCAnalyzer } from '../services/SMCAnalyzer';
import { Logger } from '../core/Logger';

/**
 * Smart Money Concepts (SMC) Detector - Real SMC analysis
 *
 * Analyzes institutional order flow and market structure:
 * - Order Blocks (OB): Areas where institutions entered positions
 * - Fair Value Gaps (FVG): Inefficiencies in price action
 * - Break of Structure (BoS): Trend changes and continuations
 * - Market Structure Shifts (MSS): Major trend reversals
 * - Liquidity Pools: Areas where stop losses cluster
 *
 * Score Interpretation:
 * - 0.0-0.3: Strong Bearish Structure
 * - 0.3-0.45: Weak Bearish Structure
 * - 0.45-0.55: Neutral/Ranging
 * - 0.55-0.7: Weak Bullish Structure
 * - 0.7-1.0: Strong Bullish Structure
 *
 * Weights:
 * - Order Blocks: 40% (most reliable)
 * - Break of Structure: 30% (trend confirmation)
 * - Fair Value Gaps: 20% (inefficiency detection)
 * - Market Structure: 10% (overall bias)
 */
export function detectSMC(ohlcv: Bar[], symbol: string): LayerScore {
  if (ohlcv.length < 50) {
    return { score: 0.0, reasons: ['Insufficient data for SMC analysis (need 50+ bars)'] };
  }

  const logger = Logger.getInstance();
  const analyzer = SMCAnalyzer.getInstance();

  try {
    logger.debug('Analyzing Smart Money Concepts', { symbol, bars: ohlcv.length });

    // Analyze SMC using the dedicated service
    const smcData = analyzer.analyze(ohlcv, symbol);

    // Initialize scoring components
    let orderBlockScore = 0.5; // neutral baseline
    let bosScore = 0.5;
    let fvgScore = 0.5;
    let structureScore = 0.5;

    const reasons: string[] = [];

    // ========== 1. ORDER BLOCKS ANALYSIS (40% weight) ==========

    if (smcData.orderBlocks && (smcData.orderBlocks?.length || 0) > 0) {
      // Count bullish vs bearish order blocks
      const bullishOBs = smcData?.orderBlocks?.filter(ob => ob.type === 'bullish');
      const bearishOBs = smcData?.orderBlocks?.filter(ob => ob.type === 'bearish');

      const bullishCount = bullishOBs.length;
      const bearishCount = bearishOBs.length;
      const totalOBs = bullishCount + bearishCount;

      if (totalOBs > 0) {
        // Calculate strength based on most recent and strongest OBs
        const recentOBs = smcData.orderBlocks.slice(-5); // Last 5 OBs
        const recentBullish = recentOBs.filter(ob => ob.type === 'bullish').length;
        const recentBearish = recentOBs.filter(ob => ob.type === 'bearish').length;

        if (bullishCount > bearishCount) {
          // More bullish OBs
          const ratio = bullishCount / totalOBs;
          orderBlockScore = 0.5 + (ratio * 0.4); // 0.5 to 0.9
          reasons.push(`${bullishCount} bullish Order Blocks (Institutional buying)`);
        } else if (bearishCount > bullishCount) {
          // More bearish OBs
          const ratio = bearishCount / totalOBs;
          orderBlockScore = 0.5 - (ratio * 0.4); // 0.1 to 0.5
          reasons.push(`${bearishCount} bearish Order Blocks (Institutional selling)`);
        } else {
          // Equal
          orderBlockScore = 0.5;
          reasons.push('Balanced Order Block distribution');
        }

        // Recent OBs have more weight
        if (recentBullish > recentBearish * 1.5) {
          orderBlockScore += 0.1; // Bonus for recent bullish activity
        } else if (recentBearish > recentBullish * 1.5) {
          orderBlockScore -= 0.1; // Penalty for recent bearish activity
        }
      }
    } else {
      reasons.push('No clear Order Blocks detected');
    }

    // ========== 2. BREAK OF STRUCTURE (30% weight) ==========

    if (smcData.structure && smcData.structure.breakOfStructure) {
      const bos = smcData.structure.breakOfStructure;

      if (bos.direction === 'bullish') {
        // Bullish BoS - price breaking above previous highs
        bosScore = 0.75;
        const strength = bos.strength || 'moderate';
        reasons.push(`Bullish BoS detected (${strength})`);

        // Strong BoS gets bonus
        if (strength === 'strong') {
          bosScore = 0.85;
        }
      } else if (bos.direction === 'bearish') {
        // Bearish BoS - price breaking below previous lows
        bosScore = 0.25;
        const strength = bos.strength || 'moderate';
        reasons.push(`Bearish BoS detected (${strength})`);

        // Strong BoS gets more weight
        if (strength === 'strong') {
          bosScore = 0.15;
        }
      } else {
        bosScore = 0.5;
        reasons.push('No clear Break of Structure');
      }
    } else {
      bosScore = 0.5;
      reasons.push('Market structure ranging');
    }

    // ========== 3. FAIR VALUE GAPS (20% weight) ==========

    if (smcData.fairValueGaps && (smcData.fairValueGaps?.length || 0) > 0) {
      // FVGs represent inefficiencies - price should fill them
      const recentFVG = smcData.fairValueGaps[smcData.fairValueGaps.length - 1];

      if (recentFVG.type === 'bullish') {
        // Bullish FVG - gap up, price inefficiency above
        fvgScore = 0.65;
        reasons.push('Bullish FVG (upward inefficiency)');
      } else if (recentFVG.type === 'bearish') {
        // Bearish FVG - gap down, price inefficiency below
        fvgScore = 0.35;
        reasons.push('Bearish FVG (downward inefficiency)');
      }

      // If FVG is filled, reduce its impact
      if (recentFVG.filled) {
        fvgScore = 0.5;
        reasons.push('FVG filled (inefficiency resolved)');
      }
    }

    // ========== 4. MARKET STRUCTURE SHIFT (10% weight) ==========

    if (smcData.structure && smcData.structure.trend) {
      const trend = smcData.structure.trend;

      if (trend === 'bullish') {
        structureScore = 0.7;
        reasons.push('Overall bullish market structure');
      } else if (trend === 'bearish') {
        structureScore = 0.3;
        reasons.push('Overall bearish market structure');
      } else {
        structureScore = 0.5;
        reasons.push('Neutral market structure (ranging)');
      }
    }

    // ========== WEIGHTED FINAL SCORE ==========

    const finalScore = (
      (orderBlockScore * 0.40) +
      (bosScore * 0.30) +
      (fvgScore * 0.20) +
      (structureScore * 0.10)
    );

    // Clamp to valid range
    const clampedScore = Math.max(0, Math.min(1, finalScore));

    logger.info('SMC analysis completed', {
      symbol,
      score: clampedScore.toFixed(3),
      orderBlocks: smcData.orderBlocks?.length || 0,
      fvgs: smcData.fairValueGaps?.length || 0,
      bos: smcData.structure?.breakOfStructure?.direction || 'none'
    });

    return {
      score: clampedScore,
      reasons: reasons.slice(0, 3) // Top 3 most important SMC signals
    };

  } catch (error) {
    logger.error('SMC analysis failed', { symbol }, error as Error);

    // Fallback to simple heuristic if SMC analyzer fails
    logger.warn('Falling back to simple SMC heuristic', { symbol });

    // Simple bias based on recent price action
    const last20 = ohlcv.slice(-20);
    const bullishCandles = last20.filter(b => b.close > b.open).length;
    const bias = bullishCandles / 20;
    const simplifiedScore = Math.max(0, Math.min(1, bias));

    return {
      score: simplifiedScore,
      reasons: [
        'SMC analyzer unavailable',
        'Using simplified structure bias',
        `${bullishCandles}/20 bullish candles`
      ]
    };
  }
}
