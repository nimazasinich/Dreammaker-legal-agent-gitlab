import { saveStrategyOutput } from '../storage/mlOutputs';

type Strategy2Result = {
  symbol: string;
  decision: { finalScore: number; action: 'BUY' | 'SELL' | 'HOLD' };
};

export async function runStrategy3({
  topFromS2
}: {
  topFromS2: Strategy2Result[];
}) {
  const top3 = [...topFromS2].sort((a, b) => b.decision.finalScore - a.decision.finalScore).slice(0, 3);

  const entries = (top3 || []).map(t => ({
    symbol: t.symbol,
    action: t.decision.action,
    entryLevels: {
      conservative: 0.236, // relative fib placeholders
      base: 0.382,
      aggressive: 0.5
    },
    risk: {
      slAtrMult: 2, // stop-loss: 2x ATR
      rr: 2 // risk-reward ratio: 1:2
    },
    summary: `Entry plan aligned with ICT/Fib/Elliott/SAR; finalScore=${t.decision.finalScore.toFixed(2)}`
  }));

  await saveStrategyOutput(3, entries);
  return entries;
}
