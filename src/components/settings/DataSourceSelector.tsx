import React, { useState, useEffect } from 'react';
import { Database, Globe, TrendingUp, Shuffle, Check, AlertCircle } from 'lucide-react';
import { Logger } from '../../core/Logger.js';

const logger = Logger.getInstance();

type DataSourceType = 'huggingface' | 'binance' | 'kucoin' | 'mixed';

interface DataSourceConfig {
  primarySource: DataSourceType;
  availableSources: DataSourceType[];
  huggingface: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
  };
  exchanges: {
    binance: {
      enabled: boolean;
    };
    kucoin: {
      enabled: boolean;
    };
  };
}

const dataSourceInfo: Record<DataSourceType, { name: string; description: string; icon: React.ReactNode; color: string }> = {
  huggingface: {
    name: 'HuggingFace Data Engine',
    description: 'Primary source with multi-provider aggregation (Recommended)',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-purple-500 to-indigo-500'
  },
  binance: {
    name: 'Binance',
    description: 'Direct Binance API integration (Legacy)',
    icon: <TrendingUp className="w-5 h-5" />,
    color: 'from-yellow-500 to-orange-500'
  },
  kucoin: {
    name: 'KuCoin',
    description: 'Direct KuCoin API integration (Legacy)',
    icon: <Database className="w-5 h-5" />,
    color: 'from-green-500 to-emerald-500'
  },
  mixed: {
    name: 'Mixed (HF + Exchanges)',
    description: 'HuggingFace with exchange fallback (Beta)',
    icon: <Shuffle className="w-5 h-5" />,
    color: 'from-cyan-500 to-blue-500'
  }
};

export const DataSourceSelector: React.FC = () => {
  const [config, setConfig] = useState<DataSourceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedSource, setSelectedSource] = useState<DataSourceType>('huggingface');

  // Load current data source configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      // NOTE: Data source config API is not yet implemented in DatasourceClient
      // Using fallback configuration for now
      const data = {
        primarySource: 'huggingface' as DataSourceType,
        availableSources: ['huggingface', 'binance', 'kucoin', 'mixed'] as DataSourceType[],
        huggingface: {
          enabled: true,
          baseUrl: 'http://localhost:8001',
          timeout: 30000
        },
        exchanges: {
          binance: { enabled: false },
          kucoin: { enabled: false }
        }
      };
      setConfig(data);
      setSelectedSource(data.primarySource);
      logger.info('Data source config loaded (fallback)', { primarySource: data.primarySource });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to load data source config', {}, err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = async (source: DataSourceType) => {
    setSelectedSource(source);
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // NOTE: Data source switching API is not yet implemented
      // Only HuggingFace/DatasourceClient is currently supported
      if (source !== 'huggingface') {
        throw new Error('Only HuggingFace data source is currently implemented. Other sources will be available in future updates.');
      }

      setSuccess(true);
      logger.info('Data source updated', { newSource: source });

      // Show success message for 3 seconds
      setTimeout(() => setSuccess(false), 3000);

      // Reload config to reflect changes
      await loadConfig();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      logger.error('Failed to update data source', {}, err as Error);
      // Revert selection on error
      setSelectedSource(config?.primarySource || 'huggingface');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="p-6 rounded-xl animate-pulse"
        style={{
          background: 'rgba(15, 15, 24, 0.6)',
          border: '1px solid rgba(99, 102, 241, 0.2)'
        }}
      >
        <div className="h-6 bg-slate-700/50 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-700/30 rounded w-2/3"></div>
      </div>
    );
  }

  return (
    <div
      className="p-6 rounded-xl"
      style={{
        background: 'rgba(15, 15, 24, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-400" />
          Data Source Configuration
        </h3>
        <p className="text-sm text-slate-400">
          Select where market and status data comes from
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold">Failed to update data source</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3">
          <Check className="w-5 h-5" />
          <span className="font-semibold">Data source updated successfully</span>
        </div>
      )}

      {/* Data Source Options */}
      <div className="space-y-3">
        {(config?.availableSources || ['huggingface', 'binance', 'kucoin', 'mixed']).map((source) => {
          const info = dataSourceInfo[source];
          const isSelected = selectedSource === source;
          const isCurrentPrimary = config?.primarySource === source;

          return (
            <button
              key={source}
              onClick={() => handleSourceChange(source)}
              disabled={saving}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'bg-slate-800/50 border-purple-500/50 shadow-lg shadow-purple-500/20'
                  : 'bg-slate-800/20 border-slate-700/30 hover:border-purple-500/30 hover:bg-slate-800/30'
              } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${info.color} ${
                    isSelected ? 'shadow-lg' : ''
                  }`}
                >
                  {info.icon}
                </div>

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-lg">{info.name}</h4>
                    {isCurrentPrimary && (
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400">{info.description}</p>

                  {/* Additional info for HuggingFace */}
                  {source === 'huggingface' && config?.huggingface && (
                    <div className="mt-2 text-xs text-slate-500">
                      <div>Base URL: {config.huggingface.baseUrl}</div>
                      <div>Timeout: {config.huggingface.timeout}ms</div>
                    </div>
                  )}

                  {/* Warning for legacy sources */}
                  {(source === 'binance' || source === 'kucoin') && isSelected && (
                    <div className="mt-2 text-xs text-orange-400">
                      Note: Only HuggingFace is fully implemented in this phase. This source may return NOT_IMPLEMENTED errors.
                    </div>
                  )}
                </div>

                {/* Selection Indicator */}
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-slate-600'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Status Info */}
      {config && (
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Primary Source:</span>
              <span className="font-semibold text-purple-400">{config.primarySource}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">HuggingFace Engine:</span>
              <span className={config.huggingface.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                {config.huggingface.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Binance:</span>
              <span className={config.exchanges.binance.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                {config.exchanges.binance.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">KuCoin:</span>
              <span className={config.exchanges.kucoin.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                {config.exchanges.kucoin.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
