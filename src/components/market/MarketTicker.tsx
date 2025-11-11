import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Logger } from '../../core/Logger.js';
import { MarketData } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { dataManager } from '../../services/dataManager';
import { API_BASE } from '../../config/env.js';

interface MarketTickerProps {
  marketData?: MarketData[];
  symbols?: string[];
  autoFetch?: boolean;
  refreshInterval?: number;
}


const logger = Logger.getInstance();

export const MarketTicker: React.FC<MarketTickerProps> = ({ 
  marketData: propMarketData,
  symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT', 'MATICUSDT'],
  autoFetch = false,
  refreshInterval = 30000 // 30 seconds
}) => {
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [marketData, setMarketData] = useState<MarketData[]>(propMarketData || []);
  
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  const fetchMarketData = useCallback(async () => {
    try {
      const symbolsParam = symbols.join(',');
      const response = await dataManager.fetchData<{
        success: boolean;
        prices: Array<{
          symbol: string;
          price: number;
          change24h: number;
          changePercent24h: number;
          volume: number;
        }>;
      }>(`${API_BASE}/market/prices?symbols=${symbolsParam}`);
      
      if (response && response.success && response.prices) {
        const formatted: MarketData[] = (response.prices || []).map((p) => ({
          symbol: p.symbol,
          price: p.price,
          change24h: p.change24h,
          changePercent24h: p.changePercent24h,
          volume: p.volume || 0,
          timestamp: Date.now(),
          open: p.price,
          high: p.price,
          low: p.price,
          close: p.price
        }));
        setMarketData(formatted);
      }
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to fetch market data:', {}, error);
    }
  }, [symbols.join(',')]); // Use symbols.join instead of symbols array

  useEffect(() => {
    if (propMarketData) {
      setMarketData(propMarketData);
    }
  }, [propMarketData]);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    // Initial fetch
    fetchMarketData();
    
    if (refreshInterval > 0) {
      interval = setInterval(() => {
        if (isMounted) {
          fetchMarketData();
        }
      }, refreshInterval);
    }
    
    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoFetch, refreshInterval, symbolsKey]); // Removed fetchMarketData from deps

  if (!marketData.length) {
    if (autoFetch) {
      return (
        <div className="bg-gray-900 border-b border-gray-800 p-3 text-center">
          <p className="text-gray-400 text-sm">Loading market data...</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="bg-gray-900 border-b border-gray-800 overflow-hidden">
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-scroll {
          animation: scroll 60s linear infinite;
        }
      `}</style>
      <div className="flex animate-scroll whitespace-nowrap py-3">
        {(marketData || []).map((coin) => {
          const price = coin.price || 0;
          const changePercent = coin.changePercent24h || coin.change24h || 0;
          const symbol = coin.symbol || '';
          
          return (
            <div key={symbol} className="flex items-center px-6 min-w-max">
              <span className="text-gray-300 font-medium mr-2">
                {symbol}
              </span>
              <span className="text-white font-semibold mr-3">
                ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
              </span>
              <div className={`flex items-center ${
                changePercent >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {changePercent >= 0 ? (
                  <TrendingUp size={16} className="mr-1" />
                ) : (
                  <TrendingDown size={16} className="mr-1" />
                )}
                <span className="font-medium">
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};