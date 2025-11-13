import { API_BASE } from '../../config/env';

export type SignalRow = {
  ts: number;
  symbol: string;
  side: 'buy'|'sell';
  score?: number;
  price?: number;
};

export async function fetchSignals(symbol: string): Promise<SignalRow[]> {
  const res = await fetch(`${API_BASE}/signals/${encodeURIComponent(symbol)}`, { credentials: 'include', mode: "cors", headers: { "Content-Type": "application/json" } });
  if (!res.ok) console.error(`signals ${res.status}`);
  const json = await res.json();
  // Normalize a few known shapes
  const items = Array.isArray(json?.signals) ? json.signals : Array.isArray(json) ? json : [];
  return (items || []).map((s:any) => ({
    ts: s.ts || s.timestamp || s.time || Date.now(),
    symbol: s.symbol || symbol,
    side: (s.side || s.signal || 'buy').toLowerCase(),
    score: s.score ?? s.confidence,
    price: s.price ?? s.markPrice ?? s.close
  }));
}
