/**
 * OrderManagementService
 * Comprehensive order management system with multiple order types and lifecycle tracking
 */

import { Logger } from '../core/Logger.js';
import { Database } from '../data/Database.js';
import { BinanceService } from './BinanceService.js';
import { KuCoinService } from './KuCoinService.js';
import { ConfigManager } from '../core/ConfigManager.js';

export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LIMIT' | 'TRAILING_STOP' | 'OCO';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'OPEN' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

export interface Order {
  id: string;
  clientOrderId: string;
  symbol: string;
  type: OrderType;
  side: OrderSide;
  status: OrderStatus;
  quantity: number;
  filledQuantity: number;
  price?: number; // Limit price or stop price
  triggerPrice?: number; // For stop orders
  stopLoss?: number;
  takeProfit?: number;
  trailingDelta?: number; // For trailing stops
  ocoOrders?: string[]; // Related OCO order IDs
  
  timestamp: number;
  updateTime: number;
  exchangeOrderId?: string;
  
  // Lifecycle tracking
  fills: Fill[];
  
  // Fee tracking
  feeAmount: number;
  feeCurrency: string;
  
  // Execution details
  averageFillPrice: number;
  totalValue: number;
  
  // Rejection reason (if rejected)
  rejectionReason?: string;
}

export interface Fill {
  id: string;
  orderId: string;
  price: number;
  quantity: number;
  fee: number;
  timestamp: number;
  exchangeFillId?: string;
}

export interface Position {
  symbol: string;
  size: number; // Positive for long, negative for short
  averagePrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  leverage?: number;
  marginUsed?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalPnL: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalFees: number;
  positions: Position[];
  cashBalance: number;
  marginBalance?: number;
  balances?: Record<string, number>;
}

interface OrderConfig {
  defaultFeeRate: number; // e.g., 0.001 (0.1%)
  feeCurrency: string;
  slippageBuffer: number; // e.g., 0.0005 (0.05%)
  defaultLeverage: number;
}

export class OrderManagementService {
  private static instance: OrderManagementService;
  private logger = Logger.getInstance();
  private database = Database.getInstance();
  private binanceService = BinanceService.getInstance();
  private kucoinService = KuCoinService.getInstance();
  private configManager = ConfigManager.getInstance();
  private preferredExchange: 'binance' | 'kucoin' = 'binance';

  private config: OrderConfig = {
    defaultFeeRate: 0.001,
    feeCurrency: 'USDT',
    slippageBuffer: 0.0005,
    defaultLeverage: 1
  };

  private orders: Map<string, Order> = new Map();
  private positions: Map<string, Position> = new Map();
  private portfolioValue: number = 100000; // Starting capital

  private constructor() {
    // Set preferred exchange from config
    const exchangeConfig = this.configManager.getExchangeConfig();
    if (exchangeConfig.preferredExchange) {
      this.preferredExchange = exchangeConfig.preferredExchange;
    }
  }

  static getInstance(): OrderManagementService {
    if (!OrderManagementService.instance) {
      OrderManagementService.instance = new OrderManagementService();
    }
    return OrderManagementService.instance;
  }

  configure(config: Partial<OrderConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Order management configured', { config: this.config });
  }

  getConfig(): OrderConfig {
    return { ...this.config };
  }

  setPortfolioValue(value: number): void {
    this.portfolioValue = value;
  }

  // Helper method to get the preferred exchange service
  private getExchangeService(): BinanceService | KuCoinService {
    return this.preferredExchange === 'kucoin' ? this.kucoinService : this.binanceService;
  }

  // Method to switch exchange at runtime
  setPreferredExchange(exchange: 'binance' | 'kucoin'): void {
    this.preferredExchange = exchange;
    this.logger.info(`Switched preferred exchange to ${exchange}`);
  }

  getPreferredExchange(): 'binance' | 'kucoin' {
    return this.preferredExchange;
  }

  // ===== ORDER CREATION =====

  async createMarketOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    clientOrderId?: string;
  }): Promise<Order> {
    const order: Order = {
      id: this.generateOrderId(),
      clientOrderId: params.clientOrderId || this.generateClientOrderId(),
      symbol: params.symbol,
      type: 'MARKET',
      side: params.side,
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      timestamp: Date.now(),
      updateTime: Date.now(),
      fills: [],
      feeAmount: 0,
      feeCurrency: this.config.feeCurrency,
      averageFillPrice: 0,
      totalValue: 0
    };

    // Market orders execute immediately at current price
    await this.executeMarketOrder(order);
    
    return order;
  }

  async createLimitOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    price: number;
    clientOrderId?: string;
    stopLoss?: number;
    takeProfit?: number;
  }): Promise<Order> {
    const order: Order = {
      id: this.generateOrderId(),
      clientOrderId: params.clientOrderId || this.generateClientOrderId(),
      symbol: params.symbol,
      type: 'LIMIT',
      side: params.side,
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.price,
      stopLoss: params.stopLoss,
      takeProfit: params.takeProfit,
      timestamp: Date.now(),
      updateTime: Date.now(),
      fills: [],
      feeAmount: 0,
      feeCurrency: this.config.feeCurrency,
      averageFillPrice: 0,
      totalValue: 0
    };

    this.orders.set(order.id, order);
    await this.saveOrder(order);
    
    this.logger.info('Limit order created', {
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      price: order.price,
      quantity: order.quantity
    });

    // Check if limit order can be filled immediately
    await this.checkLimitOrderFilling(order);

    return order;
  }

  async createStopLossOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    triggerPrice: number;
    clientOrderId?: string;
  }): Promise<Order> {
    const order: Order = {
      id: this.generateOrderId(),
      clientOrderId: params.clientOrderId || this.generateClientOrderId(),
      symbol: params.symbol,
      type: 'STOP_LOSS',
      side: params.side,
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      triggerPrice: params.triggerPrice,
      timestamp: Date.now(),
      updateTime: Date.now(),
      fills: [],
      feeAmount: 0,
      feeCurrency: this.config.feeCurrency,
      averageFillPrice: 0,
      totalValue: 0
    };

    this.orders.set(order.id, order);
    await this.saveOrder(order);
    
    this.logger.info('Stop loss order created', {
      id: order.id,
      symbol: order.symbol,
      triggerPrice: order.triggerPrice
    });

    return order;
  }

  async createTrailingStopOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    trailingDelta: number; // Percentage or absolute value
    clientOrderId?: string;
  }): Promise<Order> {
    const order: Order = {
      id: this.generateOrderId(),
      clientOrderId: params.clientOrderId || this.generateClientOrderId(),
      symbol: params.symbol,
      type: 'TRAILING_STOP',
      side: params.side,
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      trailingDelta: params.trailingDelta,
      timestamp: Date.now(),
      updateTime: Date.now(),
      fills: [],
      feeAmount: 0,
      feeCurrency: this.config.feeCurrency,
      averageFillPrice: 0,
      totalValue: 0
    };

    this.orders.set(order.id, order);
    await this.saveOrder(order);
    
    this.logger.info('Trailing stop order created', {
      id: order.id,
      symbol: order.symbol,
      trailingDelta: order.trailingDelta
    });

    return order;
  }

  async createOCOOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    limitPrice: number;
    stopPrice: number;
    clientOrderId?: string;
  }): Promise<{ limitOrder: Order; stopOrder: Order }> {
    // Create limit order
    const limitOrder: Order = {
      id: this.generateOrderId(),
      clientOrderId: `${params.clientOrderId}_LIMIT` || this.generateClientOrderId(),
      symbol: params.symbol,
      type: 'LIMIT',
      side: params.side,
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      price: params.limitPrice,
      ocoOrders: [],
      timestamp: Date.now(),
      updateTime: Date.now(),
      fills: [],
      feeAmount: 0,
      feeCurrency: this.config.feeCurrency,
      averageFillPrice: 0,
      totalValue: 0
    };

    // Create stop order
    const stopOrder: Order = {
      id: this.generateOrderId(),
      clientOrderId: `${params.clientOrderId}_STOP` || this.generateClientOrderId(),
      symbol: params.symbol,
      type: 'STOP_LOSS',
      side: params.side,
      status: 'PENDING',
      quantity: params.quantity,
      filledQuantity: 0,
      triggerPrice: params.stopPrice,
      ocoOrders: [],
      timestamp: Date.now(),
      updateTime: Date.now(),
      fills: [],
      feeAmount: 0,
      feeCurrency: this.config.feeCurrency,
      averageFillPrice: 0,
      totalValue: 0
    };

    // Link OCO orders
    limitOrder.ocoOrders = [stopOrder.id];
    stopOrder.ocoOrders = [limitOrder.id];

    this.orders.set(limitOrder.id, limitOrder);
    this.orders.set(stopOrder.id, stopOrder);
    await this.saveOrder(limitOrder);
    await this.saveOrder(stopOrder);
    
    this.logger.info('OCO order created', {
      limitOrderId: limitOrder.id,
      stopOrderId: stopOrder.id,
      symbol: params.symbol
    });

    return { limitOrder, stopOrder };
  }

  // ===== ORDER EXECUTION =====

  private async executeMarketOrder(order: Order): Promise<void> {
    try {
      // Get current market price
      const currentPrice = await this.getCurrentPrice(order.symbol);
      
      if (!currentPrice) {
        order.status = 'REJECTED';
        order.rejectionReason = 'Unable to get market price';
        this.orders.set(order.id, order);
        await this.saveOrder(order);
        return;
      }

      // Apply slippage
      let executionPrice = currentPrice;
      if (order.side === 'BUY') {
        executionPrice = currentPrice * (1 + this.config.slippageBuffer);
      } else {
        executionPrice = currentPrice * (1 - this.config.slippageBuffer);
      }

      // Create fill
      const fill = this.createFill(order, executionPrice, order.quantity);
      order.fills.push(fill);
      order.filledQuantity = order.quantity;
      order.status = 'FILLED';
      order.averageFillPrice = executionPrice;
      order.totalValue = executionPrice * order.quantity;
      order.feeAmount = order.totalValue * this.config.defaultFeeRate;
      order.updateTime = Date.now();

      this.orders.set(order.id, order);
      await this.saveOrder(order);

      // Update position
      await this.updatePosition(order);

      this.logger.info('Market order executed', {
        id: order.id,
        symbol: order.symbol,
        price: executionPrice,
        quantity: order.quantity
      });
    } catch (error) {
      this.logger.error('Failed to execute market order', {}, error as Error);
      order.status = 'REJECTED';
      order.rejectionReason = (error as Error).message;
      this.orders.set(order.id, order);
      await this.saveOrder(order);
    }
  }

  private async checkLimitOrderFilling(order: Order): Promise<void> {
    try {
      const currentPrice = await this.getCurrentPrice(order.symbol);
      
      if (!currentPrice || !order.price) {
        return;
      }

      let shouldFill = false;
      
      if (order.side === 'BUY' && currentPrice <= order.price) {
        shouldFill = true;
      } else if (order.side === 'SELL' && currentPrice >= order.price) {
        shouldFill = true;
      }

      if (shouldFill) {
        await this.fillLimitOrder(order, currentPrice);
      }
    } catch (error) {
      this.logger.error('Failed to check limit order', {}, error as Error);
    }
  }

  private async fillLimitOrder(order: Order, price: number): Promise<void> {
    const fill = this.createFill(order, price, order.quantity);
    order.fills.push(fill);
    order.filledQuantity = order.quantity;
    order.status = 'FILLED';
    order.averageFillPrice = price;
    order.totalValue = price * order.quantity;
    order.feeAmount = order.totalValue * this.config.defaultFeeRate;
    order.updateTime = Date.now();

    this.orders.set(order.id, order);
    await this.saveOrder(order);
    await this.updatePosition(order);

    // Cancel linked OCO orders
    if (order.ocoOrders && (order.ocoOrders?.length || 0) > 0) {
      for (const ocoId of order.ocoOrders) {
        await this.cancelOrder(ocoId);
      }
    }

    this.logger.info('Limit order filled', {
      id: order.id,
      symbol: order.symbol,
      price: price,
      quantity: order.quantity
    });
  }

  private createFill(order: Order, price: number, quantity: number): Fill {
    return {
      id: `fill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      price,
      quantity,
      fee: price * quantity * this.config.defaultFeeRate,
      timestamp: Date.now()
    };
  }

  // ===== ORDER MANAGEMENT =====

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    
    if (!order) {
      this.logger.warn('Order not found for cancellation', { orderId });
      return false;
    }

    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      this.logger.warn('Cannot cancel order in current state', {
        orderId,
        status: order.status
      });
      return false;
    }

    order.status = 'CANCELLED';
    order.updateTime = Date.now();

    this.orders.set(order.id, order);
    await this.saveOrder(order);

    // Cancel linked OCO orders
    if (order.ocoOrders && (order.ocoOrders?.length || 0) > 0) {
      for (const ocoId of order.ocoOrders) {
        await this.cancelOrder(ocoId);
      }
    }

    this.logger.info('Order cancelled', { orderId, symbol: order.symbol });
    return true;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  async getOrdersBySymbol(symbol: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.symbol === symbol)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getOpenOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => ['PENDING', 'OPEN', 'PARTIALLY_FILLED'].includes(order.status))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  async getOrderHistory(limit: number = 100): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  getAllOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * Generic createOrder method (type-safe wrapper)
   * Routes to appropriate specific order creation method
   */
  async createOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    price?: number;
    type?: OrderType;
    clientOrderId?: string;
  }): Promise<Order> {
    const orderType = params.type || 'MARKET';

    if (orderType === 'MARKET') {
      return this.createMarketOrder({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        clientOrderId: params.clientOrderId
      });
    } else if (orderType === 'LIMIT' && params.price) {
      return this.createLimitOrder({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        price: params.price,
        clientOrderId: params.clientOrderId
      });
    } else {
      throw new Error(`Unsupported order type: ${orderType}`);
    }
  }

  /**
   * Generic getOrders method (type-safe wrapper)
   * Returns filtered orders based on status and symbol
   */
  async getOrders(filters?: {
    status?: string;
    symbol?: string;
  }): Promise<Order[]> {
    let orders = this.getAllOrders();

    if (filters?.symbol) {
      orders = orders.filter(order => order.symbol === filters.symbol);
    }

    if (filters?.status) {
      orders = orders.filter(order => order.status === filters.status);
    }

    return orders.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Generic getPositions method (type-safe wrapper)
   * Alias for getAllPositions
   */
  async getPositions(): Promise<Position[]> {
    return this.getAllPositions();
  }

  // ===== POSITION MANAGEMENT =====

  private async updatePosition(order: Order): Promise<void> {
    if (order.status !== 'FILLED') {
      return;
    }

    const existingPosition = this.positions.get(order.symbol);
    const sideMultiplier = order.side === 'BUY' ? 1 : -1;
    const orderSize = order.quantity * sideMultiplier;

    if (existingPosition) {
      // Update existing position
      const newSize = existingPosition.size + orderSize;
      
      if (Math.abs(newSize) < 0.00000001) {
        // Position closed
        const realizedPnL = this.calculateRealizedPnL(existingPosition, order);
        existingPosition.realizedPnL += realizedPnL;
        this.portfolioValue += realizedPnL;
        this.positions.delete(order.symbol);
        
        this.logger.info('Position closed', {
          symbol: order.symbol,
          realizedPnL
        });

        // Send Telegram notification
        try {
          const { TelegramService } = await import('./TelegramService.js');
          const telegramService = TelegramService.getInstance();
          if (telegramService.isConfigured()) {
            const payload = {
              symbol: existingPosition.symbol,
              size: existingPosition.size,
              averagePrice: existingPosition.averagePrice,
              leverage: existingPosition.leverage,
              realizedPnL: realizedPnL
            };
            await telegramService.notifyPositionOpenClose(payload, false);
            await telegramService.notifyPositionSuccess(payload, realizedPnL);
          }
        } catch (error) {
          // Silently fail - Telegram notification is optional
        }
      } else {
        // Update position
        const totalCost = existingPosition.size * existingPosition.averagePrice;
        const orderCost = orderSize * order.averageFillPrice;
        existingPosition.averagePrice = (totalCost + orderCost) / newSize;
        existingPosition.size = newSize;
        
        // Add to realized P&L if partially closed
        if (Math.sign(existingPosition.size) !== Math.sign(orderSize)) {
          const realizedPnL = this.calculateRealizedPnL(existingPosition, order);
          existingPosition.realizedPnL += realizedPnL;
          this.portfolioValue += realizedPnL;
        }
        
        this.positions.set(order.symbol, existingPosition);
      }
    } else {
      // Create new position
      const position: Position = {
        symbol: order.symbol,
        size: orderSize,
        averagePrice: order.averageFillPrice,
        unrealizedPnL: 0,
        realizedPnL: 0,
        leverage: this.config.defaultLeverage
      };
      
      this.positions.set(order.symbol, position);
      
      this.logger.info('Position opened', {
        symbol: order.symbol,
        size: position.size,
        averagePrice: position.averagePrice
      });

      // Send Telegram notification
      try {
        const { TelegramService } = await import('./TelegramService.js');
        const telegramService = TelegramService.getInstance();
        if (telegramService.isConfigured()) {
          const payload = {
            symbol: position.symbol,
            size: position.size,
            averagePrice: position.averagePrice,
            leverage: position.leverage
          };
          await telegramService.notifyPositionOpenClose(payload, true);
        }
      } catch (error) {
        // Silently fail - Telegram notification is optional
      }
    }

    await this.updateUnrealizedPnL(order.symbol);
  }

  private calculateRealizedPnL(existingPosition: Position, order: Order): number {
    const sideMultiplier = order.side === 'BUY' ? 1 : -1;
    const fillValue = order.quantity * order.averageFillPrice * sideMultiplier;
    const originalCost = order.quantity * existingPosition.averagePrice * sideMultiplier;
    return fillValue - originalCost;
  }

  private async updateUnrealizedPnL(symbol: string): Promise<void> {
    const position = this.positions.get(symbol);
    
    if (!position) {
      return;
    }

    try {
      const currentPrice = await this.getCurrentPrice(symbol);
      
      if (!currentPrice) {
        return;
      }

      const currentValue = position.size * currentPrice;
      const costBasis = position.size * position.averagePrice;
      position.unrealizedPnL = currentValue - costBasis;
      
      this.positions.set(symbol, position);

      // Check liquidation risk and notify if high
      if (position.leverage && position.leverage > 1) {
        const marginUsed = Math.abs(position.size * position.averagePrice / position.leverage);
        const liquidationPrice = position.averagePrice * (1 - (1 / position.leverage) * 0.9);
        const distanceToLiquidation = Math.abs((currentPrice - liquidationPrice) / position.averagePrice);
        const risk = Math.max(0, 1 - distanceToLiquidation);
        
        if (risk >= 0.8) {
          try {
            const { TelegramService } = await import('./TelegramService.js');
            const telegramService = TelegramService.getInstance();
            if (telegramService.isConfigured()) {
              const payload = {
                symbol: position.symbol,
                size: position.size,
                averagePrice: position.averagePrice,
                leverage: position.leverage,
                unrealizedPnL: position.unrealizedPnL
              };
              await telegramService.notifyLiquidationRisk(payload, risk);
            }
          } catch (error) {
            // Silently fail - Telegram notification is optional
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to update unrealized P&L', { symbol }, error as Error);
    }
  }

  async getPosition(symbol: string): Promise<Position | null> {
    await this.updateUnrealizedPnL(symbol);
    return this.positions.get(symbol) || null;
  }

  async getAllPositions(): Promise<Position[]> {
    // Update all positions
    for (const symbol of this.positions.keys()) {
      await this.updateUnrealizedPnL(symbol);
    }
    
    return Array.from(this.positions.values());
  }

  // ===== PORTFOLIO MANAGEMENT =====

  async getPortfolioSummary(): Promise<PortfolioSummary> {
    const positions = await this.getAllPositions();
    
    let totalUnrealizedPnL = 0;
    let totalRealizedPnL = 0;
    let totalFees = 0;

    for (const position of positions) {
      totalUnrealizedPnL += position.unrealizedPnL;
      totalRealizedPnL += position.realizedPnL;
    }

    // Calculate total fees from all filled orders
    for (const order of this.orders.values()) {
      if (order.status === 'FILLED') {
        totalFees += order.feeAmount;
      }
    }

    const totalPnL = totalUnrealizedPnL + totalRealizedPnL;
    const cashBalance = this.portfolioValue - totalFees + totalPnL;

    return {
      totalValue: cashBalance + totalUnrealizedPnL,
      totalPnL,
      unrealizedPnL: totalUnrealizedPnL,
      realizedPnL: totalRealizedPnL,
      totalFees,
      positions,
      cashBalance
    };
  }

  // ===== HELPERS =====

  private async getCurrentPrice(symbol: string): Promise<number | null> {
    try {
      const marketData = await this.database.getMarketData(symbol, '1h', 1);
      return marketData[0]?.close || null;
    } catch (error) {
      this.logger.error('Failed to get current price', { symbol }, error as Error);
      return null;
    }
  }

  private async saveOrder(order: Order): Promise<void> {
    try {
      await this.database.saveOrder(order);
    } catch (error) {
      this.logger.error('Failed to save order', {}, error as Error);
    }
  }

  private generateOrderId(): string {
    return `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateClientOrderId(): string {
    return `cid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

