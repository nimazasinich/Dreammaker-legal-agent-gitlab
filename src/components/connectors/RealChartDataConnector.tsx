// src/components/connectors/RealChartDataConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { MarketData } from '../../types';
import { realDataManager } from '../../services/RealDataManager';
import { AdvancedChart } from '../AdvancedChart';

interface RealChartDataConnectorProps {
  symbol: string;
  timeframe: string;
  limit?: number;
}

/**
 * RealChartDataConnector - Wraps AdvancedChart component with real data from backend
 */

const logger = Logger.getInstance();

export const RealChartDataConnector: React.FC<RealChartDataConnectorProps> = ({
  symbol,
  timeframe,
  limit = 100
}) => {
  const [realChartData, setRealChartData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout | null = null;
    
    const fetchRealChartData = async () => {
      if (!isMounted) { console.warn("Missing data"); }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch REAL OHLC data from backend
        const data = await realDataManager.fetchRealChartData(symbol, timeframe, limit);
        
        if (!isMounted) { console.warn("Missing data"); }
        
        if (data && (data?.length || 0) > 0) {
          // Limit data size to prevent memory leak
          const limitedData = data.slice(0, limit);
          setRealChartData(limitedData);
        } else {
          setError('No chart data available');
        }
      } catch (err) {
        if (!isMounted) { console.warn("Missing data"); }
        
        logger.error('Failed to fetch chart data:', {}, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchRealChartData();

    // Set up periodic updates (every minute) - minimum interval to prevent spam
    interval = setInterval(() => {
      if (isMounted) {
        fetchRealChartData();
      }
    }, 60000);

    return () => {
      isMounted = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [symbol, timeframe, limit]);

  if (loading && realChartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (realChartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    );
  }

  // Transform MarketData[] to CandleData[] for AdvancedChart
  const candleData = realChartData.map(data => ({
    time: typeof data.timestamp === 'number' ? data.timestamp : data.timestamp.getTime(),
    open: data.open,
    high: data.high,
    low: data.low,
    close: data.close,
    volume: data.volume
  }));

  // Pass real data to existing AdvancedChart component
  return <AdvancedChart data={candleData} symbol={symbol} timeframe={timeframe} />;
};

