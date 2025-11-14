/**
 * TradeEngine - Core trading execution engine
 *
 * Accepts trade signals from:
 * - Strategy Pipeline (Strategy 3)
 * - Live Scoring
 * - Manual API requests
 *
 * All trades are:
 * - Risk-guarded
 * - Testnet-only
 * - Honest about success/failure (NO FAKE FILLS)
 */

import { Logger } from '../../core/Logger.js';
import { ExchangeClient, PlaceOrderParams, PlaceOrderResult } from '../../services/exchange/ExchangeClient.js';
import { RiskGuard } from './RiskGuard.js';
import { Database } from '../../data/Database.js';

export interface TradeSignal {
  source: 'strategy-pipeline' | 'live-scoring' | 'manual';
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence?: number | null;
  score?: number | null;
  timestamp: number;
}

export interface TradeExecutionResult {
  executed: boolean;
  reason?: string;
  order?: PlaceOrderResult | null;
}

/**
 * TradeEngine - Executes trade signals with risk management
 */
export class TradeEngine {
  private static instance: TradeEngine;
  private logger = Logger.getInstance();
  private exchangeClient: ExchangeClient;
  private riskGuard: RiskGuard;
  private database: Database;

  // Default trade size in USDT
  private defaultTradeSize = 100;

  private constructor() {
    this.exchangeClient = ExchangeClient.getInstance();
    this.riskGuard = RiskGuard.getInstance();
    this.database = Database.getInstance();
  }

  static getInstance(): TradeEngine {
    if (!TradeEngine.instance) {
      TradeEngine.instance = new TradeEngine();
    }
    return TradeEngine.instance;
  }

  /**
   * Execute a trade signal
   *
   * @param signal Trade signal to execute
   * @param quantityUSDT Optional trade size in USDT (defaults to 100)
   * @returns TradeExecutionResult with execution status
   */
  async executeSignal(signal: TradeSignal, quantityUSDT?: number): Promise<TradeExecutionResult> {
    const tradeSize = quantityUSDT || this.defaultTradeSize;

    this.logger.info('Executing trade signal', {
      source: signal.source,
      symbol: signal.symbol,
      action: signal.action,
      quantityUSDT: tradeSize
    });

    // 1. Check if action is HOLD
    if (signal.action === 'HOLD') {
      this.logger.info('Signal action is HOLD, skipping execution', {
        symbol: signal.symbol
      });
      return {
        executed: false,
        reason: 'Signal action is HOLD'
      };
    }

    // 2. Run risk guard check
    const riskCheck = await this.riskGuard.checkTradeRisk({
      symbol: signal.symbol,
      side: signal.action,
      quantityUSDT: tradeSize
    });

    if (!riskCheck.allowed) {
      this.logger.warn('Trade blocked by risk guard', {
        symbol: signal.symbol,
        reason: riskCheck.reason
      });
      return {
        executed: false,
        reason: `blocked-by-risk-guard: ${riskCheck.reason}`
      };
    }

    // 3. Get current price to calculate quantity
    let currentPrice: number;
    try {
      const marketData = await this.database.getMarketData(signal.symbol, '1h', 1);
      if (!marketData || marketData.length === 0) {
        return {
          executed: false,
          reason: 'Market data unavailable for symbol'
        };
      }
      currentPrice = marketData[0].close;
    } catch (error: any) {
      this.logger.error('Failed to get market data', { symbol: signal.symbol }, error);
      return {
        executed: false,
        reason: 'Failed to get market data'
      };
    }

    // 4. Calculate quantity in base currency
    const quantity = tradeSize / currentPrice;

    // 5. Get leverage from risk guard config
    const riskConfig = this.riskGuard.getConfig();
    const leverage = riskConfig.leverage || 3;

    // 6. Place order via exchange client
    const orderParams: PlaceOrderParams = {
      symbol: signal.symbol,
      side: signal.action,
      quantity: quantity,
      type: 'MARKET',
      leverage: leverage,
      reduceOnly: false
    };

    let orderResult: PlaceOrderResult;
    try {
      orderResult = await this.exchangeClient.placeOrder(orderParams);
    } catch (error: any) {
      this.logger.error('Failed to place order', { params: orderParams }, error);
      return {
        executed: false,
        reason: `Order placement failed: ${error.message}`
      };
    }

    // 7. Check if order was successful
    if (orderResult.status === 'REJECTED') {
      this.logger.warn('Order rejected by exchange', {
        symbol: signal.symbol,
        error: orderResult.error
      });
      return {
        executed: false,
        reason: `Order rejected: ${orderResult.error}`,
        order: orderResult
      };
    }

    // 8. Save order to database
    try {
      await this.database.insert('orders', {
        orderId: orderResult.orderId,
        symbol: orderResult.symbol,
        side: orderResult.side,
        quantity: orderResult.quantity,
        status: orderResult.status,
        price: orderResult.price || currentPrice,
        timestamp: orderResult.timestamp,
        source: signal.source,
        confidence: signal.confidence,
        score: signal.score
      });
    } catch (error: any) {
      this.logger.error('Failed to save order to database', {}, error);
      // Continue - order was placed successfully even if save failed
    }

    // 9. Return success
    this.logger.info('Trade executed successfully', {
      orderId: orderResult.orderId,
      symbol: signal.symbol,
      side: signal.action,
      quantity: quantity,
      status: orderResult.status
    });

    return {
      executed: true,
      order: orderResult
    };
  }

  /**
   * Set default trade size in USDT
   */
  setDefaultTradeSize(sizeUSDT: number): void {
    this.defaultTradeSize = sizeUSDT;
    this.logger.info('Default trade size updated', { sizeUSDT });
  }

  /**
   * Get default trade size in USDT
   */
  getDefaultTradeSize(): number {
    return this.defaultTradeSize;
  }
}
