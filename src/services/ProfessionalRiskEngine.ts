/**
 * PROFESSIONAL CRYPTO RISK ENGINE
 * Real-world risk metrics for cryptocurrency trading
 *
 * Features:
 * - Liquidation Price Calculator
 * - Funding Rate Risk Analysis
 * - Market Depth Analysis
 * - Volatility-based Position Sizing
 * - Real Crypto Market Scenarios
 * - Cross-Exchange Risk
 * - Whale Movement Impact
 */

import { Logger } from '../core/Logger.js';
import { realDataManager } from './RealDataManager.js';

const logger = Logger.getInstance();

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  leverage: number;
  margin: number;
  unrealizedPnL: number;
  liquidationPrice?: number;
  fundingRate?: number;
  riskScore: number;
}

export interface CryptoRiskMetrics {
  // Critical Risk Metrics
  totalLiquidationRisk: number;        // % of portfolio at risk of liquidation
  aggregateLeverage: number;           // Weighted average leverage
  marginUtilization: number;           // % of margin being used

  // Market Risk
  marketDepthRisk: number;             // Risk from low liquidity
  volatilityRisk: number;              // Risk from high volatility
  fundingRateRisk: number;             // Cost/profit from funding rates

  // Portfolio Risk
  concentrationRisk: number;           // Risk from over-concentration
  correlationRisk: number;             // Risk from correlated positions

  // Real-time Metrics
  portfolioVaR: number;                // Value at Risk (95% confidence)
  maxDrawdown: number;                 // Maximum drawdown %
  sharpeRatio: number;                 // Risk-adjusted returns

  // Position Details
  positions: Position[];
  liquidationLevels: Map<string, number>;

  // Alerts
  alerts: RiskAlert[];

  // Scenario Analysis (Real Crypto Events)
  stressTests: CryptoStressTest[];
}

export interface RiskAlert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'liquidation' | 'concentration' | 'funding' | 'volatility' | 'correlation' | 'exchange';
  title: string;
  description: string;
  action: string;
  impactScore: number;  // 0-100
  timestamp: number;
}

export interface CryptoStressTest {
  scenario: string;
  description: string;
  historicalDate?: string;
  priceImpact: number;           // % change
  portfolioImpact: number;       // $ impact
  liquidationRisk: boolean;
  timeToLiquidation?: string;    // "2 hours", "instant", etc.
  probability: 'high' | 'medium' | 'low';
}

export class ProfessionalRiskEngine {
  private static instance: ProfessionalRiskEngine;

  private constructor() {}

  public static getInstance(): ProfessionalRiskEngine {
    if (!ProfessionalRiskEngine.instance) {
      ProfessionalRiskEngine.instance = new ProfessionalRiskEngine();
    }
    return ProfessionalRiskEngine.instance;
  }

  /**
   * Calculate liquidation price for a leveraged position
   */
  public calculateLiquidationPrice(
    entryPrice: number,
    leverage: number,
    side: 'LONG' | 'SHORT',
    maintenanceMarginRate: number = 0.004  // 0.4% typical for crypto
  ): number {
    if (side === 'LONG') {
      // Long liquidation: entry * (1 - 1/leverage + maintenanceMarginRate)
      return entryPrice * (1 - (1 / leverage) + maintenanceMarginRate);
    } else {
      // Short liquidation: entry * (1 + 1/leverage - maintenanceMarginRate)
      return entryPrice * (1 + (1 / leverage) - maintenanceMarginRate);
    }
  }

  /**
   * Calculate distance to liquidation (in %)
   */
  public calculateLiquidationDistance(
    currentPrice: number,
    liquidationPrice: number,
    side: 'LONG' | 'SHORT'
  ): number {
    if (side === 'LONG') {
      return ((currentPrice - liquidationPrice) / currentPrice) * 100;
    } else {
      return ((liquidationPrice - currentPrice) / currentPrice) * 100;
    }
  }

  /**
   * Calculate optimal position size based on volatility
   */
  public calculateOptimalPositionSize(
    accountBalance: number,
    riskPercentage: number,  // e.g., 2% of account
    entryPrice: number,
    stopLoss: number,
    dailyVolatility: number  // ATR or realized volatility
  ): number {
    const riskAmount = accountBalance * (riskPercentage / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);
    const volatilityAdjustment = Math.max(0.5, Math.min(1.5, 1 / (dailyVolatility / 100)));

    const positionSize = (riskAmount / priceRisk) * volatilityAdjustment;
    return positionSize;
  }

  /**
   * Assess market depth risk for a position
   */
  public assessMarketDepthRisk(
    positionSize: number,
    averageDailyVolume: number
  ): { risk: 'low' | 'medium' | 'high' | 'critical'; score: number } {
    const sizeToVolumeRatio = (positionSize / averageDailyVolume) * 100;

    if (sizeToVolumeRatio < 0.5) return { risk: 'low', score: 10 };
    if (sizeToVolumeRatio < 2) return { risk: 'medium', score: 30 };
    if (sizeToVolumeRatio < 5) return { risk: 'high', score: 60 };
    return { risk: 'critical', score: 90 };
  }

  /**
   * Calculate funding rate impact on position
   */
  public calculateFundingImpact(
    positionSize: number,
    currentPrice: number,
    fundingRate: number,  // e.g., 0.0001 for 0.01%
    hoursHeld: number = 8  // typical funding interval
  ): number {
    const positionValue = positionSize * currentPrice;
    const fundingPeriods = hoursHeld / 8;
    return positionValue * fundingRate * fundingPeriods;
  }

  /**
   * Real Crypto Market Stress Tests
   */
  public generateCryptoStressTests(
    positions: Position[],
    totalPortfolioValue: number
  ): CryptoStressTest[] {
    return [
      // 1. Luna/UST Collapse (May 2022)
      {
        scenario: 'Luna/UST Collapse (May 2022)',
        description: 'Algorithmic stablecoin death spiral - entire ecosystem collapse',
        historicalDate: 'May 9-13, 2022',
        priceImpact: -99.9,
        portfolioImpact: this.calculateScenarioImpact(positions, -99.9, ['LUNA', 'UST']),
        liquidationRisk: this.checkLiquidationRisk(positions, -99.9),
        timeToLiquidation: '3 hours',
        probability: 'low'
      },

      // 2. FTX Collapse (November 2022)
      {
        scenario: 'FTX Exchange Collapse',
        description: 'Major exchange insolvency - frozen withdrawals, -90% token crash',
        historicalDate: 'November 6-11, 2022',
        priceImpact: -90,
        portfolioImpact: this.calculateScenarioImpact(positions, -90, ['FTT']),
        liquidationRisk: this.checkLiquidationRisk(positions, -90),
        timeToLiquidation: '1 day',
        probability: 'low'
      },

      // 3. 3AC Liquidation Cascade (June 2022)
      {
        scenario: '3AC Liquidation Cascade',
        description: 'Major hedge fund default causing systematic deleveraging',
        historicalDate: 'June 13-18, 2022',
        priceImpact: -60,
        portfolioImpact: this.calculateScenarioImpact(positions, -60),
        liquidationRisk: this.checkLiquidationRisk(positions, -60),
        timeToLiquidation: '4 hours',
        probability: 'medium'
      },

      // 4. China Mining Ban (May 2021)
      {
        scenario: 'China Mining Ban',
        description: 'Regulatory crackdown - hash rate drop, network uncertainty',
        historicalDate: 'May 19-23, 2021',
        priceImpact: -50,
        portfolioImpact: this.calculateScenarioImpact(positions, -50, ['BTC']),
        liquidationRisk: this.checkLiquidationRisk(positions, -50),
        timeToLiquidation: '6 hours',
        probability: 'medium'
      },

      // 5. COVID-19 Flash Crash (March 2020)
      {
        scenario: 'COVID-19 Black Thursday',
        description: 'Global panic - crypto follows traditional markets down',
        historicalDate: 'March 12-13, 2020',
        priceImpact: -50,
        portfolioImpact: this.calculateScenarioImpact(positions, -50),
        liquidationRisk: this.checkLiquidationRisk(positions, -50),
        timeToLiquidation: '2 hours',
        probability: 'low'
      },

      // 6. ETH Flash Crash (June 2017)
      {
        scenario: 'ETH Flash Crash on GDAX',
        description: 'Market manipulation / stop hunt - $300 to $0.10 in seconds',
        historicalDate: 'June 21, 2017',
        priceImpact: -99.9,
        portfolioImpact: this.calculateScenarioImpact(positions, -99.9, ['ETH']),
        liquidationRisk: true,
        timeToLiquidation: 'Instant',
        probability: 'low'
      },

      // 7. SEC Lawsuit Impact
      {
        scenario: 'SEC Enforcement Action',
        description: 'Regulatory lawsuit (like XRP, BNB) - exchange delistings',
        historicalDate: 'December 2020 (XRP)',
        priceImpact: -70,
        portfolioImpact: this.calculateScenarioImpact(positions, -70, ['XRP', 'BNB']),
        liquidationRisk: this.checkLiquidationRisk(positions, -70),
        timeToLiquidation: '1 day',
        probability: 'medium'
      },

      // 8. Whale Dump / Market Manipulation
      {
        scenario: 'Coordinated Whale Dump',
        description: 'Large holder liquidation creating cascade effect',
        historicalDate: 'Various incidents',
        priceImpact: -35,
        portfolioImpact: this.calculateScenarioImpact(positions, -35),
        liquidationRisk: this.checkLiquidationRisk(positions, -35),
        timeToLiquidation: '30 minutes',
        probability: 'high'
      },

      // 9. Network Congestion / Oracle Failure
      {
        scenario: 'Network Congestion During Crash',
        description: 'Unable to close positions due to high gas fees or network issues',
        historicalDate: 'May 2021 (ETH network)',
        priceImpact: -25,
        portfolioImpact: this.calculateScenarioImpact(positions, -25),
        liquidationRisk: this.checkLiquidationRisk(positions, -25),
        timeToLiquidation: '1 hour',
        probability: 'high'
      },

      // 10. Leverage Liquidation Cascade
      {
        scenario: 'Perpetual Futures Mass Liquidation',
        description: 'Cascading long/short liquidations creating extreme volatility',
        historicalDate: 'April 2021 (BTC $30k liquidations)',
        priceImpact: -20,
        portfolioImpact: this.calculateScenarioImpact(positions, -20),
        liquidationRisk: this.checkLiquidationRisk(positions, -20),
        timeToLiquidation: '15 minutes',
        probability: 'high'
      }
    ];
  }

  /**
   * Calculate portfolio impact for a given scenario
   */
  private calculateScenarioImpact(
    positions: Position[],
    priceImpact: number,
    affectedSymbols?: string[]
  ): number {
    let totalImpact = 0;

    for (const pos of positions) {
      // Check if this position is affected
      if (affectedSymbols && (affectedSymbols?.length || 0) > 0) {
        const isAffected = affectedSymbols.some(symbol =>
          pos.symbol.includes(symbol)
        );
        if (!isAffected) continue;
      }

      const positionValue = pos.size * pos.currentPrice;
      const newPrice = pos.currentPrice * (1 + priceImpact / 100);

      let pnl: number;
      if (pos.side === 'LONG') {
        pnl = (newPrice - pos.entryPrice) * pos.size;
      } else {
        pnl = (pos.entryPrice - newPrice) * pos.size;
      }

      // Account for leverage
      totalImpact += pnl * pos.leverage;
    }

    return Math.round(totalImpact);
  }

  /**
   * Check if scenario would trigger liquidations
   */
  private checkLiquidationRisk(
    positions: Position[],
    priceImpact: number
  ): boolean {
    for (const pos of positions) {
      if (!pos.liquidationPrice) continue;

      const newPrice = pos.currentPrice * (1 + priceImpact / 100);

      if (pos.side === 'LONG' && newPrice <= pos.liquidationPrice) {
        return true;
      }
      if (pos.side === 'SHORT' && newPrice >= pos.liquidationPrice) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate risk alerts based on current positions
   */
  public generateRiskAlerts(
    positions: Position[],
    totalPortfolioValue: number,
    marketData: any
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const now = Date.now();

    for (const pos of positions) {
      // 1. Liquidation proximity alert
      if (pos.liquidationPrice) {
        const distance = this.calculateLiquidationDistance(
          pos.currentPrice,
          pos.liquidationPrice,
          pos.side
        );

        if (distance < 5) {
          alerts.push({
            severity: 'critical',
            type: 'liquidation',
            title: `IMMINENT LIQUIDATION: ${pos.symbol}`,
            description: `Only ${distance.toFixed(2)}% away from liquidation price $${pos.liquidationPrice.toFixed(2)}`,
            action: 'ADD MARGIN IMMEDIATELY or CLOSE POSITION',
            impactScore: 95,
            timestamp: now
          });
        } else if (distance < 15) {
          alerts.push({
            severity: 'high',
            type: 'liquidation',
            title: `Liquidation Warning: ${pos.symbol}`,
            description: `${distance.toFixed(2)}% from liquidation at $${pos.liquidationPrice.toFixed(2)}`,
            action: 'Consider adding margin or reducing leverage',
            impactScore: 70,
            timestamp: now
          });
        } else if (distance < 30) {
          alerts.push({
            severity: 'medium',
            type: 'liquidation',
            title: `Liquidation Risk: ${pos.symbol}`,
            description: `${distance.toFixed(2)}% from liquidation level`,
            action: 'Monitor closely',
            impactScore: 40,
            timestamp: now
          });
        }
      }

      // 2. High leverage warning
      if (pos.leverage >= 10) {
        alerts.push({
          severity: 'high',
          type: 'liquidation',
          title: `Extreme Leverage: ${pos.symbol}`,
          description: `${pos.leverage}x leverage increases liquidation risk exponentially`,
          action: 'Consider reducing leverage to 5x or lower',
          impactScore: 75,
          timestamp: now
        });
      }

      // 3. Position concentration
      const positionPercent = ((pos.size * pos.currentPrice) / totalPortfolioValue) * 100;
      if (positionPercent > 40) {
        alerts.push({
          severity: 'high',
          type: 'concentration',
          title: `Over-Concentration: ${pos.symbol}`,
          description: `${positionPercent.toFixed(1)}% of portfolio in single position`,
          action: 'Diversify - reduce to <25% per position',
          impactScore: 65,
          timestamp: now
        });
      } else if (positionPercent > 25) {
        alerts.push({
          severity: 'medium',
          type: 'concentration',
          title: `High Concentration: ${pos.symbol}`,
          description: `${positionPercent.toFixed(1)}% of portfolio`,
          action: 'Consider diversification',
          impactScore: 45,
          timestamp: now
        });
      }

      // 4. Negative funding rate warning (for shorts)
      if (pos.fundingRate && pos.side === 'SHORT' && pos.fundingRate < -0.001) {
        const dailyCost = this.calculateFundingImpact(
          pos.size,
          pos.currentPrice,
          pos.fundingRate,
          24
        );
        alerts.push({
          severity: 'medium',
          type: 'funding',
          title: `Expensive Funding: ${pos.symbol}`,
          description: `Negative funding ${(pos.fundingRate * 100).toFixed(4)}% - costing $${Math.abs(dailyCost).toFixed(2)}/day`,
          action: 'Consider closing if holding long-term',
          impactScore: 35,
          timestamp: now
        });
      }

      // 5. Large unrealized loss
      if (pos.unrealizedPnL < 0) {
        const lossPercent = (pos.unrealizedPnL / (pos.size * pos.entryPrice)) * 100;
        if (lossPercent < -20) {
          alerts.push({
            severity: 'critical',
            type: 'concentration',
            title: `Large Unrealized Loss: ${pos.symbol}`,
            description: `${lossPercent.toFixed(1)}% loss ($${Math.abs(pos.unrealizedPnL).toFixed(2)})`,
            action: 'Reassess trade thesis - consider stop loss',
            impactScore: 80,
            timestamp: now
          });
        }
      }
    }

    // Sort by impact score (highest first)
    return alerts.sort((a, b) => b.impactScore - a.impactScore);
  }

  /**
   * Calculate aggregate portfolio metrics
   */
  public calculateAggregateMetrics(
    positions: Position[],
    totalPortfolioValue: number
  ): Partial<CryptoRiskMetrics> {
    if (positions.length === 0) {
      return {
        aggregateLeverage: 0,
        marginUtilization: 0,
        concentrationRisk: 0,
        totalLiquidationRisk: 0
      };
    }

    // Calculate weighted average leverage
    let totalLeveragedValue = 0;
    let totalMargin = 0;

    for (const pos of positions) {
      const posValue = pos.size * pos.currentPrice;
      totalLeveragedValue += posValue * pos.leverage;
      totalMargin += pos.margin;
    }

    const aggregateLeverage = totalLeveragedValue / totalPortfolioValue;
    const marginUtilization = (totalMargin / totalPortfolioValue) * 100;

    // Calculate concentration risk (Herfindahl index)
    let concentrationIndex = 0;
    for (const pos of positions) {
      const weight = (pos.size * pos.currentPrice) / totalPortfolioValue;
      concentrationIndex += weight * weight;
    }
    const concentrationRisk = concentrationIndex * 100;

    // Calculate liquidation risk
    let positionsNearLiquidation = 0;
    for (const pos of positions) {
      if (pos.liquidationPrice) {
        const distance = this.calculateLiquidationDistance(
          pos.currentPrice,
          pos.liquidationPrice,
          pos.side
        );
        if (distance < 30) {
          positionsNearLiquidation++;
        }
      }
    }
    const totalLiquidationRisk = (positionsNearLiquidation / positions.length) * 100;

    return {
      aggregateLeverage: Math.round(aggregateLeverage * 10) / 10,
      marginUtilization: Math.round(marginUtilization * 10) / 10,
      concentrationRisk: Math.round(concentrationRisk * 10) / 10,
      totalLiquidationRisk: Math.round(totalLiquidationRisk * 10) / 10
    };
  }
}

export const professionalRiskEngine = ProfessionalRiskEngine.getInstance();
