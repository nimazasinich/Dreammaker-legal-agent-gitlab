/**
 * Diagnostics Route
 *
 * Provides comprehensive diagnostics for all data providers
 * (HuggingFace, Binance, KuCoin)
 */

import { Router, Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { providerLatencyTracker, ProviderName } from '../core/providerLatencyTracker.js';
import { providerRecoveryTracker } from '../core/providerRecoveryTracker.js';
import { providerErrorLog } from '../core/providerErrorLog.js';
import { getPrimarySource } from '../config/dataSource.js';

const router = Router();
const logger = Logger.getInstance();

/**
 * Provider diagnostics data
 */
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
    recentErrors: number; // Count of errors in last 5 minutes
  };
  lastSuccessTime?: string;
  lastFailureTime?: string;
}

/**
 * Complete diagnostics response
 */
interface DiagnosticsResponse {
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

/**
 * Build diagnostics for a single provider
 */
function buildProviderDiagnostics(provider: ProviderName): ProviderDiagnostics {
  const latencyStats = providerLatencyTracker.getStats(provider);
  const recoveryStats = providerRecoveryTracker.getStats(provider);
  const errorStats = providerErrorLog.getStats(provider);

  return {
    provider,
    latency: {
      avg: latencyStats.avgLatency,
      min: latencyStats.minLatency,
      max: latencyStats.maxLatency,
      last: latencyStats.lastLatency
    },
    recovery: {
      uptime: recoveryStats.uptime,
      successRate: recoveryStats.successRate,
      failureRate: recoveryStats.failureRate,
      isHealthy: recoveryStats.isHealthy,
      consecutiveFailures: recoveryStats.consecutiveFailures,
      lastStatus: recoveryStats.lastStatus
    },
    errors: {
      totalErrors: errorStats.totalErrors,
      lastError: errorStats.lastError ? {
        timestamp: errorStats.lastError.timestamp,
        message: errorStats.lastError.message,
        endpoint: errorStats.lastError.endpoint,
        statusCode: errorStats.lastError.statusCode
      } : undefined,
      recentErrors: providerErrorLog.hasRecentErrors(provider, 5) ?
        providerErrorLog.getRecentErrors(provider, 10).length : 0
    },
    lastSuccessTime: recoveryStats.lastSuccessTime,
    lastFailureTime: recoveryStats.lastFailureTime
  };
}

/**
 * GET /diagnostics
 * Get comprehensive diagnostics for all providers
 */
router.get('/', (req: Request, res: Response) => {
  try {
    logger.debug('Diagnostics requested');

    const primarySource = getPrimarySource();

    // Build diagnostics for all providers
    const hfDiagnostics = buildProviderDiagnostics('huggingface');
    const binanceDiagnostics = buildProviderDiagnostics('binance');
    const kucoinDiagnostics = buildProviderDiagnostics('kucoin');

    // Calculate summary
    const allProviders = [hfDiagnostics, binanceDiagnostics, kucoinDiagnostics];
    const healthyCount = allProviders.filter(p => p.recovery.isHealthy).length;
    const degradedCount = allProviders.filter(
      p => !p.recovery.isHealthy && p.recovery.consecutiveFailures < 10
    ).length;
    const unhealthyCount = allProviders.filter(
      p => p.recovery.consecutiveFailures >= 10
    ).length;

    const totalRequests = allProviders.reduce(
      (sum, p) => sum + (providerRecoveryTracker.getStats(p.provider as ProviderName).totalAttempts),
      0
    );

    const diagnostics: DiagnosticsResponse = {
      timestamp: new Date().toISOString(),
      primarySource,
      providers: {
        huggingface: hfDiagnostics,
        binance: binanceDiagnostics,
        kucoin: kucoinDiagnostics
      },
      summary: {
        totalRequests,
        healthyProviders: healthyCount,
        degradedProviders: degradedCount,
        unhealthyProviders: unhealthyCount
      }
    };

    res.json(diagnostics);
  } catch (error: any) {
    logger.error('Failed to generate diagnostics', {}, error);
    res.status(500).json({
      error: 'Failed to generate diagnostics',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * GET /diagnostics/:provider
 * Get diagnostics for a specific provider
 */
router.get('/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    if (!['huggingface', 'binance', 'kucoin'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be one of: huggingface, binance, kucoin'
      });
    }

    const diagnostics = buildProviderDiagnostics(provider as ProviderName);

    res.json({
      timestamp: new Date().toISOString(),
      provider: diagnostics
    });
  } catch (error: any) {
    logger.error('Failed to generate provider diagnostics', { provider: req.params.provider }, error);
    res.status(500).json({
      error: 'Failed to generate provider diagnostics',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /diagnostics/clear
 * Clear all diagnostics data (for testing/debugging)
 */
router.post('/clear', (req: Request, res: Response) => {
  try {
    logger.info('Clearing all diagnostics data');

    providerLatencyTracker.clearAllStats();
    providerRecoveryTracker.clearAllStats();
    providerErrorLog.clearAllErrors();

    res.json({
      success: true,
      message: 'All diagnostics data cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to clear diagnostics', {}, error);
    res.status(500).json({
      error: 'Failed to clear diagnostics',
      message: error?.message || 'Unknown error'
    });
  }
});

/**
 * POST /diagnostics/clear/:provider
 * Clear diagnostics for a specific provider
 */
router.post('/clear/:provider', (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    if (!['huggingface', 'binance', 'kucoin'].includes(provider)) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be one of: huggingface, binance, kucoin'
      });
    }

    const providerName = provider as ProviderName;

    logger.info('Clearing diagnostics data for provider', { provider: providerName });

    providerLatencyTracker.clearStats(providerName);
    providerRecoveryTracker.clearStats(providerName);
    providerErrorLog.clearErrors(providerName);

    res.json({
      success: true,
      message: `Diagnostics data cleared for ${provider}`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('Failed to clear provider diagnostics', { provider: req.params.provider }, error);
    res.status(500).json({
      error: 'Failed to clear provider diagnostics',
      message: error?.message || 'Unknown error'
    });
  }
});

export default router;
