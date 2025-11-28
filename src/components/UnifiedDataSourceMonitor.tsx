/**
 * Unified Data Source Monitor Component
 * 
 * UI component for monitoring and managing unified data sources
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  DeleteSweep as DeleteIcon,
  Download as DownloadIcon,
  CheckCircle as HealthyIcon,
  Error as ErrorIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

interface DataSourceMetrics {
  source: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  uptime: number;
  lastError?: string;
  lastErrorTime?: Date;
}

interface SystemReport {
  timestamp: Date;
  mode: string;
  dataSources: DataSourceMetrics[];
  cacheHitRate: number;
  fallbackRate: number;
  totalRequests: number;
  systemUptime: number;
}

interface HealthStatus {
  huggingface: boolean;
  coingecko: boolean;
  binance: boolean;
  cache: boolean;
  database: boolean;
}

export const UnifiedDataSourceMonitor: React.FC = () => {
  const [mode, setMode] = useState<string>('mixed');
  const [metrics, setMetrics] = useState<DataSourceMetrics[]>([]);
  const [report, setReport] = useState<SystemReport | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  // Fetch current configuration
  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/unified-data/config');
      const data = await response.json();
      if (data.success) {
        setMode(data.data.mode);
        setMetrics(data.data.metrics);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  // Fetch system report
  const fetchReport = async () => {
    try {
      const response = await fetch('/api/unified-data/report');
      const data = await response.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    }
  };

  // Fetch health status
  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/unified-data/health');
      const data = await response.json();
      if (data.success) {
        setHealth(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
    }
  };

  // Update mode
  const handleModeChange = async (newMode: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/unified-data/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      const data = await response.json();
      if (data.success) {
        setMode(newMode);
        setNotification({
          type: 'success',
          message: `Mode changed to ${newMode}`
        });
        await fetchConfig();
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to update mode'
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear cache
  const handleClearCache = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/unified-data/cache', {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: 'Cache cleared successfully'
        });
        await fetchConfig();
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to clear cache'
      });
    } finally {
      setLoading(false);
    }
  };

  // Reset metrics
  const handleResetMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/unified-data/metrics/reset', {
        method: 'POST'
      });
      const data = await response.json();
      if (data.success) {
        setNotification({
          type: 'success',
          message: 'Metrics reset successfully'
        });
        await fetchConfig();
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to reset metrics'
      });
    } finally {
      setLoading(false);
    }
  };

  // Download report
  const handleDownloadReport = () => {
    if (!report) return;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unified-data-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Refresh all data
  const handleRefresh = async () => {
    setLoading(true);
    await Promise.all([fetchConfig(), fetchReport(), fetchHealth()]);
    setLoading(false);
  };

  // Get health status icon
  const getHealthIcon = (status: boolean) => {
    return status ? (
      <HealthyIcon color="success" />
    ) : (
      <ErrorIcon color="error" />
    );
  };

  // Get uptime color
  const getUptimeColor = (uptime: number) => {
    if (uptime >= 95) return 'success';
    if (uptime >= 80) return 'warning';
    return 'error';
  };

  // Format uptime
  const formatUptime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Initial load
  useEffect(() => {
    handleRefresh();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchConfig();
      fetchHealth();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      {/* Notification */}
      {notification && (
        <Alert
          severity={notification.type}
          onClose={() => setNotification(null)}
          sx={{ mb: 2 }}
        >
          {notification.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Unified Data Source Manager</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Clear Cache">
            <IconButton onClick={handleClearCache} disabled={loading}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download Report">
            <IconButton onClick={handleDownloadReport} disabled={!report}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Configuration Card */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuration
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Data Source Mode</InputLabel>
                <Select
                  value={mode}
                  label="Data Source Mode"
                  onChange={(e) => handleModeChange(e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="huggingface">HuggingFace Primary</MenuItem>
                  <MenuItem value="direct">Direct (CoinGecko/Binance)</MenuItem>
                  <MenuItem value="mixed">Mixed (All Sources)</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Mode: <strong>{mode}</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Health Status Card */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Source Health
              </Typography>
              {health && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6} sm={4} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      {getHealthIcon(health.huggingface)}
                      <Typography variant="caption" display="block">
                        HuggingFace
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      {getHealthIcon(health.coingecko)}
                      <Typography variant="caption" display="block">
                        CoinGecko
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      {getHealthIcon(health.binance)}
                      <Typography variant="caption" display="block">
                        Binance
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      {getHealthIcon(health.cache)}
                      <Typography variant="caption" display="block">
                        Cache
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={4} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      {getHealthIcon(health.database)}
                      <Typography variant="caption" display="block">
                        Database
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* System Overview Card */}
        {report && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Overview
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Total Requests
                    </Typography>
                    <Typography variant="h5">{report.totalRequests}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Cache Hit Rate
                    </Typography>
                    <Typography variant="h5">
                      {(report.cacheHitRate * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      Fallback Rate
                    </Typography>
                    <Typography variant="h5">
                      {(report.fallbackRate * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="body2" color="text.secondary">
                      System Uptime
                    </Typography>
                    <Typography variant="h5">
                      {formatUptime(report.systemUptime)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Metrics Table */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Source Metrics
              </Typography>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Source</TableCell>
                      <TableCell align="right">Total Requests</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                      <TableCell align="right">Avg Latency</TableCell>
                      <TableCell align="right">Uptime</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.map((metric) => (
                      <TableRow key={metric.source}>
                        <TableCell>
                          <Chip
                            label={metric.source}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">{metric.totalRequests}</TableCell>
                        <TableCell align="right">
                          {metric.totalRequests > 0
                            ? `${((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1)}%`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          {metric.averageLatency > 0
                            ? `${metric.averageLatency.toFixed(0)}ms`
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${metric.uptime.toFixed(1)}%`}
                            size="small"
                            color={getUptimeColor(metric.uptime)}
                          />
                        </TableCell>
                        <TableCell>
                          {metric.lastError ? (
                            <Tooltip title={metric.lastError}>
                              <WarningIcon color="warning" fontSize="small" />
                            </Tooltip>
                          ) : (
                            <HealthyIcon color="success" fontSize="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Actions */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleResetMetrics}
              disabled={loading}
            >
              Reset Metrics
            </Button>
            <Button
              variant="outlined"
              onClick={handleClearCache}
              disabled={loading}
            >
              Clear Cache
            </Button>
            <Button
              variant="contained"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh Data
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default UnifiedDataSourceMonitor;
