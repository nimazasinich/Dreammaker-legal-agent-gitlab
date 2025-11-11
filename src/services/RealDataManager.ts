import { Logger } from '../core/Logger.js';
import { DataMode } from '../types/modes';
import { API_BASE } from '../config/env.js';
import axios from 'axios';

export interface RealPriceData {
    symbol: string;
    price: number;
    change24h: number;
    volume24h: number;
    lastUpdate: number;
    timestamp?: number;
    volume?: number;
}

type OHLCV = {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

export interface Signal {
    id: string;
    symbol: string;
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    timeframe: string;
    strength: 'STRONG' | 'MODERATE' | 'WEAK';
    timestamp: number;
}

export interface RealSignalData {
    id: string;
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    confluence: number;
    timeframe: string;
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    reasoning?: string[];
    timestamp: number;
}

export interface RealPortfolioData {
    totalValue: number;
    totalChangePercent: number;
    dayPnL: number;
    dayPnLPercent: number;
    activePositions: number;
    totalPositions: number;
    balances?: any[];
    positions?: any[];
    lastUpdated?: number;
}

export class RealDataManager {
    private readonly logger = Logger.getInstance();
    private static instance: RealDataManager;
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private readonly CACHE_TTL = 120000; // افزایش از 60 به 120 ثانیه

    private constructor() {}

    static getInstance(): RealDataManager {
        if (!RealDataManager.instance) {
            RealDataManager.instance = new RealDataManager();
        }
        return RealDataManager.instance;
    }

    private getCacheKey(type: string, params: any): string {
        return `${type}:${JSON.stringify(params)}`;
    }

    private getFromCache(key: string): any | null {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this.CACHE_TTL) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    async getPrice(symbol: string): Promise<RealPriceData> {
        const cacheKey = this.getCacheKey('price', { symbol });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        // Normalize symbol (add USDT if not present)
        const normalizedSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`;

        try {
            // Try market data endpoint first (more reliable)
            const response = await axios.get(`${API_BASE}/api/market-data/${normalizedSymbol.replace('USDT', '')}`, {
                timeout: 20000 // افزایش timeout از 10 به 20 ثانیه
            });

            if (response.data && response.data.data) {
                const data = response.data.data;
                const priceData: RealPriceData = {
                    symbol: symbol.replace('USDT', ''),
                    price: parseFloat(data.price || data.currentPrice || 0),
                    change24h: parseFloat(data.changePercent24h || data.change24h || 0),
                    volume24h: parseFloat(data.volume24h || data.volume || 0),
                    lastUpdate: Date.now()
                };

                this.setCache(cacheKey, priceData);
                return priceData;
            }
        } catch (error) {
            this.logger.warn(`Market data endpoint failed for ${symbol}, trying fallback...`);
        }

        try {
            // Try Binance via proxy
            const response = await axios.get(`${API_BASE}/binance/ticker/24hr`, {
                params: { symbol: normalizedSymbol },
                timeout: 20000 // افزایش timeout
            });

            const price24hr = await axios.get(`${API_BASE}/binance/ticker/24hr`, {
                params: { symbol: normalizedSymbol },
                timeout: 10000
            });

            const data: RealPriceData = {
                symbol: symbol.replace('USDT', ''),
                price: parseFloat(response.data.price),
                change24h: parseFloat(price24hr.data.priceChangePercent || '0'),
                volume24h: parseFloat(price24hr.data.volume || '0'),
                lastUpdate: Date.now()
            };

            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            // Fallback to CoinGecko
            try {
                const coinId = this.symbolToCoinGeckoId(normalizedSymbol);
                const response = await axios.get(`${API_BASE}/coingecko/simple/price`, {
                    params: {
                        ids: coinId,
                        vs_currencies: 'usd',
                        include_24hr_change: true,
                        include_24hr_vol: true
                    },
                    timeout: 20000 // افزایش timeout
                });

                const coinData = response.data[coinId];
                if (coinData && coinData.usd) {
                    const data: RealPriceData = {
                        symbol: symbol.replace('USDT', ''),
                        price: coinData.usd,
                        change24h: coinData.usd_24h_change || 0,
                        volume24h: coinData.usd_24h_vol || 0,
                        lastUpdate: Date.now()
                    };

                    this.setCache(cacheKey, data);
                    return data;
                }
            } catch (fallbackError) {
                this.logger.error('All price sources failed', { symbol }, fallbackError as Error);
            }
            
            // Return null instead of throwing to allow graceful degradation
            return null as any;
        }
    }

    async getOHLCV(symbol: string, timeframe: string, limit: number = 100): Promise<OHLCV[]> {
        const cacheKey = this.getCacheKey('ohlcv', { symbol, timeframe, limit });
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        try {
            // Try Binance
            const interval = this.mapTimeframe(timeframe);
            const response = await axios.get(`${API_BASE}/binance/klines`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval,
                    limit
                },
                timeout: 25000 // افزایش timeout برای داده‌های تاریخی
            });

            const data: OHLCV[] = (response.data || []).map((item: any[]) => ({
                timestamp: item[0],
                open: parseFloat(item[1]),
                high: parseFloat(item[2]),
                low: parseFloat(item[3]),
                close: parseFloat(item[4]),
                volume: parseFloat(item[5])
            }));

            this.setCache(cacheKey, data);
            return data;
        } catch (error) {
            // Fallback to Kraken
            try {
                const pair = this.symbolToKrakenPair(symbol);
                const response = await axios.get(`${API_BASE}/api/proxy/kraken/ohlc`, {
                    params: {
                        pair,
                        interval: this.mapTimeframeToKraken(timeframe)
                    },
                    timeout: 25000 // افزایش timeout
                });

                const krakenData = response.data.result[pair];
                const data: OHLCV[] = krakenData.slice(0, limit).map((item: any[]) => ({
                    timestamp: item[0] * 1000,
                    open: parseFloat(item[1]),
                    high: parseFloat(item[2]),
                    low: parseFloat(item[3]),
                    close: parseFloat(item[4]),
                    volume: parseFloat(item[6])
                }));

                this.setCache(cacheKey, data);
                return data;
            } catch (fallbackError) {
                this.logger.error('All OHLCV sources failed', { symbol, timeframe }, fallbackError as Error);
                // Return empty array instead of throwing to allow graceful degradation
                return [];
            }
        }
    }

    async getMarketData(symbols: string[]): Promise<Map<string, RealPriceData>> {
        const results = new Map<string, RealPriceData>();
        
        for (const symbol of symbols) {
            try {
                const data = await this.getPrice(symbol);
                if (data) {
                    results.set(symbol, data);
                }
            } catch (error) {
                this.logger.error(`Failed to fetch data for ${symbol}`, { symbol }, error as Error);
                // Continue with other symbols instead of failing completely
            }
        }
        
        return results;
    }

    // Alias for compatibility
    async getSignals(): Promise<any[]> {
        return this.getAISignals(10);
    }

    async getPrices(symbols: string[]): Promise<RealPriceData[]> {
        const results: RealPriceData[] = [];
        
        for (const symbol of symbols) {
            try {
                const data = await this.getPrice(symbol);
                if (data) {
                    results.push(data);
                }
            } catch (error) {
                this.logger.error(`Failed to fetch price for ${symbol}`, { symbol }, error as Error);
                // Continue with other symbols
            }
        }
        
        return results;
    }

    async getPortfolio(): Promise<RealPortfolioData> {
        try {
            const response = await axios.get(`${API_BASE}/api/portfolio`, {
                timeout: 10000
            });
            return {
                totalValue: response.data.totalValue || 0,
                totalChangePercent: response.data.totalChangePercent || 0,
                dayPnL: response.data.dayPnL || 0,
                dayPnLPercent: response.data.dayPnLPercent || 0,
                activePositions: response.data.activePositions || 0,
                totalPositions: response.data.totalPositions || 0,
                balances: response.data.balances || [],
                positions: response.data.positions || [],
                lastUpdated: Date.now()
            };
        } catch (error) {
            this.logger.error('Failed to fetch portfolio', error);
            // Return default portfolio structure
            return {
                totalValue: 0,
                totalChangePercent: 0,
                dayPnL: 0,
                dayPnLPercent: 0,
                activePositions: 0,
                totalPositions: 0,
                balances: [],
                positions: [],
                lastUpdated: Date.now()
            };
        }
    }

    async getPositions(): Promise<any[]> {
        try {
            const response = await axios.get(`${API_BASE}/api/positions`, {
                timeout: 10000
            });
            return response.data.positions || response.data || [];
        } catch (error) {
            this.logger.error('Failed to fetch positions', error);
            return [];
        }
    }

    async getAISignals(limit: number = 10): Promise<Signal[]> {
        try {
            const response = await axios.get(`${API_BASE}/api/signals`, {
                params: { limit },
                timeout: 10000
            });
            
            const signals = response.data.signals || response.data || [];
            
            // Convert to Signal format if needed
            return signals.map((s: any) => ({
                id: s.id || `${s.symbol}-${Date.now()}`,
                symbol: s.symbol || 'BTCUSDT',
                direction: s.direction || (s.action === 'BUY' ? 'BULLISH' : s.action === 'SELL' ? 'BEARISH' : 'NEUTRAL'),
                confidence: s.confidence || 0.5,
                timeframe: s.timeframe || '1h',
                strength: s.strength || (s.confidence >= 0.85 ? 'STRONG' : s.confidence >= 0.70 ? 'MODERATE' : 'WEAK'),
                timestamp: s.timestamp || Date.now()
            }));
        } catch (error) {
            this.logger.error('Failed to fetch AI signals', error);
            return [];
        }
    }

    private mapTimeframe(tf: string): string {
        const map: Record<string, string> = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d',
            '1w': '1w'
        };
        return map[tf] || '1h';
    }

    private mapTimeframeToKraken(tf: string): number {
        const map: Record<string, number> = {
            '1m': 1,
            '5m': 5,
            '15m': 15,
            '30m': 30,
            '1h': 60,
            '4h': 240,
            '1d': 1440,
            '1w': 10080
        };
        return map[tf] || 60;
    }

    private symbolToCoinGeckoId(symbol: string): string {
        const map: Record<string, string> = {
            'BTCUSDT': 'bitcoin',
            'ETHUSDT': 'ethereum',
            'BNBUSDT': 'binancecoin',
            'ADAUSDT': 'cardano',
            'DOGEUSDT': 'dogecoin',
            'XRPUSDT': 'ripple',
            'DOTUSDT': 'polkadot',
            'SOLUSDT': 'solana',
            'MATICUSDT': 'matic-network',
            'LINKUSDT': 'chainlink'
        };
        return map[symbol.toUpperCase()] || 'bitcoin';
    }

    private symbolToKrakenPair(symbol: string): string {
        const map: Record<string, string> = {
            'BTCUSDT': 'XBTUSD',
            'ETHUSDT': 'ETHUSD',
            'ADAUSDT': 'ADAUSD',
            'DOGEUSDT': 'DOGEUSD',
            'XRPUSDT': 'XRPUSD',
            'DOTUSDT': 'DOTUSD',
            'SOLUSDT': 'SOLUSD',
            'LINKUSDT': 'LINKUSD'
        };
        return map[symbol.toUpperCase()] || 'XBTUSD';
    }

    // Alias methods for connector compatibility
    async fetchRealChartData(symbol: string, timeframe: string, limit: number = 100): Promise<any[]> {
        return this.getOHLCV(symbol, timeframe, limit);
    }

    async fetchRealPrices(symbols: string[]): Promise<RealPriceData[]> {
        return this.getPrices(symbols);
    }

    async fetchRealSignals(limit: number = 20): Promise<RealSignalData[]> {
        const signals = await this.getAISignals(limit);
        return signals.map(s => ({
            id: s.id,
            symbol: s.symbol,
            action: s.direction === 'BULLISH' ? 'BUY' : s.direction === 'BEARISH' ? 'SELL' : 'HOLD',
            confidence: s.confidence,
            confluence: Math.round(s.confidence * 10),
            timeframe: s.timeframe,
            timestamp: s.timestamp,
            reasoning: []
        }));
    }

    async fetchRealPortfolio(): Promise<RealPortfolioData> {
        return this.getPortfolio();
    }

    async fetchRealBlockchainBalances(blockchain?: string): Promise<any> {
        try {
            const url = blockchain
                ? `${API_BASE}/api/blockchain/balances/${blockchain}`
                : `${API_BASE}/api/blockchain/balances`;
            const response = await axios.get(url, {
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            this.logger.error('Failed to fetch blockchain balances', error);
            return {};
        }
    }

    // Subscription methods (simple polling-based implementation)
    subscribeToPrice(symbol: string, callback: (price: RealPriceData) => void): () => void {
        const interval = setInterval(async () => {
            try {
                const price = await this.getPrice(symbol);
                if (price) {
                    callback(price);
                }
            } catch (error) {
                this.logger.error(`Subscription error for ${symbol}`, { symbol }, error as Error);
            }
        }, 5000);

        return () => clearInterval(interval);
    }

    subscribeToSignals(callback: (signal: RealSignalData) => void): () => void {
        const interval = setInterval(async () => {
            try {
                const signals = await this.fetchRealSignals(1);
                if (signals.length > 0) {
                    callback(signals[0]);
                }
            } catch (error) {
                this.logger.error('Subscription error for signals', error);
            }
        }, 15000);

        return () => clearInterval(interval);
    }

    subscribeToPortfolio(callback: (portfolio: RealPortfolioData) => void): () => void {
        const interval = setInterval(async () => {
            try {
                const portfolio = await this.getPortfolio();
                callback(portfolio);
            } catch (error) {
                this.logger.error('Subscription error for portfolio', error);
            }
        }, 10000);

        return () => clearInterval(interval);
    }
}

export const realDataManager = RealDataManager.getInstance();
