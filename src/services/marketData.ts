import type { Bar } from '../types/signals';
import { API_BASE } from '../config/env.js';
import { normalizeApiResult, type ApiEnvelope } from '../utils/integrationGuards';
import { backoffRetry } from '../utils/retry';
import { Logger } from '../core/Logger';

const logger = Logger.getInstance();

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

  try {
    // Fetch with retry and envelope validation
    const envelope = await backoffRetry<ApiEnvelope>(async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const raw = await res.json();
      return normalizeApiResult(raw);
    });

    // Check envelope status
    if (envelope.status === 'error') {
      logger.error('OHLCV fetch failed', { 
        symbol: params.symbol, 
        code: envelope.code, 
        message: envelope.message 
      });
      return [];
    }

    // Return data from envelope
    return Array.isArray(envelope.data) ? envelope.data : [];
  } catch (error) {
    logger.error('OHLCV fetch error', { 
      symbol: params.symbol, 
      timeframe: params.timeframe 
    }, error as Error);
    return [];
  }
}
