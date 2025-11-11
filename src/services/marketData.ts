import type { Bar } from '../types/signals';
import { API_BASE } from '../config/env.js';

export async function getOHLCV(params: {
  symbol: string;
  timeframe: string;
  limit?: number;
  mode: 'offline' | 'online';
}): Promise<Bar[]> {
  // Use correct endpoints based on mode
  const endpoint = params.mode === 'offline' ? '/api/offline/ohlcv' : '/api/hf/ohlcv';
  const url = `${API_BASE}${endpoint}?symbol=${encodeURIComponent(params.symbol)}&timeframe=${encodeURIComponent(
    params.timeframe
  )}&limit=${params.limit ?? 300}`;

  const res = await fetch(url);
  if (!res.ok) console.error(`HTTP ${res.status}`);
  return res.json();
}
