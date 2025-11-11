/**
 * Market Universe Service
 * Fetches and caches top trading pairs by volume
 *
 * With LastChance provider integration for top-300 universe
 */
import { API_BASE } from '../config/env';
import { lcFetchUniverseTopN } from './providers/lastchanceProvider';
import { Logger } from '../core/Logger';

export type PairItem = {
  rank: number;
  symbolUI: string;       // e.g., BTC/USDT
  symbolBinance: string;  // e.g., BTCUSDT
  base: string;
  quote: string;
  volume24h: number;
};

const logger = Logger.getInstance();

let cache: PairItem[] | null = null;
let inflight: Promise<PairItem[]> | null = null;

export async function getTopPairs(quote = 'USDT', limit = 300): Promise<PairItem[]> {
  if (cache) return cache;
  if (inflight) return inflight;

  inflight = (async () => {
    // Try backend universe endpoint first
    try {
      const r = await fetch(`${API_BASE}/market/universe?quote=${quote}&limit=${limit}`, { credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        const items = (data.items || []) as PairItem[];
        if ((items?.length || 0) > 0) {
          logger.info(`✅ Fetched ${items.length} universe pairs from backend`);
          cache = items;
          inflight = null;
          return items;
        }
      }
    } catch (err) {
      logger.warn('⚠️ Backend universe endpoint failed, trying LastChance...', err);
    }

    // Fallback to LastChance provider
    try {
      const lcData = await lcFetchUniverseTopN(limit);
      const items = (lcData || []).map((row: any, idx: number): PairItem => ({
        rank: idx + 1,
        symbolUI: row.symbolUI || toUISymbol(row.symbolBinance || row.symbol || '', quote),
        symbolBinance: row.symbolBinance || row.symbol || '',
        base: row.base || row.symbolBinance?.replace(quote, '') || '',
        quote: row.quote || quote,
        volume24h: row.volume24h || row.volume || 0,
      }));

      logger.info(`✅ Fetched ${items.length} universe pairs from LastChance`);
      cache = items;
      inflight = null;
      return items;
    } catch (lcErr) {
      logger.error('❌ LastChance universe fetch failed', lcErr);
      inflight = null;
      console.error('Failed to fetch universe from all providers');
    }
  })();

  return inflight;
}

export function searchPairs(q: string): PairItem[] {
  if (!cache) return [];
  const s = q.trim().toUpperCase();
  if (!s) return cache;
  return cache.filter(p =>
    p.symbolUI.includes(s) ||
    p.base.includes(s) ||
    p.symbolBinance.includes(s)
  );
}

/**
 * Convert UI symbol format (BTC/USDT) to Binance format (BTCUSDT)
 */
export function toBinanceSymbol(symbolUI: string): string {
  return symbolUI.replace('/', '');
}

/**
 * Convert Binance symbol format (BTCUSDT) to UI format (BTC/USDT)
 */
export function toUISymbol(symbolBinance: string, quote = 'USDT'): string {
  if (symbolBinance.endsWith(quote)) {
    const base = symbolBinance.slice(0, -quote.length);
    return `${base}/${quote}`;
  }
  return symbolBinance;
}

/**
 * Fetch OHLC data and calculate percentage change
 */
export async function getChangePct(symbolUI: string, timeframe: string): Promise<number> {
  const sym = toBinanceSymbol(symbolUI); // BTC/USDT -> BTCUSDT
  const url = `${API_BASE}/market/ohlcv?symbol=${sym}&timeframe=${timeframe}&limit=200`;

  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) console.error(`${res.status}`);
    const rows = await res.json() as Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>;
    if (!rows?.length) console.error('no bars');

    const first = rows[0].c ?? rows[0].o;
    const last = rows[rows.length - 1].c ?? rows[rows.length - 1].o;
    return ((last - first) / first) * 100;
  } catch (err) {
    // Return sentinel value for failed fetches
    return Number.NEGATIVE_INFINITY;
  }
}
