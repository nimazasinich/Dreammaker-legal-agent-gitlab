/**
 * DataSourceIndicator Component
 * 
 * Displays the current data source status for the Mixed Mode system.
 * Shows:
 * - Current data source (HuggingFace, CoinGecko, etc.)
 * - Data status (fresh, cached, stale, fallback, error)
 * - Visual indicator of data health
 * 
 * NO WebSocket, NO Binance, NO KuCoin
 */

import React from 'react';
import { useLiveData } from '../LiveDataContext';

interface DataSourceIndicatorProps {
  variant?: 'compact' | 'detailed' | 'badge';
  showRefreshButton?: boolean;
  className?: string;
}

const sourceColors: Record<string, { bg: string; text: string; icon: string }> = {
  huggingface: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: '🤗' },
  coingecko: { bg: 'bg-green-500/20', text: 'text-green-400', icon: '🦎' },
  cryptocompare: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '📊' },
  coinpaprika: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: '🌶️' },
  coincap: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', icon: '💹' },
  cache: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: '📦' },
  fallback: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: '⚠️' },
};

const statusIndicators: Record<string, { color: string; label: string; pulse: boolean }> = {
  fresh: { color: 'bg-green-500', label: 'Live', pulse: true },
  cached: { color: 'bg-blue-500', label: 'Cached', pulse: false },
  stale: { color: 'bg-yellow-500', label: 'Stale', pulse: false },
  fallback: { color: 'bg-orange-500', label: 'Fallback', pulse: true },
  error: { color: 'bg-red-500', label: 'Error', pulse: true },
};

export const DataSourceIndicator: React.FC<DataSourceIndicatorProps> = ({
  variant = 'compact',
  showRefreshButton = true,
  className = '',
}) => {
  const liveData = useLiveData();
  
  if (!liveData) {
    return null;
  }

  const { currentDataSource, dataSourceStatus, refreshData, isConnected } = liveData;
  
  const sourceInfo = sourceColors[currentDataSource] || sourceColors.fallback;
  const statusInfo = statusIndicators[dataSourceStatus] || statusIndicators.error;

  // Compact variant - just a small badge
  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        <span
          className={`w-2 h-2 rounded-full ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
        />
        <span className={`text-xs ${sourceInfo.text} font-medium capitalize`}>
          {currentDataSource}
        </span>
      </div>
    );
  }

  // Compact variant - minimal display
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${sourceInfo.bg} ${className}`}
        title={`Data from ${currentDataSource} (${statusInfo.label})`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
        />
        <span className={`text-sm ${sourceInfo.text} font-medium capitalize flex items-center gap-1`}>
          {sourceInfo.icon} {currentDataSource}
        </span>
        {showRefreshButton && (
          <button
            onClick={() => refreshData()}
            className={`ml-1 p-1 rounded hover:bg-white/10 transition-colors ${sourceInfo.text}`}
            title="Refresh data"
          >
            <RefreshIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  // Detailed variant - full status display
  return (
    <div className={`p-4 rounded-lg bg-gray-800/50 border border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Data Source</h4>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${statusInfo.color} ${statusInfo.pulse ? 'animate-pulse' : ''}`}
          />
          <span className={`text-xs font-medium ${getStatusTextColor(dataSourceStatus)}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>
      
      <div className={`flex items-center gap-3 p-3 rounded-lg ${sourceInfo.bg} mb-3`}>
        <span className="text-2xl">{sourceInfo.icon}</span>
        <div className="flex-1">
          <div className={`font-semibold ${sourceInfo.text} capitalize`}>
            {currentDataSource}
          </div>
          <div className="text-xs text-gray-400">
            {getSourceDescription(currentDataSource)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>●</span>
          <span>{isConnected ? 'Polling Active' : 'Polling Paused'}</span>
        </div>
        {showRefreshButton && (
          <button
            onClick={() => refreshData()}
            className="flex items-center gap-1 px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300"
          >
            <RefreshIcon className="w-3 h-3" />
            Refresh
          </button>
        )}
      </div>

      {/* Mixed Mode Info */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-500">
          <span className="text-gray-400">Mode:</span> Mixed (HuggingFace + Fallbacks)
        </div>
        <div className="text-xs text-gray-500 mt-1">
          <span className="text-gray-400">Fallbacks:</span> CoinGecko, CryptoCompare, CoinPaprika
        </div>
        <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <span className="text-red-400">✕</span>
          <span>No WebSocket, No Binance, No KuCoin</span>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getStatusTextColor(status: string): string {
  switch (status) {
    case 'fresh': return 'text-green-400';
    case 'cached': return 'text-blue-400';
    case 'stale': return 'text-yellow-400';
    case 'fallback': return 'text-orange-400';
    case 'error': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function getSourceDescription(source: string): string {
  switch (source) {
    case 'huggingface': return 'Primary source - HuggingFace Data Engine';
    case 'coingecko': return 'Fallback - CoinGecko API';
    case 'cryptocompare': return 'Fallback - CryptoCompare API';
    case 'coinpaprika': return 'Fallback - CoinPaprika API';
    case 'coincap': return 'Fallback - CoinCap API';
    case 'cache': return 'Using cached data';
    case 'fallback': return 'Using fallback data source';
    default: return 'Unknown data source';
  }
}

// Simple refresh icon component
const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

export default DataSourceIndicator;
