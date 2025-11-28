/**
 * Data Source Manager Integration Example
 * 
 * Complete example showing how to integrate and use the Unified Data Source Manager
 */

import { unifiedDataSourceManager } from '../src/services/UnifiedDataSourceManager';
import { useDataSourceNotifications } from '../src/components/data-sources/DataSourceNotifications';

// ============================================================================
// Example 1: Basic Market Data Fetching with Fallback
// ============================================================================

async function basicMarketDataExample() {
  console.log('=== Example 1: Basic Market Data Fetching ===\n');

  const result = await unifiedDataSourceManager.fetchMarketData(
    { symbol: 'BTC' },
    {
      timeout: 5000,
      fallbackEnabled: true,
      cacheEnabled: true
    }
  );

  if (result.success) {
    console.log('✅ Successfully fetched market data');
    console.log('Price:', result.data);
    console.log('Source:', result.source);
    console.log('Response Time:', result.responseTime, 'ms');
    console.log('From Cache:', result.fromCache);
    console.log('Fallback Used:', result.fallbackUsed);
  } else {
    console.error('❌ Failed to fetch market data');
    console.error('Error:', result.error);
  }

  console.log('\n');
}

// ============================================================================
// Example 2: Mode Switching and Comparison
// ============================================================================

async function modeSwitchingExample() {
  console.log('=== Example 2: Mode Switching ===\n');

  const modes = ['direct', 'huggingface', 'mixed'] as const;
  const results: Record<string, any> = {};

  for (const mode of modes) {
    console.log(`Testing ${mode} mode...`);
    unifiedDataSourceManager.setMode(mode);

    const result = await unifiedDataSourceManager.fetchMarketData(
      { symbol: 'BTC' },
      { timeout: 5000 }
    );

    results[mode] = {
      success: result.success,
      source: result.source,
      responseTime: result.responseTime,
      fallbackUsed: result.fallbackUsed
    };

    console.log(`${mode}:`, results[mode]);
  }

  // Find fastest mode
  const fastest = Object.entries(results)
    .filter(([_, result]) => result.success)
    .sort((a, b) => a[1].responseTime - b[1].responseTime)[0];

  console.log('\n✅ Fastest mode:', fastest?.[0], 'with', fastest?.[1].responseTime, 'ms');
  console.log('\n');
}

// ============================================================================
// Example 3: Health Monitoring
// ============================================================================

async function healthMonitoringExample() {
  console.log('=== Example 3: Health Monitoring ===\n');

  const stats = unifiedDataSourceManager.getStats();

  console.log('Current Mode:', stats.mode);
  console.log('Total Sources:', stats.totalSources);
  console.log('Healthy Sources:', stats.healthySources);
  console.log('Disabled Sources:', stats.disabledSources);
  console.log('Success Rate:', (stats.averageSuccessRate * 100).toFixed(2) + '%');
  console.log('\nTop 5 Sources by Success Rate:\n');

  const topSources = stats.sources
    .map(s => ({
      name: s.name,
      successRate: s.totalRequests > 0 
        ? (s.successfulRequests / s.totalRequests * 100).toFixed(1) 
        : '0',
      avgResponseTime: s.averageResponseTime.toFixed(0),
      isHealthy: s.isHealthy
    }))
    .sort((a, b) => parseFloat(b.successRate) - parseFloat(a.successRate))
    .slice(0, 5);

  topSources.forEach((source, idx) => {
    const status = source.isHealthy ? '✅' : '❌';
    console.log(`${idx + 1}. ${status} ${source.name}`);
    console.log(`   Success Rate: ${source.successRate}%`);
    console.log(`   Avg Response: ${source.avgResponseTime}ms\n`);
  });

  console.log('\n');
}

// ============================================================================
// Example 4: Parallel Fetching (Multiple Symbols)
// ============================================================================

async function parallelFetchingExample() {
  console.log('=== Example 4: Parallel Fetching ===\n');

  const symbols = ['BTC', 'ETH', 'ADA', 'DOT', 'LINK'];
  console.log('Fetching prices for:', symbols.join(', '));

  const startTime = Date.now();

  const results = await Promise.all(
    symbols.map(symbol =>
      unifiedDataSourceManager.fetchMarketData({ symbol }, { timeout: 5000 })
    )
  );

  const totalTime = Date.now() - startTime;

  console.log('\nResults:');
  results.forEach((result, idx) => {
    const symbol = symbols[idx];
    if (result.success) {
      console.log(`✅ ${symbol}: $${result.data.price} (${result.source}, ${result.responseTime}ms)`);
    } else {
      console.log(`❌ ${symbol}: Failed - ${result.error}`);
    }
  });

  const successful = results.filter(r => r.success).length;
  console.log(`\n${successful}/${symbols.length} successful in ${totalTime}ms`);
  console.log('\n');
}

// ============================================================================
// Example 5: HuggingFace Extended Analysis
// ============================================================================

async function huggingFaceExtendedExample() {
  console.log('=== Example 5: HuggingFace Extended Analysis ===\n');

  const result = await unifiedDataSourceManager.fetchHuggingFaceExtended('BTC');

  if (result.success && result.data) {
    console.log('✅ Comprehensive Analysis for BTC:\n');
    
    if (result.data.price) {
      console.log('Price Data:', result.data.price);
    }
    
    if (result.data.sentiment) {
      console.log('Sentiment:', result.data.sentiment);
    }
    
    if (result.data.prediction) {
      console.log('Prediction:', result.data.prediction);
    }
    
    if (result.data.signals) {
      console.log('Trading Signals:', result.data.signals);
    }
  } else {
    console.log('❌ Extended analysis not available');
    if (result.error) {
      console.log('Error:', result.error);
    }
  }

  console.log('\n');
}

// ============================================================================
// Example 6: Notification Handling
// ============================================================================

function notificationHandlingExample() {
  console.log('=== Example 6: Notification Handling ===\n');

  // Set up notification listener
  unifiedDataSourceManager.on('notification', (notification) => {
    const icon = {
      error: '🔴',
      warning: '🟡',
      info: 'ℹ️',
      success: '✅'
    }[notification.type];

    console.log(`${icon} [${notification.source}] ${notification.message}`);
    
    if (notification.details) {
      console.log('   Details:', notification.details);
    }
  });

  console.log('✅ Notification listener registered');
  console.log('Waiting for notifications...\n');
}

// ============================================================================
// Example 7: Resilience Testing
// ============================================================================

async function resilienceTestingExample() {
  console.log('=== Example 7: Resilience Testing ===\n');

  // Test 1: Very short timeout (should fail and fallback)
  console.log('Test 1: Short timeout (1ms) - should use fallback');
  const result1 = await unifiedDataSourceManager.fetchMarketData(
    { symbol: 'BTC' },
    { timeout: 1, fallbackEnabled: true, cacheEnabled: true }
  );
  console.log('Result:', result1.success ? '✅ Success (used fallback)' : '❌ Failed');
  console.log('Fallback used:', result1.fallbackUsed);
  console.log('From cache:', result1.fromCache);

  // Test 2: Invalid symbol
  console.log('\nTest 2: Invalid symbol - should handle gracefully');
  const result2 = await unifiedDataSourceManager.fetchMarketData(
    { symbol: 'INVALID_SYMBOL_123' },
    { timeout: 5000 }
  );
  console.log('Result:', result2.success ? '✅ Success' : '❌ Failed (expected)');

  // Test 3: Rapid consecutive requests
  console.log('\nTest 3: Rapid consecutive requests (10x) - should handle load');
  const startTime = Date.now();
  const promises = Array.from({ length: 10 }, () =>
    unifiedDataSourceManager.fetchMarketData({ symbol: 'BTC' }, { timeout: 5000 })
  );
  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  console.log(`Result: ${successful}/10 successful in ${totalTime}ms`);

  console.log('\n');
}

// ============================================================================
// Example 8: Manual Source Control
// ============================================================================

async function manualSourceControlExample() {
  console.log('=== Example 8: Manual Source Control ===\n');

  // Get all sources
  const allHealth = unifiedDataSourceManager.getSourceHealth();
  
  if (Array.isArray(allHealth) && allHealth.length > 0) {
    const testSource = allHealth[0].name;
    
    console.log(`Disabling source: ${testSource}`);
    unifiedDataSourceManager.disableSource(testSource, 10000); // Disable for 10 seconds

    // Check health
    const health1 = unifiedDataSourceManager.getSourceHealth(testSource);
    console.log('Status after disable:', !Array.isArray(health1) && health1.isDisabled ? '❌ Disabled' : '✅ Enabled');

    // Try to fetch (should use other sources)
    const result = await unifiedDataSourceManager.fetchMarketData(
      { symbol: 'BTC' },
      { timeout: 5000 }
    );
    console.log('Fetch result:', result.success ? '✅ Success' : '❌ Failed');
    console.log('Source used:', result.source);

    // Re-enable
    console.log(`\nRe-enabling source: ${testSource}`);
    unifiedDataSourceManager.enableSource(testSource);

    const health2 = unifiedDataSourceManager.getSourceHealth(testSource);
    console.log('Status after enable:', !Array.isArray(health2) && !health2.isDisabled ? '✅ Enabled' : '❌ Disabled');
  }

  console.log('\n');
}

// ============================================================================
// Example 9: Cache Performance
// ============================================================================

async function cachePerformanceExample() {
  console.log('=== Example 9: Cache Performance ===\n');

  // First fetch (no cache)
  console.log('First fetch (cold cache):');
  const startTime1 = Date.now();
  const result1 = await unifiedDataSourceManager.fetchMarketData(
    { symbol: 'BTC' },
    { cacheEnabled: true, timeout: 10000 }
  );
  const time1 = Date.now() - startTime1;
  console.log(`Time: ${time1}ms, From cache: ${result1.fromCache}`);

  // Second fetch (should use cache)
  console.log('\nSecond fetch (warm cache):');
  const startTime2 = Date.now();
  const result2 = await unifiedDataSourceManager.fetchMarketData(
    { symbol: 'BTC' },
    { cacheEnabled: true, timeout: 10000 }
  );
  const time2 = Date.now() - startTime2;
  console.log(`Time: ${time2}ms, From cache: ${result2.fromCache}`);

  const speedup = ((time1 - time2) / time1 * 100).toFixed(1);
  console.log(`\n✅ Cache speedup: ${speedup}%`);
  console.log('\n');
}

// ============================================================================
// Example 10: React Component Integration
// ============================================================================

function reactComponentExample() {
  console.log('=== Example 10: React Component Integration ===\n');

  console.log('Example React component using the data source manager:\n');
  
  const code = `
import React, { useEffect, useState } from 'react';
import { unifiedDataSourceManager } from './services/UnifiedDataSourceManager';
import { useDataSourceNotifications } from './components/data-sources/DataSourceNotifications';

function MarketData() {
  const [price, setPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useDataSourceNotifications();

  const fetchPrice = async () => {
    setLoading(true);
    
    const result = await unifiedDataSourceManager.fetchMarketData(
      { symbol: 'BTC' },
      { timeout: 5000, fallbackEnabled: true, cacheEnabled: true }
    );

    if (result.success) {
      setPrice(result.data);
      
      if (result.fallbackUsed) {
        addNotification({
          type: 'warning',
          message: 'Primary source failed, using fallback',
          source: result.source,
          timestamp: Date.now()
        });
      }
    } else {
      addNotification({
        type: 'error',
        message: 'Failed to fetch price: ' + result.error,
        source: 'market-data',
        timestamp: Date.now()
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>BTC Price</h2>
      {loading ? (
        <p>Loading...</p>
      ) : price ? (
        <div>
          <p>Price: ${price.price}</p>
          <p>Source: {price.source}</p>
        </div>
      ) : (
        <p>No data available</p>
      )}
    </div>
  );
}
  `;

  console.log(code);
  console.log('\n');
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Unified Data Source Manager - Integration Examples       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Setup notification handler first
    notificationHandlingExample();

    await basicMarketDataExample();
    await modeSwitchingExample();
    await healthMonitoringExample();
    await parallelFetchingExample();
    await huggingFaceExtendedExample();
    await resilienceTestingExample();
    await manualSourceControlExample();
    await cachePerformanceExample();
    reactComponentExample();

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  All Examples Completed Successfully! ✅                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export {
  basicMarketDataExample,
  modeSwitchingExample,
  healthMonitoringExample,
  parallelFetchingExample,
  huggingFaceExtendedExample,
  notificationHandlingExample,
  resilienceTestingExample,
  manualSourceControlExample,
  cachePerformanceExample,
  reactComponentExample,
  runAllExamples
};
