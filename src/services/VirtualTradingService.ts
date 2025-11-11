export class VirtualTradingService {
  private static instance: VirtualTradingService;
  private balance = 100000;
  private positions: any[] = [];
  private orders: any[] = [];
  private closedPositions: any[] = [];

  private constructor() {
    this.loadState();
  }

  static getInstance(): VirtualTradingService {
    if (!VirtualTradingService.instance) {
      VirtualTradingService.instance = new VirtualTradingService();
    }
    return VirtualTradingService.instance;
  }

  private loadState() {
    const stored = localStorage.getItem('virtual_trading_state');
    if (stored) {
      const state = JSON.parse(stored);
      this.balance = state.balance || 100000;
      this.positions = state.positions || [];
      this.orders = state.orders || [];
      this.closedPositions = state.closedPositions || [];
    }
  }

  private saveState() {
    localStorage.setItem('virtual_trading_state', JSON.stringify({
      balance: this.balance,
      positions: this.positions,
      orders: this.orders,
      closedPositions: this.closedPositions
    }));
  }

  getAccountData() {
    return {
      balance: this.balance,
      positions: this.positions,
      orders: this.orders,
      closedPositions: this.closedPositions
    };
  }

  async placeOrder(order: any): Promise<any> {
    const orderId = 'V' + Date.now();
    const newOrder = {
      ...order,
      orderId,
      status: 'active',
      timestamp: Date.now(),
      filledSize: 0
    };

    if (order.type === 'market') {
      this.executeOrder(newOrder, order.price || 50000);
    } else {
      this.orders.push(newOrder);
    }

    this.saveState();
    return { orderId };
  }

  private executeOrder(order: any, price: number) {
    const cost = order.size * price / (order.leverage || 10);
    
    if (cost > this.balance) {
      console.error('Insufficient balance');
    }

    const existing = this.positions.find(p => p.symbol === order.symbol);
    
    if (existing) {
      if ((existing.side === 'long' && order.side === 'sell') ||
          (existing.side === 'short' && order.side === 'buy')) {
        const closeSize = Math.min(existing.size, order.size);
        const pnl = existing.side === 'long' 
          ? (price - existing.entryPrice) * closeSize
          : (existing.entryPrice - price) * closeSize;
        
        this.balance += pnl + (existing.size * existing.entryPrice / existing.leverage);
        existing.size -= closeSize;
        
        if (existing.size <= 0) {
          this.closedPositions.push({
            ...existing,
            exitPrice: price,
            pnl,
            closedAt: Date.now()
          });
          this.positions = this?.positions?.filter(p => p.symbol !== order.symbol);
        }
      } else {
        existing.size += order.size;
        existing.entryPrice = ((existing.entryPrice * existing.size) + (price * order.size)) / (existing.size + order.size);
      }
    } else {
      this.balance -= cost;
      this.positions.push({
        symbol: order.symbol,
        side: order.side === 'buy' ? 'long' : 'short',
        size: order.size,
        entryPrice: price,
        leverage: order.leverage || 10,
        unrealizedPnl: 0,
        marginMode: 'isolated',
        openedAt: Date.now()
      });
    }

    this.saveState();
  }

  async closePosition(symbol: string): Promise<any> {
    const position = this.positions.find(p => p.symbol === symbol);
    if (!position) console.error('Position not found');

    return this.placeOrder({
      symbol,
      side: position.side === 'long' ? 'sell' : 'buy',
      type: 'market',
      size: position.size,
      leverage: position.leverage
    });
  }

  async cancelOrder(orderId: string): Promise<any> {
    this.orders = this?.orders?.filter(o => o.orderId !== orderId);
    this.saveState();
    return { cancelled: orderId };
  }

  updatePositionPrices(symbol: string, currentPrice: number) {
    const position = this.positions.find(p => p.symbol === symbol);
    if (position) {
      position.markPrice = currentPrice;
      position.unrealizedPnl = position.side === 'long'
        ? (currentPrice - position.entryPrice) * position.size
        : (position.entryPrice - currentPrice) * position.size;
      this.saveState();
    }
  }

  resetAccount() {
    this.balance = 100000;
    this.positions = [];
    this.orders = [];
    this.closedPositions = [];
    this.saveState();
  }
}
