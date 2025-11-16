/**
 * SpotNotAvailable - Component to display when Spot trading is not yet implemented
 * 
 * Provides clear feedback to users about Spot trading availability
 * and suggests Futures trading as an alternative.
 */

import React from 'react';
import { AlertTriangle, TrendingUp, Info } from 'lucide-react';

interface SpotNotAvailableProps {
  /** Optional custom message */
  message?: string;
  /** Whether to show link to Futures trading */
  showFuturesLink?: boolean;
  /** Callback when user clicks Futures link */
  onNavigateToFutures?: () => void;
}

export const SpotNotAvailable: React.FC<SpotNotAvailableProps> = ({
  message = 'Spot trading is not fully integrated yet',
  showFuturesLink = true,
  onNavigateToFutures
}) => {
  return (
    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Spot Trading Not Available
          </h3>
          <p className="text-yellow-800 dark:text-yellow-200 mb-4">
            {message}. The KuCoin SPOT testnet API integration is currently in development.
          </p>
          
          {showFuturesLink && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Futures trading is fully operational.</strong> You can use Futures trading with real testnet data.
                </p>
              </div>
              {onNavigateToFutures && (
                <button
                  onClick={onNavigateToFutures}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Go to Futures
                </button>
              )}
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              What's Available:
            </h4>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>Futures Trading (KuCoin Testnet)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>Real-time Market Data</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>Technical Analysis & Signals</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600 dark:text-green-400">✅</span>
                <span>Risk Management & Strategy Builder</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                <span>Spot Trading (In Development)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotNotAvailable;
