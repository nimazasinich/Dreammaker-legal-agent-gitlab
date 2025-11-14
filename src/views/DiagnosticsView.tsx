/**
 * Diagnostics View
 *
 * Displays provider diagnostics including latency, uptime, and error information
 * for HuggingFace, Binance, and KuCoin data providers.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { RefreshCw, Activity, TrendingUp, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProviderDiagnostics {
  provider: string;
  latency: {
    avg: number;
    min: number;
    max: number;
    last: number;
  };
  recovery: {
    uptime: number;
    successRate: number;
    failureRate: number;
    isHealthy: boolean;
    consecutiveFailures: number;
    lastStatus: string;
  };
  errors: {
    totalErrors: number;
    lastError?: {
      timestamp: string;
      message: string;
      endpoint?: string;
      statusCode?: number;
    };
    recentErrors: number;
  };
  lastSuccessTime?: string;
  lastFailureTime?: string;
}

interface DiagnosticsData {
  timestamp: string;
  primarySource: string;
  providers: {
    huggingface: ProviderDiagnostics;
    binance: ProviderDiagnostics;
    kucoin: ProviderDiagnostics;
  };
  summary: {
    totalRequests: number;
    healthyProviders: number;
    degradedProviders: number;
    unhealthyProviders: number;
  };
}

export default function DiagnosticsView() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/diagnostics');
      if (!response.ok) {
        throw new Error(`Failed to fetch diagnostics: ${response.statusText}`);
      }

      const data = await response.json();
      setDiagnostics(data);
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch diagnostics');
      console.error('Diagnostics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const getHealthBadge = (isHealthy: boolean, consecutiveFailures: number) => {
    if (isHealthy) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    } else if (consecutiveFailures < 10) {
      return (
        <Badge variant="default" className="bg-yellow-500">
          <AlertCircle className="w-3 h-3 mr-1" />
          Degraded
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Unhealthy
        </Badge>
      );
    }
  };

  const formatLatency = (ms: number) => {
    if (ms === 0) return 'N/A';
    return `${ms}ms`;
  };

  const formatUptime = (uptime: number) => {
    if (uptime === 0) return 'N/A';
    return `${uptime.toFixed(2)}%`;
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const ProviderCard = ({ provider }: { provider: ProviderDiagnostics }) => (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl capitalize">{provider.provider}</CardTitle>
          {getHealthBadge(provider.recovery.isHealthy, provider.recovery.consecutiveFailures)}
        </div>
        <CardDescription>
          Provider latency and recovery statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latency Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Activity className="w-4 h-4" />
            Latency
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Average</div>
              <div className="font-medium">{formatLatency(provider.latency.avg)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last</div>
              <div className="font-medium">{formatLatency(provider.latency.last)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Min</div>
              <div className="font-medium">{formatLatency(provider.latency.min)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Max</div>
              <div className="font-medium">{formatLatency(provider.latency.max)}</div>
            </div>
          </div>
        </div>

        {/* Recovery Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            Recovery
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Uptime</div>
              <div className="font-medium">{formatUptime(provider.recovery.uptime)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Success Rate</div>
              <div className="font-medium">{provider.recovery.successRate.toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-muted-foreground">Consecutive Failures</div>
              <div className={cn(
                "font-medium",
                provider.recovery.consecutiveFailures > 0 ? "text-destructive" : "text-green-500"
              )}>
                {provider.recovery.consecutiveFailures}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Status</div>
              <div className="font-medium capitalize">{provider.recovery.lastStatus}</div>
            </div>
          </div>
        </div>

        {/* Error Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Errors
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-muted-foreground">Total Errors</div>
              <div className="font-medium">{provider.errors.totalErrors}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Recent (5min)</div>
              <div className="font-medium">{provider.errors.recentErrors}</div>
            </div>
          </div>

          {provider.errors.lastError && (
            <div className="mt-2 p-2 bg-muted rounded-md">
              <div className="text-xs text-muted-foreground mb-1">Last Error</div>
              <div className="text-xs font-mono">{provider.errors.lastError.message}</div>
              {provider.errors.lastError.endpoint && (
                <div className="text-xs text-muted-foreground mt-1">
                  {provider.errors.lastError.endpoint}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(provider.errors.lastError.timestamp)}
              </div>
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div className="pt-2 border-t space-y-1 text-xs text-muted-foreground">
          <div>Last Success: {formatTimestamp(provider.lastSuccessTime)}</div>
          <div>Last Failure: {formatTimestamp(provider.lastFailureTime)}</div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Provider Diagnostics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor data provider health, latency, and error rates
          </p>
        </div>
        <Button
          onClick={fetchDiagnostics}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {diagnostics && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Primary Source: <span className="font-semibold">{diagnostics.primarySource}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{diagnostics.summary.totalRequests}</div>
                  <div className="text-sm text-muted-foreground">Total Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {diagnostics.summary.healthyProviders}
                  </div>
                  <div className="text-sm text-muted-foreground">Healthy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-500">
                    {diagnostics.summary.degradedProviders}
                  </div>
                  <div className="text-sm text-muted-foreground">Degraded</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">
                    {diagnostics.summary.unhealthyProviders}
                  </div>
                  <div className="text-sm text-muted-foreground">Unhealthy</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ProviderCard provider={diagnostics.providers.huggingface} />
            <ProviderCard provider={diagnostics.providers.binance} />
            <ProviderCard provider={diagnostics.providers.kucoin} />
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-center text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
        </>
      )}

      {!diagnostics && !error && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Click Refresh to load diagnostics data
          </CardContent>
        </Card>
      )}
    </div>
  );
}
