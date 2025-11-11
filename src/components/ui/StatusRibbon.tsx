import React from 'react';
import useHealthCheck from '../../lib/useHealthCheck';
import { t } from '../../i18n';
import { useMode } from '../../contexts/ModeContext';
import { useData } from '../../contexts/DataContext';
import { useLiveData } from '../LiveDataContext';
import { DataSourceIndicator } from './DataSourceBadge';

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-green-100 text-green-800 border-green-300',
  degraded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  down: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-slate-100 text-slate-700 border-slate-300',
};

export function StatusRibbon() {
  const { status, error } = useHealthCheck(15000, 4000);
  const { state: { dataMode, tradingMode }, setDataMode, setTradingMode } = useMode();
  const { dataSource } = useData();
  const { isConnected } = useLiveData();

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
      </div>

      <div className="flex items-center gap-3">
        {/* Data Source Indicator */}
        <DataSourceIndicator source={dataSource} />

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
      </div>
    </div>
  );
}

export default StatusRibbon;
