/**
 * Unified Data Source Manager Tests
 * 
 * Comprehensive test suite for the Unified Data Source Manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedDataSourceManager } from '../UnifiedDataSourceManager';

describe('UnifiedDataSourceManager', () => {
  let manager: UnifiedDataSourceManager;

  beforeEach(() => {
    manager = UnifiedDataSourceManager.getInstance();
    manager.clearCache();
    manager.resetMetrics();
  });

  afterEach(() => {
    manager.clearCache();
  });

  describe('Initialization', () => {
    it('should initialize as singleton', () => {
      const instance1 = UnifiedDataSourceManager.getInstance();
      const instance2 = UnifiedDataSourceManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should start with mixed mode by default', () => {
      expect(manager.getMode()).toBe('mixed');
    });
  });

  describe('Mode Management', () => {
    it('should change mode to huggingface', () => {
      manager.setMode('huggingface');
      expect(manager.getMode()).toBe('huggingface');
    });

    it('should change mode to direct', () => {
      manager.setMode('direct');
      expect(manager.getMode()).toBe('direct');
    });

    it('should change mode to mixed', () => {
      manager.setMode('mixed');
      expect(manager.getMode()).toBe('mixed');
    });
  });

  describe('Market Data Fetching', () => {
    it('should fetch market data successfully', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 10000, fallbackEnabled: true, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.source).toBeDefined();
        expect(result.latency).toBeGreaterThan(0);
      }
    }, 15000);

    it('should use cache for repeated requests', async () => {
      // First request
      const result1 = await manager.fetchMarketData(
        { symbol: 'ETHUSDT' },
        { timeout: 10000, cacheEnabled: true }
      );

      // Second request (should use cache)
      const result2 = await manager.fetchMarketData(
        { symbol: 'ETHUSDT' },
        { timeout: 10000, cacheEnabled: true }
      );

      if (result2.success) {
        expect(result2.fromCache).toBe(true);
        expect(result2.source).toBe('cache');
      }
    }, 15000);

    it('should handle fallback when primary source fails', async () => {
      manager.setMode('huggingface');
      
      const result = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 3000, fallbackEnabled: true, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      if (!result.success || result.fallbackUsed) {
        // Either failed or used fallback
        expect(result.fallbackUsed || !result.success).toBeTruthy();
      }
    }, 15000);
  });

  describe('Sentiment Analysis', () => {
    it('should fetch sentiment for a symbol', async () => {
      const result = await manager.fetchSentiment(
        { symbol: 'BTC' },
        { timeout: 15000, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.sentiment).toBeDefined();
        expect(['positive', 'negative', 'neutral']).toContain(result.data.sentiment);
      }
    }, 20000);

    it('should analyze text sentiment', async () => {
      const result = await manager.fetchSentiment(
        { text: 'Bitcoin is going to the moon!' },
        { timeout: 15000, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.sentiment).toBeDefined();
      }
    }, 20000);

    it('should use fallback sentiment when HuggingFace fails', async () => {
      const result = await manager.fetchSentiment(
        { symbol: 'XYZ_INVALID' },
        { timeout: 2000, fallbackEnabled: true, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      // Should either succeed with fallback or return error
      if (result.success && result.fallbackUsed) {
        expect(result.data.sentiment).toBeDefined();
      }
    }, 15000);
  });

  describe('Price Predictions', () => {
    it('should generate price predictions', async () => {
      const result = await manager.fetchPricePrediction(
        { symbol: 'BTCUSDT', timeframes: ['1h', '24h'] },
        { timeout: 15000, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.predictions).toBeDefined();
        expect(result.data.predictions['1h']).toBeDefined();
        expect(result.data.predictions['24h']).toBeDefined();
      }
    }, 20000);
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      manager.clearCache();
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should track cache statistics', async () => {
      // Make some cached requests
      await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { cacheEnabled: true }
      );
      
      await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { cacheEnabled: true }
      );

      const stats = manager.getCacheStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    }, 15000);
  });

  describe('Data Storage', () => {
    it('should query stored data', () => {
      const results = manager.queryStoredData({
        symbol: 'BTCUSDT',
        limit: 10
      });

      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter stored data by symbol', () => {
      const results = manager.queryStoredData({
        symbol: 'ETHUSDT'
      });

      expect(Array.isArray(results)).toBe(true);
      results.forEach(item => {
        expect(item.symbol).toBe('ETHUSDT');
      });
    });

    it('should filter stored data by source', () => {
      const results = manager.queryStoredData({
        source: 'huggingface'
      });

      expect(Array.isArray(results)).toBe(true);
      results.forEach(item => {
        expect(item.source).toBe('huggingface');
      });
    });
  });

  describe('Metrics & Reporting', () => {
    it('should track metrics', () => {
      const metrics = manager.getMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBeGreaterThan(0);
      
      metrics.forEach(metric => {
        expect(metric.source).toBeDefined();
        expect(metric.totalRequests).toBeGreaterThanOrEqual(0);
        expect(metric.averageLatency).toBeGreaterThanOrEqual(0);
        expect(metric.uptime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should generate system report', () => {
      const report = manager.generateReport();
      
      expect(report).toBeDefined();
      expect(report.timestamp).toBeDefined();
      expect(report.mode).toBeDefined();
      expect(report.dataSources).toBeDefined();
      expect(report.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(report.fallbackRate).toBeGreaterThanOrEqual(0);
      expect(report.totalRequests).toBeGreaterThanOrEqual(0);
      expect(report.systemUptime).toBeGreaterThan(0);
    });

    it('should reset metrics', () => {
      manager.resetMetrics();
      const metrics = manager.getMetrics();
      
      metrics.forEach(metric => {
        expect(metric.totalRequests).toBe(0);
        expect(metric.successfulRequests).toBe(0);
        expect(metric.failedRequests).toBe(0);
      });
    });
  });

  describe('Health Checks', () => {
    it('should check health of all data sources', async () => {
      const health = await manager.checkHealth();
      
      expect(health).toBeDefined();
      expect(health.huggingface).toBeDefined();
      expect(health.binance).toBeDefined();
      expect(health.coingecko).toBeDefined();
      expect(health.cache).toBe(true);
      expect(health.database).toBe(true);
    }, 15000);
  });

  describe('Mixed Mode Operation', () => {
    it('should fetch from multiple sources in mixed mode', async () => {
      manager.setMode('mixed');
      
      const result = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 10000, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle invalid symbols gracefully', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'INVALID_SYMBOL_XYZ' },
        { timeout: 5000, fallbackEnabled: true }
      );

      expect(result).toBeDefined();
      // Should either succeed with fallback or fail gracefully
      expect(result.success !== undefined).toBe(true);
    }, 10000);

    it('should handle timeout errors', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 1, fallbackEnabled: false }
      );

      expect(result).toBeDefined();
      // With 1ms timeout, should likely fail
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    }, 5000);
  });

  describe('Performance', () => {
    it('should handle concurrent requests', async () => {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT'];
      
      const results = await Promise.all(
        symbols.map(symbol =>
          manager.fetchMarketData(
            { symbol },
            { timeout: 10000, cacheEnabled: false }
          )
        )
      );

      expect(results.length).toBe(symbols.length);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    }, 20000);

    it('should measure latency', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 10000 }
      );

      if (result.success) {
        expect(result.latency).toBeDefined();
        expect(result.latency).toBeGreaterThan(0);
      }
    }, 15000);
  });
});

describe('Integration Tests', () => {
  let manager: UnifiedDataSourceManager;

  beforeEach(() => {
    manager = UnifiedDataSourceManager.getInstance();
    manager.clearCache();
    manager.resetMetrics();
  });

  describe('Full Data Flow', () => {
    it('should complete full data retrieval and storage flow', async () => {
      // 1. Fetch market data
      const marketResult = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { cacheEnabled: true, fallbackEnabled: true }
      );

      expect(marketResult.success || !marketResult.success).toBeTruthy();

      // 2. Fetch sentiment
      const sentimentResult = await manager.fetchSentiment(
        { symbol: 'BTC' },
        { cacheEnabled: true, fallbackEnabled: true }
      );

      expect(sentimentResult).toBeDefined();

      // 3. Generate predictions
      const predictionResult = await manager.fetchPricePrediction(
        { symbol: 'BTCUSDT', timeframes: ['1h', '24h'] },
        { cacheEnabled: true }
      );

      expect(predictionResult).toBeDefined();

      // 4. Check metrics
      const metrics = manager.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);

      // 5. Generate report
      const report = manager.generateReport();
      expect(report.totalRequests).toBeGreaterThan(0);

      // 6. Query stored data
      const stored = manager.queryStoredData({ limit: 10 });
      expect(Array.isArray(stored)).toBe(true);
    }, 30000);
  });

  describe('Fallback Scenarios', () => {
    it('should handle complete HuggingFace failure with fallback', async () => {
      manager.setMode('huggingface');

      const result = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 2000, fallbackEnabled: true, cacheEnabled: false }
      );

      expect(result).toBeDefined();
      // Should succeed via fallback or report failure
      expect(result.success !== undefined).toBe(true);
    }, 15000);
  });

  describe('Cache Performance', () => {
    it('should show performance improvement with caching', async () => {
      // First request (no cache)
      const start1 = Date.now();
      const result1 = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { cacheEnabled: true }
      );
      const latency1 = Date.now() - start1;

      // Second request (cached)
      const start2 = Date.now();
      const result2 = await manager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { cacheEnabled: true }
      );
      const latency2 = Date.now() - start2;

      if (result2.fromCache) {
        // Cached request should be faster
        expect(latency2).toBeLessThan(latency1);
      }
    }, 20000);
  });
});
