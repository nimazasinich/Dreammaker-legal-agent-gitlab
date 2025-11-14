import React, { useState, useEffect } from 'react';
import useHealthCheck from '../../lib/useHealthCheck';
import { t } from '../../i18n';
import { useMode } from '../../contexts/ModeContext';
import { useData } from '../../contexts/DataContext';
import { useLiveData } from '../LiveDataContext';
import { DataSourceIndicator } from './DataSourceBadge';
import { TradingMode, TradingMarket } from '../../types/index';

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300',
  degraded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  down: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function StatusRibbon() {
  const { status, error, providers } = useHealthCheck(15000, 4000);
  const { state: { dataMode, tradingMode, dataSource: contextDataSource }, setDataMode, setTradingMode, setDataSource } = useMode();
  const { dataSource } = useData();
  const { isConnected } = useLiveData();
  const [systemTradingMode, setSystemTradingMode] = useState<TradingMode>('OFF');
  const [systemTradingMarket, setSystemTradingMarket] = useState<TradingMarket>('FUTURES');
  const [primaryDataSource, setPrimaryDataSource] = useState<string>('huggingface');

  // Use context data source or default to 'huggingface'
  const activeDataSource = contextDataSource || primaryDataSource;

  // Fetch system trading config and primary data source from API
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch('/api/system/health');
        const data = await response.json();

        // Get primary data source from health response
        if (data.primaryDataSource) {
          setPrimaryDataSource(data.primaryDataSource);
        }

        if (data.trading) {
          setSystemTradingMode(data.trading.mode || 'OFF');
          setSystemTradingMarket(data.trading.market || 'FUTURES');
        }
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      }
    };

    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (import.meta?.env?.VITE_SHOW_STATUS_RIBBON === 'false') {
    return null;
  }

  const style = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;

  return (
    <div
      className={`w-full border ${style} text-sm px-4 py-2 flex items-center gap-4 justify-between`}
      dir="ltr"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span>
          <strong>{t('layout.healthLabel')}:</strong> {status}
        </span>
        {error ? <span className="truncate max-w-xs">{error}</span> : null}

        {/* Provider Status - Show HF engine and exchange statuses */}
        {providers && (
          <div className="flex items-center gap-2 text-xs">
            {providers.hf_engine && (
              <span
                className={`px-2 py-0.5 rounded ${
                  providers.hf_engine === 'up'
                    ? 'bg-green-100 text-green-800'
                    : providers.hf_engine === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
                title="HuggingFace Data Engine status"
              >
                HF: {providers.hf_engine}
              </span>
            )}
            {providers.binance && (
              <span
                className={`px-2 py-0.5 rounded ${
                  providers.binance === 'up'
                    ? 'bg-green-100 text-green-800'
                    : providers.binance === 'degraded'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
                title="Binance API status"
              >
                Binance: {providers.binance}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Primary Data Source Indicator */}
        <div
          className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300"
          title={`Primary data source: ${primaryDataSource}`}
        >
          <strong>Data:</strong> {primaryDataSource}
        </div>

        {/* System Trading Mode & Market Indicator */}
        <div
          className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-300"
          title={`Trading Mode: ${systemTradingMode}, Market: ${systemTradingMarket}`}
        >
          <span className="font-semibold">{systemTradingMode}</span>
          <span className="text-blue-600">|</span>
          <span>{systemTradingMarket}</span>
        </div>

        {/* WebSocket Status Indicator */}
        <div
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
            isConnected
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-gray-100 text-gray-600 border border-gray-300'
          }`}
          title={isConnected ? 'WebSocket connected' : 'WebSocket disconnected'}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          WS
        </div>

        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => setDataMode('offline')}
            className={`px-3 py-1 text-xs font-medium transition ${
              dataMode === 'offline'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={dataMode === 'offline'}
          >
            Offline
          </button>
          <button
            onClick={() => setDataMode('online')}
            className={`px-3 py-1 text-xs font-medium transition ${
              dataMode === 'online'
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={dataMode === 'online'}
          >
            Online
          </button>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => setTradingMode('virtual')}
            className={`px-3 py-1 text-xs font-medium transition ${
              tradingMode === 'virtual'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={tradingMode === 'virtual'}
          >
            Virtual
          </button>
          <button
            onClick={() => setTradingMode('real')}
            className={`px-3 py-1 text-xs font-medium transition ${
              tradingMode === 'real'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={tradingMode === 'real'}
          >
            Real
          </button>
        </div>

        {/* Data Source Selector */}
        <div className="flex rounded-lg overflow-hidden border border-gray-300">
          <button
            onClick={() => setDataSource('huggingface')}
            className={`px-3 py-1 text-xs font-medium transition ${
              activeDataSource === 'huggingface'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={activeDataSource === 'huggingface'}
            title="Use HuggingFace Data Engine as primary data source"
          >
            🤗 HF
          </button>
          <button
            onClick={() => setDataSource('exchanges')}
            className={`px-3 py-1 text-xs font-medium transition ${
              activeDataSource === 'exchanges'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={activeDataSource === 'exchanges'}
            title="Use direct exchange APIs (Binance, KuCoin)"
          >
            📊 Exchanges
          </button>
          <button
            onClick={() => setDataSource('mixed')}
            className={`px-3 py-1 text-xs font-medium transition ${
              activeDataSource === 'mixed'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
            aria-pressed={activeDataSource === 'mixed'}
            title="Use both HuggingFace and direct exchanges"
          >
            🔀 Mixed
          </button>
        </div>
      </div>
    </div>
  );
}

export default StatusRibbon;
