import React from 'react';
import { Radio, Zap, AlertCircle } from 'lucide-react';
import { useDataProvider } from '../contexts/DataProviderContext';

export const DataProviderToggle: React.FC = () => {
  const { config, setMode, canUseKuCoin } = useDataProvider();

  const handleToggle = () => {
    if (config.mode === 'demo') {
      if (canUseKuCoin()) {
        setMode('live');
      } else {
        alert('Cannot switch to Live mode: KuCoin API keys not configured');
      }
    } else {
      setMode('demo');
    }
  };

  return (
    <div className="flex items-center space-x-4 p-3 bg-white/10 rounded-lg border border-white/20">
      {/* Mode Status Indicator */}
      <div className="flex items-center space-x-2">
        {config.mode === 'demo' ? (
          <Radio className="w-5 h-5 text-blue-400" />
        ) : (
          <Zap className="w-5 h-5 text-green-400" />
        )}
        <span className="text-sm font-medium">
          {config.mode === 'demo' ? 'Demo Mode' : 'Live Mode'}
        </span>
      </div>

      {/* Provider Info */}
      <div className="flex-1 text-xs text-white/60">
        Provider: <span className="text-white/80 font-medium capitalize">{config.provider}</span>
      </div>

      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={config.mode === 'demo' && !canUseKuCoin()}
        className={`
          px-4 py-2 rounded-lg font-medium text-sm transition-all
          ${config.mode === 'demo'
            ? 'bg-blue-500 hover:bg-blue-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title={
          config.mode === 'demo' && !canUseKuCoin()
            ? 'Configure KuCoin API keys to enable Live mode'
            : 'Toggle between Demo and Live mode'
        }
      >
        Switch to {config.mode === 'demo' ? 'Live' : 'Demo'} Mode
      </button>

      {/* Warning if KuCoin not configured */}
      {!canUseKuCoin() && (
        <div className="flex items-center space-x-1 text-yellow-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>KuCoin API not configured</span>
        </div>
      )}
    </div>
  );
};
