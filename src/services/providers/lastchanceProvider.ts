/**
 * LastChance Real Data Provider
 *
 * Real-data provider using the LastChance API adapters.
 * No mock or demo data - fails fast if data unavailable.
 *
 * This provider integrates with the LastChance minimal API bundle
 * to fetch real OHLCV data, prices, and universe data.
 */

import { fetchOHLCV, fetchPrices, fetchUniverseTopN } from "../../../integrations/lastchance/adapters/RealDataProvider_from_LastChance";
import { Logger } from '../../core/Logger';

const logger = Logger.getInstance();

/**
 * Fetch OHLCV data from LastChance provider
 *
 * @param symbol - Trading pair symbol in exchange-native format (e.g., BTCUSDT)
 * @param timeframe - Candle timeframe (e.g., 1h, 4h, 1d)
 * @param limit - Number of candles to fetch (default: 500)
 * @returns Array of OHLCV candles
 * @throws Error if data unavailable or insufficient bars
 */
export async function lcFetchOHLCV(symbol: string, timeframe: string, limit = 500) {
  logger.debug(`[LastChance] Fetching OHLCV for ${symbol} ${timeframe} (limit: ${limit})`);

  try {
    const bars = await fetchOHLCV(symbol, timeframe, limit);

    if (!Array.isArray(bars) || bars.length < 1) {
      console.error('LC_OHLCV_EMPTY');
    }

    logger.info(`[LastChance] ✅ Fetched ${bars.length} OHLCV candles for ${symbol}`);
    return bars;
  } catch (error) {
    logger.warn(`[LastChance] ⚠️ OHLCV fetch failed for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Fetch current prices for multiple symbols from LastChance provider
 *
 * @param symbols - Array of symbol strings
 * @returns Array of price data objects
 * @throws Error if fetch fails
 */
export async function lcFetchPrices(symbols: string[]) {
  logger.debug(`[LastChance] Fetching prices for ${symbols.length} symbols`);

  try {
    const prices = await fetchPrices(symbols);
    logger.info(`[LastChance] ✅ Fetched prices for ${symbols.length} symbols`);
    return prices;
  } catch (error) {
    logger.warn(`[LastChance] ⚠️ Price fetch failed:`, error);
    throw error;
  }
}

/**
 * Fetch top N symbols by market cap/volume from LastChance universe proxy
 *
 * Uses CoinGecko/CoinMarketCap proxy behind API_BASE
 *
 * @param n - Number of top symbols to fetch (default: 300)
 * @returns Array of symbol data with volume, market cap, etc.
 * @throws Error if fetch fails
 */
export async function lcFetchUniverseTopN(n = 300) {
  logger.debug(`[LastChance] Fetching top ${n} universe symbols`);

  try {
    const universe = await fetchUniverseTopN(n);

    if (!Array.isArray(universe)) {
      console.error('LC_UNIVERSE_INVALID_FORMAT');
    }

    logger.info(`[LastChance] ✅ Fetched ${universe.length} universe symbols`);
    return universe;
  } catch (error) {
    logger.warn(`[LastChance] ⚠️ Universe fetch failed:`, error);
    throw error;
  }
}
