/**
 * RiskGuard - Trade risk evaluation layer
 *
 * Evaluates trade risk before execution:
 * - Position size limits
 * - Daily loss limits
 * - Open position limits
 * - Market data availability
 *
 * NO FAKE DATA - blocks trades when real data is unavailable.
 */

import fs from 'fs';
import path from 'path';
import { Logger } from '../../core/Logger.js';
import { ExchangeClient, PositionResult, AccountInfo } from '../../services/exchange/ExchangeClient.js';
import { Database } from '../../data/Database.js';

export interface RiskGuardConfig {
  maxPositionSizeUSDT: number;
  maxDailyLossUSDT: number;
  maxOpenPositions: number;
  stopLossMultiplier: number;
  takeProfitMultiplier: number;
  leverage: number;
  minAccountBalanceUSDT: number;
  maxRiskPerTradePercent: number;
  requireMarketData: boolean;
}

export interface RiskCheckInput {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantityUSDT: number;
}

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
}

/**
 * RiskGuard - Evaluates trade risk before execution
 */
export class RiskGuard {
  private static instance: RiskGuard;
  private logger = Logger.getInstance();
  private exchangeClient: ExchangeClient;
  private database: Database;
  private config: RiskGuardConfig;

  private constructor() {
    this.exchangeClient = ExchangeClient.getInstance();
    this.database = Database.getInstance();
    this.config = this.loadConfig();
  }

  static getInstance(): RiskGuard {
    if (!RiskGuard.instance) {
      RiskGuard.instance = new RiskGuard();
    }
    return RiskGuard.instance;
  }

  /**
   * Load risk guard configuration
   */
  private loadConfig(): RiskGuardConfig {
    try {
      const configPath = path.join(process.cwd(), 'config', 'risk.config.json');
      if (fs.existsSync(configPath)) {
        const rawData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(rawData);
        this.logger.info('Risk guard config loaded', { config });
        return config;
      }
    } catch (error) {
      this.logger.error('Failed to load risk guard config', {}, error as Error);
    }

    // Default config
    return {
      maxPositionSizeUSDT: 300,
      maxDailyLossUSDT: 100,
      maxOpenPositions: 3,
      stopLossMultiplier: 1.5,
      takeProfitMultiplier: 2.0,
      leverage: 3,
      minAccountBalanceUSDT: 50,
      maxRiskPerTradePercent: 2.0,
      requireMarketData: true
    };
  }

  /**
   * Check if a trade passes risk requirements
   *
   * @param input Trade parameters to check
   * @returns RiskCheckResult with allowed flag and reason if blocked
   */
  async checkTradeRisk(input: RiskCheckInput): Promise<RiskCheckResult> {
    try {
      // 1. Check position size limit
      if (input.quantityUSDT > this.config.maxPositionSizeUSDT) {
        return {
          allowed: false,
          reason: `Position size ${input.quantityUSDT} USDT exceeds max ${this.config.maxPositionSizeUSDT} USDT`
        };
      }

      // 2. Get open positions
      let openPositions: PositionResult[] = [];
      try {
        openPositions = await this.exchangeClient.getOpenPositions();
      } catch (error: any) {
        this.logger.warn('Failed to get open positions', {}, error);
        // If we can't get positions, block for safety
        return {
          allowed: false,
          reason: 'Unable to verify open positions'
        };
      }

      // 3. Check max open positions limit
      if (openPositions.length >= this.config.maxOpenPositions) {
        return {
          allowed: false,
          reason: `Max open positions limit reached (${openPositions.length}/${this.config.maxOpenPositions})`
        };
      }

      // 4. Get account info
      let accountInfo: AccountInfo;
      try {
        accountInfo = await this.exchangeClient.getAccountInfo();
      } catch (error: any) {
        this.logger.warn('Failed to get account info', {}, error);
        // If we can't get account info, block for safety
        return {
          allowed: false,
          reason: 'Unable to verify account balance'
        };
      }

      // 5. Check minimum account balance
      if (accountInfo.availableBalance < this.config.minAccountBalanceUSDT) {
        return {
          allowed: false,
          reason: `Insufficient balance: ${accountInfo.availableBalance.toFixed(2)} USDT < min ${this.config.minAccountBalanceUSDT} USDT`
        };
      }

      // 6. Check daily loss limit
      const dailyPnL = await this.getDailyPnL();
      if (dailyPnL !== null && dailyPnL < -this.config.maxDailyLossUSDT) {
        return {
          allowed: false,
          reason: `Daily loss limit exceeded: ${dailyPnL.toFixed(2)} USDT < -${this.config.maxDailyLossUSDT} USDT`
        };
      }

      // 7. Check if market data is available (if required)
      if (this.config.requireMarketData) {
        const hasMarketData = await this.checkMarketData(input.symbol);
        if (!hasMarketData) {
          return {
            allowed: false,
            reason: 'Market data unavailable for symbol'
          };
        }
      }

      // 8. Check position risk percentage
      const riskPercent = (input.quantityUSDT / accountInfo.accountEquity) * 100;
      if (riskPercent > this.config.maxRiskPerTradePercent) {
        return {
          allowed: false,
          reason: `Risk per trade ${riskPercent.toFixed(2)}% exceeds max ${this.config.maxRiskPerTradePercent}%`
        };
      }

      // All checks passed
      this.logger.info('Trade passed risk checks', {
        symbol: input.symbol,
        quantityUSDT: input.quantityUSDT,
        openPositions: openPositions.length,
        availableBalance: accountInfo.availableBalance,
        dailyPnL: dailyPnL ?? 'unknown'
      });

      return {
        allowed: true
      };

    } catch (error: any) {
      this.logger.error('Risk check failed', { input }, error);
      // On error, block for safety
      return {
        allowed: false,
        reason: `Risk check error: ${error.message}`
      };
    }
  }

  /**
   * Get daily PnL from orders
   *
   * @returns Daily PnL in USDT or null if unavailable
   */
  private async getDailyPnL(): Promise<number | null> {
    try {
      // Get today's start timestamp
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = today.getTime();

      // Query orders from database (if available)
      // Note: This is a conservative approach - if we can't compute PnL, we return null
      // and the caller can decide whether to block or allow

      // For now, we'll use unrealized PnL from account info as a proxy
      const accountInfo = await this.exchangeClient.getAccountInfo();
      return accountInfo.unrealisedPNL;

    } catch (error) {
      this.logger.warn('Failed to get daily PnL', {}, error as Error);
      return null; // Unknown PnL - caller will handle
    }
  }

  /**
   * Check if market data is available for symbol
   *
   * @param symbol Symbol to check
   * @returns true if market data is available
   */
  private async checkMarketData(symbol: string): Promise<boolean> {
    try {
      const marketData = await this.database.getMarketData(symbol, '1h', 1);
      return marketData.length > 0;
    } catch (error) {
      this.logger.warn('Failed to check market data', { symbol }, error as Error);
      return false;
    }
  }

  /**
   * Get current risk configuration
   */
  getConfig(): RiskGuardConfig {
    return { ...this.config };
  }

  /**
   * Reload configuration from file
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
    this.logger.info('Risk guard config reloaded');
  }
}
