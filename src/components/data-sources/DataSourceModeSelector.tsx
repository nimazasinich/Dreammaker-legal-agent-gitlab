/**
 * DataSourceModeSelector Component
 * 
 * UI component for selecting data source mode (Direct, HuggingFace, Mixed)
 * Displays current mode, allows switching, and shows health status
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Cloud,
  Layers
} from 'lucide-react';

export type DataSourceMode = 'direct' | 'huggingface' | 'mixed';

interface DataSourceHealth {
  name: string;
  isHealthy: boolean;
  lastSuccess: number;
  lastFailure: number;
  consecutiveFailures: number;
  averageResponseTime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  isDisabled: boolean;
}

interface DataSourceStats {
  mode: DataSourceMode;
  totalSources: number;
  healthySources: number;
  disabledSources: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageSuccessRate: number;
  sources: DataSourceHealth[];
}

export const DataSourceModeSelector: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<DataSourceMode>('direct');
  const [stats, setStats] = useState<DataSourceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentMode();
    fetchStats();
    
    // Poll for stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCurrentMode = async () => {
    try {
      const response = await fetch('/api/data-sources/mode');
      const data = await response.json();
      if (data.success) {
        setCurrentMode(data.mode);
      }
    } catch (err) {
      console.error('Failed to fetch current mode:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/data-sources/stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleModeChange = async (mode: DataSourceMode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/data-sources/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentMode(mode);
        await fetchStats();
      } else {
        setError(data.error || 'Failed to change mode');
      }
    } catch (err) {
      setError('Network error: Failed to change mode');
    } finally {
      setLoading(false);
    }
  };

  const getModeIcon = (mode: DataSourceMode) => {
    switch (mode) {
      case 'direct':
        return <Database className="w-5 h-5" />;
      case 'huggingface':
        return <Cloud className="w-5 h-5" />;
      case 'mixed':
        return <Layers className="w-5 h-5" />;
    }
  };

  const getModeDescription = (mode: DataSourceMode) => {
    switch (mode) {
      case 'direct':
        return 'Use primary data sources (Binance, CoinGecko, etc.) directly';
      case 'huggingface':
        return 'Use HuggingFace AI models for enhanced analysis and predictions';
      case 'mixed':
        return 'Use both direct sources and HuggingFace simultaneously for best results';
    }
  };

  const getHealthColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500';
  };

  const getSuccessRate = (source: DataSourceHealth) => {
    if (source.totalRequests === 0) return 0;
    return ((source.successfulRequests / source.totalRequests) * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Data Source Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Direct Mode */}
            <div
              onClick={() => !loading && handleModeChange('direct')}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                currentMode === 'direct'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getModeIcon('direct')}
                  <h3 className="font-semibold">Direct</h3>
                </div>
                {currentMode === 'direct' && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getModeDescription('direct')}
              </p>
            </div>

            {/* HuggingFace Mode */}
            <div
              onClick={() => !loading && handleModeChange('huggingface')}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                currentMode === 'huggingface'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getModeIcon('huggingface')}
                  <h3 className="font-semibold">HuggingFace</h3>
                </div>
                {currentMode === 'huggingface' && (
                  <CheckCircle2 className="w-5 h-5 text-purple-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getModeDescription('huggingface')}
              </p>
            </div>

            {/* Mixed Mode */}
            <div
              onClick={() => !loading && handleModeChange('mixed')}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                currentMode === 'mixed'
                  ? 'border-green-500 bg-green-50 dark:bg-green-950'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getModeIcon('mixed')}
                  <h3 className="font-semibold">Mixed</h3>
                </div>
                {currentMode === 'mixed' && (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getModeDescription('mixed')}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Data Source Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sources</p>
                <p className="text-2xl font-bold">{stats.totalSources}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Healthy</p>
                <p className="text-2xl font-bold text-green-500">{stats.healthySources}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Disabled</p>
                <p className="text-2xl font-bold text-red-500">{stats.disabledSources}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold">
                  {(stats.averageSuccessRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Individual Source Status */}
            <div className="space-y-2">
              <h4 className="font-semibold mb-3">Source Health</h4>
              {stats.sources.slice(0, 10).map((source) => (
                <div
                  key={source.name}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {source.isHealthy ? (
                      <CheckCircle2 className={getHealthColor(true)} />
                    ) : (
                      <XCircle className={getHealthColor(false)} />
                    )}
                    <div>
                      <p className="font-medium">{source.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {source.totalRequests} requests • {getSuccessRate(source)}% success
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {source.isDisabled && (
                      <Badge variant="destructive">Disabled</Badge>
                    )}
                    {source.averageResponseTime > 0 && (
                      <Badge variant="outline">
                        {source.averageResponseTime.toFixed(0)}ms
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataSourceModeSelector;
