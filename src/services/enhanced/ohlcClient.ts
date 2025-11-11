import { API_BASE } from '../../config/env';
import { MIN_OHLC_BARS } from '../../config/risk';

export type OhlcBar = { time:number; open:number; high:number; low:number; close:number; volume?:number };

function parseOhlcResponse(data: any): OhlcBar[] {
  const arr = Array.isArray(data) ? data : (data?.data ?? []);
  return (arr || []).map((b:any)=>{
    // Binance-style [openTime, open, high, low, close, volume, closeTime, ...]
    if (Array.isArray(b) && (b?.length || 0) >= 6) {
      return { time: +b[0], open:+b[1], high:+b[2], low:+b[3], close:+b[4], volume:+b[5] };
    }
    // Object style
    return { time:+(b.ts||b.time||b.t||b.timestamp), open:+(b.o||b.open), high:+(b.h||b.high), low:+(b.l||b.low), close:+(b.c||b.close), volume:+(b.v||b.volume) };
  }).filter(x => Number.isFinite(x.time) && Number.isFinite(x.open) && Number.isFinite(x.close));
}

export async function fetchOHLC(symbol: string, timeframe: string, limit=500): Promise<OhlcBar[]> {
  const base = API_BASE.replace(/\/+$/,'');

  // Try primary candlestick endpoint first
  const candlesticksUrl = `${base}/market/candlestick/${encodeURIComponent(symbol)}?interval=${encodeURIComponent(timeframe)}&limit=${limit}`;
  try {
    const res = await fetch(candlesticksUrl, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      const out = parseOhlcResponse(data);
      if ((out?.length || 0) >= MIN_OHLC_BARS) return out;
    }
  } catch (_) {
    // Fallthrough to HF endpoint
  }

  // Fallback: HuggingFace normalized OHLCV (still real data; no synthetic)
  const hfUrl = `${base}/api/hf/ohlcv?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`;
  const r2 = await fetch(hfUrl, { credentials: 'include' });
  if (!r2.ok) console.error(`ohlc_fetch_${r2.status}`);
  const data = await r2.json();
  const out = parseOhlcResponse(data);
  if (out.length < MIN_OHLC_BARS) console.error('NOT_ENOUGH_BARS');
  return out;
}
