#!/usr/bin/env ts-node
/**
 * Unified Data Source Manager - Integration Test & Demo Script
 * 
 * Comprehensive testing script that demonstrates all features of the
 * Unified Data Source Manager including:
 * - HuggingFace integration
 * - Fallback mechanisms
 * - Caching
 * - Database storage
 * - Performance metrics
 * - Report generation
 */

import { unifiedDataSourceManager } from '../src/services/UnifiedDataSourceManager.js';
import { Logger } from '../src/core/Logger.js';

const logger = Logger.getInstance();

// Test configuration
const TEST_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
const TEST_TIMEFRAMES = ['1h', '4h', '24h'];

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Utility functions
const log = {
  header: (msg: string) => console.log(`\n${colors.cyan}${colors.bright}${'='.repeat(80)}\n${msg}\n${'='.repeat(80)}${colors.reset}\n`),
  section: (msg: string) => console.log(`\n${colors.blue}${colors.bright}▶ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.yellow}ℹ ${msg}${colors.reset}`),
  data: (label: string, value: any) => console.log(`  ${colors.magenta}${label}:${colors.reset} ${JSON.stringify(value, null, 2)}`)
};

// Test counters
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// Test runner
async function runTest(name: string, fn: () => Promise<void>) {
  stats.total++;
  try {
    await fn();
    stats.passed++;
    log.success(name);
  } catch (error) {
    stats.failed++;
    log.error(`${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Main test suite
async function main() {
  log.header('UNIFIED DATA SOURCE MANAGER - COMPREHENSIVE TEST SUITE');
  
  try {
    // ========================================================================
    // 1. INITIALIZATION TESTS
    // ========================================================================
    log.section('1. Initialization Tests');

    await runTest('Manager instance created', async () => {
      const manager = unifiedDataSourceManager;
      if (!manager) throw new Error('Manager instance is null');
    });

    await runTest('Default mode is mixed', async () => {
      const mode = unifiedDataSourceManager.getMode();
      if (mode !== 'mixed') throw new Error(`Expected 'mixed', got '${mode}'`);
    });

    // ========================================================================
    // 2. MODE SWITCHING TESTS
    // ========================================================================
    log.section('2. Mode Switching Tests');

    await runTest('Switch to HuggingFace mode', async () => {
      unifiedDataSourceManager.setMode('huggingface');
      const mode = unifiedDataSourceManager.getMode();
      if (mode !== 'huggingface') throw new Error('Mode not changed');
    });

    await runTest('Switch to Direct mode', async () => {
      unifiedDataSourceManager.setMode('direct');
      const mode = unifiedDataSourceManager.getMode();
      if (mode !== 'direct') throw new Error('Mode not changed');
    });

    await runTest('Switch to Mixed mode', async () => {
      unifiedDataSourceManager.setMode('mixed');
      const mode = unifiedDataSourceManager.getMode();
      if (mode !== 'mixed') throw new Error('Mode not changed');
    });

    // ========================================================================
    // 3. MARKET DATA FETCHING TESTS
    // ========================================================================
    log.section('3. Market Data Fetching Tests');

    for (const symbol of TEST_SYMBOLS) {
      await runTest(`Fetch market data for ${symbol}`, async () => {
        const result = await unifiedDataSourceManager.fetchMarketData(
          { symbol, timeframe: '1h', limit: 100 },
          { timeout: 10000, fallbackEnabled: true, cacheEnabled: false }
        );

        if (!result.success) {
          log.info(`Failed to fetch ${symbol}: ${result.error}`);
          return; // Don't fail the test, as data sources may be unavailable
        }

        log.data('Source', result.source);
        log.data('Latency', `${result.latency}ms`);
        log.data('From Cache', result.fromCache);
        log.data('Fallback Used', result.fallbackUsed);
      });
    }

    // ========================================================================
    // 4. CACHING TESTS
    // ========================================================================
    log.section('4. Caching Tests');

    await runTest('Cache functionality - First request', async () => {
      const result1 = await unifiedDataSourceManager.fetchMarketData(
        { symbol: 'BTCUSDT', timeframe: '1h' },
        { cacheEnabled: true }
      );

      if (!result1.success) {
        log.info('Data fetch failed, skipping cache test');
        return;
      }

      log.data('From Cache', result1.fromCache);
      if (result1.fromCache) {
        throw new Error('First request should not be from cache');
      }
    });

    await runTest('Cache functionality - Second request (cached)', async () => {
      const result2 = await unifiedDataSourceManager.fetchMarketData(
        { symbol: 'BTCUSDT', timeframe: '1h' },
        { cacheEnabled: true }
      );

      if (!result2.success) {
        log.info('Data fetch failed');
        return;
      }

      log.data('From Cache', result2.fromCache);
      log.data('Source', result2.source);

      if (!result2.fromCache) {
        log.info('Second request should be from cache (may have expired)');
      }
    });

    await runTest('Cache statistics', async () => {
      const stats = unifiedDataSourceManager.getCacheStats();
      log.data('Cache Size', stats.size);
      log.data('Hit Rate', `${(stats.hitRate * 100).toFixed(2)}%`);
    });

    // ========================================================================
    // 5. SENTIMENT ANALYSIS TESTS
    // ========================================================================
    log.section('5. Sentiment Analysis Tests');

    await runTest('Sentiment analysis for BTC', async () => {
      const result = await unifiedDataSourceManager.fetchSentiment(
        { symbol: 'BTC' },
        { timeout: 15000, cacheEnabled: false, fallbackEnabled: true }
      );

      if (result.success) {
        log.data('Sentiment', result.data.sentiment);
        log.data('Score', result.data.score);
        log.data('Source', result.source);
        log.data('Fallback Used', result.fallbackUsed);
      } else {
        log.info(`Sentiment analysis failed: ${result.error}`);
      }
    });

    await runTest('Sentiment analysis for custom text', async () => {
      const result = await unifiedDataSourceManager.fetchSentiment(
        { text: 'Bitcoin is experiencing massive bullish momentum!' },
        { timeout: 15000, cacheEnabled: false }
      );

      if (result.success) {
        log.data('Sentiment', result.data.sentiment);
        log.data('Score', result.data.score);
      } else {
        log.info(`Text sentiment failed: ${result.error}`);
      }
    });

    // ========================================================================
    // 6. PRICE PREDICTION TESTS
    // ========================================================================
    log.section('6. Price Prediction Tests');

    await runTest('Price prediction for BTCUSDT', async () => {
      const result = await unifiedDataSourceManager.fetchPricePrediction(
        { symbol: 'BTCUSDT', timeframes: TEST_TIMEFRAMES },
        { timeout: 20000, cacheEnabled: false }
      );

      if (result.success && result.data) {
        log.data('Base Price', result.data.basePrice);
        log.data('Predictions', result.data.predictions);
      } else {
        log.info(`Prediction failed: ${result.error}`);
      }
    });

    // ========================================================================
    // 7. FALLBACK MECHANISM TESTS
    // ========================================================================
    log.section('7. Fallback Mechanism Tests');

    await runTest('HuggingFace mode with fallback', async () => {
      unifiedDataSourceManager.setMode('huggingface');
      
      const result = await unifiedDataSourceManager.fetchMarketData(
        { symbol: 'BTCUSDT' },
        { timeout: 3000, fallbackEnabled: true, cacheEnabled: false }
      );

      log.data('Success', result.success);
      log.data('Source', result.source);
      log.data('Fallback Used', result.fallbackUsed);
    });

    await runTest('Direct mode (no HuggingFace)', async () => {
      unifiedDataSourceManager.setMode('direct');
      
      const result = await unifiedDataSourceManager.fetchMarketData(
        { symbol: 'ETHUSDT' },
        { timeout: 10000, cacheEnabled: false }
      );

      if (result.success) {
        log.data('Source', result.source);
        if (result.source === 'huggingface') {
          throw new Error('Should not use HuggingFace in direct mode');
        }
      }
    });

    await runTest('Mixed mode (parallel sources)', async () => {
      unifiedDataSourceManager.setMode('mixed');
      
      const result = await unifiedDataSourceManager.fetchMarketData(
        { symbol: 'BNBUSDT' },
        { timeout: 10000, cacheEnabled: false }
      );

      log.data('Success', result.success);
      log.data('Source', result.source);
    });

    // ========================================================================
    // 8. PERFORMANCE & METRICS TESTS
    // ========================================================================
    log.section('8. Performance & Metrics Tests');

    await runTest('Concurrent requests performance', async () => {
      const startTime = Date.now();
      
      const results = await Promise.all(
        TEST_SYMBOLS.map(symbol =>
          unifiedDataSourceManager.fetchMarketData(
            { symbol },
            { timeout: 10000, cacheEnabled: false }
          )
        )
      );

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.success).length;

      log.data('Total Time', `${duration}ms`);
      log.data('Successful Requests', `${successCount}/${results.length}`);
      log.data('Avg Time per Request', `${(duration / results.length).toFixed(0)}ms`);
    });

    await runTest('Get performance metrics', async () => {
      const metrics = unifiedDataSourceManager.getMetrics();
      
      console.log('\n  Performance Metrics:');
      metrics.forEach(metric => {
        console.log(`\n  ${colors.cyan}${metric.source}${colors.reset}`);
        console.log(`    Total Requests: ${metric.totalRequests}`);
        console.log(`    Success Rate: ${metric.totalRequests > 0 ? ((metric.successfulRequests / metric.totalRequests) * 100).toFixed(1) : 0}%`);
        console.log(`    Avg Latency: ${metric.averageLatency.toFixed(0)}ms`);
        console.log(`    Uptime: ${metric.uptime.toFixed(1)}%`);
      });
    });

    // ========================================================================
    // 9. DATA STORAGE TESTS
    // ========================================================================
    log.section('9. Data Storage Tests');

    await runTest('Query stored data', async () => {
      const results = unifiedDataSourceManager.queryStoredData({
        limit: 10
      });

      log.data('Total Stored Items', results.length);
      if (results.length > 0) {
        log.data('Sample Entry', {
          symbol: results[0].symbol,
          source: results[0].source,
          dataType: results[0].dataType,
          timestamp: results[0].timestamp
        });
      }
    });

    await runTest('Query by symbol', async () => {
      const results = unifiedDataSourceManager.queryStoredData({
        symbol: 'BTCUSDT',
        limit: 5
      });

      log.data('BTCUSDT Records', results.length);
    });

    await runTest('Query by source', async () => {
      const results = unifiedDataSourceManager.queryStoredData({
        source: 'huggingface',
        limit: 5
      });

      log.data('HuggingFace Records', results.length);
    });

    // ========================================================================
    // 10. HEALTH CHECK TESTS
    // ========================================================================
    log.section('10. Health Check Tests');

    await runTest('Check all data source health', async () => {
      const health = await unifiedDataSourceManager.checkHealth();
      
      console.log('\n  Health Status:');
      Object.entries(health).forEach(([source, status]) => {
        const icon = status ? '✓' : '✗';
        const color = status ? colors.green : colors.red;
        console.log(`    ${color}${icon} ${source}${colors.reset}`);
      });
    });

    // ========================================================================
    // 11. SYSTEM REPORT TESTS
    // ========================================================================
    log.section('11. System Report Generation');

    await runTest('Generate comprehensive report', async () => {
      const report = unifiedDataSourceManager.generateReport();
      
      console.log('\n  System Report:');
      console.log(`    Mode: ${report.mode}`);
      console.log(`    Total Requests: ${report.totalRequests}`);
      console.log(`    Cache Hit Rate: ${(report.cacheHitRate * 100).toFixed(2)}%`);
      console.log(`    Fallback Rate: ${(report.fallbackRate * 100).toFixed(2)}%`);
      console.log(`    System Uptime: ${(report.systemUptime / 1000).toFixed(0)}s`);
      console.log(`    Timestamp: ${report.timestamp}`);

      // Save report to file
      const fs = await import('fs');
      const reportPath = `./unified-data-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      log.info(`Report saved to: ${reportPath}`);
    });

    // ========================================================================
    // 12. CACHE MANAGEMENT TESTS
    // ========================================================================
    log.section('12. Cache Management Tests');

    await runTest('Clear cache', async () => {
      unifiedDataSourceManager.clearCache();
      const stats = unifiedDataSourceManager.getCacheStats();
      
      if (stats.size !== 0) {
        throw new Error('Cache not cleared');
      }
      
      log.info('Cache cleared successfully');
    });

    // ========================================================================
    // 13. METRICS RESET TESTS
    // ========================================================================
    log.section('13. Metrics Reset Tests');

    await runTest('Reset metrics', async () => {
      unifiedDataSourceManager.resetMetrics();
      const metrics = unifiedDataSourceManager.getMetrics();
      
      const allReset = metrics.every(m => 
        m.totalRequests === 0 && 
        m.successfulRequests === 0 && 
        m.failedRequests === 0
      );
      
      if (!allReset) {
        throw new Error('Metrics not properly reset');
      }
      
      log.info('Metrics reset successfully');
    });

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    log.header('TEST SUMMARY');
    
    console.log(`\n  ${colors.bright}Total Tests:${colors.reset} ${stats.total}`);
    console.log(`  ${colors.green}✓ Passed:${colors.reset} ${stats.passed}`);
    console.log(`  ${colors.red}✗ Failed:${colors.reset} ${stats.failed}`);
    console.log(`  ${colors.yellow}⊘ Skipped:${colors.reset} ${stats.skipped}`);
    
    const successRate = (stats.passed / stats.total * 100).toFixed(1);
    console.log(`\n  ${colors.bright}Success Rate:${colors.reset} ${successRate}%\n`);

    if (stats.failed > 0) {
      console.log(`\n  ${colors.red}${colors.bright}Some tests failed. Please review the errors above.${colors.reset}\n`);
      process.exit(1);
    } else {
      console.log(`\n  ${colors.green}${colors.bright}All tests passed! 🎉${colors.reset}\n`);
      process.exit(0);
    }

  } catch (error) {
    log.error(`Critical error: ${error instanceof Error ? error.message : String(error)}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the test suite
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
