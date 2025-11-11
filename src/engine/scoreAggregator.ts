import { FinalDecision, CoreSignal, LayerScore, PatternScores, SentimentScores, MLScore } from '../types/signals';

type Weights = {
  core: number;   // 0.40
  smc: number;    // 0.25
  patterns: number; // 0.20
  sentiment: number; // 0.10
  ml: number;     // 0.05
};

export const DEFAULT_WEIGHTS: Weights = { core: 0.40, smc: 0.25, patterns: 0.20, sentiment: 0.10, ml: 0.05 };

export function aggregateScores(
  core: CoreSignal,
  smc: LayerScore,
  patterns: PatternScores,
  sentiment: SentimentScores,
  ml: MLScore,
  weights: Weights = DEFAULT_WEIGHTS,
  thresholds = { buy: 0.70, sell: 0.70 }
): FinalDecision {
  const finalScore =
      weights.core     * core.score
    + weights.smc      * smc.score
    + weights.patterns * patterns.combined.score
    + weights.sentiment* sentiment.combined.score
    + weights.ml       * ml.score;

  let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
  if (core.action === 'BUY'  && finalScore >= thresholds.buy)  action = 'BUY';
  if (core.action === 'SELL' && finalScore >= thresholds.sell) action = 'SELL';

  // Calculate confidence based on component agreement
  const componentScores = [core.score, smc.score, patterns.combined.score, sentiment.combined.score, ml.score];
  const avgScore = componentScores.reduce((sum, s) => sum + s, 0) / componentScores.length;
  const variance = componentScores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / componentScores.length;
  const stdDev = Math.sqrt(variance);
  const confidence = Math.max(0, Math.min(1, 1 - (stdDev * 2))); // Lower std dev = higher confidence

  return {
    action,
    score: finalScore,
    confidence,
    finalScore, // Deprecated: kept for backward compatibility
    components: { core, smc, patterns, sentiment, ml, aux: { fibonacci:{score:0,reasons:[]}, sar:{score:0,reasons:[]}, rpercent:{score:0,reasons:[]} } }
  };
}
