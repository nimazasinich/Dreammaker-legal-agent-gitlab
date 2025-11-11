// src/services/cryptoClient.ts
// Frontend client for crypto resources API
// Provides typed interfaces to call the backend crypto endpoints

const API_BASE = import.meta.env?.VITE_API_BASE ?? '/api';

export async function apiMarket(q = 'bitcoin') {
  const r = await fetch(`${API_BASE}/crypto/market?q=${encodeURIComponent(q)}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
  if (!r.ok) console.error(`market ${r.status}`);
  return r.json();
}

export async function apiOHLCV(symbol = 'BTCUSDT', timeframe = '1h', limit = 500) {
  const p = new URLSearchParams({ symbol, timeframe, limit: String(limit) }).toString();
  const r = await fetch(`${API_BASE}/crypto/ohlcv?${p}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
  if (!r.ok) console.error(`ohlcv ${r.status}`);
  return r.json();
}

export async function apiFNG() {
  const r = await fetch(`${API_BASE}/crypto/fng`, { mode: "cors", headers: { "Content-Type": "application/json" } });
  if (!r.ok) console.error(`fng ${r.status}`);
  return r.json();
}
