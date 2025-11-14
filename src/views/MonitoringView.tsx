/**
 * MonitoringView - Performance and Error Monitoring Dashboard
 *
 * Features:
 * - Real-time error tracking
 * - Performance metrics visualization
 * - Cache hit rate statistics
 * - Request deduplication stats
 * - Health check history
 *
 * Only shown in development mode or for admins
 */

import React, { useState, useEffect } from 'react';
import { errorTracker } from '../lib/errorTracking';
import { performanceMonitor } from '../lib/performanceMonitor';
import { getDeduplicationStats } from '../lib/requestDeduplication';
import type { ErrorEvent, ErrorStats } from '../lib/errorTracking';
import type { PerformanceStats } from '../lib/performanceMonitor';

export function MonitoringView() {
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null);
  const [perfStats, setPerfStats] = useState<Record<string, PerformanceStats>>({});
  const [dedupStats, setDedupStats] = useState<ReturnType<typeof getDeduplicationStats> | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Refresh stats every 2 seconds
  useEffect(() => {
    const refreshStats = () => {
      setErrorStats(errorTracker.getStats());
      setPerfStats(performanceMonitor.getAllStats());
      setDedupStats(getDeduplicationStats());
    };

    refreshStats();

    if (autoRefresh) {
      const interval = setInterval(refreshStats, 2000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleClearErrors = () => {
    if (confirm('Clear all error tracking data?')) {
      errorTracker.clear();
      setErrorStats(errorTracker.getStats());
    }
  };

  const handleClearPerformance = () => {
    if (confirm('Clear all performance metrics?')) {
      performanceMonitor.clear();
      setPerfStats({});
    }
  };

  const handleExportErrors = () => {
    const data = errorTracker.exportErrors();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPerformance = () => {
    const data = performanceMonitor.exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Monitoring</h1>
            <p className="text-slate-400 mt-1">Performance metrics and error tracking</p>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Errors"
            value={errorStats?.totalErrors || 0}
            icon="🔴"
            color="red"
          />
          <StatCard
            title="Recovery Rate"
            value={`${errorStats?.recoveryRate.toFixed(1) || 0}%`}
            icon="✅"
            color="green"
          />
          <StatCard
            title="Performance Metrics"
            value={Object.keys(perfStats).length}
            icon="⚡"
            color="blue"
          />
          <StatCard
            title="Dedup Rate"
            value={`${dedupStats?.deduplicationRate.toFixed(1) || 0}%`}
            icon="🔄"
            color="purple"
          />
        </div>

        {/* Error Tracking Section */}
        <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Error Tracking</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportErrors}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Export
              </button>
              <button
                onClick={handleClearErrors}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Error Stats by Type */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {errorStats && Object.entries(errorStats.byType).map(([type, count]) => (
              <div key={type} className="bg-slate-700/50 rounded p-3">
                <div className="text-slate-400 text-sm capitalize">{type}</div>
                <div className="text-2xl font-bold text-white">{count}</div>
              </div>
            ))}
          </div>

          {/* Recent Errors */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Recent Errors</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {errorStats?.recentErrors.map((error: ErrorEvent) => (
                <ErrorCard key={error.id} error={error} />
              ))}
              {(!errorStats || errorStats.recentErrors.length === 0) && (
                <div className="text-center text-slate-400 py-8">
                  No errors recorded
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Performance Metrics Section */}
        <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Performance Metrics</h2>
            <div className="flex gap-2">
              <button
                onClick={handleExportPerformance}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Export
              </button>
              <button
                onClick={handleClearPerformance}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="space-y-4">
            {Object.values(perfStats).map((stat: PerformanceStats) => (
              <PerformanceCard key={stat.name} stat={stat} />
            ))}
            {Object.keys(perfStats).length === 0 && (
              <div className="text-center text-slate-400 py-8">
                No performance metrics recorded
              </div>
            )}
          </div>
        </section>

        {/* Request Deduplication Section */}
        <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Request Deduplication</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700/50 rounded p-4">
              <div className="text-slate-400 text-sm">Total Requests</div>
              <div className="text-2xl font-bold text-white">{dedupStats?.totalRequests || 0}</div>
            </div>
            <div className="bg-slate-700/50 rounded p-4">
              <div className="text-slate-400 text-sm">Deduped Requests</div>
              <div className="text-2xl font-bold text-white">{dedupStats?.dedupedRequests || 0}</div>
            </div>
            <div className="bg-slate-700/50 rounded p-4">
              <div className="text-slate-400 text-sm">In Flight</div>
              <div className="text-2xl font-bold text-white">{dedupStats?.inFlight || 0}</div>
            </div>
            <div className="bg-slate-700/50 rounded p-4">
              <div className="text-slate-400 text-sm">Dedup Rate</div>
              <div className="text-2xl font-bold text-white">
                {dedupStats?.deduplicationRate.toFixed(1) || 0}%
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: string;
  color: 'red' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    red: 'from-red-600/20 to-red-900/20 border-red-700',
    green: 'from-green-600/20 to-green-900/20 border-green-700',
    blue: 'from-blue-600/20 to-blue-900/20 border-blue-700',
    purple: 'from-purple-600/20 to-purple-900/20 border-purple-700'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-sm border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );
}

function ErrorCard({ error }: { error: ErrorEvent }) {
  const [expanded, setExpanded] = useState(false);

  const typeColors = {
    network: 'bg-blue-600/20 text-blue-400 border-blue-700',
    validation: 'bg-yellow-600/20 text-yellow-400 border-yellow-700',
    server: 'bg-red-600/20 text-red-400 border-red-700',
    client: 'bg-orange-600/20 text-orange-400 border-orange-700',
    unknown: 'bg-slate-600/20 text-slate-400 border-slate-700'
  };

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs border ${typeColors[error.type]}`}>
              {error.type}
            </span>
            <span className="text-slate-400 text-xs">
              {new Date(error.timestamp).toLocaleString()}
            </span>
            {error.recovered && (
              <span className="px-2 py-1 rounded text-xs bg-green-600/20 text-green-400 border border-green-700">
                Recovered
              </span>
            )}
          </div>
          <div className="text-white font-medium">{error.message}</div>
          <div className="text-slate-400 text-sm mt-1">
            {error.context.component} → {error.context.action}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-white"
        >
          {expanded ? '▼' : '▶'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-600">
          <div className="text-sm">
            <div className="text-slate-400 mb-2">Context:</div>
            <pre className="bg-slate-900 rounded p-2 text-xs overflow-x-auto text-slate-300">
              {JSON.stringify(error.context, null, 2)}
            </pre>
            {error.stack && (
              <>
                <div className="text-slate-400 mt-4 mb-2">Stack Trace:</div>
                <pre className="bg-slate-900 rounded p-2 text-xs overflow-x-auto text-slate-300">
                  {error.stack}
                </pre>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PerformanceCard({ stat }: { stat: PerformanceStats }) {
  const getColor = (avg: number) => {
    if (avg < 100) return 'text-green-400';
    if (avg < 500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium">{stat.name}</h3>
        <span className="text-slate-400 text-sm">{stat.count} calls</span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div>
          <div className="text-slate-400 text-xs">Min</div>
          <div className="text-white font-medium">{stat.min.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Max</div>
          <div className="text-white font-medium">{stat.max.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Avg</div>
          <div className={`font-medium ${getColor(stat.avg)}`}>{stat.avg.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">Median</div>
          <div className="text-white font-medium">{stat.median.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">P95</div>
          <div className="text-white font-medium">{stat.p95.toFixed(0)}ms</div>
        </div>
        <div>
          <div className="text-slate-400 text-xs">P99</div>
          <div className="text-white font-medium">{stat.p99.toFixed(0)}ms</div>
        </div>
      </div>
    </div>
  );
}

export default MonitoringView;
