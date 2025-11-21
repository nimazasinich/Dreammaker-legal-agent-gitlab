import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Logger } from '../../core/Logger.js';
import { MarketData } from '../../types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DatasourceClient } from '../../services/DatasourceClient';

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
  const fetchingRef = useRef(false);
  
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  const fetchMarketData = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) {
      return;
    }
    
    fetchingRef.current = true;
    try {
      const datasourceClient = DatasourceClient.getInstance();
      const cleanSymbols = symbols.map(s => s.replace('USDT', ''));
      const priceData = await datasourceClient.getTopCoins(cleanSymbols.length, cleanSymbols);
      
      const formatted: MarketData[] = priceData.map((p) => ({
        symbol: p.symbol + 'USDT',
        open: p.price,
        high: p.price,
        low: p.price,
        close: p.price,
        price: p.price,
        change24h: p.change24h || 0,
        changePercent24h: p.changePercent24h || 0,
        volume: p.volume || 0,
        timestamp: p.timestamp || Date.now()
      }));
      setMarketData(formatted);
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Failed to fetch market data:', {}, error);
    } finally {
      fetchingRef.current = false;
    }
  }, [symbols.join(',')]); // Use symbols.join instead of symbols array

  useEffect(() => {
    if (propMarketData) {
      setMarketData(propMarketData);
    }
  }, [propMarketData]);

  useEffect(() => {
    if (!autoFetch) {
      return; // Don't fetch if autoFetch is disabled
    }
    
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    // Initial fetch
    fetchMarketData();
    
    if (refreshInterval > 0 && autoFetch) {
      interval = setInterval(() => {
        if (isMounted && autoFetch) {
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
  }, [autoFetch, refreshInterval, symbolsKey, fetchMarketData]);

  // DEFENSIVE UI: Empty State with Beautiful Placeholder
  if (!marketData || marketData.length === 0) {
    if (autoFetch) {
      return (
        <div className="relative overflow-hidden" style={{
          background: 'linear-gradient(90deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 50%, rgba(15, 15, 24, 0.95) 100%)',
          borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          <div className="flex items-center justify-center py-4 px-6 gap-3">
            <div className="animate-pulse flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-slate-300 text-sm font-medium tracking-wide">
              Loading institutional-grade market data...
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="relative overflow-hidden" style={{
      background: 'linear-gradient(90deg, rgba(15, 15, 24, 0.95) 0%, rgba(20, 20, 30, 0.95) 50%, rgba(15, 15, 24, 0.95) 100%)',
      borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
    }}>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 40s linear infinite;
        }
        .ticker-item:hover {
          transform: scale(1.05);
        }
      `}</style>
      
      {/* Gradient Overlays for Edge Fade */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{
        background: 'linear-gradient(to right, rgba(15, 15, 24, 0.95) 0%, transparent 100%)'
      }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none" style={{
        background: 'linear-gradient(to left, rgba(15, 15, 24, 0.95) 0%, transparent 100%)'
      }} />
      
      <div className="flex animate-scroll whitespace-nowrap py-4">
        {/* DEFENSIVE: Double the data to create seamless loop */}
        {[...(marketData || []), ...(marketData || [])].map((coin, index) => {
          // DEFENSIVE: Robust null handling
          const price = coin?.price ?? 0;
          const changePercent = coin?.changePercent24h ?? coin?.change24h ?? 0;
          const symbol = coin?.symbol || 'UNKNOWN';
          const isPositive = changePercent >= 0;
          
          return (
            <div 
              key={`${symbol}-${index}`} 
              className="ticker-item flex items-center gap-4 px-8 min-w-max transition-all duration-300 cursor-pointer group"
            >
              {/* Symbol with Visual Hierarchy */}
              <span className="text-slate-300 font-bold text-sm tracking-wider group-hover:text-white transition-colors">
                {symbol}
              </span>
              
              {/* Price - THE MOST IMPORTANT (Biggest & Boldest) */}
              <span className="text-white font-extrabold text-xl group-hover:scale-110 transition-all duration-500" style={{
                textShadow: '0 0 10px rgba(255, 255, 255, 0.2)',
                letterSpacing: '-0.02em'
              }}>
                ${price ? price.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: price < 1 ? 6 : 2 
                }) : '---'}
              </span>
              
              {/* Change Percentage - Visual Feedback with Smooth Transitions */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-500 group-hover:shadow-lg group-hover:scale-105 ${
                isPositive 
                  ? 'bg-emerald-500/20 group-hover:bg-emerald-500/30' 
                  : 'bg-rose-500/20 group-hover:bg-rose-500/30'
              }`} style={{
                border: isPositive 
                  ? '1px solid rgba(16, 185, 129, 0.3)' 
                  : '1px solid rgba(239, 68, 68, 0.3)',
                boxShadow: isPositive
                  ? '0 0 20px rgba(16, 185, 129, 0.2)'
                  : '0 0 20px rgba(239, 68, 68, 0.2)'
              }}>
                {isPositive ? (
                  <TrendingUp size={14} className="text-emerald-400 group-hover:translate-y-[-2px] transition-transform" />
                ) : (
                  <TrendingDown size={14} className="text-rose-400 group-hover:translate-y-[2px] transition-transform" />
                )}
                <span className={`font-bold text-sm ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`} style={{
                  textShadow: isPositive
                    ? '0 0 10px rgba(52, 211, 153, 0.5)'
                    : '0 0 10px rgba(251, 113, 133, 0.5)'
                }}>
                  {isPositive ? '+' : ''}{changePercent ? changePercent.toFixed(2) : '0.00'}%
                </span>
              </div>
              
              {/* Separator */}
              <div className="w-px h-6 bg-slate-700/50 group-hover:bg-slate-600 transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
};