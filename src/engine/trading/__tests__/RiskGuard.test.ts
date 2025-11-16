/**
 * RiskGuard Tests
 *
 * Tests the core risk checking logic:
 * - Futures allowed trade
 * - Futures blocked by position size
 * - Futures blocked by missing market data
 * - SPOT safety block
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RiskGuard } from '../RiskGuard.js';
import { ExchangeClient, AccountInfo, PositionResult } from '../../../services/exchange/ExchangeClient.js';
import { Database } from '../../../data/Database.js';
import { RiskCheckInput } from '../../../types/index.js';

describe('RiskGuard', () => {
  let riskGuard: RiskGuard;
  let mockExchangeClient: {
    getOpenPositions: ReturnType<typeof vi.fn>;
    getAccountInfo: ReturnType<typeof vi.fn>;
  };
  let mockDatabase: {
    getMarketData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock ExchangeClient BEFORE getting RiskGuard instance
    mockExchangeClient = {
      getOpenPositions: vi.fn(),
      getAccountInfo: vi.fn()
    };
    vi.spyOn(ExchangeClient, 'getInstance').mockReturnValue(mockExchangeClient as any);

    // Mock Database BEFORE getting RiskGuard instance
    mockDatabase = {
      getMarketData: vi.fn()
    };
    vi.spyOn(Database, 'getInstance').mockReturnValue(mockDatabase as any);

    // Reset singleton by accessing private instance (workaround for testing)
    // Get fresh instance - it will use our mocks since they're set up first
    (RiskGuard as any).instance = undefined;
    riskGuard = RiskGuard.getInstance();
  });

  describe('Futures - Allowed Trade', () => {
    it('should allow trade when all checks pass', async () => {
      // Arrange: All values within limits
      const input: RiskCheckInput = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantityUSDT: 100, // Below max (300)
        market: 'FUTURES'
      };

      // Mock responses
      mockExchangeClient.getOpenPositions.mockResolvedValue([
        { symbol: 'ETHUSDT', side: 'LONG', size: 1 } as PositionResult
      ]); // 1 position, below max (3)

      mockExchangeClient.getAccountInfo.mockResolvedValue({
        availableBalance: 1000, // Above min (50)
        accountEquity: 10000, // For risk % calculation
        unrealisedPNL: -10, // Above -maxDailyLoss (-100)
        marginBalance: 1000
      } as AccountInfo);

      mockDatabase.getMarketData.mockResolvedValue([
        { symbol: 'BTCUSDT', close: 50000, timestamp: Date.now() }
      ]);

      // Act
      const result = await riskGuard.checkTradeRisk(input);

      // Assert
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('Futures - Blocked by Position Size', () => {
    it('should block trade when position size exceeds limit', async () => {
      // Arrange: Position size exceeds max
      const input: RiskCheckInput = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantityUSDT: 500, // Exceeds max (300)
        market: 'FUTURES'
      };

      // Act
      const result = await riskGuard.checkTradeRisk(input);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('exceeds max');
      expect(result.reason).toContain('300'); // maxPositionSizeUSDT
    });
  });

  describe('Futures - Blocked by Missing Market Data', () => {
    it('should block trade when market data is required but unavailable', async () => {
      // Arrange: Market data missing
      const input: RiskCheckInput = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantityUSDT: 100, // Within limits
        market: 'FUTURES'
      };

      // Mock responses
      mockExchangeClient.getOpenPositions.mockResolvedValue([]);
      mockExchangeClient.getAccountInfo.mockResolvedValue({
        availableBalance: 1000,
        accountEquity: 10000,
        unrealisedPNL: -10,
        marginBalance: 1000
      } as AccountInfo);

      // No market data available
      mockDatabase.getMarketData.mockResolvedValue([]);

      // Act
      const result = await riskGuard.checkTradeRisk(input);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Market data unavailable');
    });
  });

  describe('SPOT - Safety Block', () => {
    it('should block SPOT trades for safety (balance verification not available)', async () => {
      // Arrange: SPOT market
      const input: RiskCheckInput = {
        symbol: 'BTCUSDT',
        side: 'BUY',
        quantityUSDT: 100,
        market: 'SPOT'
      };

      // Act
      const result = await riskGuard.checkTradeRisk(input);

      // Assert
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('SPOT balance verification not available');
    });
  });
});
