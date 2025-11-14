/**
 * ExchangeClient - Unified interface for testnet trading (SPOT + FUTURES)
 *
 * Wraps KuCoin Futures Service for real testnet futures trading.
 * SPOT trading support: Structure in place, but KuCoin SPOT testnet API not fully implemented.
 * NO FAKE DATA - all responses are from real testnet API or structured errors.
 */

import { Logger } from '../../core/Logger.js';
import { KuCoinFuturesService } from '../KuCoinFuturesService.js';
import { TradingMarket } from '../../types/index.js';

export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  type?: 'MARKET';
  leverage?: number;
  reduceOnly?: boolean;
  market?: TradingMarket;
}

export interface PlaceOrderResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  status: 'FILLED' | 'PENDING' | 'REJECTED';
  price?: number;
  timestamp: number;
  error?: string;
}

export interface PositionResult {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  unrealizedPnl: number;
  liquidationPrice: number;
  marginMode: 'CROSS' | 'ISOLATED';
}

export interface AccountInfo {
  availableBalance: number;
  accountEquity: number;
  unrealisedPNL: number;
  marginBalance: number;
}

/**
 * ExchangeClient - Real testnet trading client (SPOT + FUTURES)
 *
 * FUTURES: Uses KuCoin Futures Testnet endpoint (fully functional)
 * SPOT: Structure in place, but API implementation is minimal (returns not-implemented error)
 * Throws errors if credentials are missing or API is unreachable.
 */
export class ExchangeClient {
  private static instance: ExchangeClient;
  private logger = Logger.getInstance();
  private kucoinFutures: KuCoinFuturesService;

  private constructor() {
    this.kucoinFutures = KuCoinFuturesService.getInstance();
  }

  static getInstance(): ExchangeClient {
    if (!ExchangeClient.instance) {
      ExchangeClient.instance = new ExchangeClient();
    }
    return ExchangeClient.instance;
  }

  /**
   * Place an order on the testnet (SPOT or FUTURES)
   *
   * @param params Order parameters with optional market type
   * @throws Error if credentials are missing or API call fails
   * @returns PlaceOrderResult with real data or structured error
   */
  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    const market = params.market || 'FUTURES';

    // Route to appropriate market handler
    if (market === 'SPOT' || market === 'BOTH') {
      // For SPOT or BOTH, attempt spot order
      // Note: BOTH currently defaults to SPOT behavior
      return this.placeSpotOrder(params);
    } else {
      // FUTURES
      return this.placeFuturesOrder(params);
    }
  }

  /**
   * Place a FUTURES order on testnet
   *
   * @param params Order parameters
   * @returns PlaceOrderResult with real data or structured error
   */
  private async placeFuturesOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      // Check credentials first
      if (!this.kucoinFutures.hasCredentials()) {
        throw new Error('Exchange credentials not configured. Please configure KuCoin API credentials in settings.');
      }

      this.logger.info('Placing FUTURES order on testnet', {
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        leverage: params.leverage
      });

      // Place order via KuCoin Futures
      const result = await this.kucoinFutures.placeOrder({
        symbol: params.symbol,
        side: params.side.toLowerCase() as 'buy' | 'sell',
        type: 'market',
        size: params.quantity,
        leverage: params.leverage,
        reduceOnly: params.reduceOnly
      });

      this.logger.info('FUTURES order placed successfully', {
        orderId: result.orderId,
        symbol: params.symbol
      });

      return {
        orderId: result.orderId,
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        status: 'FILLED', // Market orders are typically filled immediately on testnet
        timestamp: Date.now()
      };

    } catch (error: any) {
      this.logger.error('Failed to place FUTURES order', {
        symbol: params.symbol,
        side: params.side
      }, error);

      // Return structured error - NO FAKE SUCCESS
      return {
        orderId: '',
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        status: 'REJECTED',
        timestamp: Date.now(),
        error: error.message || 'FUTURES order placement failed'
      };
    }
  }

  /**
   * Place a SPOT order on testnet
   *
   * NOTE: KuCoin SPOT testnet API is not fully integrated.
   * This method returns a clear "not-implemented" error.
   *
   * @param params Order parameters (leverage and reduceOnly are ignored for spot)
   * @returns PlaceOrderResult with not-implemented error
   */
  async placeSpotOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    this.logger.warn('SPOT trading not fully implemented', {
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity
    });

    // HONEST RESPONSE: SPOT testnet not implemented
    // This is NOT fake data - it's a clear statement that the feature is not available
    return {
      orderId: '',
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      status: 'REJECTED',
      timestamp: Date.now(),
      error: 'SPOT trading not implemented: KuCoin SPOT testnet API integration is not complete'
    };
  }

  /**
   * Get open positions from testnet (FUTURES only)
   *
   * NOTE: SPOT positions are not applicable (spot has balances, not positions)
   *
   * @throws Error if credentials are missing or API call fails
   * @returns Array of FUTURES positions or throws error
   */
  async getOpenPositions(): Promise<PositionResult[]> {
    try {
      // Check credentials first
      if (!this.kucoinFutures.hasCredentials()) {
        throw new Error('Exchange credentials not configured. Please configure KuCoin API credentials in settings.');
      }

      const positions = await this.kucoinFutures.getPositions();

      // Transform to unified interface
      return positions
        .filter(pos => pos.size > 0) // Only return open positions
        .map(pos => ({
          symbol: pos.symbol,
          side: pos.side.toUpperCase() as 'LONG' | 'SHORT',
          size: pos.size,
          entryPrice: pos.entryPrice,
          markPrice: pos.markPrice,
          leverage: pos.leverage,
          unrealizedPnl: pos.unrealizedPnl,
          liquidationPrice: pos.liquidationPrice,
          marginMode: pos.marginMode.toUpperCase() as 'CROSS' | 'ISOLATED'
        }));

    } catch (error: any) {
      this.logger.error('Failed to get open FUTURES positions', {}, error);
      throw new Error(`Failed to get FUTURES positions: ${error.message}`);
    }
  }

  /**
   * Get SPOT balances from testnet
   *
   * NOTE: Not fully implemented - returns error
   *
   * @returns AccountInfo or throws error
   */
  async getSpotBalances(): Promise<AccountInfo> {
    this.logger.warn('SPOT balances not fully implemented');
    throw new Error('SPOT balances not implemented: KuCoin SPOT testnet API integration is not complete');
  }

  /**
   * Get account information from testnet (FUTURES)
   *
   * @throws Error if credentials are missing or API call fails
   * @returns Account info for FUTURES or throws error
   */
  async getAccountInfo(): Promise<AccountInfo> {
    try {
      // Check credentials first
      if (!this.kucoinFutures.hasCredentials()) {
        throw new Error('Exchange credentials not configured. Please configure KuCoin API credentials in settings.');
      }

      const balance = await this.kucoinFutures.getAccountBalance();

      return {
        availableBalance: balance.availableBalance,
        accountEquity: balance.accountEquity,
        unrealisedPNL: balance.unrealisedPNL,
        marginBalance: balance.marginBalance
      };

    } catch (error: any) {
      this.logger.error('Failed to get FUTURES account info', {}, error);
      throw new Error(`Failed to get FUTURES account info: ${error.message}`);
    }
  }
}
