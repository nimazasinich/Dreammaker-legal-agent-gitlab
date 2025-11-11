import { MarketData } from '../types';

import { Logger } from '../core/Logger.js';
interface TechnicalIndicators {
  sma: number[];
  ema: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  obv: number[];
  vwap: number[];
  atr: number[];
  stochastic: {
    k: number[];
    d: number[];
  };
}

interface SmartMoneyFeatures {
  orderBlocks: Array<{
    price: number;
    timestamp: Date;
    type: 'bullish' | 'bearish';
    strength: number;
  }>;
  fairValueGaps: Array<{
    high: number;
    low: number;
    timestamp: Date;
    filled: boolean;
  }>;
  breakOfStructure: Array<{
    price: number;
    timestamp: Date;
    direction: 'up' | 'down';
    significance: number;
  }>;
  liquidityZones: Array<{
    price: number;
    volume: number;
    strength: number;
  }>;
}

interface MarketRegime {
  trend: 'bullish' | 'bearish' | 'sideways';
  strength: number;
  confidence: number;
  volatility: 'low' | 'medium' | 'high';
  volume: 'low' | 'medium' | 'high';
}

interface DataFeedHealth {
  binanceStatus: 'healthy' | 'degraded' | 'down';
  coinGeckoStatus: 'healthy' | 'degraded' | 'down';
  lastUpdate: Date;
  latency: number;
  errorRate: number;
}

class BinanceAPI {
  private readonly logger = Logger.getInstance();
  private baseUrl = 'https://api.binance.com/api/v3';
  private proxyUrl = 'binance'; // Use backend proxy
  private useProxy = true; // Enable proxy by default
  private wsUrl = 'wss://stream.binance.com:9443/ws';
  private rateLimitRemaining = 1200;
  private lastRequestTime = 0;
  private websocket: WebSocket | null = null;
  private subscriptions = new Map<string, (data: any) => void>();

  async getHistoricalKlines(symbol: string, interval: string, limit: number = 500): Promise<any[]> {
    await this.checkRateLimit();
    
    try {
      // Use proxy endpoint to avoid CORS issues
      const url = this.useProxy
        ? `${this.proxyUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
        : `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        // Handle 451 (Geo-blocked)
        if (response.status === 451) {
          this.logger.warn('⚠️ Binance API blocked (451); - Geo restriction. Using mock data fallback.');
          console.error('Binance API unavailable in your region');
        }
        
        console.error(`Binance API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.updateRateLimit(response.headers);
      
      return data;
    } catch (error) {
      this.logger.error('Binance API error:', {}, error);
      throw error;
    }
  }

  async get24hrTicker(symbol: string): Promise<any> {
    await this.checkRateLimit();
    
    try {
      const response = await fetch(`${this.baseUrl}/ticker/24hr?symbol=${symbol}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
      
      if (!response.ok) {
        console.error(`Binance API error: ${response.status}`);
      }
      
      const data = await response.json();
      this.updateRateLimit(response.headers);
      
      return data;
    } catch (error) {
      this.logger.error('Binance ticker error:', {}, error);
      throw error;
    }
  }

  subscribeToRealTime(symbols: string[], callback: (data: any) => void): void {
    const streams = (symbols || []).map(symbol => `${symbol.toLowerCase()}@ticker`).join('/');
    const wsUrl = `${this.wsUrl}/${streams}`;
    
    if (this.websocket) {
      this.websocket.close();
    }
    
    this.websocket = new WebSocket(wsUrl);

    this.websocket.onopen = () => {
      this.logger.info('Binance WebSocket connected');
    };

    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        this.logger.error('WebSocket message parsing error:', {}, error);
      }
    };

    this.websocket.onerror = (error) => {
      this.logger.error('Binance WebSocket error:', {}, new Error('WebSocket error'));
    };

    this.websocket.onclose = () => {
      this.logger.info('Binance WebSocket disconnected');
      setTimeout(() => {
        if ((symbols?.length || 0) > 0) {
          this.subscribeToRealTime(symbols, callback);
        }
      }, 5000);
    };
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (this.rateLimitRemaining <= 10 && timeSinceLastRequest < 60000) {
      const waitTime = 60000 - timeSinceLastRequest;
      this.logger.info(`Rate limit approaching, waiting ${waitTime}ms`, { data: waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = now;
  }

  private updateRateLimit(headers: Headers): void {
    const remaining = headers.get('x-mbx-used-weight-1m');
    if (remaining) {
      this.rateLimitRemaining = 1200 - parseInt(remaining);
    }
  }

  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }
}

class CoinGeckoAPI {
  private readonly logger = Logger.getInstance();
  private baseUrl = 'https://api.coingecko.com/api/v3';
  private proxyUrl = 'coingecko'; // Use backend proxy
  private useProxy = true; // Enable proxy by default
  private rateLimitRemaining = 50;
  private lastRequestTime = 0;

  async getHistoricalData(coinId: string, days: number = 30): Promise<any> {
    await this.checkRateLimit();
    
    try {
      // Use proxy endpoint to avoid CORS and 401 issues
      const url = this.useProxy
        ? `${this.proxyUrl}/market_chart?coinId=${coinId}&days=${days}&vs_currency=usd&interval=hourly`
        : `${this.baseUrl}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          this.logger.warn('⚠️ CoinGecko API key missing or invalid (401);. Using mock data fallback.');
          console.error('CoinGecko API key required');
        }

        if (response.status === 429) {
          this.logger.warn('⚠️ CoinGecko rate limit exceeded (429);. Using mock data fallback.');
          console.error('CoinGecko rate limit exceeded');
        }

        console.error(`CoinGecko API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('CoinGecko API error:', {}, error);
      throw error;
    }
  }

  async getCurrentPrice(coinIds: string[]): Promise<any> {
    await this.checkRateLimit();
    
    try {
      const ids = coinIds.join(',');
      // Use proxy endpoint
      const url = this.useProxy
        ? `${this.proxyUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
        : `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          console.error('CoinGecko API key required');
        }
        console.error(`CoinGecko API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      this.logger.error('CoinGecko price error:', {}, error);
      throw error;
    }
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.rateLimitRemaining <= 5 && timeSinceLastRequest < 60000) {
      const waitTime = 60000 - timeSinceLastRequest;
      this.logger.info(`CoinGecko rate limit approaching, waiting ${waitTime}ms`, { data: waitTime });
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = now;
  }
}

export class MarketDataService {
  private readonly logger = Logger.getInstance();

  private binanceAPI: BinanceAPI;
  private coinGeckoAPI: CoinGeckoAPI;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private realTimeSubscriptions = new Map<string, (data: MarketData) => void>();
  
  private symbolMappings = {
    'BTCUSDT': { binance: 'BTCUSDT', coingecko: 'bitcoin' },
    'ETHUSDT': { binance: 'ETHUSDT', coingecko: 'ethereum' },
    'BNBUSDT': { binance: 'BNBUSDT', coingecko: 'binancecoin' },
    'ADAUSDT': { binance: 'ADAUSDT', coingecko: 'cardano' },
    'SOLUSDT': { binance: 'SOLUSDT', coingecko: 'solana' },
    'MATICUSDT': { binance: 'MATICUSDT', coingecko: 'matic-network' },
    'DOTUSDT': { binance: 'DOTUSDT', coingecko: 'polkadot' },
    'LINKUSDT': { binance: 'LINKUSDT', coingecko: 'chainlink' },
    'LTCUSDT': { binance: 'LTCUSDT', coingecko: 'litecoin' },
    'XRPUSDT': { binance: 'XRPUSDT', coingecko: 'ripple' }
  };

  constructor() {
    this.binanceAPI = new BinanceAPI();
    this.coinGeckoAPI = new CoinGeckoAPI();
  }

  async getHistoricalData(symbol: string, timeframe: string, limit: number = 500): Promise<MarketData[]> {
    const cacheKey = `${symbol}_${timeframe}_${limit}`;
    const cached = this.getFromCache(cacheKey, 300000);
    
    if (cached) {
      return cached;
    }

    try {
      const binanceInterval = this.convertTimeframeToBinance(timeframe);
      const binanceSymbol = this.symbolMappings[symbol as keyof typeof this.symbolMappings]?.binance || symbol;
      
      const klines = await this.binanceAPI.getHistoricalKlines(binanceSymbol, binanceInterval, limit);
      const marketData = this.convertBinanceKlinesToMarketData(klines, symbol, timeframe);
      
      this.setCache(cacheKey, marketData, 300000);
      return marketData;

    } catch (error) {
      this.logger.warn('⚠️ Binance failed (CORS or API error);, trying CoinGecko fallback...');

      try {
        const coinGeckoId = this.symbolMappings[symbol as keyof typeof this.symbolMappings]?.coingecko;
        if (!coinGeckoId) {
          console.error(`No CoinGecko mapping for ${symbol}`);
        }

        const days = this.convertLimitToDays(limit, timeframe);
        const data = await this.coinGeckoAPI.getHistoricalData(coinGeckoId, days);
        const marketData = this.convertCoinGeckoToMarketData(data, symbol, timeframe);

        this.setCache(cacheKey, marketData, 300000);
        return marketData;

      } catch (fallbackError) {
        this.logger.warn('⚠️ Both APIs failed, returning empty array (frontend will use mock data);');
        // Return empty array instead of throwing - frontend will handle with mock data
        return [];
      }
    }
  }

  async getRealTimePrice(symbol: string): Promise<MarketData> {
    try {
      const binanceSymbol = this.symbolMappings[symbol as keyof typeof this.symbolMappings]?.binance || symbol;
      const ticker = await this.binanceAPI.get24hrTicker(binanceSymbol);
      
      return {
        symbol,
        timeframe: '1m',
        timestamp: new Date(),
        open: parseFloat(ticker.openPrice),
        high: parseFloat(ticker.highPrice),
        low: parseFloat(ticker.lowPrice),
        close: parseFloat(ticker.lastPrice),
        volume: parseFloat(ticker.volume),
        trades: parseInt(ticker.count)
      };
    } catch (error) {
      this.logger.error('Real-time price fetch failed:', {}, error);
      throw error;
    }
  }

  async subscribeToRealTime(symbols: string[], callback: (data: MarketData) => void): Promise<void> {
    const binanceSymbols = (symbols || []).map(symbol => 
      this.symbolMappings[symbol as keyof typeof this.symbolMappings]?.binance || symbol
    );

    this.binanceAPI.subscribeToRealTime(binanceSymbols, (wsData) => {
      try {
        const marketData: MarketData = {
          symbol: wsData.s,
          timeframe: '1m',
          timestamp: new Date(wsData.E),
          open: parseFloat(wsData.o),
          high: parseFloat(wsData.h),
          low: parseFloat(wsData.l),
          close: parseFloat(wsData.c),
          volume: parseFloat(wsData.v),
          trades: parseInt(wsData.n)
        };

        callback(marketData);
      } catch (error) {
        this.logger.error('WebSocket data processing error:', {}, error);
      }
    });

    symbols.forEach(symbol => {
      this.realTimeSubscriptions.set(symbol, callback);
    });
  }

  async calculateIndicators(data: MarketData[]): Promise<TechnicalIndicators> {
    if (data.length < 50) {
      console.error('Insufficient data for technical indicators');
    }

    const closes = (data || []).map(d => d.close);
    const highs = (data || []).map(d => d.high);
    const lows = (data || []).map(d => d.low);
    const volumes = (data || []).map(d => d.volume);

    return {
      sma: this.calculateSMA(closes, 20),
      ema: this.calculateEMA(closes, 20),
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      bollinger: this.calculateBollingerBands(closes, 20, 2),
      obv: this.calculateOBV(closes, volumes),
      vwap: this.calculateVWAP(data),
      atr: this.calculateATR(highs, lows, closes, 14),
      stochastic: this.calculateStochastic(highs, lows, closes, 14)
    };
  }

  async getSmartMoneyFeatures(data: MarketData[]): Promise<SmartMoneyFeatures> {
    return {
      orderBlocks: this.detectOrderBlocks(data),
      fairValueGaps: this.detectFairValueGaps(data),
      breakOfStructure: this.detectBreakOfStructure(data),
      liquidityZones: this.detectLiquidityZones(data)
    };
  }

  async detectMarketRegime(data: MarketData[]): Promise<MarketRegime> {
    if (data.length < 50) {
      console.error('Insufficient data for regime detection');
    }

    const closes = (data || []).map(d => d.close);
    const volumes = (data || []).map(d => d.volume);
    
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const currentPrice = closes[closes.length - 1];
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    
    let trend: 'bullish' | 'bearish' | 'sideways';
    let strength = 0;
    
    if (currentPrice > currentSMA20 && currentSMA20 > currentSMA50) {
      trend = 'bullish';
      strength = Math.min(1, (currentPrice - currentSMA50) / currentSMA50 * 10);
    } else if (currentPrice < currentSMA20 && currentSMA20 < currentSMA50) {
      trend = 'bearish';
      strength = Math.min(1, (currentSMA50 - currentPrice) / currentSMA50 * 10);
    } else {
      trend = 'sideways';
      strength = 0.5;
    }
    
    const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
    const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
    
    let volatilityLevel: 'low' | 'medium' | 'high';
    if (volatility < 0.02) volatilityLevel = 'low';
    else if (volatility < 0.05) volatilityLevel = 'medium';
    else volatilityLevel = 'high';
    
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const recentVolume = volumes.slice(-10).reduce((sum, v) => sum + v, 0) / 10;
    
    let volumeLevel: 'low' | 'medium' | 'high';
    if (recentVolume < avgVolume * 0.8) volumeLevel = 'low';
    else if (recentVolume < avgVolume * 1.2) volumeLevel = 'medium';
    else volumeLevel = 'high';
    
    return {
      trend,
      strength,
      confidence: Math.min(1, strength + (volumeLevel === 'high' ? 0.2 : 0)),
      volatility: volatilityLevel,
      volume: volumeLevel
    };
  }

  async validateDataQuality(data: MarketData[]): Promise<DataFeedHealth> {
    const now = Date.now();
    let binanceStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    let coinGeckoStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    let latency = 0;
    let errorRate = 0;

    try {
      const start = Date.now();
      await this.binanceAPI.get24hrTicker('BTCUSDT');
      latency = Date.now() - start;
      
      if (latency > 2000) binanceStatus = 'degraded';
    } catch (error) {
      binanceStatus = 'down';
      errorRate += 0.5;
    }

    try {
      await this.coinGeckoAPI.getCurrentPrice(['bitcoin']);
    } catch (error) {
      coinGeckoStatus = 'down';
      errorRate += 0.5;
    }

    return {
      binanceStatus,
      coinGeckoStatus,
      lastUpdate: new Date(),
      latency,
      errorRate
    };
  }

  // Technical Indicator Calculations
  private calculateSMA(data: number[], period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  }

  private calculateEMA(data: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    result.push(ema);
    
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    
    return result;
  }

  private calculateRSI(data: number[], period: number): number[] {
    const result: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        result.push(100 - (100 / (1 + rs)));
      }
    }
    
    return result;
  }

  private calculateMACD(data: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    
    const macd: number[] = [];
    const startIndex = 26 - 12;
    
    for (let i = startIndex; i < ema12.length; i++) {
      macd.push(ema12[i] - ema26[i - startIndex]);
    }
    
    const signal = this.calculateEMA(macd, 9);
    const histogram: number[] = [];
    
    const signalStartIndex = macd.length - signal.length;
    for (let i = signalStartIndex; i < macd.length; i++) {
      histogram.push(macd[i] - signal[i - signalStartIndex]);
    }
    
    return { macd, signal, histogram };
  }

  private calculateBollingerBands(data: number[], period: number, stdDev: number): { upper: number[]; middle: number[]; lower: number[] } {
    const sma = this.calculateSMA(data, period);
    const upper: number[] = [];
    const lower: number[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(mean + (standardDeviation * stdDev));
      lower.push(mean - (standardDeviation * stdDev));
    }
    
    return { upper, middle: sma, lower };
  }

  private calculateOBV(closes: number[], volumes: number[]): number[] {
    const result: number[] = [volumes[0]];
    
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) {
        result.push(result[i - 1] + volumes[i]);
      } else if (closes[i] < closes[i - 1]) {
        result.push(result[i - 1] - volumes[i]);
      } else {
        result.push(result[i - 1]);
      }
    }
    
    return result;
  }

  private calculateVWAP(data: MarketData[]): number[] {
    const result: number[] = [];
    let cumulativeVolume = 0;
    let cumulativeVolumePrice = 0;
    
    for (const candle of data) {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      cumulativeVolumePrice += typicalPrice * candle.volume;
      cumulativeVolume += candle.volume;
      
      result.push(cumulativeVolumePrice / cumulativeVolume);
    }
    
    return result;
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number[] {
    const trueRanges: number[] = [];
    
    for (let i = 1; i < highs.length; i++) {
      const tr1 = highs[i] - lows[i];
      const tr2 = Math.abs(highs[i] - closes[i - 1]);
      const tr3 = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  private calculateStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number[]; d: number[] } {
    const k: number[] = [];
    
    for (let i = period - 1; i < closes.length; i++) {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      
      if (highestHigh === lowestLow) {
        k.push(50);
      } else {
        k.push(((closes[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
      }
    }
    
    const d = this.calculateSMA(k, 3);
    
    return { k, d };
  }

  // Smart Money Concepts
  private detectOrderBlocks(data: MarketData[]): Array<{ price: number; timestamp: Date; type: 'bullish' | 'bearish'; strength: number }> {
    const orderBlocks: Array<{ price: number; timestamp: Date; type: 'bullish' | 'bearish'; strength: number }> = [];
    
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const prev = data[i - 1];
      
      if (current.close > current.open &&
          current.volume > data.slice(Math.max(0, i - 10), i).reduce((sum, d) => sum + d.volume, 0) / 10 * 1.5 &&
          prev.close < prev.open) {
        orderBlocks.push({
          price: current.low,
          timestamp: new Date(current.timestamp),
          type: 'bullish',
          strength: (current.close - current.open) / current.open
        });
      }

      if (current.close < current.open &&
          current.volume > data.slice(Math.max(0, i - 10), i).reduce((sum, d) => sum + d.volume, 0) / 10 * 1.5 &&
          prev.close > prev.open) {
        orderBlocks.push({
          price: current.high,
          timestamp: new Date(current.timestamp),
          type: 'bearish',
          strength: (current.open - current.close) / current.open
        });
      }
    }
    
    return orderBlocks;
  }

  private detectFairValueGaps(data: MarketData[]): Array<{ high: number; low: number; timestamp: Date; filled: boolean }> {
    const gaps: Array<{ high: number; low: number; timestamp: Date; filled: boolean }> = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      const prev = data[i - 1];
      const current = data[i];
      
      if (current.low > prev.high) {
        gaps.push({
          high: current.low,
          low: prev.high,
          timestamp: new Date(current.timestamp),
          filled: false
        });
      }

      if (current.high < prev.low) {
        gaps.push({
          high: prev.low,
          low: current.high,
          timestamp: new Date(current.timestamp),
          filled: false
        });
      }
    }
    
    gaps.forEach(gap => {
      const gapIndex = data.findIndex(d => d.timestamp >= gap.timestamp);
      for (let i = gapIndex + 1; i < data.length; i++) {
        if (data[i].low <= gap.low && data[i].high >= gap.high) {
          gap.filled = true;
          break;
        }
      }
    });
    
    return gaps;
  }

  private detectBreakOfStructure(data: MarketData[]): Array<{ price: number; timestamp: Date; direction: 'up' | 'down'; significance: number }> {
    const breaks: Array<{ price: number; timestamp: Date; direction: 'up' | 'down'; significance: number }> = [];
    const swingHighs: Array<{ price: number; index: number }> = [];
    const swingLows: Array<{ price: number; index: number }> = [];
    
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const isSwingHigh = data.slice(i - 2, i + 3).every((d, idx) => idx === 2 || d.high <= current.high);
      const isSwingLow = data.slice(i - 2, i + 3).every((d, idx) => idx === 2 || d.low >= current.low);
      
      if (isSwingHigh) {
        swingHighs.push({ price: current.high, index: i });
      }
      if (isSwingLow) {
        swingLows.push({ price: current.low, index: i });
      }
    }
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      
      const lastSwingHigh = swingHighs.filter(sh => sh.index < i).pop();
      if (lastSwingHigh && current.close > lastSwingHigh.price) {
        breaks.push({
          price: lastSwingHigh.price,
          timestamp: new Date(current.timestamp),
          direction: 'up',
          significance: (current.close - lastSwingHigh.price) / lastSwingHigh.price
        });
      }

      const lastSwingLow = swingLows.filter(sl => sl.index < i).pop();
      if (lastSwingLow && current.close < lastSwingLow.price) {
        breaks.push({
          price: lastSwingLow.price,
          timestamp: new Date(current.timestamp),
          direction: 'down',
          significance: (lastSwingLow.price - current.close) / lastSwingLow.price
        });
      }
    }
    
    return breaks;
  }

  private detectLiquidityZones(data: MarketData[]): Array<{ price: number; volume: number; strength: number }> {
    const zones: Array<{ price: number; volume: number; strength: number }> = [];
    const priceVolumeMap = new Map<number, number>();
    
    data.forEach(candle => {
      const priceLevel = Math.round(candle.close * 100) / 100;
      const existingVolume = priceVolumeMap.get(priceLevel) || 0;
      priceVolumeMap.set(priceLevel, existingVolume + candle.volume);
    });
    
    const avgVolume = Array.from(priceVolumeMap.values()).reduce((sum, vol) => sum + vol, 0) / priceVolumeMap.size;
    
    priceVolumeMap.forEach((volume, price) => {
      if (volume > avgVolume * 2) {
        zones.push({
          price,
          volume,
          strength: volume / avgVolume
        });
      }
    });
    
    return zones.sort((a, b) => b.strength - a.strength).slice(0, 10);
  }

  // Utility methods
  private convertTimeframeToBinance(timeframe: string): string {
    const mapping: { [key: string]: string } = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };
    return mapping[timeframe] || '1h';
  }

  private convertLimitToDays(limit: number, timeframe: string): number {
    const timeframeMinutes: { [key: string]: number } = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440,
      '1w': 10080
    };
    
    const minutes = timeframeMinutes[timeframe] || 60;
    return Math.ceil((limit * minutes) / 1440);
  }

  private convertBinanceKlinesToMarketData(klines: any[], symbol: string, timeframe: string): MarketData[] {
    return (klines || []).map(kline => ({
      symbol,
      timeframe,
      timestamp: new Date(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      trades: parseInt(kline[8])
    }));
  }

  private convertCoinGeckoToMarketData(data: any, symbol: string, timeframe: string): MarketData[] {
    const prices = data.prices || [];
    const volumes = data.total_volumes || [];
    
    return (prices || []).map((price: [number, number], index: number) => ({
      symbol,
      timeframe,
      timestamp: new Date(price[0]),
      open: price[1],
      high: price[1],
      low: price[1],
      close: price[1],
      volume: volumes[index] ? volumes[index][1] : 0,
      trades: 0
    }));
  }

  private getFromCache(key: string, maxAge: number): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  disconnect(): void {
    this.binanceAPI.disconnect();
    this.realTimeSubscriptions.clear();
  }

  getSupportedSymbols(): string[] {
    return Object.keys(this.symbolMappings);
  }

  getSupportedTimeframes(): string[] {
    return ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
  }
}

export const marketDataService = new MarketDataService();