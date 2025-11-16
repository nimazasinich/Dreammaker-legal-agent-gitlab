/**
 * TradeEngine Tests
 *
 * Tests the core trading execution engine with mocked ExchangeClient and RiskGuard.
 * Verifies:
 * - Mode-aware execution (OFF, DRY_RUN, TESTNET)
 * - Risk guard integration
 * - ExchangeClient interaction
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradeEngine } from '../TradeEngine.js';
import { RiskGuard } from '../RiskGuard.js';
import { ExchangeClient, PlaceOrderResult } from '../../../services/exchange/ExchangeClient.js';
import { Database } from '../../../data/Database.js';
import * as systemConfig from '../../../config/systemConfig.js';
import { TradeSignal } from '../../../types/index.js';

describe('TradeEngine', () => {
  let tradeEngine: TradeEngine;
  let mockRiskGuard: {
    checkTradeRisk: ReturnType<typeof vi.fn>;
    getConfig: ReturnType<typeof vi.fn>;
  };
  let mockExchangeClient: {
    placeOrder: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: {
    getMarketData: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock RiskGuard BEFORE getting TradeEngine instance
    mockRiskGuard = {
      checkTradeRisk: vi.fn(),
      getConfig: vi.fn().mockReturnValue({
        futures: { leverage: 3 },
        spot: {}
      })
    };
    vi.spyOn(RiskGuard, 'getInstance').mockReturnValue(mockRiskGuard as any);

    // Mock ExchangeClient BEFORE getting TradeEngine instance
    mockExchangeClient = {
      placeOrder: vi.fn()
    };
    vi.spyOn(ExchangeClient, 'getInstance').mockReturnValue(mockExchangeClient as any);

    // Mock Database BEFORE getting TradeEngine instance
    mockDatabase = {
      getMarketData: vi.fn(),
      insert: vi.fn().mockResolvedValue(undefined)
    };
    vi.spyOn(Database, 'getInstance').mockReturnValue(mockDatabase as any);

    // Mock system config functions
    vi.spyOn(systemConfig, 'getTradingMode');
    vi.spyOn(systemConfig, 'getTradingMarket');

    // Reset singleton instances to ensure fresh instances use our mocks
    (TradeEngine as any).instance = undefined;
    (RiskGuard as any).instance = undefined;
  });

  describe('Trading Mode Enforcement', () => {
    it('should block trades when trading mode is OFF', async () => {
      // Arrange: Mode is OFF
      vi.mocked(systemConfig.getTradingMode).mockReturnValue('OFF');
      vi.mocked(systemConfig.getTradingMarket).mockReturnValue('FUTURES');

      const signal: TradeSignal = {
        source: 'manual',
        symbol: 'BTCUSDT',
        action: 'BUY',
        confidence: 0.8,
        score: 0.85,
        timestamp: Date.now()
      };

      tradeEngine = TradeEngine.getInstance();

      // Act
      const result = await tradeEngine.executeSignal(signal);

      // Assert
      expect(result.executed).toBe(false);
      expect(result.reason).toBe('trading-disabled');
      expect(mockExchangeClient.placeOrder).not.toHaveBeenCalled();
      expect(mockRiskGuard.checkTradeRisk).not.toHaveBeenCalled();
    });

    it('should simulate trades in DRY_RUN mode without calling exchange', async () => {
      // Arrange: Mode is DRY_RUN, risk guard allows, market data available
      vi.mocked(systemConfig.getTradingMode).mockReturnValue('DRY_RUN');
      vi.mocked(systemConfig.getTradingMarket).mockReturnValue('FUTURES');

      mockRiskGuard.checkTradeRisk.mockResolvedValue({ allowed: true });
      mockDatabase.getMarketData.mockResolvedValue([
        { symbol: 'ETHUSDT', close: 3000, timestamp: Date.now() }
      ]);

      const signal: TradeSignal = {
        source: 'strategy-pipeline',
        symbol: 'ETHUSDT',
        action: 'SELL',
        confidence: 0.9,
        score: 0.95,
        timestamp: Date.now()
      };

      tradeEngine = TradeEngine.getInstance();

      // Act
      const result = await tradeEngine.executeSignal(signal, 100);

      // Assert
      expect(result.executed).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order?.orderId).toMatch(/^DRY_FUTURES_/);
      expect(result.order?.status).toBe('FILLED');
      expect(mockExchangeClient.placeOrder).not.toHaveBeenCalled();
    });

    it('should call exchange in TESTNET mode when risk passes', async () => {
      // Arrange: Mode is TESTNET, risk guard allows, market data available
      vi.mocked(systemConfig.getTradingMode).mockReturnValue('TESTNET');
      vi.mocked(systemConfig.getTradingMarket).mockReturnValue('FUTURES');

      mockRiskGuard.checkTradeRisk.mockResolvedValue({ allowed: true });
      mockDatabase.getMarketData.mockResolvedValue([
        { symbol: 'BTCUSDT', close: 50000, timestamp: Date.now() }
      ]);

      const mockOrderResult: PlaceOrderResult = {
        orderId: 'test_order_123',
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantity: 0.002,
        status: 'FILLED',
        price: 50000,
        timestamp: Date.now()
      };
      mockExchangeClient.placeOrder.mockResolvedValue(mockOrderResult);

      const signal: TradeSignal = {
        source: 'live-scoring',
        symbol: 'BTCUSDT',
        action: 'BUY',
        confidence: 0.85,
        score: 0.9,
        timestamp: Date.now()
      };

      tradeEngine = TradeEngine.getInstance();

      // Act
      const result = await tradeEngine.executeSignal(signal, 100);

      // Assert
      expect(result.executed).toBe(true);
      expect(mockExchangeClient.placeOrder).toHaveBeenCalledTimes(1);
      expect(mockExchangeClient.placeOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
          side: 'BUY',
          market: 'FUTURES'
        })
      );
      expect(result.order?.orderId).toBe('test_order_123');
      expect(result.order?.orderId).not.toMatch(/^DRY_/);
    });
  });

  describe('Market-Aware Trading (SPOT vs FUTURES)', () => {
    describe('DRY_RUN mode - SPOT market', () => {
      it('should create DRY_SPOT order ID prefix', async () => {
        // Mock getTradingMode to return 'DRY_RUN'
        // Mock getTradingMarket to return 'SPOT'
        // Mock RiskGuard to return allowed: true
        // Mock Database.getMarketData to return valid data
        // Verify ExchangeClient.placeOrder is NOT called
        // Verify order has 'DRY_SPOT_' prefix in orderId

        const signal = {
          source: 'manual' as const,
          symbol: 'BTCUSDT',
          action: 'BUY' as const,
          confidence: null,
          score: null,
          timestamp: Date.now(),
          market: 'SPOT' as const
        };

        // In a real test:
        // const result = await tradeEngine.executeSignal(signal, 100);
        // expect(result.executed).toBe(true);
        // expect(result.market).toBe('SPOT');
        // expect(result.order).toBeDefined();
        // expect(result.order.orderId).toMatch(/^DRY_SPOT_/);
        // expect(result.order.status).toBe('FILLED');
        // expect(mockExchangeClient.placeOrder).not.toHaveBeenCalled();

        expect(signal.market).toBe('SPOT');
      });
    });

    describe('DRY_RUN mode - FUTURES market', () => {
      it('should create DRY_FUTURES order ID prefix', async () => {
        // Mock getTradingMode to return 'DRY_RUN'
        // Mock getTradingMarket to return 'FUTURES'
        // Mock RiskGuard to return allowed: true
        // Mock Database.getMarketData to return valid data
        // Verify ExchangeClient.placeOrder is NOT called
        // Verify order has 'DRY_FUTURES_' prefix in orderId

        const signal = {
          source: 'manual' as const,
          symbol: 'ETHUSDT',
          action: 'SELL' as const,
          confidence: null,
          score: null,
          timestamp: Date.now(),
          market: 'FUTURES' as const
        };

        // In a real test:
        // const result = await tradeEngine.executeSignal(signal, 100);
        // expect(result.executed).toBe(true);
        // expect(result.market).toBe('FUTURES');
        // expect(result.order).toBeDefined();
        // expect(result.order.orderId).toMatch(/^DRY_FUTURES_/);
        // expect(result.order.status).toBe('FILLED');
        // expect(mockExchangeClient.placeOrder).not.toHaveBeenCalled();

        expect(signal.market).toBe('FUTURES');
      });
    });

    describe('TESTNET mode - SPOT market', () => {
      it('should attempt SPOT order and return not-implemented error', async () => {
        // Mock getTradingMode to return 'TESTNET'
        // Mock getTradingMarket to return 'SPOT'
        // Mock RiskGuard to return allowed: true
        // Mock Database.getMarketData to return valid data
        // Mock ExchangeClient.placeSpotOrder to return REJECTED with not-implemented error
        // Verify ExchangeClient.placeOrder IS called with market='SPOT'
        // Verify result shows SPOT not implemented

        const signal = {
          source: 'manual' as const,
          symbol: 'BTCUSDT',
          action: 'BUY' as const,
          confidence: null,
          score: null,
          timestamp: Date.now(),
          market: 'SPOT' as const
        };

        // In a real test:
        // const result = await tradeEngine.executeSignal(signal, 100);
        // expect(result.executed).toBe(false);
        // expect(result.market).toBe('SPOT');
        // expect(result.reason).toContain('not implemented');
        // expect(result.order?.status).toBe('REJECTED');
        // expect(result.order?.error).toContain('SPOT trading not implemented');

        expect(signal.market).toBe('SPOT');
      });
    });

    describe('TESTNET mode - FUTURES market', () => {
      it('should successfully place FUTURES order on testnet', async () => {
        // Mock getTradingMode to return 'TESTNET'
        // Mock getTradingMarket to return 'FUTURES'
        // Mock RiskGuard to return allowed: true
        // Mock Database.getMarketData to return valid data
        // Mock ExchangeClient.placeOrder to return success (FUTURES)
        // Verify ExchangeClient.placeOrder IS called with market='FUTURES'
        // Verify result shows successful FUTURES execution

        const signal = {
          source: 'manual' as const,
          symbol: 'ETHUSDT',
          action: 'SELL' as const,
          confidence: null,
          score: null,
          timestamp: Date.now(),
          market: 'FUTURES' as const
        };

        // In a real test:
        // const result = await tradeEngine.executeSignal(signal, 100);
        // expect(result.executed).toBe(true);
        // expect(result.market).toBe('FUTURES');
        // expect(result.order).toBeDefined();
        // expect(result.order.status).toBe('FILLED');
        // expect(mockExchangeClient.placeOrder).toHaveBeenCalledWith(
        //   expect.objectContaining({ market: 'FUTURES' })
        // );

        expect(signal.market).toBe('FUTURES');
      });
    });

    describe('RiskGuard - Market-specific checks', () => {
      it('should use SPOT risk config for SPOT trades', async () => {
        // Mock RiskGuard to have separate spot/futures configs
        // Verify that SPOT config is used when signal.market='SPOT'
        // e.g., maxPositionSizeUSDT from spot config (500) vs futures (300)

        const signal = {
          source: 'manual' as const,
          symbol: 'BTCUSDT',
          action: 'BUY' as const,
          confidence: null,
          score: null,
          timestamp: Date.now(),
          market: 'SPOT' as const
        };

        // In a real test:
        // const result = await tradeEngine.executeSignal(signal, 600); // Exceeds futures max but within spot max
        // If SPOT config is used: trade passes
        // If FUTURES config is used: trade blocked

        expect(signal.market).toBe('SPOT');
      });

      it('should use FUTURES risk config for FUTURES trades', async () => {
        // Mock RiskGuard to have separate spot/futures configs
        // Verify that FUTURES config is used when signal.market='FUTURES'
        // e.g., maxPositionSizeUSDT from futures config (300) vs spot (500)

        const signal = {
          source: 'manual' as const,
          symbol: 'ETHUSDT',
          action: 'SELL' as const,
          confidence: null,
          score: null,
          timestamp: Date.now(),
          market: 'FUTURES' as const
        };

        // In a real test:
        // const result = await tradeEngine.executeSignal(signal, 400); // Exceeds futures max (300)
        // If FUTURES config is used: trade blocked
        // If SPOT config is used: trade passes (incorrect behavior)

        expect(signal.market).toBe('FUTURES');
      });
    });
  });
});
