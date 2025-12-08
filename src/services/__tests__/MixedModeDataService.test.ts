/**
 * MixedModeDataService Tests
 * 
 * Tests for the Mixed Mode data fetching system:
 * - HuggingFace as primary source
 * - Fallback to CoinGecko, CryptoCompare, etc.
 * - Caching with TTL
 * - On-demand API requests
 * - Error handling and logging
 * 
 * NO WebSocket, NO Binance, NO KuCoin
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock axios before importing the service
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(() => mockAxiosInstance),
    defaults: { headers: {} }
  };
  return {
    default: mockAxiosInstance,
    create: vi.fn(() => mockAxiosInstance)
  };
});

// Mock Logger
vi.mock('../../core/Logger.js', () => ({
  Logger: {
    getInstance: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}));

describe('MixedModeDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Configuration', () => {
    it('should have HuggingFace as primary source by default', async () => {
      // Import dynamically to get fresh instance
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const config = service.getConfig();
      
      expect(config.primarySource).toBe('huggingface');
    });

    it('should have fallback sources configured', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const config = service.getConfig();
      
      expect(config.fallbackSources).toContain('coingecko');
      expect(config.fallbackSources).toContain('cryptocompare');
      expect(config.fallbackSources).toContain('coinpaprika');
      expect(config.fallbackSources).toContain('coincap');
    });

    it('should have cache TTL settings', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const config = service.getConfig();
      
      expect(config.cacheTTL).toBeDefined();
      expect(config.cacheTTL.marketData).toBeGreaterThan(0);
    });

    it('should NOT include Binance or KuCoin in fallback sources', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const config = service.getConfig();
      
      expect(config.fallbackSources).not.toContain('binance');
      expect(config.fallbackSources).not.toContain('kucoin');
    });
  });

  describe('Mixed Mode Operation', () => {
    it('should be in mixed mode when enabled', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const config = service.getConfig();
      
      expect(config.enableMixedMode).toBe(true);
    });

    it('should update configuration at runtime', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      service.updateConfig({ pollingInterval: 60000 });
      const config = service.getConfig();
      
      expect(config.pollingInterval).toBe(60000);
    });
  });

  describe('Source Health Tracking', () => {
    it('should track health for all sources', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const healthStatus = service.getSourceHealthStatus();
      
      expect(healthStatus).toBeInstanceOf(Array);
      expect(healthStatus.length).toBeGreaterThan(0);
      
      // Check that each health entry has required fields
      healthStatus.forEach(health => {
        expect(health.name).toBeDefined();
        expect(health.isHealthy).toBeDefined();
        expect(health.totalRequests).toBeDefined();
      });
    });

    it('should get health for specific source', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const hfHealth = service.getSourceHealth('huggingface');
      
      expect(hfHealth).toBeDefined();
      expect(hfHealth?.name).toBe('huggingface');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      // Clear cache should not throw
      expect(() => service.clearCache()).not.toThrow();
    });

    it('should clear cache for specific symbol', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      expect(() => service.clearCacheForSymbol('BTC')).not.toThrow();
    });
  });

  describe('Source Management', () => {
    it('should disable source manually', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      service.disableSource('coingecko', 60000);
      const health = service.getSourceHealth('coingecko');
      
      expect(health?.isDisabled).toBe(true);
    });

    it('should enable source manually', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      service.disableSource('coingecko', 60000);
      service.enableSource('coingecko');
      const health = service.getSourceHealth('coingecko');
      
      expect(health?.isDisabled).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should return stats', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      const stats = service.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.mode).toBeDefined();
      expect(stats.primarySource).toBe('huggingface');
      expect(stats.sources).toBeDefined();
    });
  });

  describe('Polling', () => {
    it('should start and stop polling', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      const callback = vi.fn();
      const stopPolling = service.startPolling(['BTC'], callback, 1000);
      
      expect(typeof stopPolling).toBe('function');
      
      // Stop polling
      stopPolling();
      
      // Should not throw
      expect(() => service.stopAllPolling()).not.toThrow();
    });
  });

  describe('Notifications', () => {
    it('should allow subscribing to notifications', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      const callback = vi.fn();
      const unsubscribe = service.onNotification(callback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Cleanup
      unsubscribe();
    });
  });

  describe('Data Source Exclusions', () => {
    it('should NOT have Binance client', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      // Check that service doesn't have binance references
      expect((service as any).binanceClient).toBeUndefined();
      expect((service as any).binanceService).toBeUndefined();
    });

    it('should NOT have KuCoin client', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      // Check that service doesn't have kucoin references
      expect((service as any).kucoinClient).toBeUndefined();
      expect((service as any).kucoinService).toBeUndefined();
    });

    it('should NOT have WebSocket connection', async () => {
      const { MixedModeDataService } = await import('../MixedModeDataService');
      const service = MixedModeDataService.getInstance();
      
      // Check that service doesn't have websocket references
      expect((service as any).ws).toBeUndefined();
      expect((service as any).websocket).toBeUndefined();
      expect((service as any).wsManager).toBeUndefined();
    });
  });
});

describe('Data Source Configuration', () => {
  it('should configure HuggingFace as primary in dataSource config', async () => {
    const { getPrimarySource, isMixedMode } = await import('../../config/dataSource');
    
    const primarySource = getPrimarySource();
    const mixedMode = isMixedMode();
    
    // Primary should be huggingface or mixed
    expect(['huggingface', 'mixed']).toContain(primarySource);
    
    // Mixed mode should be enabled
    expect(mixedMode).toBe(true);
  });

  it('should NOT have Binance/KuCoin in data source types', async () => {
    // Import the type and check it doesn't include binance/kucoin
    const { getDataSourceConfig } = await import('../../config/dataSource');
    const config = getDataSourceConfig();
    
    // Should not have exchanges with binance/kucoin
    expect(config.primarySource).not.toBe('binance');
    expect(config.primarySource).not.toBe('kucoin');
  });
});

describe('WebSocket Configuration', () => {
  it('should have WebSocket disabled by default', async () => {
    const { USE_LASTCHANCE_WS, POLLING_ENABLED } = await import('../../config/ws');
    
    expect(USE_LASTCHANCE_WS).toBe(false);
    expect(POLLING_ENABLED).toBe(true);
  });

  it('should have polling enabled instead of WebSocket', async () => {
    const { POLLING_INTERVAL_MS, getPollingConfig } = await import('../../config/ws');
    
    expect(POLLING_INTERVAL_MS).toBeGreaterThan(0);
    
    const pollingConfig = getPollingConfig();
    expect(pollingConfig.enabled).toBe(true);
  });
});
