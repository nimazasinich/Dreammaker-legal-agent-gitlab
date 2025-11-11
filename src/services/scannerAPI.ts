// Complete Scanner API Integration
// This file ensures all scanner components can fetch real data from backend

import { Logger } from '../core/Logger.js';
import { API_BASE } from '../config/env.js';

const logger = Logger.getInstance();

export interface ScannerAPIResponse<T> {
    success: boolean;
    data: T;
    source?: string;
    timestamp?: number;
    error?: string;
}

/**
 * AI Signals Scanner API
 */
export const fetchAISignals = async (symbols: string[] = ['BTC', 'ETH', 'SOL']): Promise<any[]> => {
    try {
        const promises = (symbols || []).map(async (symbol) => {
            const response = await fetch(`${API_BASE}/signals/${symbol}USDT`, { mode: "cors", headers: { "Content-Type": "application/json" } });
            if (!response.ok) console.error(`Failed to fetch signals for ${symbol}`);
            const data: ScannerAPIResponse<any> = await response.json();
            return data.success ? data.data : null;
        });
        
        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    } catch (error) {
        logger.error('Error fetching AI signals:', {}, error);
        return [];
    }
};

/**
 * Technical Patterns Scanner API
 */
export const fetchTechnicalPatterns = async (symbols: string[] = ['BTC', 'ETH', 'SOL']): Promise<any[]> => {
    try {
        const promises = (symbols || []).map(async (symbol) => {
            const response = await fetch(`${API_BASE}/analysis/harmonic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: `${symbol}USDT` })
            });
            if (!response.ok) console.error(`Failed to fetch patterns for ${symbol}`);
            const data: ScannerAPIResponse<any> = await response.json();
            return data.success ? data.data : null;
        });
        
        const results = await Promise.all(promises);
        return results.filter(r => r !== null).flat();
    } catch (error) {
        logger.error('Error fetching technical patterns:', {}, error);
        return [];
    }
};

/**
 * Smart Money Scanner API
 */
export const fetchSmartMoneyFlows = async (symbols: string[] = ['BTC', 'ETH', 'SOL']): Promise<any[]> => {
    try {
        const promises = (symbols || []).map(async (symbol) => {
            const response = await fetch(`${API_BASE}/analysis/smc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: `${symbol}USDT` })
            });
            if (!response.ok) console.error(`Failed to fetch SMC for ${symbol}`);
            const data: ScannerAPIResponse<any> = await response.json();
            return data.success ? data.data : null;
        });
        
        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    } catch (error) {
        logger.error('Error fetching smart money flows:', {}, error);
        return [];
    }
};

/**
 * News Sentiment Scanner API
 */
export const fetchNewsSentiment = async (): Promise<any[]> => {
    try {
        const response = await fetch(`${API_BASE}/sentiment/news`, { mode: "cors", headers: { "Content-Type": "application/json" } });
        if (!response.ok) console.error('Failed to fetch news sentiment');
        const data: ScannerAPIResponse<any> = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        logger.error('Error fetching news sentiment:', {}, error);
        return [];
    }
};

/**
 * Whale Activity Scanner API
 */
export const fetchWhaleActivity = async (symbols: string[] = ['BTC', 'ETH']): Promise<any[]> => {
    try {
        const symbolsParam = symbols.join(',');
        const response = await fetch(`${API_BASE}/whales/activity?symbols=${symbolsParam}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
        if (!response.ok) console.error('Failed to fetch whale activity');
        const data: ScannerAPIResponse<any> = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        logger.error('Error fetching whale activity:', {}, error);
        return [];
    }
};

/**
 * Market Data API
 */
export const fetchMarketData = async (symbol: string): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE}/market-data/${symbol}`, { mode: "cors", headers: { "Content-Type": "application/json" } });
        if (!response.ok) console.error(`Failed to fetch market data for ${symbol}`);
        const data: ScannerAPIResponse<any> = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        logger.error('Error fetching market data:', {}, error);
        return null;
    }
};

/**
 * Settings API
 */
export const fetchSettings = async (): Promise<any> => {
    try {
        const response = await fetch(`${API_BASE}/settings`, { mode: "cors", headers: { "Content-Type": "application/json" } });
        if (!response.ok) console.error('Failed to fetch settings');
        const data: ScannerAPIResponse<any> = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        logger.error('Error fetching settings:', {}, error);
        return null;
    }
};

export const saveSettings = async (settings: any): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        if (!response.ok) console.error('Failed to save settings');
        const data: ScannerAPIResponse<any> = await response.json();
        return data.success;
    } catch (error) {
        logger.error('Error saving settings:', {}, error);
        return false;
    }
};

/**
 * Health Check API
 */
export const checkAPIHealth = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${API_BASE}/health`, { mode: "cors", headers: { "Content-Type": "application/json" } });
        const data = await response.json();
        return data.status === 'ok';
    } catch (error) {
        logger.error('API health check failed:', {}, error);
        return false;
    }
};
