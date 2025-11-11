import { fetchFearGreed } from './newsProvider';

export type SentimentCompact = {
  overall?: number;              // 0-100 if computed
  fearGreedValue?: number;       // 0-100
  label?: string;                // 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
};

export async function fetchSentimentCompact(): Promise<SentimentCompact|null> {
  const fg = await fetchFearGreed();
  if (!fg) return null;
  const v = Number(fg.value);
  return {
    overall: v,
    fearGreedValue: v,
    label: fg.value_classification
  };
}
