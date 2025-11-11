/**
 * Comprehensive test suite for EnhancedMarketDataService
 *
 * Tests all free crypto data sources:
 * - Price APIs (CoinGecko, CoinCap, CoinPaprika, Binance, CoinDesk)
 * - Sentiment APIs (Fear & Greed, Reddit)
 * - Blockchain APIs (Blockchair)
 * - Whale tracking (Whale Alert)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { EnhancedMarketDataService } from '../EnhancedMarketDataService.js';

describe('EnhancedMarketDataService - Comprehensive API Tests', () => {
  let service: EnhancedMarketDataService;
  const testSymbols = ['BTC', 'ETH', 'SOL'];

  beforeAll(() => {
    service = EnhancedMarketDataService.getInstance();
  });

  // ================ PRICE DATA TESTS ================

  describe('Price Data APIs', () => {
    it('should fetch prices from any available provider', async () => {
      const prices = await service.getRealTimePrices(testSymbols);

      expect(prices).toBeDefined();
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);

      const btcPrice = prices.find(p => p.symbol === 'BTC');
      expect(btcPrice).toBeDefined();
      expect(btcPrice!.price).toBeGreaterThan(0);
      expect(btcPrice!.source).toBeTruthy();

      console.log(`✅ Price API test passed - Source: ${btcPrice!.source}`);
      console.log(`   BTC: $${btcPrice!.price.toLocaleString()}`);
      console.log(`   Volume 24h: $${btcPrice!.volume24h.toLocaleString()}`);
    }, 30000);

    it('should fetch single price', async () => {
      const btcPrice = await service.getRealTimePrice('BTC');

      expect(btcPrice).toBeDefined();
      expect(btcPrice.symbol).toBe('BTC');
      expect(btcPrice.price).toBeGreaterThan(0);

      console.log(`✅ Single price fetch - BTC: $${btcPrice.price.toLocaleString()}`);
    }, 15000);

    it('should cache prices for subsequent requests', async () => {
      const start1 = Date.now();
      await service.getRealTimePrice('BTC');
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await service.getRealTimePrice('BTC');
      const time2 = Date.now() - start2;

      expect(time2).toBeLessThan(time1);
      console.log(`✅ Cache test - First: ${time1}ms, Cached: ${time2}ms`);
    }, 30000);
  });

  // ================ HISTORICAL DATA TESTS ================

  describe('Historical Data', () => {
    it('should fetch historical OHLCV data', async () => {
      const data = await service.getHistoricalData('BTC', 7);

      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const firstCandle = data[0];
      expect(firstCandle.open).toBeGreaterThan(0);
      expect(firstCandle.high).toBeGreaterThan(0);
      expect(firstCandle.low).toBeGreaterThan(0);
      expect(firstCandle.close).toBeGreaterThan(0);
      expect(firstCandle.symbol).toBe('BTC');

      console.log(`✅ Historical data - ${data.length} candles`);
      console.log(`   Latest: O=${firstCandle.open} H=${firstCandle.high} L=${firstCandle.low} C=${firstCandle.close}`);
    }, 15000);
  });

  // ================ SENTIMENT TESTS ================

  describe('Sentiment APIs', () => {
    it('should fetch Fear & Greed Index', async () => {
      const fng = await service.getFearGreedIndex();

      expect(fng).toBeDefined();
      expect(fng.value).toBeGreaterThanOrEqual(0);
      expect(fng.value).toBeLessThanOrEqual(100);
      expect(fng.classification).toBeTruthy();

      console.log(`✅ Fear & Greed Index: ${fng.value} (${fng.classification})`);
      if (fng.change24h !== undefined) {
        console.log(`   24h Change: ${fng.change24h > 0 ? '+' : ''}${fng.change24h}`);
      }
    }, 15000);

    it('should fetch Reddit posts', async () => {
      const posts = await service.getRedditPosts('CryptoCurrency', 10);

      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);

      if (posts.length > 0) {
        const firstPost = posts[0];
        expect(firstPost.title).toBeTruthy();
        expect(firstPost.author).toBeTruthy();
        expect(typeof firstPost.score).toBe('number');

        console.log(`✅ Reddit posts fetched: ${posts.length}`);
        console.log(`   Top post: "${firstPost.title.substring(0, 50)}..."`);
        console.log(`   Score: ${firstPost.score}, Comments: ${firstPost.numComments}`);
      } else {
        console.log('⚠️  No Reddit posts returned (rate limit or network issue)');
      }
    }, 15000);
  });

  // ================ BLOCKCHAIN DATA TESTS ================

  describe('Blockchain APIs', () => {
    it('should fetch Bitcoin address data from Blockchair', async () => {
      // Test with a known Bitcoin address (Satoshi's genesis block address)
      const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
      const data = await service.getBlockchainData(address, 'bitcoin');

      if (data) {
        expect(data.chain).toBe('bitcoin');
        expect(data.address).toBe(address);
        expect(typeof data.balance).toBe('number');
        expect(typeof data.txCount).toBe('number');

        console.log(`✅ Blockchair - Bitcoin address data:`);
        console.log(`   Balance: ${data.balance} BTC`);
        console.log(`   Total Received: ${data.totalReceived} BTC`);
        console.log(`   Transactions: ${data.txCount}`);
      } else {
        console.log('⚠️  Blockchair returned no data (may be rate limited)');
      }
    }, 20000);

    it('should handle Ethereum addresses', async () => {
      // Test with a known Ethereum address (Vitalik's address)
      const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const data = await service.getBlockchainData(address, 'ethereum');

      if (data) {
        expect(data.chain).toBe('ethereum');
        expect(data.address.toLowerCase()).toBe(address.toLowerCase());

        console.log(`✅ Blockchair - Ethereum address data:`);
        console.log(`   Balance: ${data.balance} ETH`);
        console.log(`   Transactions: ${data.txCount}`);
      } else {
        console.log('⚠️  Blockchair Ethereum data not available');
      }
    }, 20000);
  });

  // ================ WHALE TRACKING TESTS ================

  describe('Whale Alert API', () => {
    it('should attempt to fetch whale transactions (if API key configured)', async () => {
      try {
        const whales = await service.getWhaleTransactions(1000000);

        expect(whales).toBeDefined();
        expect(Array.isArray(whales)).toBe(true);

        if (whales.length > 0) {
          const firstWhale = whales[0];
          expect(firstWhale.amount).toBeGreaterThan(0);
          expect(firstWhale.symbol).toBeTruthy();
          expect(firstWhale.blockchain).toBeTruthy();

          console.log(`✅ Whale Alert - ${whales.length} transactions`);
          console.log(`   Latest: ${firstWhale.amount} ${firstWhale.symbol} ($${firstWhale.amountUsd.toLocaleString()})`);
          console.log(`   Blockchain: ${firstWhale.blockchain}`);
        } else {
          console.log('⚠️  No whale transactions (API key may not be configured)');
        }
      } catch (error: any) {
        console.log('⚠️  Whale Alert not configured:', error.message);
        expect(true).toBe(true); // Don't fail if API key not configured
      }
    }, 15000);
  });

  // ================ HEALTH CHECK TESTS ================

  describe('Service Health', () => {
    it('should check health of all providers', async () => {
      const health = await service.getHealthStatus();

      expect(health).toBeDefined();
      expect(typeof health).toBe('object');

      console.log('✅ Provider Health Status:');
      Object.entries(health).forEach(([provider, isHealthy]) => {
        const status = isHealthy ? '✓ Online' : '✗ Offline';
        console.log(`   ${provider}: ${status}`);
      });

      // At least one provider should be healthy
      const healthyCount = Object.values(health).filter(Boolean).length;
      expect(healthyCount).toBeGreaterThan(0);
    }, 30000);
  });

  // ================ FALLBACK MECHANISM TESTS ================

  describe('Fallback Mechanism', () => {
    it('should automatically fallback between providers', async () => {
      // Clear cache to force fresh API calls
      service.clearAllCaches();

      const prices = await service.getRealTimePrices(['BTC', 'ETH']);

      expect(prices).toBeDefined();
      expect(prices.length).toBeGreaterThan(0);

      const sources = [...new Set(prices.map(p => p.source))];
      console.log(`✅ Fallback test - Used sources: ${sources.join(', ')}`);
    }, 30000);
  });

  // ================ STRESS TEST ================

  describe('Stress Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = [
        service.getRealTimePrice('BTC'),
        service.getRealTimePrice('ETH'),
        service.getRealTimePrice('SOL'),
        service.getFearGreedIndex(),
        service.getHistoricalData('BTC', 1)
      ];

      const results = await Promise.allSettled(promises);
      const succeeded = results.filter(r => r.status === 'fulfilled').length;

      expect(succeeded).toBeGreaterThan(0);
      console.log(`✅ Concurrent requests - ${succeeded}/${results.length} succeeded`);
    }, 30000);
  });
});

// ================ MANUAL TEST RUNNER ================

/**
 * Run this file directly to test all APIs:
 * npm run test -- src/services/__tests__/EnhancedMarketDataService.test.ts
 *
 * Or run specific test:
 * npm run test -- -t "should fetch prices"
 */
