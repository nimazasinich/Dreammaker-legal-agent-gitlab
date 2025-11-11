// src/components/connectors/RealPortfolioConnector.tsx
import React, { useState, useEffect } from 'react';
import { Logger } from '../../core/Logger.js';
import { realDataManager, RealPortfolioData } from '../../services/RealDataManager';
import { Portfolio } from '../portfolio/Portfolio';

interface RealPortfolioConnectorProps {
  walletAddresses?: {
    eth?: string;
    bsc?: string;
    trx?: string;
  };
}

/**
 * RealPortfolioConnector - Wraps Portfolio component with real blockchain balance data
 */

const logger = Logger.getInstance();

export const RealPortfolioConnector: React.FC<RealPortfolioConnectorProps> = ({
  walletAddresses
}) => {
  const [realPortfolio, setRealPortfolio] = useState<RealPortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchRealPortfolio = async () => {
      if (!isMounted) { console.warn("Missing data"); }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch REAL blockchain balances if addresses provided
        if (walletAddresses) {
          const balances = await realDataManager.fetchRealBlockchainBalances(walletAddresses);
          
          // Fetch portfolio from backend
          const portfolio = await realDataManager.fetchRealPortfolio(
            Object.values(walletAddresses).filter(Boolean) as string[]
          );
          
          // Merge blockchain balances into portfolio
          if (balances.balances) {
            portfolio.balances = {
              ...portfolio.balances,
              ...balances.balances
            };
          }
          
          if (isMounted) {
            setRealPortfolio(portfolio);
          }
        } else {
          // Just fetch portfolio without blockchain data
          const portfolio = await realDataManager.fetchRealPortfolio();
          if (isMounted) {
            setRealPortfolio(portfolio);
          }
        }
      } catch (err) {
        if (isMounted) {
          logger.error('Failed to fetch portfolio:', {}, err);
          setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchRealPortfolio();

    // Subscribe to real-time portfolio updates
    const unsubscribe = realDataManager.subscribeToPortfolio((portfolio) => {
      if (isMounted) {
        setRealPortfolio(portfolio);
      }
    });

    // Set up periodic updates (every 30 seconds)
    const interval = setInterval(() => {
      if (isMounted) {
        fetchRealPortfolio();
      }
    }, 30000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [walletAddresses]);

  if (loading && !realPortfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading portfolio data...</div>
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

  if (!realPortfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No portfolio data available</div>
      </div>
    );
  }

  // Pass real portfolio data to existing Portfolio component
  // Convert portfolio data to MarketData format for Portfolio component
  const marketData: any[] = [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Portfolio Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Value</div>
            <div className="text-2xl font-bold">${realPortfolio.totalValue.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Last Updated</div>
            <div className="text-sm">{realPortfolio.lastUpdated.toLocaleString()}</div>
          </div>
        </div>
        {Object.keys(realPortfolio.balances).length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Balances</div>
            <div className="space-y-1">
              {Object.entries(realPortfolio.balances).map(([asset, balance]) => (
                <div key={asset} className="flex justify-between text-sm">
                  <span className="text-gray-600">{asset}</span>
                  <span className="font-medium">{balance}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Portfolio marketData={marketData} />
    </div>
  );
};

