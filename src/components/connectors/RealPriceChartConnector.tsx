// src/components/connectors/RealPriceChartConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { realDataManager, RealPriceData } from '../../services/RealDataManager';
import { PriceChart } from '../market/PriceChart';

interface RealPriceChartConnectorProps {
  symbols: string[];
  height?: number;
}

/**
 * RealPriceChartConnector - Wraps PriceChart component with real-time price data
 */

const logger = Logger.getInstance();

export const RealPriceChartConnector: React.FC<RealPriceChartConnectorProps> = ({
  symbols,
  height = 300
}) => {
  const [realPrices, setRealPrices] = useState<RealPriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRealPrices = async () => {
      if (!isMounted) { console.warn("Missing data"); }

      try {
        setLoading(true);
        setError(null);

        // Fetch REAL price data from backend
        const prices = await realDataManager.getPrices(symbols);
        if (isMounted) {
          setRealPrices(prices);
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Failed to fetch prices:', {}, err);
          setError(err instanceof Error ? err.message : 'Failed to fetch prices');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchRealPrices();

    // Set up periodic updates (every 5 seconds)
    const interval = setInterval(() => {
      if (isMounted) {
        fetchRealPrices();
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbols]);

  if (loading && realPrices.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">Loading price data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (realPrices.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">No price data available</div>
      </div>
    );
  }

  // Convert RealPriceData to format expected by PriceChart (CandlestickData)
  // Since we only have price data, we'll use the same price for OHLC
  const chartData = (realPrices || []).map(price => ({
    timestamp: price.lastUpdate,
    open: price.price,
    high: price.price,
    low: price.price,
    close: price.price,
    volume: price.volume24h || 0
  }));

  // Use the first symbol for the chart
  const chartSymbol = symbols[0] || 'BTCUSDT';

  // Pass real data to existing PriceChart component
  return <PriceChart symbol={chartSymbol} data={chartData} autoFetch={false} />;
};

