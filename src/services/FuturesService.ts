/**
 * Futures Service
 * Orchestrates futures trading operations using adapter and repositories
 */
import { Logger } from '../core/Logger.js';
import { FEATURE_FUTURES, EXCHANGE_KUCOIN } from '../config/flags.js';
// COMMENTED OUT: Missing futures provider files - need to be created or removed
// import { IFuturesExchange } from '../providers/futures/IFuturesExchange.js';
// import { KucoinFuturesAdapter } from '../providers/futures/KucoinFuturesAdapter.js';
import { FuturesPositionRepository } from '../data/repositories/FuturesPositionRepository.js';
import { FuturesOrderRepository } from '../data/repositories/FuturesOrderRepository.js';
import { EncryptedDatabase } from '../data/EncryptedDatabase.js';
import {
  FuturesPosition,
  FuturesOrder,
  LeverageSettings,
  FundingRate,
  FuturesAccountBalance,
  FuturesOrderbook
} from '../types/futures.js';

export class FuturesService {
  private static instance: FuturesService;
  private logger = Logger.getInstance();
  private exchange: any | null = null; // Type commented out due to missing IFuturesExchange
  private positionRepo: FuturesPositionRepository | null = null;
  private orderRepo: FuturesOrderRepository | null = null;

  private constructor() {
    if (FEATURE_FUTURES && EXCHANGE_KUCOIN) {
      try {
        // COMMENTED OUT: Missing KucoinFuturesAdapter
        // this.exchange = KucoinFuturesAdapter.getInstance();
        this.logger.info('Futures service initialization skipped - adapter not available');
      } catch (error) {
        this.logger.error('Failed to initialize futures exchange adapter', {}, error as Error);
      }

      try {
        const db = EncryptedDatabase.getInstance().getDatabase();
        this.positionRepo = new FuturesPositionRepository(db);
        this.orderRepo = new FuturesOrderRepository(db);
        this.logger.info('Futures repositories initialized');
      } catch (error) {
        this.logger.error('Failed to initialize futures repositories', {}, error as Error);
      }
    } else {
      this.logger.info('Futures feature disabled via feature flags');
    }
  }

  static getInstance(): FuturesService {
    if (!FuturesService.instance) {
      FuturesService.instance = new FuturesService();
    }
    return FuturesService.instance;
  }

  private checkEnabled(): void {
    if (!FEATURE_FUTURES) {
      console.error('Futures trading is disabled. Set FEATURE_FUTURES=true to enable.');
    }
    if (!this.exchange) {
      console.error('Futures exchange adapter not initialized');
    }
  }

  async getPositions(): Promise<FuturesPosition[]> {
    this.checkEnabled();

    try {
      // Fetch from exchange
      const exchangePositions = await this.exchange!.getPositions();

      // Sync to database
      if (this.positionRepo) {
        for (const pos of exchangePositions) {
          await this.positionRepo.upsertPosition(pos);
        }
      }

      return exchangePositions;
    } catch (error) {
      this.logger.error('Failed to get positions', {}, error as Error);
      
      // Fallback to database if exchange fails
      if (this.positionRepo) {
        return await this.positionRepo.findOpenPositions();
      }

      throw error;
    }
  }

  async placeOrder(order: FuturesOrder): Promise<any> {
    this.checkEnabled();

    try {
      // Place order on exchange
      const result = await this.exchange!.placeOrder(order);

      // Save to database
      if (this.orderRepo && result.orderId) {
        order.orderId = result.orderId;
        order.status = 'pending';
        await this.orderRepo.insert(order);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to place order', { order }, error as Error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<any> {
    this.checkEnabled();

    try {
      const result = await this.exchange!.cancelOrder(orderId);

      // Update in database
      if (this.orderRepo) {
        await this.orderRepo.updateOrderStatus(orderId, 'cancelled');
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to cancel order', { orderId }, error as Error);
      throw error;
    }
  }

  async cancelAllOrders(symbol?: string): Promise<any> {
    this.checkEnabled();

    try {
      const result = await this.exchange!.cancelAllOrders(symbol);

      // Update in database
      if (this.orderRepo) {
        const orders = symbol 
          ? await this.orderRepo.findBySymbol(symbol, 'active')
          : await this.orderRepo.findOpenOrders();
        
        for (const order of orders) {
          if (order.orderId) {
            await this.orderRepo.updateOrderStatus(order.orderId, 'cancelled');
          }
        }
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to cancel all orders', { symbol }, error as Error);
      throw error;
    }
  }

  async getOpenOrders(symbol?: string): Promise<any[]> {
    this.checkEnabled();

    try {
      return await this.exchange!.getOpenOrders(symbol);
    } catch (error) {
      this.logger.error('Failed to get open orders', { symbol }, error as Error);
      
      // Fallback to database
      if (this.orderRepo) {
        if (symbol) {
          return await this.orderRepo.findBySymbol(symbol, 'active');
        }
        return await this.orderRepo.findOpenOrders();
      }

      throw error;
    }
  }

  async setLeverage(symbol: string, leverage: number, marginMode = 'isolated'): Promise<any> {
    this.checkEnabled();

    try {
      return await this.exchange!.setLeverage(symbol, leverage, marginMode);
    } catch (error) {
      this.logger.error('Failed to set leverage', { symbol, leverage }, error as Error);
      throw error;
    }
  }

  async getAccountBalance(): Promise<FuturesAccountBalance> {
    this.checkEnabled();

    try {
      return await this.exchange!.getAccountBalance();
    } catch (error) {
      this.logger.error('Failed to get account balance', {}, error as Error);
      throw error;
    }
  }

  async getOrderbook(symbol: string, depth = 20): Promise<FuturesOrderbook> {
    this.checkEnabled();

    try {
      return await this.exchange!.getOrderbook(symbol, depth);
    } catch (error) {
      this.logger.error('Failed to get orderbook', { symbol }, error as Error);
      throw error;
    }
  }

  async getFundingRate(symbol: string): Promise<FundingRate> {
    this.checkEnabled();

    try {
      return await this.exchange!.getFundingRate(symbol);
    } catch (error) {
      this.logger.error('Failed to get funding rate', { symbol }, error as Error);
      throw error;
    }
  }

  async getFundingRateHistory(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit = 100
  ): Promise<FundingRate[]> {
    this.checkEnabled();

    try {
      return await this.exchange!.getFundingRateHistory(symbol, startTime, endTime, limit);
    } catch (error) {
      this.logger.error('Failed to get funding rate history', { symbol }, error as Error);
      throw error;
    }
  }

  /**
   * Close a position by placing a market order in the opposite direction
   * Helper method adapted from Project A
   * Uses reduceOnly flag to ensure position is closed, not opened
   */
  async closePosition(symbol: string): Promise<any> {
    this.checkEnabled();

    try {
      const positions = await this.getPositions();
      const position = positions.find(p => p.symbol === symbol);
      
      if (!position) {
        console.error(`Position not found for symbol: ${symbol}`);
      }

      const order: FuturesOrder = {
        symbol,
        side: position.side === 'long' ? 'sell' : 'buy',
        type: 'market',
        qty: position.size,
        reduceOnly: true // Critical: ensures we close position, not open new one
      };

      return await this.placeOrder(order);
    } catch (error) {
      this.logger.error('Failed to close position', { symbol }, error as Error);
      throw error;
    }
  }

  /**
   * Get account information (balance, margin, etc.)
   */
  async getAccountInfo(): Promise<any> {
    this.checkEnabled();
    
    try {
      // Mock implementation - returns dummy account info
      return {
        availableBalance: 0,
        totalBalance: 0,
        unrealizedPnl: 0,
        marginUsed: 0,
        marginRatio: 0
      };
    } catch (error) {
      this.logger.error('Failed to get account info', {}, error as Error);
      throw error;
    }
  }

  /**
   * Get orders (open and recent)
   */
  async getOrders(symbol?: string, limit: number = 50): Promise<any[]> {
    this.checkEnabled();
    
    try {
      // Mock implementation - returns empty orders array
      return [];
    } catch (error) {
      this.logger.error('Failed to get orders', { symbol, limit }, error as Error);
      throw error;
    }
  }
}
