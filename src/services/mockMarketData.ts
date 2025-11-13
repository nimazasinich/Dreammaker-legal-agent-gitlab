/**
 * Mock Market Data Generator
 * Useful when external APIs are unavailable
 */

import { MarketData } from '../types';

export interface CandlestickData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Generate realistic price candles for chart components
 */
export function generateMockChartData(
  symbol: string,
  count: number = 100,
  timeframe: string = '1h'
): CandlestickData[] {
  const basePrices: Record<string, number> = {
    'BTC': 67420,
    'BTCUSDT': 67420,
    'ETH': 3512,
    'ETHUSDT': 3512,
    'SOL': 152,
    'SOLUSDT': 152,
    'ADA': 0.456,
    'ADAUSDT': 0.456,
    'DOT': 7.2,
    'DOTUSDT': 7.2,
    'LINK': 15.8,
    'LINKUSDT': 15.8,
    'MATIC': 0.78,
    'MATICUSDT': 0.78,
    'AVAX': 36.4,
    'AVAXUSDT': 36.4,
  };

  const cleanSymbol = symbol.replace('USDT', '').replace('/USDT', '').toUpperCase();
  const basePrice = basePrices[cleanSymbol] || basePrices[symbol] || 100;

  // Convert interval to milliseconds
  const intervals: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };

  const interval = intervals[timeframe] || intervals['1h'];
  const now = Date.now();
  const candles: CandlestickData[] = [];

  // Generate a pseudo-realistic trend
  let currentPrice = basePrice;
  const trendDirection = Math.random() > 0.5 ? 1 : -1;
  const trendStrength = 0.0002; // 0.02% per candle

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - (i * interval);

    // Main trend component
    const trend = trendDirection * trendStrength * basePrice;
    
    // Volatility noise
    const volatility = basePrice * 0.015; // 1.5% volatility
    const noise = (Math.random() - 0.5) * volatility;

    // Price calculation
    const open = currentPrice;
    const close = currentPrice + trend + noise;
    
    // Derive high/low with realistic wicks
    const wickSize = volatility * 0.3;
    const high = Math.max(open, close) + Math.random() * wickSize;
    const low = Math.min(open, close) - Math.random() * wickSize;

    // Volume scaling (higher on strong moves)
    const priceMove = Math.abs(close - open);
    const baseVolume = basePrice * 10000;
    const volumeMultiplier = 1 + (priceMove / basePrice) * 5;
    const volume = baseVolume * volumeMultiplier * (0.5 + Math.random());

    candles.push({
      timestamp,
      open: Number(open.toFixed(8)),
      high: Number(high.toFixed(8)),
      low: Number(low.toFixed(8)),
      close: Number(close.toFixed(8)),
      volume: Number(volume.toFixed(2)),
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Generate the latest price snapshot
 */
export function generateMockCurrentPrice(symbol: string): MarketData {
  const basePrices: Record<string, number> = {
    'BTC': 67420,
    'BTCUSDT': 67420,
    'ETH': 3512,
    'ETHUSDT': 3512,
    'SOL': 152,
    'SOLUSDT': 152,
    'ADA': 0.456,
    'ADAUSDT': 0.456,
    'DOT': 7.2,
    'DOTUSDT': 7.2,
  };

  const cleanSymbol = symbol.replace('USDT', '').replace('/USDT', '').toUpperCase();
  const basePrice = basePrices[cleanSymbol] || basePrices[symbol] || 100;

  // Current price with slight drift
  const variation = (Math.random() * 0.02) - 0.01; // ±1%
  const price = basePrice * (1 + variation);

  // 24h percentage change
  const change24h = (Math.random() * 0.1) - 0.05; // ±5%
  const priceChange = price * change24h;

  // 24h volume
  const volume24h = basePrice * (500000 + Math.random() * 1000000);

  return {
    symbol: symbol,
    timestamp: Date.now(),
    open: Number((price * (1 - change24h)).toFixed(8)),
    high: Number((price * 1.03).toFixed(8)),
    low: Number((price * 0.97).toFixed(8)),
    close: Number(price.toFixed(8)),
    volume: Number(volume24h.toFixed(2)),
  };
}

/**
 * Generate price list for multiple symbols
 */
export function generateMockPricesList(symbols: string[]): MarketData[] {
  return (symbols || []).map(symbol => generateMockCurrentPrice(symbol));
}

/**
 * Helper to simulate network delay
 */
export function simulateNetworkDelay(ms: number = 200): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determine whether mock data should be used
 */
export function shouldUseMockData(): boolean {
  // Use in development or when live APIs are unavailable
  return import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

