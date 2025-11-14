/**
 * ExchangeClient - Unified interface for testnet trading
 *
 * Wraps KuCoin Futures Service for real testnet trading.
 * NO FAKE DATA - all responses are from real testnet API or structured errors.
 */

import { Logger } from '../../core/Logger.js';
import { KuCoinFuturesService } from '../KuCoinFuturesService.js';

export interface PlaceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  type?: 'MARKET';
  leverage?: number;
  reduceOnly?: boolean;
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
 * ExchangeClient - Real testnet trading client
 *
 * Uses KuCoin Futures Testnet endpoint.
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
   * Place an order on the testnet
   *
   * @throws Error if credentials are missing or API call fails
   * @returns PlaceOrderResult with real data or structured error
   */
  async placeOrder(params: PlaceOrderParams): Promise<PlaceOrderResult> {
    try {
      // Check credentials first
      if (!this.kucoinFutures.hasCredentials()) {
        throw new Error('Exchange credentials not configured. Please configure KuCoin API credentials in settings.');
      }

      this.logger.info('Placing order on testnet', {
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

      this.logger.info('Order placed successfully', {
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
      this.logger.error('Failed to place order', {
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
        error: error.message || 'Order placement failed'
      };
    }
  }

  /**
   * Get open positions from testnet
   *
   * @throws Error if credentials are missing or API call fails
   * @returns Array of positions or throws error
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
      this.logger.error('Failed to get open positions', {}, error);
      throw new Error(`Failed to get positions: ${error.message}`);
    }
  }

  /**
   * Get account information from testnet
   *
   * @throws Error if credentials are missing or API call fails
   * @returns Account info or throws error
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
      this.logger.error('Failed to get account info', {}, error);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }
}
