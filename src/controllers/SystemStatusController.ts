/**
 * SystemStatusController
 *
 * Provides GET /api/system/status endpoint
 * Aggregates REAL status from all subsystems:
 * - Feature flags
 * - Live scoring status
 * - Trading health
 * - Tuning results
 *
 * NO FAKE DATA - Only reports actual system state
 */

import { Request, Response } from 'express';
import { Logger } from '../core/Logger.js';
import { getSystemConfig, isFeatureEnabled, getTradingMode, getTradingMarket } from '../config/systemConfig.js';
import { ScoreStreamGateway } from '../ws/ScoreStreamGateway.js';
import { TuningStorage } from '../engine/tuning/TuningStorage.js';
import { ExchangeClient } from '../services/exchange/ExchangeClient.js';
import { SystemStatusResponse } from '../types/index.js';

export class SystemStatusController {
  private logger = Logger.getInstance();
  private scoreStreamGateway = ScoreStreamGateway.getInstance();
  private tuningStorage = TuningStorage.getInstance();
  private exchangeClient = ExchangeClient.getInstance();

  /**
   * GET /api/system/status
   *
   * Returns comprehensive system status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      // 1. Load system config
      const systemConfig = getSystemConfig();

      // 2. Get live scoring status
      const liveScoreStatus = this.scoreStreamGateway.getStatus();
      const latestScores = this.scoreStreamGateway.getAllLatestScores();
      const lastScoreTimestamp =
        latestScores.length > 0 && latestScores[0].timestamp
          ? latestScores[0].timestamp
          : null;

      // 3. Get tuning status
      let tuningHasRun = false;
      let tuningLastMetric: { metric: 'sharpe' | 'winRate' | 'pnl' | null; value: number | null } = {
        metric: null,
        value: null
      };

      try {
        const latestTuning = await this.tuningStorage.getLatest();
        if (latestTuning) {
          tuningHasRun = true;
          if (latestTuning.bestCandidate && latestTuning.bestCandidate.metrics) {
            const metrics = latestTuning.bestCandidate.metrics;
            tuningLastMetric.metric = latestTuning.metric;
            tuningLastMetric.value = metrics[latestTuning.metric] ?? null;
          }
        }
      } catch (error) {
        this.logger.error('Failed to get tuning status', {}, error as Error);
        // Continue - tuning status is not critical
      }

      // 4. Get trading health
      let tradingHealth: 'ok' | 'unreachable' | 'off' | 'unknown' = 'unknown';
      const tradingMode = systemConfig.modes.trading;

      if (tradingMode === 'OFF') {
        tradingHealth = 'off';
      } else if (tradingMode === 'DRY_RUN') {
        // DRY_RUN doesn't connect to exchange, so mark as ok (simulated)
        tradingHealth = 'ok';
      } else if (tradingMode === 'TESTNET') {
        // Try to ping exchange
        try {
          await this.exchangeClient.getAccountInfo();
          tradingHealth = 'ok';
        } catch (error) {
          this.logger.warn('Exchange health check failed', {}, error as Error);
          tradingHealth = 'unreachable';
        }
      }

      // 5. Build response
      const tradingMarket = getTradingMarket();

      const response: SystemStatusResponse = {
        environment: systemConfig.modes.environment,
        features: systemConfig.features,
        trading: {
          mode: tradingMode,
          market: tradingMarket,
          health: tradingHealth
        },
        liveScoring: {
          enabled: systemConfig.features.liveScoring,
          streaming: liveScoreStatus.isStreaming,
          lastScoreTimestamp
        },
        tuning: {
          hasRun: tuningHasRun,
          lastMetric: tuningLastMetric
        }
      };

      this.logger.debug('System status retrieved', {
        environment: response.environment,
        tradingMode: response.trading.mode,
        tradingMarket: response.trading.market,
        tradingHealth: response.trading.health
      });

      res.json(response);
    } catch (error) {
      this.logger.error('Failed to get system status', {}, error as Error);
      res.status(500).json({
        error: 'Failed to retrieve system status',
        message: (error as Error).message
      });
    }
  }
}
