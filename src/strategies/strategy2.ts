import { getOHLCV } from '../services/marketData';
import { runStrategyPipeline } from '../engine/pipeline';
import { saveStrategyOutput } from '../storage/mlOutputs';

type Strategy1Result = {
  symbol: string;
  priceUsd: number;
  decision: { finalScore: number; action: 'BUY' | 'SELL' | 'HOLD' };
};

export async function runStrategy2({
  topFromS1,
  timeframe = '15m',
  mode = 'offline' as const
}: {
  topFromS1: Strategy1Result[];
  timeframe?: string;
  mode?: 'offline' | 'online';
}) {
  const rows = [];

  for (const r of topFromS1) {
    try {
      const ohlcv = await getOHLCV({ symbol: r.symbol, timeframe, mode, limit: 300 });
      const decision = await runStrategyPipeline(ohlcv, r.symbol);

      // Placeholder ETA model: higher score = sooner entry opportunity
      const etaMinutes = Math.max(5, Math.round((1 - decision.finalScore) * 120));

      rows.push({ symbol: r.symbol, decision, etaMinutes });
    } catch (err) {
      console.warn(`Strategy2: Failed to process ${r.symbol}:`, err);
    }
  }

  await saveStrategyOutput(2, rows);
  return rows;
}
