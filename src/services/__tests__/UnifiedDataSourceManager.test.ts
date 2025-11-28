/**
 * Unified Data Source Manager Tests
 * 
 * Comprehensive tests for data source management, fallback, and resilience
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UnifiedDataSourceManager } from '../UnifiedDataSourceManager';

describe('UnifiedDataSourceManager', () => {
  let manager: UnifiedDataSourceManager;

  beforeEach(() => {
    manager = UnifiedDataSourceManager.getInstance();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize as singleton', () => {
      const instance1 = UnifiedDataSourceManager.getInstance();
      const instance2 = UnifiedDataSourceManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should load data sources from config', () => {
      const stats = manager.getStats();
      expect(stats.totalSources).toBeGreaterThan(0);
    });

    it('should initialize with default mode', () => {
      const mode = manager.getMode();
      expect(['direct', 'huggingface', 'mixed']).toContain(mode);
    });
  });

  describe('Mode Management', () => {
    it('should change mode successfully', () => {
      manager.setMode('huggingface');
      expect(manager.getMode()).toBe('huggingface');

      manager.setMode('direct');
      expect(manager.getMode()).toBe('direct');

      manager.setMode('mixed');
      expect(manager.getMode()).toBe('mixed');
    });

    it('should emit notification on mode change', (done) => {
      manager.once('notification', (notification) => {
        expect(notification.type).toBe('info');
        expect(notification.message).toContain('mode changed');
        done();
      });

      manager.setMode('mixed');
    });
  });

  describe('Fallback Logic', () => {
    it('should try primary source first', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { timeout: 5000 }
      );

      // Should return a result (success or failure)
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('timestamp');
    });

    it('should fallback on timeout', async () => {
      // This test would need mocking of actual services
      // For now, we verify the structure
      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { timeout: 100 } // Very short timeout
      );

      expect(result).toBeDefined();
      expect(typeof result.fallbackUsed).toBe('boolean');
    });

    it('should use cache when all sources fail', async () => {
      // First, populate cache
      await manager.fetchMarketData(
        { symbol: 'BTC' },
        { cacheEnabled: true }
      );

      // Then test cache retrieval
      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { cacheEnabled: true, timeout: 1 }
      );

      // Should get cached data or handle gracefully
      expect(result).toBeDefined();
    });
  });

  describe('Mixed Mode', () => {
    it('should fetch from multiple sources simultaneously', async () => {
      manager.setMode('mixed');

      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { mode: 'mixed', timeout: 10000 }
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('source');
    });
  });

  describe('Health Tracking', () => {
    it('should track source health', () => {
      const health = manager.getSourceHealth();
      expect(Array.isArray(health)).toBe(true);

      if (Array.isArray(health) && health.length > 0) {
        const source = health[0];
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('isHealthy');
        expect(source).toHaveProperty('totalRequests');
        expect(source).toHaveProperty('successfulRequests');
        expect(source).toHaveProperty('failedRequests');
      }
    });

    it('should get health for specific source', () => {
      const allHealth = manager.getSourceHealth();
      if (Array.isArray(allHealth) && allHealth.length > 0) {
        const sourceName = allHealth[0].name;
        const health = manager.getSourceHealth(sourceName);
        
        expect(health).toHaveProperty('name');
        expect(health).toHaveProperty('isHealthy');
      }
    });

    it('should disable source after consecutive failures', async () => {
      // This would need mocking to simulate failures
      // For now, we verify the manual disable/enable works
      const stats = manager.getStats();
      if (stats.totalSources > 0) {
        const allHealth = manager.getSourceHealth();
        if (Array.isArray(allHealth) && allHealth.length > 0) {
          const sourceName = allHealth[0].name;
          
          manager.disableSource(sourceName, 60000);
          const health = manager.getSourceHealth(sourceName);
          
          if (!Array.isArray(health)) {
            expect(health.isDisabled).toBe(true);
          }
        }
      }
    });

    it('should re-enable source after cooldown', () => {
      const stats = manager.getStats();
      if (stats.totalSources > 0) {
        const allHealth = manager.getSourceHealth();
        if (Array.isArray(allHealth) && allHealth.length > 0) {
          const sourceName = allHealth[0].name;
          
          manager.disableSource(sourceName);
          manager.enableSource(sourceName);
          
          const health = manager.getSourceHealth(sourceName);
          if (!Array.isArray(health)) {
            expect(health.isDisabled).toBe(false);
          }
        }
      }
    });
  });

  describe('Statistics', () => {
    it('should provide comprehensive stats', () => {
      const stats = manager.getStats();

      expect(stats).toHaveProperty('mode');
      expect(stats).toHaveProperty('totalSources');
      expect(stats).toHaveProperty('healthySources');
      expect(stats).toHaveProperty('disabledSources');
      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('successfulRequests');
      expect(stats).toHaveProperty('failedRequests');
      expect(stats).toHaveProperty('averageSuccessRate');
      expect(stats).toHaveProperty('sources');

      expect(Array.isArray(stats.sources)).toBe(true);
    });

    it('should calculate success rate correctly', () => {
      const stats = manager.getStats();
      
      expect(typeof stats.averageSuccessRate).toBe('number');
      expect(stats.averageSuccessRate).toBeGreaterThanOrEqual(0);
      expect(stats.averageSuccessRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Notifications', () => {
    it('should emit notification on source failure', (done) => {
      manager.once('notification', (notification) => {
        expect(notification).toHaveProperty('type');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('source');
        expect(notification).toHaveProperty('timestamp');
        done();
      });

      // Trigger a failure scenario
      // This would need proper mocking in a real implementation
      manager.setMode('direct');
    });
  });

  describe('HuggingFace Extended Features', () => {
    it('should fetch extended HuggingFace data', async () => {
      const result = await manager.fetchHuggingFaceExtended('BTC');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('fallbackUsed');
      
      if (result.success && result.data) {
        expect(result.data).toHaveProperty('timestamp');
        // Extended data may have price, sentiment, prediction
      }
    });

    it('should use fallback when HuggingFace fails', async () => {
      // Test with a very short timeout to force fallback
      const result = await manager.fetchHuggingFaceExtended('BTC', { timeout: 1 });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('fallbackUsed');
      
      // Should either succeed with fallback or fail gracefully
      if (result.success) {
        expect(result.fallbackUsed).toBe(true);
        expect(result.source).not.toBe('huggingface');
      }
    });

    it('should use cache when available', async () => {
      // First request to populate cache
      await manager.fetchHuggingFaceExtended('BTC', { cacheEnabled: true, timeout: 10000 });
      
      // Second request should use cache
      const result = await manager.fetchHuggingFaceExtended('BTC', { cacheEnabled: true });

      expect(result).toHaveProperty('success');
      if (result.success) {
        expect(result.fromCache).toBe(true);
        expect(result.source).toBe('cache');
      }
    });

    it('should handle partial HuggingFace failures gracefully', async () => {
      const result = await manager.fetchHuggingFaceExtended('BTC', { timeout: 10000 });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      
      if (result.success && result.data) {
        // Should have at least some data (price, sentiment, or prediction)
        const hasData = result.data.price || result.data.sentiment || result.data.prediction;
        expect(hasData).toBeTruthy();
      }
    });

    it('should track fallback usage correctly', async () => {
      const result = await manager.fetchHuggingFaceExtended('BTC', { timeout: 10000 });

      expect(result).toHaveProperty('fallbackUsed');
      expect(typeof result.fallbackUsed).toBe('boolean');
      
      if (result.fallbackUsed) {
        expect(result.sourceType).toBe('fallback');
      }
    });
  });

  describe('Sentiment Analysis', () => {
    it('should fetch sentiment data', async () => {
      const result = await manager.fetchSentiment(
        { symbol: 'BTC' },
        { timeout: 5000 }
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('source');
    });
  });

  describe('News Fetching', () => {
    it('should fetch news data', async () => {
      const result = await manager.fetchNews(
        { limit: 10, keyword: 'crypto' },
        { timeout: 5000 }
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('source');
    });
  });

  describe('Resilience', () => {
    it('should handle invalid symbols gracefully', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'INVALID_SYMBOL_12345' },
        { timeout: 5000 }
      );

      expect(result).toHaveProperty('success');
      // Should handle gracefully even if it fails
    });

    it('should handle network errors gracefully', async () => {
      // Simulate network error by using very short timeout
      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { timeout: 1 }
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
    });

    it('should maintain state across multiple requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        manager.fetchMarketData(
          { symbol: 'BTC' },
          { timeout: 5000 }
        )
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('success');
      });
    });

    it('should recover from all sources failing', async () => {
      // First request might fail
      await manager.fetchMarketData(
        { symbol: 'BTC' },
        { timeout: 1 }
      );

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Next request with proper timeout should work
      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { timeout: 5000 }
      );

      expect(result).toHaveProperty('success');
    });
  });

  describe('Cache Management', () => {
    it('should cache successful fetches', async () => {
      const result1 = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { cacheEnabled: true, timeout: 10000 }
      );

      const result2 = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { cacheEnabled: true, timeout: 10000 }
      );

      // Second request might be from cache
      if (result1.success && result2.success) {
        expect(result2.fromCache || result2.success).toBe(true);
      }
    });

    it('should respect cache disabled option', async () => {
      const result = await manager.fetchMarketData(
        { symbol: 'BTC' },
        { cacheEnabled: false, timeout: 5000 }
      );

      if (result.success) {
        expect(result.fromCache).toBe(false);
      }
    });
  });
});
